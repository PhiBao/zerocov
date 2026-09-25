// Jest global test setup
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';
