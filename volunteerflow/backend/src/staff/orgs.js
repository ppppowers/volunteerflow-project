'use strict';
const express = require('express');
const { requireStaffAuth, requirePermission, logStaffAudit } = require('./middleware');

module.exports = function staffOrgsRouter(pool) {
  const router = express.Router();

  // GET / — search orgs
  router.get('/', requireStaffAuth(pool), requirePermission('orgs.view', pool), async (req, res) => {
    const { q = '', plan, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(u.org_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.id ILIKE $${params.length})`);
    }
    if (plan) {
      params.push(plan);
      conditions.push(`u.plan = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const orgsResult = await pool.query(`
      SELECT u.id, u.org_name, u.email, u.plan, u.status, u.created_at, u.last_login,
             COUNT(DISTINCT v.id) as volunteer_count,
             COUNT(DISTINCT e.id) as event_count
      FROM users u
      LEFT JOIN volunteers v ON v.org_id = u.id
      LEFT JOIN events e ON e.org_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM users u ${where}`, params);

    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      category: 'orgs', action: 'search',
      metadata: { q, plan, status, page, limit },
      ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});

    res.json({ orgs: orgsResult.rows, total: Number(countResult.rows[0].total), page: Number(page), limit: Number(limit) });
  });

  // GET /:id — org detail
  router.get('/:id', requireStaffAuth(pool), requirePermission('orgs.view', pool), async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Org not found' });

    const org = { ...result.rows[0] };
    // Strip sensitive fields if no orgs.view_sensitive
    if (!req.staff.permissions.includes('orgs.view_sensitive')) {
      delete org.stripe_customer_id;
      delete org.stripe_subscription_id;
      delete org.billing_email;
    }

    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      targetOrgId: id, targetOrgName: org.org_name,
      category: 'orgs', action: 'viewed',
      ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});

    res.json({ org });
  });

  // PATCH /:id — edit org fields
  router.patch('/:id', requireStaffAuth(pool), requirePermission('orgs.edit_basic', pool), async (req, res) => {
    const { id } = req.params;
    const orgResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!orgResult.rows[0]) return res.status(404).json({ error: 'Org not found' });
    const before = orgResult.rows[0];

    const allowed = ['org_name', 'status', 'plan']; // expand based on permissions
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    await pool.query(`UPDATE users SET ${setClauses} WHERE id = $1`, values);

    const fieldChanges = {};
    for (const key of Object.keys(updates)) {
      fieldChanges[key] = { before: before[key], after: updates[key] };
    }

    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      targetOrgId: id, targetOrgName: before.org_name,
      category: 'orgs', action: 'edited', fieldChanges,
      ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});

    res.json({ ok: true });
  });

  // GET /:id/notes — paginated notes (WHERE is_deleted = false)
  router.get('/:id/notes', requireStaffAuth(pool), requirePermission('notes.view', pool), async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await pool.query(
      `SELECT n.*, su.full_name as created_by_name FROM org_notes n
       JOIN staff_users su ON su.id = n.created_by
       WHERE n.org_id = $1 AND n.is_deleted = false
       ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`,
      [id, Number(limit), offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) as total FROM org_notes WHERE org_id = $1 AND is_deleted = false', [id]);
    res.json({ notes: result.rows, total: Number(countResult.rows[0].total) });
  });

  // POST /:id/notes — create note
  router.post('/:id/notes', requireStaffAuth(pool), requirePermission('notes.create', pool), async (req, res) => {
    const { id } = req.params;
    const { content, is_important = false, tags = [] } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
    const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      'INSERT INTO org_notes (id, org_id, created_by, content, is_important, tags) VALUES ($1,$2,$3,$4,$5,$6)',
      [noteId, id, req.staff.staffId, content.trim(), is_important, tags]
    );
    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      targetOrgId: id, category: 'notes', action: 'created',
      resourceType: 'note', resourceId: noteId,
      ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});
    res.json({ ok: true, noteId });
  });

  // PATCH /:id/notes/:nid — edit note
  router.patch('/:id/notes/:nid', requireStaffAuth(pool), requirePermission('notes.edit_own', pool), async (req, res) => {
    const { id, nid } = req.params;
    const noteResult = await pool.query('SELECT * FROM org_notes WHERE id = $1 AND org_id = $2 AND is_deleted = false', [nid, id]);
    if (!noteResult.rows[0]) return res.status(404).json({ error: 'Note not found' });
    const note = noteResult.rows[0];

    // Check edit_own vs edit_any
    const isOwn = note.created_by === req.staff.staffId;
    if (!isOwn && !req.staff.permissions.includes('notes.edit_any')) {
      return res.status(403).json({ error: 'Insufficient permissions', required: 'notes.edit_any' });
    }

    const { content, is_important, tags } = req.body;
    await pool.query(
      'UPDATE org_notes SET content = COALESCE($1, content), is_important = COALESCE($2, is_important), tags = COALESCE($3, tags), updated_at = NOW(), updated_by = $4 WHERE id = $5',
      [content ?? null, is_important ?? null, tags ?? null, req.staff.staffId, nid]
    );
    res.json({ ok: true });
  });

  // DELETE /:id/notes/:nid — soft delete (set is_deleted = true)
  router.delete('/:id/notes/:nid', requireStaffAuth(pool), requirePermission('notes.delete', pool), async (req, res) => {
    const { id, nid } = req.params;
    const noteResult = await pool.query('SELECT id FROM org_notes WHERE id = $1 AND org_id = $2 AND is_deleted = false', [nid, id]);
    if (!noteResult.rows[0]) return res.status(404).json({ error: 'Note not found' });
    await pool.query('UPDATE org_notes SET is_deleted = true, updated_at = NOW(), updated_by = $1 WHERE id = $2', [req.staff.staffId, nid]);
    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      category: 'notes', action: 'deleted', resourceType: 'note', resourceId: nid,
      ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});
    res.json({ ok: true });
  });

  // GET /:id/activity — union of staff_audit_logs + audit_logs for that org, last 50
  router.get('/:id/activity', requireStaffAuth(pool), requirePermission('audit.view_org', pool), async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 'staff' as source, id, timestamp, staff_user_name as actor, action, category, outcome, metadata
      FROM staff_audit_logs WHERE target_org_id = $1
      UNION ALL
      SELECT 'org' as source, id, created_at as timestamp, user_id as actor, action, category, 'success' as outcome, details as metadata
      FROM audit_logs WHERE org_id = $1
      ORDER BY timestamp DESC LIMIT 50
    `, [id]);
    res.json({ activity: result.rows });
  });

  return router;
};
