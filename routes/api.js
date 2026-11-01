const express = require('express');
const router = express.Router();
const db = require('../database/db');
const config = require('../config');
const { formatBytes } = require('../utils/helpers');

// GET /api/search?q= - Live search suggestions (max 5)
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json([]);
  }

  const searchParam = `%${query}%`;
  const limit = config.pagination.searchLimit || 5;

  const results = db.prepare(`
    SELECT n.id, n.title, n.slug, n.file_type, n.file_size, n.download_count,
           c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.title LIKE ? OR n.description LIKE ? OR c.name LIKE ?
    ORDER BY n.download_count DESC, n.created_at DESC
    LIMIT ?
  `).all(searchParam, searchParam, searchParam, limit);

  const formatted = results.map(item => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category_name,
    category_slug: item.category_slug,
    file_type: item.file_type.toUpperCase(),
    file_size: formatBytes(item.file_size),
    download_count: item.download_count,
    url: `/note/${item.slug}`
  }));

  res.json(formatted);
});

// GET /api/notes?page=&category= - Paginated JSON list of notes
router.get('/notes', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const categorySlug = req.query.category || null;
  const perPage = config.pagination.perPage;
  const offset = (page - 1) * perPage;

  let categoryCondition = '';
  const params = [];

  if (categorySlug && categorySlug !== 'all') {
    const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(categorySlug);
    if (category) {
      categoryCondition = 'WHERE n.category_id = ?';
      params.push(category.id);
    }
  }

  const totalCountResult = db.prepare(`
    SELECT COUNT(*) as total
    FROM notes n
    ${categoryCondition}
  `).get(...params);
  const total = totalCountResult ? totalCountResult.total : 0;
  const totalPages = Math.ceil(total / perPage) || 1;

  const notes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    ${categoryCondition}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  res.json({
    page,
    totalPages,
    totalNotes: total,
    notes: notes.map(n => ({
      ...n,
      file_size_formatted: formatBytes(n.file_size)
    }))
  });
});

module.exports = router;
