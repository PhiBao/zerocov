import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee', suffix = '') =>
  db.createUser({
    id: generateId(),
    email: `${role}${suffix}@test.com`,
    passwordHash: '$2b$10$test', // not a real hash — not used for auth in middleware tests
    name: `Test ${role}`,
    role,
    createdAt: new Date(),
  });

const bearerHeader = (userId: string, email: string, role: 'employee' | 'manager' | 'admin') => {
  const { accessToken } = generateAuthTokens({ userId, email, role });
  return `Bearer ${accessToken}`;
};

beforeEach(() => { db.reset(); });

describe('auth/middleware — authenticate()', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when Authorization scheme is not Bearer', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Basic sometoken');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a completely invalid token string', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer not-a-jwt-at-all');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token with a tampered signature', async () => {
    // Build a token signed with the wrong secret — signature will be invalid
    const tamperedToken = jwt.sign(
      { userId: 'x', email: 'x@x.com', role: 'employee' },
      'definitely-the-wrong-secret',
    );
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  /**
   * Validates EXP-TOKEN-401 from docs/auth-security-requirements.md:
   * expired tokens MUST return 401, never 500.
   */
  it('returns 401 (not 500) for an expired access token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'test-id', email: 'exp@test.com', role: 'employee' },
      process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production',
      { expiresIn: -1 },
    );
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    // Per EXP-TOKEN-401: expired tokens MUST return 401, not 500
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('passes through a valid token and sets req.user', async () => {
    const user = makeUser();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', bearerHeader(user.id, user.email, user.role));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });
});

describe('auth/middleware — requireRole()', () => {
  it('returns 403 when employee accesses manager-only route', async () => {
    const emp = makeUser('employee');
    const res = await request(app)
      .get('/approvals')
      .set('Authorization', bearerHeader(emp.id, emp.email, emp.role));
    expect(res.status).toBe(403);
  });

  it('allows manager to access manager-only route', async () => {
    const mgr = makeUser('manager');
    const res = await request(app)
      .get('/approvals')
      .set('Authorization', bearerHeader(mgr.id, mgr.email, mgr.role));
    expect(res.status).toBe(200);
  });

  it('allows admin to access manager-only route', async () => {
    const adm = makeUser('admin');
    const res = await request(app)
      .get('/approvals')
      .set('Authorization', bearerHeader(adm.id, adm.email, adm.role));
    expect(res.status).toBe(200);
  });
});
