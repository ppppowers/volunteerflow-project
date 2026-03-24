'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { requireStaffAuth, logStaffAudit } = require('./middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

module.exports = function staffAuthRouter(pool) {
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query(`
      SELECT su.id, su.email, su.full_name, su.role_id, su.is_active,
             su.password_hash, sr.permissions
      FROM staff_users su
      JOIN staff_roles sr ON sr.id = su.role_id
      WHERE su.email = $1
    `, [email.toLowerCase()]);

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const perms = Object.keys(user.permissions || {}).filter(k => user.permissions[k]);
    const sessionId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO staff_sessions (id, staff_user_id, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)',
      [sessionId, user.id, req.ip, req.headers['user-agent'] || '', expiresAt]
    );
    pool.query('UPDATE staff_users SET last_login = NOW() WHERE id = $1', [user.id]).catch(() => {});

    const STAFF_JWT_SECRET = process.env.STAFF_JWT_SECRET;
    const payload = {
      staffId: user.id, email: user.email, name: user.full_name,
      roleId: user.role_id, permissions: perms, sessionId,
    };
    const token = jwt.sign(payload, STAFF_JWT_SECRET, { expiresIn: '8h' });

    logStaffAudit(pool, {
      staffUserId: user.id, staffUserName: user.full_name, staffRole: user.role_id,
      category: 'auth', action: 'login', ipAddress: req.ip, staffSessionId: sessionId,
    }).catch(() => {});

    res.json({ token, user: { staffId: user.id, email: user.email, name: user.full_name, roleId: user.role_id, permissions: perms, sessionId } });
  });

  router.post('/logout', requireStaffAuth(pool), async (req, res) => {
    await pool.query('UPDATE staff_sessions SET is_active = false WHERE id = $1', [req.staff.sessionId]);
    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      category: 'auth', action: 'logout', ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});
    res.json({ ok: true });
  });

  router.get('/me', requireStaffAuth(pool), (req, res) => {
    res.json({ user: req.staff });
  });

  return router;
};
