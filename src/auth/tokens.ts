import jwt from 'jsonwebtoken';
import { TokenPayload, AuthTokens } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export function generateAuthTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): AuthTokens {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  // expiresIn in seconds — parse from env or default 15 minutes
  const expiresIn = JWT_EXPIRES_IN.endsWith('m')
    ? parseInt(JWT_EXPIRES_IN) * 60
    : parseInt(JWT_EXPIRES_IN);
  return { accessToken, refreshToken, expiresIn };
}
