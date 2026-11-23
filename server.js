const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'neovalues-admin-2024';

// --- Database Setup ---
// Use /app/data/ on Railway (persistent volume), local dir for dev
const dbDir = process.env.RAILWAY_ENVIRONMENT ? '/app/data' : __dirname;
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, 'results.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    name TEXT,
    economics TEXT,
    resource_management TEXT,
    culture TEXT,
    authority TEXT,
    nation TEXT,
    foreign_policy TEXT,
    technology TEXT,
    social_control TEXT,
    territorial_organization TEXT,
    matched_ideology TEXT,
    next_closest TEXT,
    user_agent TEXT,
    ip TEXT
  )
`);

// Safe migrations for existing v1.4 Databases
const migrations = [
  'ALTER TABLE submissions ADD COLUMN name TEXT',
  'ALTER TABLE submissions ADD COLUMN technology TEXT',
  'ALTER TABLE submissions ADD COLUMN social_control TEXT',
  'ALTER TABLE submissions ADD COLUMN territorial_organization TEXT'
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) {}
}

const insertStmt = db.prepare(`
  INSERT INTO submissions (
    name, economics, resource_management, culture, authority, nation,
    foreign_policy, technology, social_control, territorial_organization,
    matched_ideology, next_closest, user_agent, ip
  )
  VALUES (
    @name, @economics, @resource_management, @culture, @authority, @nation,
    @foreign_policy, @technology, @social_control, @territorial_organization,
    @matched_ideology, @next_closest, @user_agent, @ip
  )
`);

const getAllStmt = db.prepare('SELECT * FROM submissions ORDER BY id DESC');
const getCountStmt = db.prepare('SELECT COUNT(*) as count FROM submissions');
const deleteStmt = db.prepare('DELETE FROM submissions WHERE id = ?');

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// --- API: Submit Results ---
app.post('/api/submit', (req, res) => {
  try {
    const { results = {}, matchedIdeology, nextClosest, userName } = req.body || {};

    insertStmt.run({
      name: userName || null,
      economics: results.economics || null,
      resource_management: results.resource_management || null,
      culture: results.culture || null,
      authority: results.authority || null,
      nation: results.nation || null,
      foreign_policy: results.foreign || null,
      technology: results.technology || null,
      social_control: results.social_control || null,
      territorial_organization: results.territorial_organization || null,
      matched_ideology: matchedIdeology || null,
      next_closest: nextClosest || null,
      user_agent: req.headers['user-agent'] || null,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// --- API: Admin Data (password protected) ---
app.get('/api/admin/results', (req, res) => {
  const pw = req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Wrong password' });
  }

  const submissions = getAllStmt.all();
  const count = getCountStmt.get().count;
  res.json({ count, submissions });
});

// --- API: Delete Submission (password protected) ---
app.delete('/api/admin/results/:id', (req, res) => {
  const pw = req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Wrong password' });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid submission id' });
  }

  const info = deleteStmt.run(id);
  res.json({ ok: true, deleted: info.changes });
});

// --- Start ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NeoValues server running on port ${PORT}`);
  });
}

module.exports = app;
