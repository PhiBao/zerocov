import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, generateAuthTokens } from '../../../src/auth/tokens';

const SECRET = process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production';

describe('auth/tokens', () => {
  describe('signAccessToken + verifyAccessToken', () => {
    it('signs and verifies a valid payload', () => {
      const payload = { userId: 'u1', email: 'a@test.com', role: 'employee' as const };
      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('u1');
      expect(decoded.email).toBe('a@test.com');
      expect(decoded.role).toBe('employee');
    });

    it('throws on invalid signature', () => {
      const token = jwt.sign({ userId: 'u1' }, 'wrong-secret');
      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('throws on expired access token', () => {
      const token = jwt.sign({ userId: 'u1', email: 'a@test.com', role: 'employee' }, SECRET, { expiresIn: -1 });
      expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('signRefreshToken + verifyRefreshToken', () => {
    it('signs and verifies a refresh token', () => {
      const payload = { userId: 'u2', email: 'b@test.com', role: 'manager' as const };
      const token = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe('u2');
    });

    it('refresh token cannot be verified as access token', () => {
      const payload = { userId: 'u2', email: 'b@test.com', role: 'manager' as const };
      const refreshToken = signRefreshToken(payload);
      // Access token verifier uses different secret — should throw
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('generateAuthTokens', () => {
    it('returns accessToken, refreshToken, and expiresIn', () => {
      const result = generateAuthTokens({ userId: 'u3', email: 'c@test.com', role: 'admin' });
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('access token contains the correct payload', () => {
      const result = generateAuthTokens({ userId: 'u3', email: 'c@test.com', role: 'admin' });
      const decoded = verifyAccessToken(result.accessToken);
      expect(decoded.userId).toBe('u3');
      expect(decoded.role).toBe('admin');
    });
  });
});
