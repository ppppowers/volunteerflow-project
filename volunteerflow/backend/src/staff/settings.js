'use strict';
const { requireStaffAuth } = require('./middleware');

function staffSettingsRouter(pool) {
  const router = require('express').Router();

  // GET / — return all system settings as a plain key->value object
  router.get('/', requireStaffAuth(pool), async (req, res) => {
    if (!req.staff.permissions.includes('feature_flags.manage')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const result = await pool.query('SELECT key, value FROM system_settings ORDER BY key');
      const data = {};
      for (const row of result.rows) {
        data[row.key] = row.value;
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error('[staff/settings] GET error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:key — update a single setting value (JSONB)
  router.patch('/:key', requireStaffAuth(pool), async (req, res) => {
    if (!req.staff.permissions.includes('feature_flags.manage')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const { key } = req.params;
      if (req.body.value === undefined) {
        return res.status(400).json({ error: 'value is required' });
      }
      const result = await pool.query(
        `UPDATE system_settings
         SET value = $1::jsonb, updated_by = $2, updated_at = NOW()
         WHERE key = $3
         RETURNING key`,
        [JSON.stringify(req.body.value), req.staff.id, key]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[staff/settings] PATCH error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = staffSettingsRouter;
