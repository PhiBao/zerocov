import request from 'supertest';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee') =>
  db.createUser({ id: generateId(), email: `${role}-${generateId()}@t.com`, passwordHash: 'x', name: 'T', role, createdAt: new Date() });

const auth = (user: ReturnType<typeof makeUser>) => {
  const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return { Authorization: `Bearer ${accessToken}` };
};

const makeExpense = (userId: string) =>
  db.createExpense({ id: generateId(), userId, amount: 3000, category: 'meals', description: 'Lunch', status: 'submitted', createdAt: new Date(), updatedAt: new Date() });

const makeApproval = (expenseId: string, requesterId: string, approverId: string) =>
  db.createApproval({ id: generateId(), expenseId, requesterId, approverId, status: 'pending', createdAt: new Date() });

beforeEach(() => { db.reset(); });

describe('GET /approvals', () => {
  it('returns 200 with approvals for manager', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).get('/approvals').set(auth(mgr));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 403 for employee', async () => {
    const emp = makeUser('employee');
    const res = await request(app).get('/approvals').set(auth(emp));
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/approvals');
    expect(res.status).toBe(401);
  });
});

describe('GET /approvals/pending', () => {
  it('returns only pending approvals', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp1 = makeExpense(emp.id);
    const exp2 = makeExpense(emp.id);
    makeApproval(exp1.id, emp.id, mgr.id); // pending
    const resolved = makeApproval(exp2.id, emp.id, mgr.id);
    db.updateApproval(resolved.id, { status: 'approved', resolvedAt: new Date() });
    const res = await request(app).get('/approvals/pending').set(auth(mgr));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('pending');
  });
});

describe('GET /approvals/:id', () => {
  it('returns 200 for the assigned approver', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).get(`/approvals/${appr.id}`).set(auth(mgr));
    expect(res.status).toBe(200);
  });

  it('returns 200 for the requester', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).get(`/approvals/${appr.id}`).set(auth(emp));
    expect(res.status).toBe(200);
  });

  it('returns 403 for an unrelated user', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const other = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).get(`/approvals/${appr.id}`).set(auth(other));
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent approval', async () => {
    const mgr = makeUser('manager');
    const res = await request(app).get(`/approvals/${generateId()}`).set(auth(mgr));
    expect(res.status).toBe(404);
  });
});

describe('POST /approvals/:id/resolve', () => {
  it('approves an expense successfully', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr)).send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.approval.status).toBe('approved');
    expect(res.body.data.expense.status).toBe('approved');
  });

  it('rejects an expense with a comment', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr)).send({ status: 'rejected', comment: 'Missing receipt' });
    expect(res.status).toBe(200);
    expect(res.body.data.approval.comment).toBe('Missing receipt');
    expect(res.body.data.expense.status).toBe('rejected');
  });

  it('returns 422 when already resolved', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    db.updateApproval(appr.id, { status: 'approved', resolvedAt: new Date() });
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr)).send({ status: 'approved' });
    expect(res.status).toBe(422);
  });

  it('returns 403 when wrong approver tries to resolve', async () => {
    const mgr1 = makeUser('manager');
    const mgr2 = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr1.id);
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr2)).send({ status: 'approved' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid status value', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(mgr)).send({ status: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/approvals/${generateId()}/resolve`).send({ status: 'approved' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for employee trying to resolve', async () => {
    const mgr = makeUser('manager');
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const appr = makeApproval(exp.id, emp.id, mgr.id);
    const res = await request(app).post(`/approvals/${appr.id}/resolve`)
      .set(auth(emp)).send({ status: 'approved' });
    expect(res.status).toBe(403);
  });
});
