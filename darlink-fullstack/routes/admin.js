// ===========================================================
// DarLink Tunisia — admin API: auth + property & lead management
// ===========================================================
const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

// --- very small in-memory login rate limiter (per IP) ---
const loginAttempts = new Map(); // ip -> { count, first }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { loginAttempts.delete(ip); return false; }
  return rec.count >= MAX_ATTEMPTS;
}
function recordFailure(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}
function clearFailures(ip) { loginAttempts.delete(ip); }

// ---------- Auth ----------
router.post('/login', (req, res) => {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants requis.' });
  }

  const admin = db.get('admins').find({ username }).value();
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    recordFailure(ip);
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  clearFailures(ip);
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  res.json({ ok: true, username: admin.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

// All routes below require an authenticated admin session
router.use(requireAdmin);

// ---------- Photo upload ----------
// Accepts up to 10 images in one request (field name "photos"),
// stores them in public/uploads/, and returns their public URLs.
router.post('/upload', (req, res) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Échec du téléversement.' });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }
    const urls = files.map(f => `/uploads/${f.filename}`);
    res.status(201).json({ urls });
  });
});

router.delete('/upload', (req, res) => {
  const { url } = req.body || {};
  if (!url || !url.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'URL invalide.' });
  }
  const filename = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filePath, (err) => {
    // Not finding the file is fine (already removed / never existed) — don't block the UI.
    res.json({ ok: true });
  });
});

// ---------- Properties CRUD ----------
router.get('/properties', (req, res) => {
  res.json(db.get('properties').value());
});

router.post('/properties', (req, res) => {
  const body = req.body || {};
  const required = ['type_fr', 'type_en', 'city_fr', 'city_en', 'price', 'bedrooms'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return res.status(400).json({ error: `Le champ "${field}" est requis.` });
    }
  }

  const nextId = db.get('meta.nextPropertyId').value();
  const now = new Date().toISOString();
  const property = {
    id: nextId,
    type_fr: body.type_fr, type_en: body.type_en,
    city_fr: body.city_fr, city_en: body.city_en,
    neighborhood_fr: body.neighborhood_fr || '', neighborhood_en: body.neighborhood_en || '',
    price: Number(body.price) || 0,
    bedrooms: Number(body.bedrooms) || 1,
    bathrooms: Number(body.bathrooms) || 1,
    area: Number(body.area) || 0,
    floor_fr: body.floor_fr || '', floor_en: body.floor_en || '',
    availability_fr: body.availability_fr || 'Disponible immédiatement',
    availability_en: body.availability_en || 'Available immediately',
    available_now: !!body.available_now,
    description_fr: body.description_fr || '',
    description_en: body.description_en || '',
    full_description_fr: body.full_description_fr || body.description_fr || '',
    full_description_en: body.full_description_en || body.description_en || '',
    features_fr: Array.isArray(body.features_fr) ? body.features_fr : String(body.features_fr || '').split(',').map(s => s.trim()).filter(Boolean),
    features_en: Array.isArray(body.features_en) ? body.features_en : String(body.features_en || '').split(',').map(s => s.trim()).filter(Boolean),
    images: Array.isArray(body.images) ? body.images : String(body.images || '').split(',').map(s => s.trim()).filter(Boolean),
    address_fr: body.address_fr || '', address_en: body.address_en || '',
    createdAt: now, updatedAt: now
  };

  db.get('properties').push(property).write();
  db.set('meta.nextPropertyId', nextId + 1).write();
  res.status(201).json(property);
});

router.put('/properties/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.get('properties').find({ id }).value();
  if (!existing) return res.status(404).json({ error: 'Bien introuvable.' });

  const body = req.body || {};
  const updated = { ...existing };
  const editableFields = [
    'type_fr', 'type_en', 'city_fr', 'city_en', 'neighborhood_fr', 'neighborhood_en',
    'price', 'bedrooms', 'bathrooms', 'area', 'floor_fr', 'floor_en',
    'availability_fr', 'availability_en', 'available_now',
    'description_fr', 'description_en', 'full_description_fr', 'full_description_en',
    'address_fr', 'address_en'
  ];
  editableFields.forEach(f => {
    if (body[f] !== undefined) updated[f] = body[f];
  });
  if (body.features_fr !== undefined) {
    updated.features_fr = Array.isArray(body.features_fr) ? body.features_fr : String(body.features_fr).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (body.features_en !== undefined) {
    updated.features_en = Array.isArray(body.features_en) ? body.features_en : String(body.features_en).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (body.images !== undefined) {
    updated.images = Array.isArray(body.images) ? body.images : String(body.images).split(',').map(s => s.trim()).filter(Boolean);
  }
  updated.price = Number(updated.price) || 0;
  updated.bedrooms = Number(updated.bedrooms) || 1;
  updated.bathrooms = Number(updated.bathrooms) || 1;
  updated.area = Number(updated.area) || 0;
  updated.available_now = !!updated.available_now;
  updated.updatedAt = new Date().toISOString();

  db.get('properties').find({ id }).assign(updated).write();
  res.json(updated);
});

router.delete('/properties/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.get('properties').find({ id }).value();
  if (!existing) return res.status(404).json({ error: 'Bien introuvable.' });
  db.get('properties').remove({ id }).write();
  res.json({ ok: true });
});

// ---------- Leads ----------
router.get('/leads', (req, res) => {
  const leads = db.get('leads').value().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(leads);
});

router.patch('/leads/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.get('leads').find({ id }).value();
  if (!existing) return res.status(404).json({ error: 'Message introuvable.' });
  const { status } = req.body || {};
  if (status) db.get('leads').find({ id }).assign({ status }).write();
  res.json(db.get('leads').find({ id }).value());
});

router.delete('/leads/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('leads').remove({ id }).write();
  res.json({ ok: true });
});

// ---------- Change admin password ----------
router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Mot de passe invalide (8 caractères minimum).' });
  }
  const admin = db.get('admins').find({ id: req.session.adminId }).value();
  if (!admin || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.get('admins').find({ id: admin.id }).assign({ passwordHash: newHash }).write();
  res.json({ ok: true });
});

module.exports = router;
