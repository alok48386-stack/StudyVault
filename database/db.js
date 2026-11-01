const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure storage directories exist
if (!fs.existsSync(config.storage.notesDir)) {
  fs.mkdirSync(config.storage.notesDir, { recursive: true });
}
if (!fs.existsSync(config.storage.previewsDir)) {
  fs.mkdirSync(config.storage.previewsDir, { recursive: true });
}

// Initialize SQLite connection
const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema if tables don't exist
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

module.exports = db;
