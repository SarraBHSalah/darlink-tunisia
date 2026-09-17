// ===========================================================
// DarLink Tunisia — server entry point
// ===========================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const propertiesRoutes = require('./routes/properties');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 8091;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'darlink-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 8 // 8h
  }
}));

// ---- API ----
app.use('/api/properties', propertiesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Static frontend (public site + admin panel) ----
app.use(express.static(path.join(__dirname, 'public')));

// Friendly fallback for unknown routes -> 404 page or index
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint introuvable.' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DarLink Tunisia server running on http://localhost:${PORT}`);
});
