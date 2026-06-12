const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// Optional auth: attaches req.user if a valid token is present, otherwise continues
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

const FIELDS = ['name','age','gender','area','whatsapp','email','occupation','interests','availability','group_size_pref','bio'];

function pickBody(body) {
  const { name, age, gender, area, whatsapp, email, occupation, interests, availability, group_size_pref, bio } = body;
  return { name, age, gender, area, whatsapp, email, occupation, interests, availability: availability || {}, group_size_pref, bio };
}

// POST /api/submit — works for guests AND logged-in users
router.post('/submit', optionalAuth, async (req, res) => {
  const b = pickBody(req.body);
  if (!b.name || !b.age || !b.gender || !b.area || !b.whatsapp || !b.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const email = String(b.email).toLowerCase().trim();
  const accountId = req.user ? req.user.id : null;
  try {
    // If a profile with this email already exists, update it instead of duplicating
    const existing = await pool.query('SELECT id, edit_key FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      const editKey = existing.rows[0].edit_key || crypto.randomBytes(24).toString('hex');
      await pool.query(
        `UPDATE users SET name=$1, age=$2, gender=$3, area=$4, whatsapp=$5, email=$6,
         occupation=$7, interests=$8, availability=$9, group_size_pref=$10, bio=$11,
         account_id=COALESCE($12, account_id), edit_key=$13 WHERE id=$14`,
        [b.name, b.age, b.gender, b.area, b.whatsapp, email, b.occupation, b.interests,
         b.availability, b.group_size_pref, b.bio, accountId, editKey, id]
      );
      return res.json({ success: true, id, edit_key: editKey, updated: true });
    }
    const editKey = crypto.randomBytes(24).toString('hex');
    const { rows } = await pool.query(
      `INSERT INTO users (account_id, name, age, gender, area, whatsapp, email, occupation, interests, availability, group_size_pref, bio, edit_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [accountId, b.name, b.age, b.gender, b.area, b.whatsapp, email, b.occupation, b.interests,
       b.availability, b.group_size_pref, b.bio, editKey]
    );
    res.json({ success: true, id: rows[0].id, edit_key: editKey, updated: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/:id?key=... — guest profile fetch, requires the secret edit key
router.get('/profile/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const profile = rows[0];
    if (!profile || !profile.edit_key || profile.edit_key !== req.query.key) {
      return res.status(404).json({ error: 'Not found' });
    }
    delete profile.edit_key;
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/profile — profile for a logged-in account
router.get('/me/profile', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    const profile = rows[0] || null;
    if (profile) delete profile.edit_key;
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
