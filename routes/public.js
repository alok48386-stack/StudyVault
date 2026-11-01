const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const config = require('../config');
const { formatBytes, formatDate } = require('../utils/helpers');

// Helper to fetch all categories with their note counts
function getCategoriesWithCounts() {
  return db.prepare(`
    SELECT c.*, COUNT(n.id) as note_count
    FROM categories c
    LEFT JOIN notes n ON n.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all();
}

// GET / - Home page
router.get('/', (req, res) => {
  const selectedCategorySlug = req.query.category || null;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = config.pagination.perPage;
  const offset = (page - 1) * perPage;

  const categories = getCategoriesWithCounts();
  let selectedCategory = null;

  let categoryCondition = '';
  const params = [];

  if (selectedCategorySlug && selectedCategorySlug !== 'all') {
    selectedCategory = db.prepare('SELECT * FROM categories WHERE slug = ?').get(selectedCategorySlug);
    if (selectedCategory) {
      categoryCondition = 'WHERE n.category_id = ?';
      params.push(selectedCategory.id);
    }
  }

  // 1. Latest Notes (min 8)
  const latestNotes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    ${categoryCondition}
    ORDER BY n.created_at DESC
    LIMIT ?
  `).all(...params, config.pagination.latestCount);

  // 2. Popular Notes (min 8)
  const popularNotes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    ${categoryCondition}
    ORDER BY n.download_count DESC, n.created_at DESC
    LIMIT ?
  `).all(...params, config.pagination.popularCount);

  // 3. All Notes (Paginated 12 per page)
  const totalCountResult = db.prepare(`
    SELECT COUNT(*) as total
    FROM notes n
    ${categoryCondition}
  `).get(...params);
  const totalNotes = totalCountResult ? totalCountResult.total : 0;
  const totalPages = Math.ceil(totalNotes / perPage) || 1;

  const allNotes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    ${categoryCondition}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  res.render('home', {
    title: `${config.siteName} - Free Student Study Notes & Formula Sheets`,
    categories,
    selectedCategory,
    selectedCategorySlug,
    latestNotes,
    popularNotes,
    allNotes,
    pagination: {
      currentPage: page,
      totalPages,
      totalNotes,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    }
  });
});

// GET /category/:slug - Notes filtered by subject
router.get('/category/:slug', (req, res) => {
  const categorySlug = req.params.slug;
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(categorySlug);
  
  if (!category) {
    return res.status(404).render('404', {
      title: 'Subject Not Found - ' + config.siteName,
      message: `The subject "${categorySlug}" could not be found.`
    });
  }

  // Redirect to home with category filter query for unified UI state
  return res.redirect(`/?category=${encodeURIComponent(category.slug)}`);
});

// GET /search - Full search results page
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  const categories = getCategoriesWithCounts();
  
  if (!query) {
    return res.redirect('/');
  }

  const searchParam = `%${query}%`;
  const results = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.title LIKE ? OR n.description LIKE ? OR c.name LIKE ?
    ORDER BY n.download_count DESC, n.created_at DESC
  `).all(searchParam, searchParam, searchParam);

  res.render('search', {
    title: `Search results for "${query}" - ${config.siteName}`,
    query,
    results,
    categories
  });
});

