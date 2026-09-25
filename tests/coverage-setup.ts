/**
 * coverage-setup.ts — Force-imports all source modules so jest --coverage
 * reports 0% for untested files rather than omitting them entirely.
 * Gives the accurate baseline showing auth/expenses/approvals/reports at 0%.
 */
import '../src/utils/helpers';
import '../src/auth/tokens';
import '../src/auth/middleware';
import '../src/auth/routes';
import '../src/expenses/routes';
import '../src/approvals/routes';
import '../src/reports/routes';
import '../src/notifications/service';
import '../src/db';
