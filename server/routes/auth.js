const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const pool    = require('../db/pool');
const { signToken, verifyToken } = require('../middleware/auth');
const { Resend } = require('resend');

function getResend() { return new Resend(process.env.RESEND_API_KEY || 'placeholder'); }
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const role = email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'user';
    const { rows } = await pool.query(
      'INSERT INTO accounts (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email.toLowerCase(), hash, role]
    );
    const account = rows[0];
    res.json({ token: signToken({ id: account.id, email: account.email, role: account.role }), role: account.role });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase()]);
    const account = rows[0];
    if (!account) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL && account.role !== 'admin') {
      await pool.query('UPDATE accounts SET role = $1 WHERE id = $2', ['admin', account.id]);
      account.role = 'admin';
    }
    res.json({ token: signToken({ id: account.id, email: account.email, role: account.role }), role: account.role });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/forgot-password — generate + email OTP
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const { rows } = await pool.query('SELECT id FROM accounts WHERE email = $1', [email]);
    // Always return success to avoid account enumeration
    if (!rows[0]) return res.json({ success: true });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp, 8);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Invalidate old OTPs for this email
    await pool.query('UPDATE password_reset_otps SET used=TRUE WHERE email=$1', [email]);
    await pool.query(
      'INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [email, hash, expires]
    );

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Bowling Circle password reset code',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#f7f1e6;border-radius:12px">
          <h2 style="color:#0f766e;margin-bottom:8px">🎳 The Bowling Circle</h2>
          <p style="color:#2b2620">Your password reset code is:</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#0f766e;margin:20px 0">${otp}</div>
          <p style="color:#6f675a;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>`
    });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/verify-otp — verify code, return short-lived reset token
router.post('/verify-otp', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const otp   = (req.body.otp || '').trim();
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM password_reset_otps WHERE email=$1 AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    const record = rows[0];
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });
    const match = await bcrypt.compare(otp, record.otp_hash);
    if (!match) return res.status(400).json({ error: 'Invalid or expired code' });
    await pool.query('UPDATE password_reset_otps SET used=TRUE WHERE id=$1', [record.id]);
    // Reset token: 20-min expiry, signed with JWT_SECRET
    const { signToken: sign } = require('../middleware/auth');
    const resetToken = sign({ email, purpose: 'password_reset' });
    res.json({ reset_token: resetToken });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/reset-password — set new password using reset token
router.post('/reset-password', async (req, res) => {
  const { reset_token, password } = req.body;
  if (!reset_token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
    let payload;
    try { payload = jwt.verify(reset_token, JWT_SECRET); } catch { return res.status(400).json({ error: 'Reset link expired, please start again' }); }
    if (payload.purpose !== 'password_reset') return res.status(400).json({ error: 'Invalid token' });
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query('UPDATE accounts SET password_hash=$1 WHERE email=$2', [hash, payload.email]);
    if (!rowCount) return res.status(404).json({ error: 'Account not found' });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