// GET /note/:slug - Note detail page
router.get('/note/:slug', (req, res) => {
  const slug = req.params.slug;
  const note = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.slug = ? OR n.id = ?
  `).get(slug, parseInt(slug, 10) || -1);

  if (!note) {
    return res.status(404).render('404', {
      title: 'Note Not Found - ' + config.siteName,
      message: 'The requested study note does not exist or has been removed.'
    });
  }

  // Related notes row (same subject, 4 items, excluding current note)
  const relatedNotes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.category_id = ? AND n.id != ?
    ORDER BY n.download_count DESC, n.created_at DESC
    LIMIT ?
  `).all(note.category_id, note.id, config.pagination.relatedCount);

  // If fewer than 4 related notes in same category, supplement with top popular notes
  if (relatedNotes.length < config.pagination.relatedCount) {
    const needed = config.pagination.relatedCount - relatedNotes.length;
    const existingIds = [note.id, ...relatedNotes.map(r => r.id)];
    const placeholders = existingIds.map(() => '?').join(',');
    
    const additional = db.prepare(`
      SELECT n.*, c.name as category_name, c.slug as category_slug
      FROM notes n
      JOIN categories c ON n.category_id = c.id
      WHERE n.id NOT IN (${placeholders})
      ORDER BY n.download_count DESC
      LIMIT ?
    `).all(...existingIds, needed);
    
    relatedNotes.push(...additional);
  }

  res.render('note', {
    title: `${note.title} - Free Download | ${config.siteName}`,
    metaDescription: `${note.title} (${note.category_name}) - ${note.description.substring(0, 150)}...`,
    note,
    relatedNotes
  });
});

// GET /download/:slug - Download page with 5-second progress loader
router.get('/download/:slug', (req, res) => {
  const slug = req.params.slug;
  const note = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.slug = ? OR n.id = ?
  `).get(slug, parseInt(slug, 10) || -1);

  if (!note) {
    return res.status(404).render('404', {
      title: 'Note Not Found - ' + config.siteName,
      message: 'The requested download could not be found.'
    });
  }

  // Suggested notes (6 to 8 notes: same subject first, then popular notes)
  const suggestedNotes = db.prepare(`
    SELECT n.*, c.name as category_name, c.slug as category_slug
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    WHERE n.id != ?
    ORDER BY 
      CASE WHEN n.category_id = ? THEN 0 ELSE 1 END,
      n.download_count DESC,
      n.created_at DESC
    LIMIT ?
  `).all(note.id, note.category_id, config.pagination.suggestedCount);

  res.render('download', {
    title: `Downloading: ${note.title} - ${config.siteName}`,
    note,
    suggestedNotes
  });
});

// GET /file/:slug - Sends the file and increments the download count
router.get('/file/:slug', (req, res) => {
  const slug = req.params.slug;
  const note = db.prepare(`
    SELECT * FROM notes WHERE slug = ? OR id = ?
  `).get(slug, parseInt(slug, 10) || -1);

  if (!note) {
    return res.status(404).send('File not found');
  }

  // Increment download count
  db.prepare('UPDATE notes SET download_count = download_count + 1 WHERE id = ?').run(note.id);

  // Resolve absolute path to the stored note file
  let fullPath = path.isAbsolute(note.file_path)
    ? note.file_path
    : path.join(__dirname, '..', note.file_path);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('The requested physical file was not found on the server.');
  }

  // Sanitize download filename for the browser
  const ext = path.extname(fullPath) || `.${note.file_type}`;
  const downloadFilename = `${note.slug}${ext}`;

  res.download(fullPath, downloadFilename, (err) => {
    if (err && !res.headersSent) {
      console.error('Download error:', err);
      res.status(500).send('Error delivering file.');
    }
  });
});

// GET /sitemap.xml - Dynamic XML sitemap for SEO
router.get('/sitemap.xml', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const notes = db.prepare('SELECT slug, updated_at FROM notes ORDER BY updated_at DESC').all();
  const categories = db.prepare('SELECT slug FROM categories ORDER BY name ASC').all();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Home
  xml += `  <url>\n    <loc>${host}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  
  // Categories
  categories.forEach(c => {
    xml += `  <url>\n    <loc>${host}/category/${c.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // Notes
  notes.forEach(n => {
    const lastmod = n.updated_at ? new Date(n.updated_at).toISOString().split('T')[0] : '';
    xml += `  <url>\n    <loc>${host}/note/${n.slug}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// GET /robots.txt
router.get('/robots.txt', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const content = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${host}/sitemap.xml\n`;
  res.header('Content-Type', 'text/plain');
  res.send(content);
});

module.exports = router;
