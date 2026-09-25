import request from 'supertest';
import { createApp } from '../../src/app';
import { db } from '../../src/db';
import { generateAuthTokens } from '../../src/auth/tokens';
import { generateId } from '../../src/utils/helpers';

const app = createApp();

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee') =>
  db.createUser({ id: generateId(), email: `${role}-${generateId()}@test.com`, passwordHash: 'x', name: 'T', role, createdAt: new Date() });

const auth = (user: ReturnType<typeof makeUser>) => {
  const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return { Authorization: `Bearer ${accessToken}` };
};

beforeEach(() => { db.reset(); });

describe('Complete expense approval workflow', () => {
  it('happy path: create → submit → approve → expense is approved', async () => {
    // Arrange
    const emp = makeUser('employee');
    const mgr = makeUser('manager');

    // Step 1: Create expense
    const createRes = await request(app).post('/expenses').set(auth(emp))
      .send({ amount: 25000, category: 'travel', description: 'Flight to IBM Summit' });
    expect(createRes.status).toBe(201);
    const expenseId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('draft');

    // Step 2: Submit for approval
    const submitRes = await request(app)
      .post(`/expenses/${expenseId}/submit`).set(auth(emp)).send({ approverId: mgr.id });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.expense.status).toBe('submitted');
    const approvalId = submitRes.body.data.approval.id;

    // Step 3: Manager approves
    const approveRes = await request(app)
      .post(`/approvals/${approvalId}/resolve`).set(auth(mgr)).send({ status: 'approved' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.approval.status).toBe('approved');

    // Step 4: Expense is now approved
    const expRes = await request(app).get(`/expenses/${expenseId}`).set(auth(emp));
    expect(expRes.status).toBe(200);
    expect(expRes.body.data.status).toBe('approved');

    // Step 5: resolvedAt is set
    const apprRes = await request(app).get(`/approvals/${approvalId}`).set(auth(mgr));
    expect(apprRes.body.data.resolvedAt).toBeTruthy();
  });

  it('rejection path: create → submit → reject with comment', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');

    const exp = db.createExpense({ id: generateId(), userId: emp.id, amount: 5000, category: 'meals', description: 'Dinner', status: 'submitted', createdAt: new Date(), updatedAt: new Date() });
    const appr = db.createApproval({ id: generateId(), expenseId: exp.id, requesterId: emp.id, approverId: mgr.id, status: 'pending', createdAt: new Date() });

    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr)).send({ status: 'rejected', comment: 'Personal expense, not reimbursable' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval.comment).toBe('Personal expense, not reimbursable');

    const expRes = await request(app).get(`/expenses/${exp.id}`).set(auth(emp));
    expect(expRes.body.data.status).toBe('rejected');
  });

  it('state guard: cannot edit expense after submission', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');
    const exp = db.createExpense({ id: generateId(), userId: emp.id, amount: 5000, category: 'meals', description: 'Lunch', status: 'submitted', createdAt: new Date(), updatedAt: new Date() });

    const editRes = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp)).send({ amount: 9999 });
    expect(editRes.status).toBe(422);

    const deleteRes = await request(app).delete(`/expenses/${exp.id}`).set(auth(emp));
    expect(deleteRes.status).toBe(422);
  });

  it('double resolution guard: cannot resolve an already-resolved approval', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');
    const exp = db.createExpense({ id: generateId(), userId: emp.id, amount: 5000, category: 'meals', description: 'Test', status: 'submitted', createdAt: new Date(), updatedAt: new Date() });
    const appr = db.createApproval({ id: generateId(), expenseId: exp.id, requesterId: emp.id, approverId: mgr.id, status: 'pending', createdAt: new Date() });

    // First resolution — should succeed
    const first = await request(app).post(`/approvals/${appr.id}/resolve`).set(auth(mgr)).send({ status: 'approved' });
    expect(first.status).toBe(200);

    // Second resolution — should fail
    const second = await request(app).post(`/approvals/${appr.id}/resolve`).set(auth(mgr)).send({ status: 'rejected' });
    expect(second.status).toBe(422);
  });

  it('approved expenses appear in reports; rejected expenses do not', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');

    // Create and approve one expense
    const approvedExp = db.createExpense({ id: generateId(), userId: emp.id, amount: 8000, category: 'equipment', description: 'Keyboard', status: 'approved', createdAt: new Date(), updatedAt: new Date() });

    // Create and reject another expense
    db.createExpense({ id: generateId(), userId: emp.id, amount: 2000, category: 'meals', description: 'Personal dinner', status: 'rejected', createdAt: new Date(), updatedAt: new Date() });

    const dateFrom = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const dateTo = new Date(Date.now() + 86400000).toISOString();   // tomorrow

    const res = await request(app).post('/reports').set(auth(emp)).send({ dateFrom, dateTo });
    expect(res.status).toBe(201);
    expect(res.body.data.expenseCount).toBe(1);
    expect(res.body.data.expenses[0].id).toBe(approvedExp.id);
    expect(res.body.data.totalAmount).toBe(8000);
  });
});
