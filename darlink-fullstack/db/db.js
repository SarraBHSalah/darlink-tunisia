// ===========================================================
// DarLink Tunisia — JSON file database (lowdb v1, synchronous)
// Lightweight, dependency-free persistence layer suited to a
// single-admin small business site. Swap for Postgres/MySQL
// later if the catalogue grows large or multiple admins write
// concurrently.
// ===========================================================
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'darlink.json');
const adapter = new FileSync(DB_FILE);
const db = low(adapter);

db.defaults({
  properties: [],
  leads: [],
  admins: [],
  meta: { nextPropertyId: 1, nextLeadId: 1 }
}).write();

module.exports = db;
