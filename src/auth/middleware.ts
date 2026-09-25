import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './tokens';
import { TokenPayload, UserRole } from '../types';

// Extend Express Request to include authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * authenticate — verifies the Bearer token in the Authorization header.
 *
 * Every verification failure — missing header, malformed header, invalid
 * signature, malformed token, expired token — responds with 401, as required
 * by openapi.yaml and docs/auth-security-requirements.md (EXP-TOKEN-401).
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * requireRole — authorization middleware that checks the user's role.
 * Must be used after `authenticate`.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
