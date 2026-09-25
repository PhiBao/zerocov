import request from 'supertest';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee', email?: string) =>
  db.createUser({ id: generateId(), email: email ?? `${role}-${generateId()}@test.com`, passwordHash: 'x', name: 'T', role, createdAt: new Date() });

const auth = (user: ReturnType<typeof makeUser>) => {
  const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return { Authorization: `Bearer ${accessToken}` };
};

const makeExpense = (userId: string, overrides: Partial<{ status: string; amount: number }> = {}) =>
  db.createExpense({
    id: generateId(), userId, amount: overrides.amount ?? 5000, category: 'travel',
    description: 'Test expense', status: (overrides.status ?? 'draft') as any,
    createdAt: new Date(), updatedAt: new Date(),
  });

beforeEach(() => { db.reset(); });

describe('GET /expenses', () => {
  it('returns 200 with empty array when no expenses', async () => {
    const emp = makeUser('employee');
    const res = await request(app).get('/expenses').set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns only the authenticated user\'s expenses', async () => {
    const emp1 = makeUser('employee');
    const emp2 = makeUser('employee');
    makeExpense(emp1.id);
    makeExpense(emp2.id);
    const res = await request(app).get('/expenses').set(auth(emp1));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(401);
  });
});

describe('GET /expenses/:id', () => {
  it('returns 200 for own expense', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app).get(`/expenses/${exp.id}`).set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(exp.id);
  });

  it('returns 403 for another user\'s expense as employee', async () => {
    const emp1 = makeUser('employee');
    const emp2 = makeUser('employee');
    const exp = makeExpense(emp2.id);
    const res = await request(app).get(`/expenses/${exp.id}`).set(auth(emp1));
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent expense', async () => {
    const emp = makeUser();
    const res = await request(app).get(`/expenses/${generateId()}`).set(auth(emp));
    expect(res.status).toBe(404);
  });
});

describe('POST /expenses', () => {
  it('creates a draft expense with valid data', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 10000, category: 'travel', description: 'Flight to conference',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.amount).toBe(10000);
  });

  it('returns 400 for amount <= 0', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 0, category: 'travel', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: -100, category: 'travel', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-integer amount', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 10.5, category: 'travel', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an amount above the business limit', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 1_000_001, category: 'travel', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-finite amount (raw JSON 1e999)', async () => {
    const emp = makeUser();
    const res = await request(app)
      .post('/expenses')
      .set(auth(emp))
      .set('Content-Type', 'application/json')
      .send('{"amount":1e999,"category":"travel","description":"Test"}');
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 1000, category: 'invalid-cat', description: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing description', async () => {
    const emp = makeUser();
    const res = await request(app).post('/expenses').set(auth(emp)).send({
      amount: 1000, category: 'travel',
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/expenses').send({ amount: 1000, category: 'travel', description: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /expenses/:id', () => {
  it('updates a draft expense', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp)).send({ amount: 9000 });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(9000);
  });

  it('returns 400 for amount <= 0', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp)).send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-integer amount', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp)).send({ amount: 10.5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-finite amount (raw JSON 1e999)', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app)
      .patch(`/expenses/${exp.id}`)
      .set(auth(emp))
      .set('Content-Type', 'application/json')
      .send('{"amount":1e999}');
    expect(res.status).toBe(400);
  });

  it('returns 422 for non-draft expense', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id, { status: 'submitted' });
    const res = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp)).send({ amount: 9000 });
    expect(res.status).toBe(422);
  });

  it('returns 403 for another user\'s expense', async () => {
    const emp1 = makeUser();
    const emp2 = makeUser();
    const exp = makeExpense(emp2.id);
    const res = await request(app).patch(`/expenses/${exp.id}`).set(auth(emp1)).send({ description: 'x' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent expense', async () => {
    const emp = makeUser();
    const res = await request(app).patch(`/expenses/${generateId()}`).set(auth(emp)).send({ amount: 1000 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /expenses/:id', () => {
  it('deletes a draft expense', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id);
    const res = await request(app).delete(`/expenses/${exp.id}`).set(auth(emp));
    expect(res.status).toBe(200);
    expect(db.findExpenseById(exp.id)).toBeUndefined();
  });

  it('returns 422 for a submitted expense', async () => {
    const emp = makeUser();
    const exp = makeExpense(emp.id, { status: 'submitted' });
    const res = await request(app).delete(`/expenses/${exp.id}`).set(auth(emp));
    expect(res.status).toBe(422);
  });
});

describe('POST /expenses/:id/submit', () => {
  it('submits to a valid manager and creates approval', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');
    const exp = makeExpense(emp.id);
    const res = await request(app).post(`/expenses/${exp.id}/submit`).set(auth(emp)).send({ approverId: mgr.id });
    expect(res.status).toBe(201);
    expect(res.body.data.expense.status).toBe('submitted');
    expect(res.body.data.approval.status).toBe('pending');
  });

  it('returns 404 for non-existent approver', async () => {
    const emp = makeUser('employee');
    const exp = makeExpense(emp.id);
    const res = await request(app).post(`/expenses/${exp.id}/submit`).set(auth(emp)).send({ approverId: generateId() });
    expect(res.status).toBe(404);
  });

  it('returns 422 when approver has employee role', async () => {
    const emp1 = makeUser('employee');
    const emp2 = makeUser('employee');
    const exp = makeExpense(emp1.id);
    const res = await request(app).post(`/expenses/${exp.id}/submit`).set(auth(emp1)).send({ approverId: emp2.id });
    expect(res.status).toBe(422);
  });

  it('returns 422 when re-submitting an already-submitted expense', async () => {
    const emp = makeUser('employee');
    const mgr = makeUser('manager');
    const exp = makeExpense(emp.id, { status: 'submitted' });
    const res = await request(app).post(`/expenses/${exp.id}/submit`).set(auth(emp)).send({ approverId: mgr.id });
    expect(res.status).toBe(422);
  });
});
