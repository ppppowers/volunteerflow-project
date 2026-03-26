'use strict';
const { requireStaffAuth } = require('./middleware');

function staffFeedbackRouter(pool) {
  const router = require('express').Router();

  // GET / — list all feedback, newest first
  router.get('/', requireStaffAuth(pool), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM feedback ORDER BY created_at DESC'
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('[staff/feedback] GET error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id/status — mark feedback as new or reviewed
  router.patch('/:id/status', requireStaffAuth(pool), async (req, res) => {
    try {
      const { status } = req.body;
      if (!['new', 'reviewed'].includes(status)) {
        return res.status(400).json({ error: "status must be 'new' or 'reviewed'" });
      }
      const result = await pool.query(
        'UPDATE feedback SET status = $1 WHERE id = $2 RETURNING id',
        [status, req.params.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[staff/feedback] PATCH status error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = staffFeedbackRouter;
