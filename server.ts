/**
 * Vercel entrypoint (framework: node).
 *
 * Serves the ZeroCov demo console at `/`, exposes the real Express API under
 * `/api/*` (prefix stripped), and adds two demo-only endpoints:
 *   POST /api/demo/flow           — runs the full workflow against the real app
 *   GET  /api/demo/expired-token  — mints an expired JWT for the 401 check
 *
 * Everything else is handled by the same `createApp()` used by the test suite.
 * The demo flow invokes the Express app in-process (no localhost networking),
 * which works inside serverless runtimes.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import express, { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from './src/app';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const apiApp = createApp();
const root: Express = express();
root.disable('x-powered-by');

const PORT = Number(process.env.PORT ?? 3000);

type Captured = { status: number; ms: number; body: unknown };

/** Run a request through the Express app without touching the network. */
function invoke(method: string, url: string, body?: unknown, token?: string): Promise<Captured> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req: Request = Readable.from(payload ? [Buffer.from(payload)] : []) as unknown as Request;
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload)),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
    (req as unknown as { get: (n: string) => string | undefined }).get = (name: string) => req.headers[name.toLowerCase()] as string | undefined;

    let settled = false;
    const finish = (status: number, text: string): void => {
      if (settled) return;
      settled = true;
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep raw text */
      }
      resolve({ status, ms: Date.now() - started, body: parsed });
    };

    const res = {
      statusCode: 200,
      locals: {},
      app: apiApp,
      req,
      setHeader(): void { /* headers are not inspected by the flow */ },
      getHeader(): undefined { return undefined; },
      removeHeader(): void { /* noop */ },
      status(code: number) { this.statusCode = code; return this; },
      json(obj: unknown) { finish(this.statusCode, JSON.stringify(obj)); return this; },
      send(text: unknown) { finish(this.statusCode, typeof text === 'string' ? text : JSON.stringify(text)); return this; },
      end(text?: unknown) { finish(this.statusCode, text === undefined ? '' : String(text)); return this; },
    };

    try {
      apiApp(req, res as unknown as Response);
    } catch (err) {
      reject(err);
    }
  });
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = typeof v === 'string' && /token/i.test(k) ? `${v.slice(0, 24)}…` : redact(v);
    }
    return out;
  }
  return value;
}

type Step = {
  step: string; method: string; path: string;
  status: number; ms: number; expect: number; pass: boolean; body: unknown;
};

function record(steps: Step[], label: string, method: string, path: string, expect: number, result: Captured): void {
  steps.push({
    step: label, method, path,
    status: result.status, ms: result.ms, expect,
    pass: result.status === expect, body: redact(result.body),
  });
}

