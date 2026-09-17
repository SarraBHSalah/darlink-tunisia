// ===========================================================
// DarLink Tunisia — one-time seed: import the 50 demo
// properties and create the initial admin account.
// Run with: npm run seed
// Safe to re-run — it skips work that's already done.
// ===========================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

function loadStaticProperties() {
  const file = path.join(__dirname, '..', 'public', 'js', 'data.js');
  const text = fs.readFileSync(file, 'utf-8');
  const marker = 'const PROPERTIES = ';
  const idx = text.indexOf(marker);
  if (idx === -1) throw new Error('Could not find "const PROPERTIES = " marker in data.js');
  let jsonText = text.slice(idx + marker.length).trim();
  if (jsonText.endsWith(';')) jsonText = jsonText.slice(0, -1);
  return JSON.parse(jsonText);
}

function seedProperties() {
  if (db.get('properties').size().value() > 0) {
    console.log('Properties already seeded (' + db.get('properties').size().value() + ' rows) — skipping.');
    return;
  }
  const props = loadStaticProperties();
  const now = new Date().toISOString();
  const withMeta = props.map(p => ({ ...p, createdAt: now, updatedAt: now }));
  db.set('properties', withMeta).write();
  const nextId = Math.max(...withMeta.map(p => p.id), 0) + 1;
  db.set('meta.nextPropertyId', nextId).write();
  console.log(`Seeded ${withMeta.length} properties (nextPropertyId=${nextId}).`);
}

function seedAdmin() {
  if (db.get('admins').size().value() > 0) {
    console.log('Admin account already exists — skipping.');
    return;
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'darlink2026';
  const hash = bcrypt.hashSync(password, 10);
  db.get('admins').push({ id: 1, username, passwordHash: hash, createdAt: new Date().toISOString() }).write();
  console.log(`Admin account created — username: "${username}"`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`No ADMIN_PASSWORD set in .env — using default password "darlink2026". CHANGE THIS before going live.`);
  }
}

seedProperties();
seedAdmin();
console.log('Seed complete.');
