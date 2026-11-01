const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const config = require('../config');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/upload');
const { slugify, formatBytes, formatDate } = require('../utils/helpers');

// Helper to safely delete file if it exists and is within storage folder
function deleteFileSafely(relativePath) {
  if (!relativePath) return;
  // Don't delete default preview
  if (relativePath.includes('default-preview.svg')) return;

  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(__dirname, '..', relativePath);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      console.warn('Failed to delete file:', fullPath, e.message);
    }
  }
}

// ----------------------------------------------------
// Authentication Routes (Public to admin attempt)
// ----------------------------------------------------

// GET /admin/login - Login Page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin/login', {
    title: 'Admin Login - ' + config.siteName,
    error: req.session.loginError || null
  });
  req.session.loginError = null;
});

// POST /admin/login - Process Password
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    req.session.isAdmin = true;
    const redirectUrl = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    return res.redirect(redirectUrl);
  } else {
    req.session.loginError = 'Invalid admin password. Please try again.';
    return res.redirect('/admin/login');
  }
});

// GET /admin/logout - Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Apply admin authentication to all subsequent routes
router.use(adminAuth);

// ----------------------------------------------------
// Admin Protected Routes
// ----------------------------------------------------

// GET /admin - Dashboard Overview
router.get('/', (req, res) => {
  const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
  const totalDownloads = db.prepare('SELECT COALESCE(SUM(download_count), 0) as count FROM notes').get().count;
  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;

  const latestNotes = db.prepare(`
    SELECT n.*, c.name as category_name
    FROM notes n
    JOIN categories c ON n.category_id = c.id
    ORDER BY n.created_at DESC
    LIMIT 5
  `).all();

  res.render('admin/dashboard', {
    title: 'Admin Dashboard - ' + config.siteName,
    activeNav: 'dashboard',
    stats: {
      totalNotes,
      totalDownloads,
      totalCategories
    },
    latestNotes
  });
});

// GET /admin/notes - Notes List with Search
router.get('/notes', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  let query = `
    SELECT n.*, c.name as category_name
    FROM notes n
    JOIN categories c ON n.category_id = c.id
  `;
  const params = [];

  if (searchQuery) {
    query += ` WHERE n.title LIKE ? OR n.description LIKE ? OR c.name LIKE ?`;
    const sp = `%${searchQuery}%`;
    params.push(sp, sp, sp);
  }

  query += ` ORDER BY n.created_at DESC`;

  const notes = db.prepare(query).all(...params);
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

  res.render('admin/notes', {
    title: 'Manage Notes - Admin Panel',
    activeNav: 'notes',
    notes,
    categories,
    searchQuery,
    success: req.session.flashSuccess || null,
    error: req.session.flashError || null
  });
  req.session.flashSuccess = null;
  req.session.flashError = null;
});

// GET /admin/notes/new - Add Note Form
router.get('/notes/new', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.render('admin/note-form', {
    title: 'Upload New Note - Admin Panel',
    activeNav: 'new-note',
    isEdit: false,
    note: {},
    categories,
    error: req.session.flashError || null
  });
  req.session.flashError = null;
});

// POST /admin/notes/new - Handle Add Note Submission
router.post('/notes/new', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      req.session.flashError = err.message || 'File upload failed.';
      return res.redirect('/admin/notes/new');
    }

    try {
      const { title, category_id, description, uploader_name } = req.body;

      if (!title || !category_id || !description) {
        req.session.flashError = 'Title, Category, and Description are required.';
        return res.redirect('/admin/notes/new');
      }

      if (!req.files || !req.files.note_file || req.files.note_file.length === 0) {
        req.session.flashError = 'Please upload a note file (PDF, DOC, DOCX, PPT, ZIP).';
        return res.redirect('/admin/notes/new');
      }

      const noteFile = req.files.note_file[0];
      const previewFile = req.files.preview_image ? req.files.preview_image[0] : null;

      // Generate unique slug
      let baseSlug = slugify(title) || 'note';
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM notes WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }

      const ext = path.extname(noteFile.filename).replace('.', '').toLowerCase();
      const relativeNotePath = path.join('storage', 'notes', noteFile.filename).replace(/\\/g, '/');
      const relativePreviewPath = previewFile
        ? path.join('storage', 'previews', previewFile.filename).replace(/\\/g, '/')
        : 'storage/previews/default-preview.svg';

      db.prepare(`
        INSERT INTO notes (
          title, slug, description, category_id, uploader_name,
          file_path, file_type, file_size, preview_image,
          download_count, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          0, datetime('now'), datetime('now')
        )
      `).run(
        title.trim(),
        slug,
        description.trim(),
        parseInt(category_id, 10),
        (uploader_name || 'Admin').trim(),
        relativeNotePath,
        ext,
        noteFile.size,
        relativePreviewPath
      );

      req.session.flashSuccess = `Note "${title}" uploaded successfully!`;
      res.redirect('/admin/notes');
    } catch (e) {
      console.error('Error creating note:', e);
      req.session.flashError = 'Database error: ' + e.message;
      res.redirect('/admin/notes/new');
    }
  });
});

// GET /admin/notes/:id/edit - Edit Note Form
router.get('/notes/:id/edit', (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);

  if (!note) {
    req.session.flashError = 'Note not found.';
    return res.redirect('/admin/notes');
  }

  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

  res.render('admin/note-form', {
    title: `Edit Note: ${note.title} - Admin Panel`,
    activeNav: 'notes',
    isEdit: true,
    note,
    categories,
    error: req.session.flashError || null
  });
  req.session.flashError = null;
});