async function runDemoFlow() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const password = 'demo-password-123';
  const steps: Step[] = [];

  const employeeReg = await invoke('POST', '/auth/register', {
    email: `demo-employee-${stamp}@zerocov.dev`, password, name: 'Demo Employee', role: 'employee',
  });
  record(steps, 'Register employee', 'POST', '/auth/register', 201, employeeReg);
  const employeeToken = (employeeReg.body as { data?: { tokens?: { accessToken?: string } } })?.data?.tokens?.accessToken as string;

  const managerReg = await invoke('POST', '/auth/register', {
    email: `demo-manager-${stamp}@zerocov.dev`, password, name: 'Demo Manager', role: 'manager',
  });
  record(steps, 'Register manager', 'POST', '/auth/register', 201, managerReg);
  const managerId = (managerReg.body as { data?: { user?: { id?: string } } })?.data?.user?.id as string;
  const managerToken = (managerReg.body as { data?: { tokens?: { accessToken?: string } } })?.data?.tokens?.accessToken as string;

  const created = await invoke('POST', '/expenses', {
    amount: 25000, category: 'travel', description: 'Flight to IBM Summit',
  }, employeeToken);
  record(steps, 'Employee creates a draft expense', 'POST', '/expenses', 201, created);
  const expenseId = (created.body as { data?: { id?: string } })?.data?.id as string;

  const submitted = await invoke('POST', `/expenses/${expenseId}/submit`, { approverId: managerId }, employeeToken);
  record(steps, 'Employee submits it to the manager', 'POST', '/expenses/:id/submit', 201, submitted);
  const approvalId = (submitted.body as { data?: { approval?: { id?: string } } })?.data?.approval?.id as string;

  const guarded = await invoke('PATCH', `/expenses/${expenseId}`, { amount: 999 }, employeeToken);
  record(steps, 'State guard: editing a submitted expense is rejected', 'PATCH', '/expenses/:id', 422, guarded);

  const resolved = await invoke('POST', `/approvals/${approvalId}/resolve`, { status: 'approved' }, managerToken);
  record(steps, 'Manager approves the request', 'POST', '/approvals/:id/resolve', 200, resolved);

  const reread = await invoke('GET', `/expenses/${expenseId}`, undefined, employeeToken);
  record(steps, 'Expense is now approved', 'GET', '/expenses/:id', 200, reread);

  const expired = jwt.sign({ userId: 'demo', email: 'demo@zerocov.dev', role: 'employee' }, JWT_SECRET, { expiresIn: -1 });
  const expiredCheck = await invoke('GET', '/auth/me', undefined, expired);
  record(steps, 'Spec check: expired token returns 401, never 500', 'GET', '/auth/me', 401, expiredCheck);

  const report = await invoke('POST', '/reports', {
    dateFrom: new Date(Date.now() - 86_400_000).toISOString(),
    dateTo: new Date(Date.now() + 86_400_000).toISOString(),
  }, employeeToken);
  record(steps, 'Report includes only approved expenses', 'POST', '/reports', 201, report);

  const passed = steps.filter((s) => s.pass).length;
  return {
    ok: passed === steps.length,
    summary: `${passed}/${steps.length} steps matched the documented status codes`,
    flow: 'register → create → submit → guard → approve → read → expired-token 401 → report',
    steps,
  };
}

function sendJson(res: Response, status: number, body: unknown): void {
  res.status(status).set('cache-control', 'no-store').json(body);
}

function landingHtml(): string {
  const candidates = [
    join(process.cwd(), 'public', 'index.html'),
    join(__dirname, 'public', 'index.html'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  return '<!doctype html><meta charset="utf-8"><title>ZeroCov</title><body style="font-family:sans-serif;background:#080b12;color:#e9eef9;padding:40px"><h1>ZeroCov</h1><p>Demo console asset not found. See <a style="color:#9fc2ff" href="https://github.com/PhiBao/zerocov">github.com/PhiBao/zerocov</a>.</p></body>';
}

root.get('/', (_req: Request, res: Response) => {
  res.type('html').set('cache-control', 'no-store').send(landingHtml());
});

root.get('/api', (_req: Request, res: Response) => {
  sendJson(res, 200, {
    ok: true,
    service: 'ExpenseFlow API — ZeroCov live demo',
    demoConsole: '/',
    apiContract: '/openapi.yaml',
    routes: ['/api/health', '/api/auth/*', '/api/expenses/*', '/api/approvals/*', '/api/reports/*', '/api/demo/flow', '/api/demo/expired-token'],
  });
});

root.get('/api/demo/expired-token', (_req: Request, res: Response) => {
  const token = jwt.sign({ userId: 'demo', email: 'demo@zerocov.dev', role: 'employee' }, JWT_SECRET, { expiresIn: -1 });
  sendJson(res, 200, {
    token,
    note: 'Minted with expiresIn: -1. Call GET /api/auth/me with it — expect 401 (EXP-TOKEN-401).',
  });
});

root.post('/api/demo/flow', async (_req: Request, res: Response) => {
  try {
    sendJson(res, 200, await runDemoFlow());
  } catch (err) {
    sendJson(res, 500, { ok: false, error: (err as Error).message });
  }
});

// Strip the /api prefix, then hand off to the real Express app.
root.use((req: Request, _res: Response, next) => {
  if (req.url.startsWith('/api')) req.url = req.url.slice(4) || '/';
  next();
});
root.use(apiApp);

root.listen(PORT, () => {
  console.log(`ExpenseFlow API + ZeroCov demo console listening on ${PORT}`);
});

export default root;
