'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { requireStaffAuth, requirePermission, logStaffAudit } = require('./middleware');

module.exports = function staffEmployeesRouter(pool) {
  const router = express.Router();

  // GET / — list all employees
  router.get('/', requireStaffAuth(pool), requirePermission('employees.view', pool), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT su.id, su.email, su.full_name as name, su.title, su.is_active, su.created_at, su.last_login,
               sr.id as role_id, sr.name as role_name
        FROM staff_users su
        JOIN staff_roles sr ON su.role_id = sr.id
        ORDER BY su.full_name ASC
      `);
      res.json({ employees: result.rows });
    } catch (err) {
      console.error('[staff/employees] GET / error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /:id — single employee
  router.get('/:id', requireStaffAuth(pool), requirePermission('employees.view', pool), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT su.id, su.email, su.full_name as name, su.title, su.is_active, su.created_at, su.last_login,
               sr.id as role_id, sr.name as role_name
        FROM staff_users su
        JOIN staff_roles sr ON su.role_id = sr.id
        WHERE su.id = $1
      `, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Employee not found' });
      res.json({ employee: result.rows[0] });
    } catch (err) {
      console.error('[staff/employees] GET /:id error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST / — create employee
  router.post('/', requireStaffAuth(pool), requirePermission('employees.create', pool), async (req, res) => {
    try {
      const { email, name, title, roleId, password } = req.body;

      // Validate required fields
      if (!email || !name || !password) {
        return res.status(400).json({ error: 'email, name, and password are required' });
      }

      // Check email uniqueness
      const existing = await pool.query('SELECT id FROM staff_users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows[0]) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      const hash = await bcrypt.hash(password, 12);
      const id = randomUUID();

      await pool.query(
        'INSERT INTO staff_users (id, email, full_name, title, role_id, password_hash, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, email.toLowerCase(), name, title || null, roleId || null, hash, req.staff.staffId]
      );

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'employees', action: 'created',
        resourceType: 'employee', resourceId: id,
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      const created = await pool.query(`
        SELECT su.id, su.email, su.full_name as name, su.title, su.is_active, su.created_at, su.last_login,
               sr.id as role_id, sr.name as role_name
        FROM staff_users su
        JOIN staff_roles sr ON su.role_id = sr.id
        WHERE su.id = $1
      `, [id]);

      res.status(201).json({ employee: created.rows[0] });
    } catch (err) {
      console.error('[staff/employees] POST / error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id — update employee fields
  router.patch('/:id', requireStaffAuth(pool), requirePermission('employees.edit', pool), async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch current employee
      const current = await pool.query('SELECT * FROM staff_users WHERE id = $1', [id]);
      if (!current.rows[0]) return res.status(404).json({ error: 'Employee not found' });
      const before = current.rows[0];

      // Only allowed fields
      const allowed = { name: 'full_name', title: 'title', roleId: 'role_id' };
      const updates = {};
      const fieldChanges = {};

      if (req.body.name !== undefined) {
        updates['full_name'] = req.body.name;
        fieldChanges['name'] = { before: before.full_name, after: req.body.name };
      }
      if (req.body.title !== undefined) {
        updates['title'] = req.body.title;
        fieldChanges['title'] = { before: before.title, after: req.body.title };
      }
      if (req.body.roleId !== undefined) {
        updates['role_id'] = req.body.roleId;
        fieldChanges['roleId'] = { before: before.role_id, after: req.body.roleId };
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = [id, ...Object.values(updates)];
      await pool.query(`UPDATE staff_users SET ${setClauses} WHERE id = $1`, values);

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'employees', action: 'edited',
        resourceType: 'employee', resourceId: id,
        fieldChanges,
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      const updated = await pool.query(`
        SELECT su.id, su.email, su.full_name as name, su.title, su.is_active, su.created_at, su.last_login,
               sr.id as role_id, sr.name as role_name
        FROM staff_users su
        JOIN staff_roles sr ON su.role_id = sr.id
        WHERE su.id = $1
      `, [id]);

      res.json({ employee: updated.rows[0] });
    } catch (err) {
      console.error('[staff/employees] PATCH /:id error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id/disable — disable an employee account
  router.patch('/:id/disable', requireStaffAuth(pool), requirePermission('employees.disable', pool), async (req, res) => {
    try {
      const { id } = req.params;

      // Cannot disable self
      if (id === req.staff.staffId) {
        return res.status(400).json({ error: 'Cannot disable yourself' });
      }

      const result = await pool.query(
        'UPDATE staff_users SET is_active = false WHERE id = $1',
        [id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Employee not found' });

      logStaffAudit(pool, {
        staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
        category: 'employees', action: 'disabled',
        resourceType: 'employee', resourceId: id,
        ipAddress: req.ip, staffSessionId: req.staff.sessionId,
      }).catch(() => {});

      res.json({ ok: true });
    } catch (err) {
      console.error('[staff/employees] PATCH /:id/disable error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
