/**
 * BASELINE TESTS — These are the only tests that exist before the ZeroCov
 * workflow runs. They cover a small portion of utils/helpers.ts only,
 * giving approximately 22.8% statement coverage overall.
 *
 * The rest of the codebase (auth, expenses, approvals, reports) has 0% coverage.
 */
import {
  isValidEmail,
  isNonEmptyString,
  formatAmount,
  formatDateRange,
  sanitizeString,
  generateId,
} from '../../../src/utils/helpers';

describe('utils/helpers — baseline tests', () => {
  describe('isValidEmail', () => {
    it('accepts a valid email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('rejects missing @ symbol', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for a non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isNonEmptyString(42)).toBe(false);
    });
  });

  describe('formatAmount', () => {
    it('formats 1000 cents as $10.00', () => {
      expect(formatAmount(1000)).toBe('$10.00');
    });

    it('formats 0 cents as $0.00', () => {
      expect(formatAmount(0)).toBe('$0.00');
    });
  });

  describe('formatDateRange', () => {
    it('formats a date range correctly', () => {
      const from = new Date('2024-01-01T00:00:00Z');
      const to = new Date('2024-01-31T00:00:00Z');
      expect(formatDateRange(from, to)).toBe('2024-01-01 to 2024-01-31');
    });
  });

  describe('sanitizeString', () => {
    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('removes HTML angle brackets', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });
  });

  describe('generateId', () => {
    it('generates a non-empty string', () => {
      expect(typeof generateId()).toBe('string');
      expect(generateId().length).toBeGreaterThan(0);
    });

    it('generates unique IDs', () => {
      expect(generateId()).not.toBe(generateId());
    });
  });
});
