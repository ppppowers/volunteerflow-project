'use strict';
const jwt = require('jsonwebtoken');

const STALE_MINUTES = 5;
const MAX_SESSION_HOURS = 4;

// requireStaffAuth(pool) — call as requireStaffAuth(pool) to get middleware fn
function requireStaffAuth(pool) {
  return async (req, res, next) => {
    const STAFF_JWT_SECRET = process.env.STAFF_JWT_SECRET;
    if (!STAFF_JWT_SECRET) {
      console.error('STAFF_JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No staff token' });

    let payload;
    try {
      payload = jwt.verify(token, STAFF_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired staff token' });
    }

    // Step 1: Synchronous stale-check — commits before is_active gate
    await pool.query(
      `UPDATE staff_sessions SET is_active = false
       WHERE is_active = true AND (
         last_seen < NOW() - ($1 * INTERVAL '1 minute')
         OR started_at < NOW() - ($2 * INTERVAL '1 hour')
       )`,
      [STALE_MINUTES, MAX_SESSION_HOURS]
    );

    // Step 2: Validate session is still active
    const sessionRes = await pool.query(
      'SELECT is_active FROM staff_sessions WHERE id = $1 AND staff_user_id = $2 AND is_active = true',
      [payload.sessionId, payload.staffId]
    );
    if (!sessionRes.rows[0]) {
      return res.status(401).json({ error: 'Staff session expired or invalid' });
    }

    // Step 3: Attach staff context
    req.staff = payload;

    // Step 4: Update last_seen (non-blocking)
    pool.query('UPDATE staff_sessions SET last_seen = NOW() WHERE id = $1', [payload.sessionId]).catch(() => {});

    next();
  };
}

function requirePermission(perm, pool) {
  return (req, res, next) => {
    if (!req.staff?.permissions?.includes(perm)) {
      // Log denial non-blocking
      if (pool) {
        logStaffAudit(pool, {
          staffUserId: req.staff?.staffId || 'unknown',
          staffUserName: req.staff?.name || 'unknown',
          staffRole: req.staff?.roleId || 'unknown',
          category: 'access_denied',
          action: 'denied',
          outcome: 'denied',
          metadata: { requiredPermission: perm, path: req.path },
          ipAddress: req.ip,
          staffSessionId: req.staff?.sessionId,
        }).catch(() => {});
      }
      return res.status(403).json({ error: 'Insufficient permissions', required: perm });
    }
    next();
  };
}

function validateSupportSession(pool) {
  return async (req, res, next) => {
    const orgId = req.params.id;
    const sessionRes = await pool.query(
      'SELECT id FROM support_sessions WHERE staff_user_id = $1 AND org_id = $2 AND is_active = true',
      [req.staff.staffId, orgId]
    );
    if (!sessionRes.rows[0]) {
      return res.status(403).json({ error: 'No active support session for this org' });
    }
    req.supportSessionId = sessionRes.rows[0].id;
    next();
  };
}

async function logStaffAudit(pool, {
  staffUserId, staffUserName, staffRole,
  targetOrgId, targetOrgName,
  category, action,
  resourceType, resourceId,
  fieldChanges, reason,
  ipAddress, staffSessionId, supportSessionId,
  outcome = 'success', metadata,
}) {
  const id = `sal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(`
    INSERT INTO staff_audit_logs
      (id, staff_user_id, staff_user_name, staff_role,
       target_org_id, target_org_name, category, action,
       resource_type, resource_id, field_changes, reason,
       ip_address, staff_session_id, support_session_id, outcome, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  `, [
    id, staffUserId, staffUserName, staffRole,
    targetOrgId || null, targetOrgName || null, category, action,
    resourceType || null, resourceId || null,
    fieldChanges ? JSON.stringify(fieldChanges) : null,
    reason || null, ipAddress || null, staffSessionId || null,
    supportSessionId || null, outcome,
    metadata ? JSON.stringify(metadata) : null,
  ]);
}

module.exports = { requireStaffAuth, requirePermission, validateSupportSession, logStaffAudit };
