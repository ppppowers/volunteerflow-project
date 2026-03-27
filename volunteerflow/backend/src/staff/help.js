'use strict';
const { requireStaffAuth } = require('./middleware');

function staffHelpRouter(pool) {
  const router = require('express').Router();

  // GET / — list all items (drafts + published), staff only
  router.get('/', requireStaffAuth(pool), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM help_content ORDER BY type, sort_order, created_at'
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('[staff/help] GET error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST / — create a new item
  router.post('/', requireStaffAuth(pool), async (req, res) => {
    try {
      const { type, title, body, category, sort_order, published, video_url } = req.body;
      if (!['faq', 'article'].includes(type)) {
        return res.status(400).json({ error: 'type must be faq or article' });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const result = await pool.query(
        `INSERT INTO help_content (type, title, body, category, sort_order, published, video_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          type,
          title.trim(),
          (body || '').trim(),
          (category || '').trim() || null,
          sort_order ?? 0,
          published ?? false,
          (video_url || '').trim() || null,
        ]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('[staff/help] POST error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /:id — update an item (client always sends all fields)
  router.put('/:id', requireStaffAuth(pool), async (req, res) => {
    try {
      const { id } = req.params;
      const { type, title, body, category, sort_order, published, video_url } = req.body;
      if (!['faq', 'article'].includes(type)) {
        return res.status(400).json({ error: 'type must be faq or article' });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const result = await pool.query(
        `UPDATE help_content
         SET type       = $2,
             title      = $3,
             body       = $4,
             category   = $5,
             sort_order = $6,
             published  = $7,
             video_url  = $8,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          type,
          (title || '').trim(),
          (body || '').trim(),
          (category || '').trim() || null,
          sort_order ?? 0,
          published ?? false,
          (video_url || '').trim() || null,
        ]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('[staff/help] PUT error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /:id — delete an item
  router.delete('/:id', requireStaffAuth(pool), async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM help_content WHERE id = $1',
        [req.params.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[staff/help] DELETE error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = staffHelpRouter;
