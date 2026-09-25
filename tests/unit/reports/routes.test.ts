import request from 'supertest';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';
import { ExpenseCategory, ExpenseStatus, Report } from '../../../src/types';

const app = createApp();

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee') =>
  db.createUser({ id: generateId(), email: `${role}-${generateId()}@test.com`, passwordHash: 'x', name: 'T', role, createdAt: new Date() });

const auth = (user: ReturnType<typeof makeUser>) => {
  const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return { Authorization: `Bearer ${accessToken}` };
};

const makeExpense = (
  userId: string,
  overrides: Partial<{ status: ExpenseStatus; category: ExpenseCategory; amount: number }> = {},
) =>
  db.createExpense({
    id: generateId(), userId, amount: overrides.amount ?? 5000,
    category: overrides.category ?? 'travel', description: 'Test expense',
    status: overrides.status ?? 'approved', createdAt: new Date(), updatedAt: new Date(),
  });

const makeReport = (userId: string): Report => {
  const now = new Date();
  return db.createReport({
    id: generateId(), userId, dateFrom: now, dateTo: now, generatedAt: now,
    format: 'json', expenses: [], totalAmount: 0, expenseCount: 0,
  });
};

const range = () => ({
  dateFrom: new Date(Date.now() - 86_400_000).toISOString(),
  dateTo: new Date(Date.now() + 86_400_000).toISOString(),
});

beforeEach(() => { db.reset(); });

describe('GET /reports', () => {
  it('returns 200 with an empty array when no reports exist', async () => {
    const emp = makeUser();
    const res = await request(app).get('/reports').set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns only reports belonging to the authenticated user', async () => {
    const emp = makeUser();
    const mgr = makeUser('manager');
    makeReport(emp.id);
    makeReport(mgr.id);
    const res = await request(app).get('/reports').set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/reports');
    expect(res.status).toBe(401);
  });
});

describe('GET /reports/:id', () => {
  it('returns 200 for own report', async () => {
    const emp = makeUser();
    const report = makeReport(emp.id);
    const res = await request(app).get(`/reports/${report.id}`).set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(report.id);
  });

  it('returns 404 for an unknown report', async () => {
    const emp = makeUser();
    const res = await request(app).get(`/reports/${generateId()}`).set(auth(emp));
    expect(res.status).toBe(404);
  });

  it('returns 403 for another employee\'s report', async () => {
    const emp1 = makeUser();
    const emp2 = makeUser();
    const report = makeReport(emp2.id);
    const res = await request(app).get(`/reports/${report.id}`).set(auth(emp1));
    expect(res.status).toBe(403);
  });

  it('allows a manager to view another user\'s report', async () => {
    const emp = makeUser();
    const mgr = makeUser('manager');
    const report = makeReport(emp.id);
    const res = await request(app).get(`/reports/${report.id}`).set(auth(mgr));
    expect(res.status).toBe(200);
  });
});

describe('POST /reports', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/reports').send(range());
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid dateFrom', async () => {
    const emp = makeUser();
    const res = await request(app)
      .post('/reports')
      .set(auth(emp))
      .send({ dateFrom: 'not-a-date', dateTo: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid dateTo', async () => {
    const emp = makeUser();
    const res = await request(app)
      .post('/reports')
      .set(auth(emp))
      .send({ dateFrom: new Date().toISOString(), dateTo: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when dateFrom is after dateTo', async () => {
    const emp = makeUser();
    const res = await request(app).post('/reports').set(auth(emp)).send({
      dateFrom: new Date(Date.now() + 86_400_000).toISOString(),
      dateTo: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when categories is not an array', async () => {
    const emp = makeUser();
    const res = await request(app).post('/reports').set(auth(emp)).send({
      ...range(), categories: 'travel',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid category filter', async () => {
    const emp = makeUser();
    const res = await request(app).post('/reports').set(auth(emp)).send({
      ...range(), categories: ['not-a-category'],
    });
    expect(res.status).toBe(400);
  });

  it('includes only approved and paid expenses', async () => {
    const emp = makeUser();
    makeExpense(emp.id, { status: 'approved', amount: 5000 });
    makeExpense(emp.id, { status: 'paid', amount: 2500 });
    makeExpense(emp.id, { status: 'rejected', amount: 9999 });
    makeExpense(emp.id, { status: 'draft', amount: 9999 });

    const res = await request(app).post('/reports').set(auth(emp)).send(range());
    expect(res.status).toBe(201);
    expect(res.body.data.expenseCount).toBe(2);
    expect(res.body.data.totalAmount).toBe(7500);
  });

  it('scopes the report to the employee\'s own expenses', async () => {
    const emp = makeUser();
    const mgr = makeUser('manager');
    makeExpense(emp.id, { amount: 5000 });
    makeExpense(mgr.id, { amount: 9999 });

    const res = await request(app).post('/reports').set(auth(emp)).send(range());
    expect(res.status).toBe(201);
    expect(res.body.data.expenseCount).toBe(1);
    expect(res.body.data.totalAmount).toBe(5000);
  });

  it('lets a manager include expenses across users', async () => {
    const emp = makeUser();
    const mgr = makeUser('manager');
    makeExpense(emp.id, { amount: 5000 });
    makeExpense(mgr.id, { amount: 2500 });

    const res = await request(app).post('/reports').set(auth(mgr)).send(range());
    expect(res.status).toBe(201);
    expect(res.body.data.expenseCount).toBe(2);
    expect(res.body.data.totalAmount).toBe(7500);
  });

  it('applies the category filter', async () => {
    const emp = makeUser();
    makeExpense(emp.id, { category: 'travel', amount: 5000 });
    makeExpense(emp.id, { category: 'meals', amount: 2500 });

    const res = await request(app).post('/reports').set(auth(emp)).send({
      ...range(), categories: ['meals'],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.expenseCount).toBe(1);
    expect(res.body.data.totalAmount).toBe(2500);
  });

  it('returns a summary with the JSON response', async () => {
    const emp = makeUser();
    makeExpense(emp.id, { amount: 5000 });

    const res = await request(app).post('/reports').set(auth(emp)).send(range());
    expect(res.status).toBe(201);
    expect(res.body.data.summary.expenseCount).toBe(1);
    expect(res.body.data.summary.totalFormatted).toBe('$50.00');
    expect(typeof res.body.data.summary.dateRange).toBe('string');
  });

  it('returns a CSV attachment when format is csv', async () => {
    const emp = makeUser();
    makeExpense(emp.id, { amount: 5000 });

    const res = await request(app).post('/reports').set(auth(emp)).send({
      ...range(), format: 'csv',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('id,date,category,description,amount,status');
    expect(res.text).toContain('$50.00');
  });
});
