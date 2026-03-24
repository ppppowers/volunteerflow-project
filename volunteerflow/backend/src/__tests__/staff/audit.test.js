'use strict';
const request = require('supertest');
const express = require('express');

process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const jwt = require('jsonwebtoken');

function buildAuditApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/audit', require('../../staff/audit')(pool));
  return app;
}

function makeToken(permissions = ['audit.view_all', 'audit.export']) {
  return jwt.sign(
    {
      staffId: 'u1',
      email: 'test@test.com',
      name: 'Test User',
      roleId: 'role_admin',
      permissions,
      sessionId: 'ss_abc',
    },
    process.env.STAFF_JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Satisfies requireStaffAuth (3 queries: stale UPDATE, session SELECT, last_seen UPDATE)
// then queues extra results for route-specific queries.
function makePool(extraQueryResults = []) {
  const pool = { query: jest.fn() };
  pool.query
    .mockResolvedValueOnce({ rows: [] })                    // stale UPDATE (staff_sessions)
    .mockResolvedValueOnce({ rows: [{ is_active: true }] }) // session SELECT
    .mockResolvedValueOnce({ rows: [] });                   // last_seen UPDATE (non-blocking)
  extraQueryResults.forEach(r => pool.query.mockResolvedValueOnce(r));
  return pool;
}

const sampleLog = {
  id: 'sal_1',
  created_at: new Date('2024-01-15T12:00:00Z'),
  staff_user_id: 'u1',
  category: 'org_edit',
  action: 'edited',
  target_org_id: 'org1',
  target_org_name: 'Acme Corp',
  resource_type: 'org',
  resource_id: 'org1',
  outcome: 'success',
  reason: null,
  field_changes: null,
  metadata: null,
  staff_email: 'test@test.com',
  staff_name: 'Test User',
  staff_role: 'Admin',
};

// ─── GET / ────────────────────────────────────────────────────────────────────

describe('GET /api/staff/audit', () => {
  test('requires audit.view_all — 403 without it', async () => {
    const pool = makePool();
    const res = await request(buildAuditApp(pool))
      .get('/api/staff/audit')
      .set('Authorization', `Bearer ${makeToken(['some.other.perm'])}`);
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('audit.view_all');
  });

  test('returns paginated logs with { logs, total, page, limit, pages }', async () => {
    const pool = makePool([
      { rows: [sampleLog] },          // data query
      { rows: [{ total: '1' }] },     // count query
    ]);
    const res = await request(buildAuditApp(pool))
      .get('/api/staff/audit')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      logs: expect.any(Array),
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    });
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].id).toBe('sal_1');
  });

  test('filters by category param', async () => {
    const pool = makePool([
      { rows: [] },               // data query (empty result for filtered category)
      { rows: [{ total: '0' }] }, // count query
    ]);
    const res = await request(buildAuditApp(pool))
      .get('/api/staff/audit?category=auth')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
    expect(res.body.total).toBe(0);

    // Verify that the category filter was included in the SQL (check query calls)
    const queryCalls = pool.query.mock.calls;
    // Skip the 3 auth middleware calls; 4th call is the data query
    const dataQueryCall = queryCalls[3];
    expect(dataQueryCall[0]).toContain('sal.category');
    // The params array should contain 'auth'
    expect(dataQueryCall[1]).toContain('auth');
  });
});

// ─── GET /export ──────────────────────────────────────────────────────────────

describe('GET /api/staff/audit/export', () => {
  test('requires audit.export — 403 without it', async () => {
    const pool = makePool();
    const res = await request(buildAuditApp(pool))
      .get('/api/staff/audit/export')
      .set('Authorization', `Bearer ${makeToken(['audit.view_all'])}`); // no audit.export
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('audit.export');
  });

  test('returns CSV content-type', async () => {
    const pool = makePool([
      { rows: [sampleLog] }, // data query
      { rows: [] },           // logStaffAudit INSERT (fire-and-forget)
    ]);
    const res = await request(buildAuditApp(pool))
      .get('/api/staff/audit/export')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*audit-.*\.csv/);
    // Should contain the header row
    expect(res.text).toContain('timestamp,staff_name,staff_role');
    // Should contain data
    expect(res.text).toContain('Test User');
  });
});
