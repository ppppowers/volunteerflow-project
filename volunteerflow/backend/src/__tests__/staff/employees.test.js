'use strict';
const request = require('supertest');
const express = require('express');
process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const jwt = require('jsonwebtoken');

function buildEmployeesApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/employees', require('../../staff/employees')(pool));
  return app;
}

function makeToken(permissions = ['employees.view'], staffId = 'su1') {
  return jwt.sign(
    { staffId, email: 'a@b.com', name: 'Test User', roleId: 'role_admin', permissions, sessionId: 'sess1' },
    process.env.STAFF_JWT_SECRET, { expiresIn: '8h' }
  );
}

// Provides the 3 calls requireStaffAuth always makes, then queues additional results
function activeSessionPool(extraQueryResults = []) {
  const pool = { query: jest.fn() };
  pool.query
    .mockResolvedValueOnce({ rows: [] })                      // stale UPDATE
    .mockResolvedValueOnce({ rows: [{ is_active: true }] })  // session SELECT
    .mockResolvedValueOnce({ rows: [] });                     // last_seen UPDATE
  extraQueryResults.forEach(r => pool.query.mockResolvedValueOnce(r));
  return pool;
}

// ─── GET / ────────────────────────────────────────────────────────────────────

describe('GET /api/staff/employees', () => {
  test('returns 403 without employees.view permission', async () => {
    const pool = activeSessionPool();
    const token = makeToken(['orgs.view']); // no employees.view
    const res = await request(buildEmployeesApp(pool))
      .get('/api/staff/employees')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('returns { employees } array', async () => {
    const employees = [
      { id: 'su1', email: 'alice@example.com', name: 'Alice', title: 'Support', is_active: true, created_at: new Date().toISOString(), last_login: null, role_id: 'role_admin', role_name: 'Admin' },
    ];
    const pool = activeSessionPool([{ rows: employees }]);
    const res = await request(buildEmployeesApp(pool))
      .get('/api/staff/employees')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].email).toBe('alice@example.com');
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe('POST /api/staff/employees', () => {
  test('returns 403 without employees.create permission', async () => {
    const pool = activeSessionPool();
    const token = makeToken(['employees.view']); // no employees.create
    const res = await request(buildEmployeesApp(pool))
      .post('/api/staff/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com', name: 'New', password: 'pass123' });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:id/disable ───────────────────────────────────────────────────────

describe('PATCH /api/staff/employees/:id/disable', () => {
  test('returns 403 with only employees.edit (not employees.disable)', async () => {
    const pool = activeSessionPool();
    const token = makeToken(['employees.view', 'employees.edit']); // no disable
    const res = await request(buildEmployeesApp(pool))
      .patch('/api/staff/employees/su99/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  test('returns 400 when trying to disable self', async () => {
    const MY_ID = 'su_self';
    // Pool: stale UPDATE, session SELECT, last_seen UPDATE — no extra needed (blocked before DB call)
    const pool = activeSessionPool();
    const token = makeToken(['employees.view', 'employees.disable'], MY_ID);
    const res = await request(buildEmployeesApp(pool))
      .patch(`/api/staff/employees/${MY_ID}/disable`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot disable yourself/);
  });
});
