import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens, verifyRefreshToken } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

beforeEach(() => { db.reset(); });

const VALID_PASSWORD = 'password123';
const VALID_EMAIL = 'alice@example.com';

const seedUser = async (role: 'employee' | 'manager' | 'admin' = 'employee') => {
  const hash = await bcrypt.hash(VALID_PASSWORD, 10);
  return db.createUser({ id: generateId(), email: VALID_EMAIL, passwordHash: hash, name: 'Alice', role, createdAt: new Date() });
};

describe('POST /auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'new@example.com', password: 'strongpass', name: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(typeof res.body.data.tokens.accessToken).toBe('string');
  });

  it('defaults role to employee', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'emp@example.com', password: 'strongpass', name: 'Emp',
    });
    expect(res.body.data.user.role).toBe('employee');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email', password: 'strongpass', name: 'X',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password shorter than 8 chars', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'v@v.com', password: 'short', name: 'X',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'v@v.com', password: 'strongpass',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await seedUser();
    const res = await request(app).post('/auth/register').send({
      email: VALID_EMAIL, password: 'strongpass', name: 'Dup',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => seedUser());

  it('returns 200 and tokens for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: VALID_EMAIL, password: VALID_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email: VALID_EMAIL, password: 'wrongpass' });
    expect(res.status).toBe(401);
    // Same response as unknown email — no user enumeration
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for unknown email (same message as wrong password)', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'unknown@x.com', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: VALID_EMAIL });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('returns a new access token for a valid refresh token', async () => {
    const user = await seedUser();
    const { refreshToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
    const res = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('returns 400 for missing refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'not-a-token' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns the current user profile', async () => {
    const user = await seedUser();
    const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(VALID_EMAIL);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('returns 200 for authenticated user', async () => {
    const user = await seedUser();
    const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
    const res = await request(app).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});
