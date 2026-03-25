'use strict';
const express = require('express');
const { requireStaffAuth, requirePermission, logStaffAudit } = require('./middleware');

module.exports = function staffRolesRouter(pool) {
  const router = express.Router();

  // GET / — list all roles
  router.get('/', requireStaffAuth(pool), requirePermission('roles.view', pool), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, description, permissions, is_system, sort_order FROM staff_roles ORDER BY sort_order ASC'
      );
      res.json({ roles: result.rows });
    } catch (err) {
      console.error('[staff/roles] GET / error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST / — create custom role
  router.post('/', requireStaffAuth(pool), requirePermission('roles.manage', pool), async (req, res) => {
    try {
      const { name, description, permissions } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      // Check name uniqueness
      const existing = await pool.query('SELECT id FROM staff_roles WHERE name = $1', [name]);
      if (existing.rows[0]) return res.status(409).json({ error: 'Role name already in use' });

      const id = `role_${name.toLowerCase().replace(/\s+/g, '_')}`;
      const is_system = false;
      const sort_order = 99;

      await pool.query(
        'INSERT INTO staff_roles (id, name, description, permissions, is_system, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, name, description || null, JSON.stringify(permissions || {}), is_system, sort_order]
      );

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'roles', action: 'created',
        resourceType: 'role', resourceId: id,
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      const created = await pool.query(
        'SELECT id, name, description, permissions, is_system, sort_order FROM staff_roles WHERE id = $1',
        [id]
      );
      res.status(201).json({ role: created.rows[0] });
    } catch (err) {
      console.error('[staff/roles] POST / error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id — update role
  router.patch('/:id', requireStaffAuth(pool), requirePermission('roles.manage', pool), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      // Fetch existing role
      const existing = await pool.query(
        'SELECT id, name, description, permissions, is_system, sort_order FROM staff_roles WHERE id = $1',
        [id]
      );
      if (!existing.rows[0]) return res.status(404).json({ error: 'Role not found' });
      const role = existing.rows[0];

      // System role restrictions
      if (role.is_system) {
        if (name !== undefined && name !== role.name) {
          return res.status(400).json({ error: 'Cannot modify name of system role' });
        }
        // Cannot remove permissions that exist in the current system role
        if (permissions !== undefined) {
          const currentPerms = role.permissions || {};
          for (const key of Object.keys(currentPerms)) {
            if (currentPerms[key] && !permissions[key]) {
              return res.status(400).json({ error: 'Cannot remove permissions from system role' });
            }
          }
        }
      }

      const updates = {};
      if (name !== undefined && !role.is_system) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = [id, ...Object.values(updates)];
      await pool.query(`UPDATE staff_roles SET ${setClauses} WHERE id = $1`, values);

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'roles', action: 'edited',
        resourceType: 'role', resourceId: id,
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      const updated = await pool.query(
        'SELECT id, name, description, permissions, is_system, sort_order FROM staff_roles WHERE id = $1',
        [id]
      );
      res.json({ role: updated.rows[0] });
    } catch (err) {
      console.error('[staff/roles] PATCH /:id error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
