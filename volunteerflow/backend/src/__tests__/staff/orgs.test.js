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

  test('returns org list with pages field', async () => {
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
    // Issue 2: pages must be present
    expect(res.body.pages).toBe(1);
  });

  test('clamps limit to 100', async () => {
    const pool = activeSessionPool([
      { rows: [] },
      { rows: [{ total: '0' }] },
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs?limit=9999')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    // Verify the query was called with 100 as limit parameter
    const calls = pool.query.mock.calls;
    // The SELECT orgs query is the 4th call (index 3): stale, session, last_seen, then orgs query
    const orgQueryCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('LIMIT'));
    expect(orgQueryCall).toBeDefined();
    const limitArg = orgQueryCall[1][orgQueryCall[1].length - 2]; // second-to-last param is limit
    expect(limitArg).toBe(100);
  });

  test('applies rep filter', async () => {
    const pool = activeSessionPool([
      { rows: [] },
      { rows: [{ total: '0' }] },
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs?rep=su_xyz')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    // The WHERE clause should include assigned_rep
    const calls = pool.query.mock.calls;
    const orgQueryCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('FROM users'));
    expect(orgQueryCall[0]).toContain('assigned_rep');
    expect(orgQueryCall[1]).toContain('su_xyz');
  });
});

describe('GET /api/staff/orgs/:id', () => {
  test('strips sensitive fields when orgs.view_sensitive absent', async () => {
    const orgRow = {
      id: 'u1', org_name: 'Habitat', email: 'h@example.com',
      billing_info: 'VISA-1234', payment_method: 'stripe', tax_id: '12-345',
      internal_notes: 'internal stuff',
    };
    const pool = activeSessionPool([
      { rows: [orgRow] }, // SELECT * FROM users
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs/u1')
      .set('Authorization', `Bearer ${makeToken(['orgs.view'])}`);
    expect(res.status).toBe(200);
    expect(res.body.org.billing_info).toBeUndefined();
    expect(res.body.org.payment_method).toBeUndefined();
    expect(res.body.org.tax_id).toBeUndefined();
    expect(res.body.org.internal_notes).toBeUndefined();
  });

  test('returns sensitive fields when orgs.view_sensitive present', async () => {
    const orgRow = {
      id: 'u1', org_name: 'Habitat', email: 'h@example.com',
      billing_info: 'VISA-1234', payment_method: 'stripe', tax_id: '12-345',
      internal_notes: 'internal stuff',
    };
    const pool = activeSessionPool([
      { rows: [orgRow] }, // SELECT * FROM users
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs/u1')
      .set('Authorization', `Bearer ${makeToken(['orgs.view', 'orgs.view_sensitive'])}`);
    expect(res.status).toBe(200);
    expect(res.body.org.billing_info).toBe('VISA-1234');
    expect(res.body.org.payment_method).toBe('stripe');
    expect(res.body.org.tax_id).toBe('12-345');
    expect(res.body.org.internal_notes).toBe('internal stuff');
  });

  test('returns 404 for unknown org', async () => {
    const pool = activeSessionPool([
      { rows: [] }, // SELECT * FROM users — not found
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs/no_such_id')
      .set('Authorization', `Bearer ${makeToken(['orgs.view'])}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/staff/orgs/:id — field-level permissions', () => {
  test('blocks plan edit without orgs.edit_plan', async () => {
    const orgRow = { id: 'u1', org_name: 'Habitat', plan: 'start' };
    const pool = activeSessionPool([
      { rows: [orgRow] }, // SELECT * FROM users
    ]);
    const res = await request(buildOrgsApp(pool))
      .patch('/api/staff/orgs/u1')
      .set('Authorization', `Bearer ${makeToken(['orgs.view', 'orgs.edit_basic'])}`);
    // Sending plan without orgs.edit_plan
    const res2 = await request(buildOrgsApp(activeSessionPool([{ rows: [orgRow] }])))
      .patch('/api/staff/orgs/u1')
      .send({ plan: 'grow' })
      .set('Authorization', `Bearer ${makeToken(['orgs.view', 'orgs.edit_basic'])}`);
    expect(res2.status).toBe(403);
    expect(res2.body.required).toBe('orgs.edit_plan');
  });

  test('blocks status edit without orgs.edit_status', async () => {
    const orgRow = { id: 'u1', org_name: 'Habitat', status: 'active' };
    const pool = activeSessionPool([{ rows: [orgRow] }]);
    const res = await request(buildOrgsApp(pool))
      .patch('/api/staff/orgs/u1')
      .send({ status: 'suspended' })
      .set('Authorization', `Bearer ${makeToken(['orgs.view', 'orgs.edit_basic'])}`);
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('orgs.edit_status');
  });

  test('returns updated org row after successful patch', async () => {
    const orgRow = { id: 'u1', org_name: 'Habitat', plan: 'start' };
    const updatedRow = { id: 'u1', org_name: 'Habitat Updated', plan: 'start' };
    // Queries: SELECT (fetch before), UPDATE, logStaffAudit INSERT (fire-and-forget), SELECT (fetch after)
    const pool = activeSessionPool([
      { rows: [orgRow] },     // SELECT before update
      { rowCount: 1 },        // UPDATE
      { rows: [] },           // logStaffAudit INSERT (fire-and-forget)
      { rows: [updatedRow] }, // SELECT after update
    ]);
    const res = await request(buildOrgsApp(pool))
      .patch('/api/staff/orgs/u1')
      .send({ org_name: 'Habitat Updated' })
      .set('Authorization', `Bearer ${makeToken(['orgs.view', 'orgs.edit_basic'])}`);
    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe('Habitat Updated');
  });
});

describe('DELETE /api/staff/orgs/:id/notes/:nid', () => {
  test('soft-deletes note by setting is_deleted = true, does NOT physically delete', async () => {
    const pool = activeSessionPool([
      { rows: [{ id: 'note_1', org_id: 'u1', is_deleted: false }] }, // SELECT note
      { rowCount: 1 }, // UPDATE is_deleted = true
    ]);
    const res = await request(buildOrgsApp(pool))
      .delete('/api/staff/orgs/u1/notes/note_1')
      .set('Authorization', `Bearer ${makeToken(['notes.delete'])}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify UPDATE was used (not DELETE)
    const calls = pool.query.mock.calls;
    const updateCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('is_deleted = true'));
    expect(updateCall).toBeDefined();
    // No physical DELETE should have been called
    const deleteCall = calls.find(c => typeof c[0] === 'string' && /^\s*DELETE\s/i.test(c[0]));
    expect(deleteCall).toBeUndefined();
  });

  test('returns 404 when note not found or already deleted', async () => {
    const pool = activeSessionPool([
      { rows: [] }, // SELECT note — not found
    ]);
    const res = await request(buildOrgsApp(pool))
      .delete('/api/staff/orgs/u1/notes/ghost_note')
      .set('Authorization', `Bearer ${makeToken(['notes.delete'])}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/staff/orgs/:id/notes', () => {
  test('filters WHERE is_deleted = false', async () => {
    const pool = activeSessionPool([
      { rows: [{ id: 'note_1', content: 'hello', is_deleted: false }] }, // notes SELECT
      { rows: [{ total: '1' }] }, // count SELECT
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs/u1/notes')
      .set('Authorization', `Bearer ${makeToken(['notes.view'])}`);
    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);

    // Verify query uses is_deleted = false
    const calls = pool.query.mock.calls;
    const notesQueryCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('org_notes'));
    expect(notesQueryCall[0]).toContain('is_deleted = false');
  });
});

describe('PATCH /api/staff/orgs/:id/notes/:nid', () => {
  test('allows edit when notes.edit_any even if not own note', async () => {
    // staffId is 'su1' from makeToken, note created_by is 'su_other'
    const noteRow = { id: 'note_1', org_id: 'u1', created_by: 'su_other', is_deleted: false };
    const pool = activeSessionPool([
      { rows: [noteRow] }, // SELECT note
      { rowCount: 1 },     // UPDATE note
    ]);
    const res = await request(buildOrgsApp(pool))
      .patch('/api/staff/orgs/u1/notes/note_1')
      .send({ content: 'Updated content' })
      .set('Authorization', `Bearer ${makeToken(['notes.edit_own', 'notes.edit_any'])}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('blocks edit when only notes.edit_own and note is not own', async () => {
    // staffId is 'su1' from makeToken, note created_by is 'su_other'
    const noteRow = { id: 'note_1', org_id: 'u1', created_by: 'su_other', is_deleted: false };
    const pool = activeSessionPool([
      { rows: [noteRow] }, // SELECT note
    ]);
    const res = await request(buildOrgsApp(pool))
      .patch('/api/staff/orgs/u1/notes/note_1')
      .send({ content: 'Trying to edit' })
      .set('Authorization', `Bearer ${makeToken(['notes.edit_own'])}`);
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('notes.edit_any');
  });
});
