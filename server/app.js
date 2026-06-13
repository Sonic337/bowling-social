require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security headers (XSS, clickjacking, MIME sniffing, CSP) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],   // Vite bundles need inline
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());

// ── Body size cap — 20kb is more than enough for a form ──
app.use(express.json({ limit: '20kb' }));

// ── Rate limiters ──
// Auth: 10 attempts per IP per 15 min (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
});

// Submit: 8 submissions per IP per hour (spam protection)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' },
  skip: (req) => req.path !== '/submit',   // only /api/submit
});

app.use('/api/auth',   authLimiter,   require('./routes/auth'));
app.use('/api',        submitLimiter, require('./routes/public'));
app.use('/api/admin',                 require('./routes/admin'));

module.exports = app;
