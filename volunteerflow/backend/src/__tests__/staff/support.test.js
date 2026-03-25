'use strict';
const request = require('supertest');
const express = require('express');
process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const jwt = require('jsonwebtoken');

function buildSupportApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/support', require('../../staff/support')(pool));
  return app;
}

function makeToken(permissions = ['support.view_mode', 'support.impersonation', 'audit.view_all']) {
  return jwt.sign(
    { staffId: 'u1', email: 'test@test.com', name: 'Test User', roleId: 'role_admin', permissions, sessionId: 'ss_abc' },
    process.env.STAFF_JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Sets up a pool mock that satisfies requireStaffAuth (3 calls),
// then returns further results for route-specific queries.
function activeSessionPool(extraQueryResults = []) {
  const pool = { query: jest.fn() };
  pool.query
    .mockResolvedValueOnce({ rows: [] })                          // stale UPDATE (staff_sessions)
    .mockResolvedValueOnce({ rows: [{ is_active: true }] })       // session SELECT
    .mockResolvedValueOnce({ rows: [] });                         // last_seen UPDATE (non-blocking)
  extraQueryResults.forEach(r => pool.query.mockResolvedValueOnce(r));
  return pool;
}

// ─── POST /enter ──────────────────────────────────────────────────────────────

describe('POST /api/staff/support/enter', () => {
  test('rejects without reason → 400', async () => {
    const pool = activeSessionPool();
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/enter')
      .send({ orgId: 'org1' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason/i);
  });

  test('rejects support mode without impersonation permission → 403', async () => {
    const pool = activeSessionPool([
      // No org query needed — 403 is returned before that
    ]);
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/enter')
      .send({ orgId: 'org1', mode: 'support', reason: 'Helping customer' })
      .set('Authorization', `Bearer ${makeToken(['support.view_mode'])}`); // no impersonation
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('support.impersonation');
  });

  test('creates session and returns sessionId → 200', async () => {
    const pool = activeSessionPool([
      { rows: [{ id: 'org1', org_name: 'Acme Org' }] }, // SELECT org
      { rows: [], rowCount: 1 },                          // INSERT support_sessions
      { rows: [] },                                       // logStaffAudit INSERT (fire-and-forget)
    ]);
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/enter')
      .send({ orgId: 'org1', reason: 'Customer requested help' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toMatch(/^supsess_/);
    expect(res.body.orgId).toBe('org1');
    expect(res.body.orgName).toBe('Acme Org');
    expect(res.body.mode).toBe('view_only');
  });

  test('returns 404 when org not found', async () => {
    const pool = activeSessionPool([
      { rows: [] }, // SELECT org — not found
    ]);
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/enter')
      .send({ orgId: 'no_such_org', reason: 'testing' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /exit ───────────────────────────────────────────────────────────────

describe('POST /api/staff/support/exit', () => {
  test('marks session inactive and returns ok → 200', async () => {
    const pool = activeSessionPool([
      { rows: [], rowCount: 1 }, // UPDATE support_sessions
      { rows: [] },               // logStaffAudit INSERT (fire-and-forget)
    ]);
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/exit')
      .send({ sessionId: 'supsess_abc123' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('returns 404 when session not found', async () => {
    const pool = activeSessionPool([
      { rows: [], rowCount: 0 }, // UPDATE — no rows affected
    ]);
    const res = await request(buildSupportApp(pool))
      .post('/api/staff/support/exit')
      .send({ sessionId: 'supsess_nonexistent' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /heartbeat ─────────────────────────────────────────────────────────

describe('PATCH /api/staff/support/heartbeat', () => {
  test('updates last_heartbeat and returns ok → 200', async () => {
    const pool = activeSessionPool([
      { rows: [], rowCount: 1 }, // UPDATE support_sessions
    ]);
    const res = await request(buildSupportApp(pool))
      .patch('/api/staff/support/heartbeat')
      .send({ sessionId: 'supsess_abc123', path: '/dashboard' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('returns 404 when session not found or already ended', async () => {
    const pool = activeSessionPool([
      { rows: [], rowCount: 0 }, // UPDATE — no rows affected
    ]);
    const res = await request(buildSupportApp(pool))
      .patch('/api/staff/support/heartbeat')
      .send({ sessionId: 'supsess_gone', path: '/dashboard' })
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /active ──────────────────────────────────────────────────────────────

describe('GET /api/staff/support/active', () => {
  test('requires audit.view_all — denies without it → 403', async () => {
    const pool = activeSessionPool();
    const res = await request(buildSupportApp(pool))
      .get('/api/staff/support/active')
      .set('Authorization', `Bearer ${makeToken(['support.view_mode'])}`); // no audit.view_all
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('audit.view_all');
  });

  test('returns active sessions array → 200', async () => {
    const sessionRow = {
      id: 'supsess_1', staff_user_id: 'u1', org_id: 'org1',
      mode: 'view_only', is_active: true,
      staff_email: 'test@test.com', org_name: 'Acme Org',
    };
    const pool = activeSessionPool([
      { rows: [], rowCount: 0 },    // stale UPDATE (support_sessions)
      { rows: [sessionRow] },        // SELECT active sessions
    ]);
    const res = await request(buildSupportApp(pool))
      .get('/api/staff/support/active')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].id).toBe('supsess_1');
    expect(res.body.sessions[0].staff_email).toBe('test@test.com');
    expect(res.body.sessions[0].org_name).toBe('Acme Org');
  });
});
