// ===========================================================
// DarLink Tunisia — contact form submission API
// Stores every submission as a "lead" in the database (visible
// in the admin panel) and, if SMTP env vars are configured,
// also emails a notification to the business inbox.
// ===========================================================
const express = require('express');
const db = require('../db/db');
const { maybeSendNotification } = require('../lib/mailer');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/', async (req, res) => {
  const { name, phone, email, subject, message, propertyId } = req.body || {};

  if (!name || !phone || !email || !subject || !message) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "L'adresse email n'est pas valide." });
  }

  const nextId = db.get('meta.nextLeadId').value();
  const lead = {
    id: nextId,
    name: String(name).trim().slice(0, 200),
    phone: String(phone).trim().slice(0, 60),
    email: String(email).trim().slice(0, 200),
    subject: String(subject).trim().slice(0, 300),
    message: String(message).trim().slice(0, 5000),
    propertyId: propertyId ? parseInt(propertyId, 10) : null,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  db.get('leads').push(lead).write();
  db.set('meta.nextLeadId', nextId + 1).write();

  try {
    await maybeSendNotification(lead);
  } catch (err) {
    console.error('Email notification failed (lead was still saved):', err.message);
  }

  res.status(201).json({ ok: true, id: lead.id });
});

module.exports = router;
