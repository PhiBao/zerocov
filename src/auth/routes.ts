import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateAuthTokens, verifyRefreshToken, signAccessToken } from './tokens';
import { authenticate } from './middleware';
import { sendSuccess, sendError, isValidEmail, isNonEmptyString, generateId } from '../utils/helpers';
import { LoginDTO, RegisterDTO } from '../types';

export const authRouter: Router = Router();

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, role = 'employee' }: RegisterDTO = req.body;

  if (!isValidEmail(email)) {
    return sendError(res, 'Invalid email address');
  }
  if (!isNonEmptyString(password) || password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters');
  }
  if (!isNonEmptyString(name)) {
    return sendError(res, 'Name is required');
  }

  if (db.findUserByEmail(email)) {
    return sendError(res, 'Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser({ id: generateId(), email, passwordHash, name, role, createdAt: new Date() });

  const tokens = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return sendSuccess(res, { user: { id: user.id, email: user.email, name: user.name, role: user.role }, tokens }, 201);
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password }: LoginDTO = req.body;

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    return sendError(res, 'Email and password are required');
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return sendError(res, 'Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return sendError(res, 'Invalid credentials', 401);
  }

  const tokens = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return sendSuccess(res, {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tokens,
  });
});

// POST /auth/refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return sendError(res, 'Refresh token required');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = db.findUserById(payload.userId);
    if (!user) {
      return sendError(res, 'User not found', 401);
    }
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    return sendSuccess(res, { accessToken });
  } catch {
    return sendError(res, 'Invalid or expired refresh token', 401);
  }
});

// POST /auth/logout
authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  // In production this would invalidate the token in a denylist
  return sendSuccess(res, { message: 'Logged out successfully' });
});

// GET /auth/me
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const user = db.findUserById(req.user!.userId);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  return sendSuccess(res, { id: user.id, email: user.email, name: user.name, role: user.role });
});
