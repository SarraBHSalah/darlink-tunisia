// ===========================================================
// DarLink Tunisia — public property API
// ===========================================================
const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET /api/properties?city=&type=&maxPrice=&minBedrooms=&page=&pageSize=
router.get('/', (req, res) => {
  const { city, type, maxPrice, minBedrooms, page = 1, pageSize = 9 } = req.query;

  let results = db.get('properties').value();

  if (city) results = results.filter(p => p.city_fr === city);
  if (type) results = results.filter(p => p.type_fr === type);
  if (maxPrice) results = results.filter(p => p.price <= parseInt(maxPrice, 10));
  if (minBedrooms) results = results.filter(p => p.bedrooms >= parseInt(minBedrooms, 10));

  const total = results.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.max(1, Math.min(50, parseInt(pageSize, 10) || 9));
  const start = (pageNum - 1) * size;
  const items = results.slice(start, start + size);

  res.json({
    total,
    page: pageNum,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
    items
  });
});

// GET /api/properties/meta — distinct cities & types for filter dropdowns
router.get('/meta', (req, res) => {
  const props = db.get('properties').value();
  const cities = [...new Map(props.map(p => [p.city_fr, { fr: p.city_fr, en: p.city_en }])).values()];
  const types = [...new Map(props.map(p => [p.type_fr, { fr: p.type_fr, en: p.type_en }])).values()];
  res.json({ cities, types });
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const property = db.get('properties').find({ id }).value();
  if (!property) return res.status(404).json({ error: 'Property not found' });
  res.json(property);
});

module.exports = router;
