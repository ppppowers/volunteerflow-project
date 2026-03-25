'use strict';
const express = require('express');
const { requireStaffAuth, requirePermission, logStaffAudit } = require('./middleware');

const COLUMNS = ['timestamp','staff_name','staff_role','target_org_name','category','action','resource_type','outcome','reason','field_changes'];

function buildWhereClause(query) {
  const conditions = ['1=1'];
  const params = [];

  if (query.staffUserId) {
    params.push(query.staffUserId);
    conditions.push(`sal.staff_user_id = $${params.length}`);
  }
  if (query.targetOrgId) {
    params.push(query.targetOrgId);
    conditions.push(`sal.target_org_id = $${params.length}`);
  }
  if (query.category) {
    params.push(query.category);
    conditions.push(`sal.category = $${params.length}`);
  }
  if (query.outcome) {
    params.push(query.outcome);
    conditions.push(`sal.outcome = $${params.length}`);
  }
  if (query.from) {
    params.push(query.from);
    conditions.push(`sal.created_at >= $${params.length}`);
  }
  if (query.to) {
    params.push(query.to);
    conditions.push(`sal.created_at <= $${params.length}`);
  }
  if (query.q) {
    params.push(`%${query.q}%`);
    conditions.push(`(sal.action ILIKE $${params.length} OR sal.resource_type ILIKE $${params.length})`);
  }

  return { where: conditions.join(' AND '), params };
}

const BASE_SELECT = `
  SELECT
    sal.id, sal.created_at, sal.staff_user_id, sal.category, sal.action,
    sal.target_org_id, sal.target_org_name, sal.resource_type, sal.resource_id,
    sal.outcome, sal.reason, sal.field_changes, sal.metadata,
    su.email as staff_email, su.name as staff_name,
    sr.name as staff_role
  FROM staff_audit_logs sal
  JOIN staff_users su ON sal.staff_user_id = su.id
  JOIN staff_roles sr ON su.role_id = sr.id
`;

function staffAuditRouter(pool) {
  const router = express.Router();

  // GET / — paginated audit log
  router.get('/', requireStaffAuth(pool), requirePermission('audit.view_all', pool), async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const { where, params } = buildWhereClause(req.query);

      const dataParams = [...params, limit, offset];
      const dataQuery = `
        ${BASE_SELECT}
        WHERE ${where}
        ORDER BY sal.created_at DESC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM staff_audit_logs sal
        JOIN staff_users su ON sal.staff_user_id = su.id
        JOIN staff_roles sr ON su.role_id = sr.id
        WHERE ${where}
      `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, dataParams),
        pool.query(countQuery, params),
      ]);

      const total = parseInt(countResult.rows[0]?.total ?? 0);
      const pages = Math.ceil(total / limit);

      return res.json({
        logs: dataResult.rows,
        total,
        page,
        limit,
        pages,
      });
    } catch (err) {
      console.error('Audit GET / error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /export — CSV download (no pagination)
  router.get('/export', requireStaffAuth(pool), requirePermission('audit.export', pool), async (req, res) => {
    try {
      const { where, params } = buildWhereClause(req.query);

      const dataQuery = `
        ${BASE_SELECT}
        WHERE ${where}
        ORDER BY sal.created_at DESC
      `;

      const result = await pool.query(dataQuery, params);

      // Log the export itself before streaming
      logStaffAudit(pool, {
        staffUserId: req.staff.staffId,
        staffUserName: req.staff.name,
        staffRole: req.staff.roleId,
        category: 'audit',
        action: 'exported',
        resourceType: 'audit_log',
        outcome: 'success',
        metadata: { filters: req.query },
      }).catch(() => {});

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);

      // Write header row
      res.write(COLUMNS.join(',') + '\n');

      // Write each row
      for (const row of result.rows) {
        const values = [
          row.created_at?.toISOString() ?? '',
          row.staff_name ?? '',
          row.staff_role ?? '',
          row.target_org_name ?? '',
          row.category ?? '',
          row.action ?? '',
          row.resource_type ?? '',
          row.outcome ?? '',
          row.reason ?? '',
          row.field_changes ? JSON.stringify(row.field_changes) : '',
        ].map(v => {
          const s = String(v);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        });
        res.write(values.join(',') + '\n');
      }
      res.end();
    } catch (err) {
      console.error('Audit GET /export error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = staffAuditRouter;
