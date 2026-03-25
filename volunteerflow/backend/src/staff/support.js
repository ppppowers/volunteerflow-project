'use strict';
const { randomUUID } = require('crypto');
const { requireStaffAuth, requirePermission, logStaffAudit } = require('./middleware');

function staffSupportRouter(pool) {
  const router = require('express').Router();

  // POST /enter — start a support session for an org
  router.post('/enter',
    requireStaffAuth(pool),
    requirePermission('support.view_mode', pool),
    async (req, res) => {
      try {
        const { orgId, reason, mode: rawMode } = req.body;
        const mode = rawMode || 'view_only';

        if (!orgId) {
          return res.status(400).json({ error: 'orgId is required' });
        }
        if (!['view_only', 'support'].includes(mode)) {
          return res.status(400).json({ error: 'mode must be view_only or support' });
        }
        if (!reason || !reason.trim()) {
          return res.status(400).json({ error: 'reason is required' });
        }

        if (mode === 'support' && !req.staff.permissions.includes('support.impersonation')) {
          return res.status(403).json({ error: 'Insufficient permissions', required: 'support.impersonation' });
        }

        const orgResult = await pool.query('SELECT id, org_name FROM users WHERE id = $1', [orgId]);
        if (!orgResult.rows[0]) {
          return res.status(404).json({ error: 'Org not found' });
        }
        const { org_name: orgName } = orgResult.rows[0];

        const sessionId = `supsess_${randomUUID()}`;
        await pool.query(
          'INSERT INTO support_sessions (id, staff_user_id, org_id, mode, reason) VALUES ($1,$2,$3,$4,$5)',
          [sessionId, req.staff.staffId, orgId, mode, reason.trim()]
        );

        logStaffAudit(pool, {
          staffUserId: req.staff.staffId,
          staffUserName: req.staff.name,
          staffRole: req.staff.roleId,
          targetOrgId: orgId,
          targetOrgName: orgName,
          category: 'support_view',
          action: 'entered',
          resourceType: 'support_session',
          resourceId: sessionId,
          reason: reason.trim(),
          metadata: { mode },
          ipAddress: req.ip,
          staffSessionId: req.staff.sessionId,
        }).catch(() => {});

        res.json({ sessionId, orgId, orgName, mode });
      } catch (err) {
        console.error('[staff/support] enter error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // POST /exit — end a support session
  router.post('/exit',
    requireStaffAuth(pool),
    async (req, res) => {
      try {
        const { sessionId } = req.body;
        const result = await pool.query(
          'UPDATE support_sessions SET ended_at = NOW(), is_active = false WHERE id = $1 AND staff_user_id = $2',
          [sessionId, req.staff.staffId]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Support session not found' });
        }

        logStaffAudit(pool, {
          staffUserId: req.staff.staffId,
          staffUserName: req.staff.name,
          staffRole: req.staff.roleId,
          category: 'support_view',
          action: 'exited',
          resourceType: 'support_session',
          resourceId: sessionId,
          ipAddress: req.ip,
          staffSessionId: req.staff.sessionId,
        }).catch(() => {});

        res.json({ ok: true });
      } catch (err) {
        console.error('[staff/support] exit error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // PATCH /heartbeat — keep a support session alive
  router.patch('/heartbeat',
    requireStaffAuth(pool),
    async (req, res) => {
      try {
        const { sessionId, path } = req.body;
        const result = await pool.query(
          'UPDATE support_sessions SET last_heartbeat = NOW() WHERE id = $1 AND staff_user_id = $2 AND is_active = true',
          [sessionId, req.staff.staffId]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Support session not found or already ended' });
        }
        res.json({ ok: true });
      } catch (err) {
        console.error('[staff/support] heartbeat error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // GET /active — list all currently active support sessions
  router.get('/active',
    requireStaffAuth(pool),
    requirePermission('audit.view_all', pool),
    async (req, res) => {
      try {
        // Expire stale sessions (no heartbeat for 5+ minutes)
        await pool.query(
          `UPDATE support_sessions SET is_active = false, ended_at = NOW()
           WHERE is_active = true AND last_heartbeat < NOW() - INTERVAL '5 minutes'`
        );

        const result = await pool.query(
          `SELECT ss.*, su.email as staff_email, u.org_name
           FROM support_sessions ss
           JOIN staff_users su ON ss.staff_user_id = su.id
           JOIN users u ON ss.org_id = u.id
           WHERE ss.is_active = true
           ORDER BY ss.started_at DESC`
        );

        res.json({ sessions: result.rows });
      } catch (err) {
        console.error('[staff/support] active error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  return router;
}

module.exports = staffSupportRouter;