// POST /admin/notes/:id/edit - Update Note
router.post('/notes/:id/edit', (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const existingNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);

  if (!existingNote) {
    req.session.flashError = 'Note not found.';
    return res.redirect('/admin/notes');
  }

  upload(req, res, (err) => {
    if (err) {
      req.session.flashError = err.message || 'File upload error.';
      return res.redirect(`/admin/notes/${noteId}/edit`);
    }

    try {
      const { title, category_id, description, uploader_name } = req.body;

      if (!title || !category_id || !description) {
        req.session.flashError = 'Title, Category, and Description are required.';
        return res.redirect(`/admin/notes/${noteId}/edit`);
      }

      // If title changed, update slug ensuring uniqueness
      let newSlug = existingNote.slug;
      if (title.trim() !== existingNote.title) {
        let baseSlug = slugify(title) || 'note';
        newSlug = baseSlug;
        let counter = 1;
        while (db.prepare('SELECT id FROM notes WHERE slug = ? AND id != ?').get(newSlug, noteId)) {
          newSlug = `${baseSlug}-${counter++}`;
        }
      }

      let filePath = existingNote.file_path;
      let fileType = existingNote.file_type;
      let fileSize = existingNote.file_size;
      let previewImage = existingNote.preview_image;

      // If new note file uploaded, delete old and update
      if (req.files && req.files.note_file && req.files.note_file.length > 0) {
        deleteFileSafely(existingNote.file_path);
        const newFile = req.files.note_file[0];
        filePath = path.join('storage', 'notes', newFile.filename).replace(/\\/g, '/');
        fileType = path.extname(newFile.filename).replace('.', '').toLowerCase();
        fileSize = newFile.size;
      }

      // If new preview image uploaded, delete old and update
      if (req.files && req.files.preview_image && req.files.preview_image.length > 0) {
        deleteFileSafely(existingNote.preview_image);
        const newPreview = req.files.preview_image[0];
        previewImage = path.join('storage', 'previews', newPreview.filename).replace(/\\/g, '/');
      }

      db.prepare(`
        UPDATE notes
        SET title = ?,
            slug = ?,
            description = ?,
            category_id = ?,
            uploader_name = ?,
            file_path = ?,
            file_type = ?,
            file_size = ?,
            preview_image = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        title.trim(),
        newSlug,
        description.trim(),
        parseInt(category_id, 10),
        (uploader_name || 'Admin').trim(),
        filePath,
        fileType,
        fileSize,
        previewImage,
        noteId
      );

      req.session.flashSuccess = `Note "${title}" updated successfully!`;
      res.redirect('/admin/notes');
    } catch (e) {
      console.error('Error updating note:', e);
      req.session.flashError = 'Database error: ' + e.message;
      res.redirect(`/admin/notes/${noteId}/edit`);
    }
  });
});

// POST /admin/notes/:id/delete - Delete Note
router.post('/notes/:id/delete', (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);

  if (!note) {
    req.session.flashError = 'Note not found.';
    return res.redirect('/admin/notes');
  }

  try {
    // Delete physical files
    deleteFileSafely(note.file_path);
    deleteFileSafely(note.preview_image);

    // Remove from database
    db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);

    req.session.flashSuccess = `Note "${note.title}" has been deleted.`;
  } catch (e) {
    console.error('Error deleting note:', e);
    req.session.flashError = 'Could not delete note: ' + e.message;
  }

  res.redirect('/admin/notes');
});

// ----------------------------------------------------
// Categories Management
// ----------------------------------------------------

// GET /admin/categories - List & Manage Categories
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(n.id) as note_count
    FROM categories c
    LEFT JOIN notes n ON n.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all();

  res.render('admin/categories', {
    title: 'Manage Subjects / Categories - Admin Panel',
    activeNav: 'categories',
    categories,
    success: req.session.flashSuccess || null,
    error: req.session.flashError || null
  });
  req.session.flashSuccess = null;
  req.session.flashError = null;
});

// POST /admin/categories/new - Add Category
router.post('/categories/new', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    req.session.flashError = 'Subject name cannot be empty.';
    return res.redirect('/admin/categories');
  }

  let slug = slugify(name);
  if (!slug) slug = 'subject-' + Date.now();

  try {
    db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
    req.session.flashSuccess = `Category "${name}" created!`;
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      req.session.flashError = 'A subject with this name or slug already exists.';
    } else {
      req.session.flashError = 'Error adding subject: ' + e.message;
    }
  }

  res.redirect('/admin/categories');
});

// POST /admin/categories/:id/edit - Rename Category
router.post('/categories/:id/edit', (req, res) => {
  const categoryId = parseInt(req.params.id, 10);
  const name = (req.body.name || '').trim();

  if (!name) {
    req.session.flashError = 'Subject name cannot be empty.';
    return res.redirect('/admin/categories');
  }

  let slug = slugify(name);
  try {
    db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').run(name, slug, categoryId);
    req.session.flashSuccess = `Subject updated to "${name}".`;
  } catch (e) {
    req.session.flashError = 'Could not update subject: ' + e.message;
  }

  res.redirect('/admin/categories');
});

// POST /admin/categories/:id/delete - Delete Category
router.post('/categories/:id/delete', (req, res) => {
  const categoryId = parseInt(req.params.id, 10);
  const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE category_id = ?').get(categoryId).count;

  if (noteCount > 0) {
    req.session.flashError = `Cannot delete subject because it contains ${noteCount} note(s). Please reassign or delete those notes first.`;
    return res.redirect('/admin/categories');
  }

  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    req.session.flashSuccess = 'Subject deleted successfully.';
  } catch (e) {
    req.session.flashError = 'Error deleting subject: ' + e.message;
  }

  res.redirect('/admin/categories');
});

module.exports = router;
