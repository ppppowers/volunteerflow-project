'use strict';
const express = require('express');
const { randomUUID } = require('crypto');
const { requireStaffAuth, requirePermission, validateSupportSession, logStaffAudit } = require('./middleware');

module.exports = function staffOrgsRouter(pool) {
  const router = express.Router();

  // GET / — search orgs
  router.get('/', requireStaffAuth(pool), requirePermission('orgs.view', pool), async (req, res) => {
    try {
      const { q = '', plan, status, rep } = req.query;
      const page = Number(req.query.page) || 1;
      // Issue 3: cap limit at 100
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const conditions = [];
      const params = [];

      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(u.org_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.contact_name ILIKE $${params.length} OR u.id ILIKE $${params.length})`);
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
        SELECT u.id, u.org_name, u.email, u.contact_name, u.plan, u.status, u.created_at, u.last_login
        FROM users u
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]);

      const countResult = await pool.query(`SELECT COUNT(*) as total FROM users u ${where}`, params);
      const total = Number(countResult.rows[0].total);

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'orgs', action: 'search',
        metadata: { q, plan, status, rep, page, limit },
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      // Issue 2: include pages in response
      res.json({ orgs: orgsResult.rows, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /:id — org detail
  router.get('/:id', requireStaffAuth(pool), requirePermission('orgs.view', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Org not found' });

      const org = { ...result.rows[0] };
      // Issue 4: strip the correct sensitive fields
      if (!req.staff.permissions.includes('orgs.view_sensitive')) {
        delete org.billing_info;
        delete org.payment_method;
        delete org.tax_id;
        delete org.internal_notes;
      }

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        targetOrgId: id, targetOrgName: org.org_name,
        category: 'orgs', action: 'viewed',
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      res.json({ org });
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id — edit org fields
  router.patch('/:id', requireStaffAuth(pool), requirePermission('orgs.edit_basic', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const orgResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!orgResult.rows[0]) return res.status(404).json({ error: 'Org not found' });
      const before = orgResult.rows[0];

      // Field-level permission checks — only columns that exist on the users table
      const fieldPermissions = {
        plan:          'orgs.edit_plan',
        status:        'orgs.edit_status',
        org_name:      'orgs.edit_basic',
        contact_name:  'orgs.edit_contact',
        contact_email: 'orgs.edit_contact',
      };

      // Check each submitted field's required permission
      for (const [field, requiredPerm] of Object.entries(fieldPermissions)) {
        if (req.body[field] !== undefined && !req.staff.permissions.includes(requiredPerm)) {
          return res.status(403).json({ error: 'Insufficient permissions', required: requiredPerm });
        }
      }

      // Collect updates for allowed fields
      const allowed = Object.keys(fieldPermissions);
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const ALLOWED_COLUMNS = new Set(allowed);
      for (const key of Object.keys(updates)) {
        if (!ALLOWED_COLUMNS.has(key)) {
          return res.status(400).json({ error: `Invalid field: ${key}` });
        }
      }

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

      // Issue 7: return updated org row
      const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      res.json({ org: updatedResult.rows[0] });
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /:id/notes — paginated notes (WHERE is_deleted = false)
  router.get('/:id/notes', requireStaffAuth(pool), requirePermission('notes.view', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      const result = await pool.query(
        `SELECT n.*, su.full_name as created_by_name FROM org_notes n
         JOIN staff_users su ON su.id = n.created_by
         WHERE n.org_id = $1 AND n.is_deleted = false
         ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );
      const countResult = await pool.query('SELECT COUNT(*) as total FROM org_notes WHERE org_id = $1 AND is_deleted = false', [id]);
      res.json({ notes: result.rows, total: Number(countResult.rows[0].total) });
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /:id/notes — create note
  router.post('/:id/notes', requireStaffAuth(pool), requirePermission('notes.create', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const { content, is_important = false, tags = [] } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
      const noteId = `note_${randomUUID()}`;
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
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id/notes/:nid — edit note
  // Fix 3: no requirePermission middleware — auth gap between notes.edit_own and notes.edit_any handled inside
  router.patch('/:id/notes/:nid',
    requireStaffAuth(pool),
    // NO requirePermission here — handled inside
    async (req, res) => {
      try {
        const permissions = req.staff.permissions || [];
        if (!permissions.includes('notes.edit_own') && !permissions.includes('notes.edit_any')) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const { id, nid } = req.params;

        // Fetch the note
        const noteResult = await pool.query(
          'SELECT * FROM org_notes WHERE id = $1 AND org_id = $2 AND is_deleted = false',
          [nid, id]
        );
        if (!noteResult.rows.length) return res.status(404).json({ error: 'Note not found' });
        const note = noteResult.rows[0];

        // Ownership check: edit_own requires own note; edit_any bypasses
        if (!permissions.includes('notes.edit_any') && note.created_by !== req.staff.staffId) {
          return res.status(403).json({ error: 'Insufficient permissions', required: 'notes.edit_any' });
        }

        const { content, is_important, tags } = req.body;
        await pool.query(
          'UPDATE org_notes SET content = COALESCE($1, content), is_important = COALESCE($2, is_important), tags = COALESCE($3, tags), updated_at = NOW(), updated_by = $4 WHERE id = $5',
          [content ?? null, is_important ?? null, tags ?? null, req.staff.staffId, nid]
        );
        res.json({ ok: true });
      } catch (err) {
        console.error('[staff/orgs] notes patch error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // DELETE /:id/notes/:nid — soft delete (set is_deleted = true)
  router.delete('/:id/notes/:nid', requireStaffAuth(pool), requirePermission('notes.delete', pool), async (req, res) => {
    try {
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
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Support View Routes (require active support session) ────────────────────

  // GET /:id/dashboard-stats
  router.get('/:id/dashboard-stats',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const counts = await Promise.all([
          pool.query('SELECT COUNT(*) FROM volunteers WHERE org_id = $1', [req.params.id]),
          pool.query('SELECT COUNT(*) FROM events WHERE org_id = $1', [req.params.id]),
          pool.query("SELECT COUNT(*) FROM applications WHERE org_id = $1 AND status = 'pending'", [req.params.id]),
          pool.query('SELECT COALESCE(SUM(hours), 0) as total_hours FROM volunteers WHERE org_id = $1', [req.params.id]),
        ]);
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({
          volunteers: parseInt(counts[0].rows[0].count),
          events: parseInt(counts[1].rows[0].count),
          pending_applications: parseInt(counts[2].rows[0].count),
          total_hours: parseFloat(counts[3].rows[0].total_hours),
        });
      } catch (err) {
        console.error('[staff/orgs] dashboard-stats error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /:id/volunteers
  router.get('/:id/volunteers',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM volunteers WHERE org_id = $1 ORDER BY created_at DESC',
          [req.params.id]
        );
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({ volunteers: result.rows });
      } catch (err) {
        console.error('[staff/orgs] volunteers error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /:id/events
  router.get('/:id/events',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM events WHERE org_id = $1 ORDER BY start_date DESC',
          [req.params.id]
        );
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({ events: result.rows });
      } catch (err) {
        console.error('[staff/orgs] events error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /:id/applications
  router.get('/:id/applications',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM applications WHERE org_id = $1 ORDER BY created_at DESC',
          [req.params.id]
        );
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({ applications: result.rows });
      } catch (err) {
        console.error('[staff/orgs] applications error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /:id/hours
  router.get('/:id/hours',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM volunteers WHERE org_id = $1',
          [req.params.id]
        );
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({ volunteers: result.rows });
      } catch (err) {
        console.error('[staff/orgs] hours error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /:id/settings
  router.get('/:id/settings',
    requireStaffAuth(pool), requirePermission('orgs.view', pool), validateSupportSession(pool),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM org_settings WHERE id = $1',
          [req.params.id]
        );
        const sessionId = req.headers['x-support-session-id'];
        if (sessionId) {
          pool.query(
            'UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2',
            [JSON.stringify([{ path: req.path, timestamp: new Date() }]), sessionId]
          ).catch(() => {});
        }
        res.json({ settings: result.rows[0] || null });
      } catch (err) {
        console.error('[staff/orgs] settings error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ─── End Support View Routes ──────────────────────────────────────────────────

  // GET /:id/activity — union of staff_audit_logs + audit_logs for that org, last 50
  router.get('/:id/activity', requireStaffAuth(pool), requirePermission('audit.view_org', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT id, timestamp, staff_user_name as actor, action, category, outcome, metadata
        FROM staff_audit_logs WHERE target_org_id = $1
        ORDER BY timestamp DESC LIMIT 50
      `, [id]);
      res.json({ activity: result.rows });
    } catch (err) {
      console.error('[staff/orgs] error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
