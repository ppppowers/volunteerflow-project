'use strict';
const request = require('supertest');
const express = require('express');
process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const jwt = require('jsonwebtoken');

function buildOrgsApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/orgs', require('../../staff/orgs')(pool));
  return app;
}

function makeToken(permissions = ['orgs.view']) {
  return jwt.sign(
    { staffId: 'su1', email: 'a@b.com', name: 'A', roleId: 'role_owner', permissions, sessionId: 'sess1' },
    process.env.STAFF_JWT_SECRET, { expiresIn: '8h' }
  );
}

function activeSessionPool(extraQueryResults = []) {
  const pool = { query: jest.fn() };
  // stale UPDATE, session SELECT, last_seen UPDATE (from requireStaffAuth)
  pool.query
    .mockResolvedValueOnce({ rows: [] })               // stale UPDATE
    .mockResolvedValueOnce({ rows: [{ is_active: true }] }) // session SELECT
    .mockResolvedValueOnce({ rows: [] });              // last_seen UPDATE
  extraQueryResults.forEach(r => pool.query.mockResolvedValueOnce(r));
  return pool;
}

describe('GET /api/staff/orgs', () => {
  test('rejects unauthenticated', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const res = await request(buildOrgsApp(pool)).get('/api/staff/orgs');
    expect(res.status).toBe(401);
  });

  test('returns org list', async () => {
    const pool = activeSessionPool([
      { rows: [{ id: 'u1', org_name: 'Habitat', plan: 'grow', volunteer_count: 5, event_count: 2 }] },
      { rows: [{ total: '1' }] },
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.orgs).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});
