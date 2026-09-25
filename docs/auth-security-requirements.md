# Auth Security Requirements

## Overview

This document defines the security requirements for all authentication endpoints in the ExpenseFlow API. These requirements MUST be validated by tests.

## JWT Configuration

- **Access tokens**: Short-lived (15 minutes default)
- **Refresh tokens**: Long-lived (7 days default)
- **Algorithm**: HS256 (HMAC SHA-256)
- **Secret**: Must be provided via environment variable `JWT_SECRET` — never hardcoded

## Required HTTP Status Codes

This is the authoritative mapping. Tests MUST verify these exact status codes.

| Scenario | Endpoint | Required Status Code |
|---|---|---|
| Missing Authorization header | Any authenticated route | **401** |
| Malformed Authorization header | Any authenticated route | **401** |
| Invalid JWT signature | Any authenticated route | **401** |
| **Expired JWT token** | **Any authenticated route** | **401** |
| Valid token, insufficient role | Any role-restricted route | **403** |
| Valid credentials | POST /auth/login | **200** |
| Invalid credentials (wrong password) | POST /auth/login | **401** |
| Unknown email | POST /auth/login | **401** |
| Duplicate email on register | POST /auth/register | **409** |
| Invalid email format | POST /auth/register | **400** |
| Password too short (< 8 chars) | POST /auth/register | **400** |
| Missing name | POST /auth/register | **400** |
| Invalid refresh token | POST /auth/refresh | **401** |
| Expired refresh token | POST /auth/refresh | **401** |

## Critical Security Requirements

### EXP-TOKEN-401
**Expired tokens MUST return 401, not 500.**
When a client sends an expired JWT access token, the server must return HTTP 401 with a clear error message. Returning 500 is a security misconfiguration that:
- Reveals internal error details to attackers
- Prevents clients from correctly handling token expiry
- Breaks the standard OAuth 2.0 bearer token error response model

This requirement exists because `jsonwebtoken`'s `verify()` throws `TokenExpiredError` (a subclass of `JsonWebTokenError`). Catch blocks must explicitly handle this case.

### NO-INFO-LEAK
Login failures must return the same response ("Invalid credentials") whether the email doesn't exist or the password is wrong. This prevents user enumeration.

### REFRESH-ROTATE
Refresh tokens should be single-use in production. In the current implementation, refresh tokens are stateless (not invalidated server-side) — this is acceptable for the demo but must be noted.

### BEARER-ONLY
Authentication is Bearer token only. Cookie-based auth is not supported.

## Test Scenarios (Minimum Required)

### Authentication middleware tests
1. Request with no Authorization header → 401
2. Request with `Authorization: Basic xxx` (wrong scheme) → 401  
3. Request with `Authorization: Bearer <invalid_token>` → 401
4. Request with `Authorization: Bearer <expired_token>` → **401** (not 500)
5. Request with `Authorization: Bearer <valid_token>` → passes through (200 or route-specific)

### Login tests
6. Valid credentials → 200 with `{ success: true, data: { user, tokens } }`
7. Wrong password → 401
8. Unknown email → 401 (same response as wrong password — no enumeration)

### Register tests
9. New valid user → 201
10. Duplicate email → 409
11. Invalid email → 400
12. Short password → 400

### Refresh tests
13. Valid refresh token → 200 with new access token
14. Invalid/tampered refresh token → 401
