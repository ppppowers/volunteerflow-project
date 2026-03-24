'use strict';
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const { requireStaffAuth, requirePermission } = require('../../staff/middleware');

function buildApp(middleware) {
  const app = express();
  app.use(express.json());
  app.get('/test', ...middleware, (req, res) => res.json({ ok: true, staff: req.staff }));
  return app;
}

function makeToken(payload, secret = process.env.STAFF_JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '8h' });
}

describe('requireStaffAuth', () => {
  test('rejects missing token', async () => {
    const app = buildApp([requireStaffAuth({ query: jest.fn().mockResolvedValue({ rows: [] }) })]);
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
  });

  test('rejects token signed with wrong secret', async () => {
    const token = makeToken({ staffId: '1' }, 'wrong-secret');
    const app = buildApp([requireStaffAuth({ query: jest.fn().mockResolvedValue({ rows: [] }) })]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('rejects when session is not active', async () => {
    const token = makeToken({ staffId: 'su1', sessionId: 'sess1', permissions: [] });
    // pool mock: stale check updates nothing, session lookup returns null
    const mockPool = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [] })   // stale-check UPDATE
      .mockResolvedValueOnce({ rows: [] })   // session SELECT returns no active row
    };
    const app = buildApp([requireStaffAuth(mockPool)]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('attaches req.staff and calls next when valid', async () => {
    const token = makeToken({ staffId: 'su1', email: 'a@b.com', name: 'A', roleId: 'role_owner', permissions: ['orgs.view'], sessionId: 'sess1' });
    const mockPool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })                  // stale UPDATE
        .mockResolvedValueOnce({ rows: [{ is_active: true }] }) // session SELECT
        .mockResolvedValueOnce({ rows: [] })                  // last_seen UPDATE
    };
    const app = buildApp([requireStaffAuth(mockPool)]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.staff.staffId).toBe('su1');
  });
});

describe('requirePermission', () => {
  test('returns 403 when permission missing', async () => {
    const token = makeToken({ staffId: 'su1', name: 'A', roleId: 'r', permissions: ['notes.view'], sessionId: 's1' });
    const mockPool = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ is_active: true }] })
      .mockResolvedValueOnce({ rows: [] }) // last_seen
    };
    const app = buildApp([requireStaffAuth(mockPool), requirePermission('orgs.edit_plan', mockPool)]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('orgs.edit_plan');
  });
});
