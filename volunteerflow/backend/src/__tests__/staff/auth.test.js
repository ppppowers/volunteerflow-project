'use strict';
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

function buildAuthApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/auth', require('../../staff/auth')(pool));
  return app;
}

describe('POST /api/staff/auth/login', () => {
  test('returns 401 for unknown email', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 12);
    const pool = { query: jest.fn().mockResolvedValue({
      rows: [{ id: 'su1', full_name: 'A', email: 'a@b.com', role_id: 'role_owner', is_active: true,
               password_hash: hash, permissions: {} }]
    })};
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('returns 403 for inactive account', async () => {
    const hash = await bcrypt.hash('pass', 12);
    const pool = { query: jest.fn().mockResolvedValue({
      rows: [{ id: 'su1', full_name: 'A', email: 'a@b.com', role_id: 'role_owner', is_active: false,
               password_hash: hash, permissions: {} }]
    })};
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'pass' });
    expect(res.status).toBe(403);
  });

  test('returns token on valid credentials', async () => {
    const hash = await bcrypt.hash('correct', 12);
    const pool = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'su1', full_name: 'A', email: 'a@b.com',
               role_id: 'role_owner', is_active: true, password_hash: hash,
               permissions: { 'orgs.view': true } }] })
      .mockResolvedValueOnce({ rows: [] }) // INSERT session
      .mockResolvedValueOnce({ rows: [] }) // UPDATE last_login
    };
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@b.com');
  });
});
