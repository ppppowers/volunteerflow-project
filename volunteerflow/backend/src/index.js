const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const { generateSecret, generateURI, verifySync } = require('otplib');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { pool, initializeDatabase } = require('./db');
const { dispatchBulk, dispatchJobNotif, buildFrom } = require('./mailer');
const createStaffRouter = require('./staff/index');

// ── Supabase Storage client ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'volunteerflow-files';
const storageEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const supabase = storageEnabled
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// ── Multer (memory storage — buffer streamed directly to Supabase) ────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ── Stripe ────────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

const STRIPE_PRICE_IDS = {
  discover: { monthly: process.env.STRIPE_PRICE_DISCOVER_MONTHLY, yearly: process.env.STRIPE_PRICE_DISCOVER_YEARLY },
  grow:     { monthly: process.env.STRIPE_PRICE_GROW_MONTHLY,     yearly: process.env.STRIPE_PRICE_GROW_YEARLY     },
};

const PAYPAL_PLAN_IDS = {
  discover: { monthly: process.env.PAYPAL_PLAN_DISCOVER_MONTHLY, yearly: process.env.PAYPAL_PLAN_DISCOVER_YEARLY },
  grow:     { monthly: process.env.PAYPAL_PLAN_GROW_MONTHLY,     yearly: process.env.PAYPAL_PLAN_GROW_YEARLY     },
};

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Public-facing backend URL used to generate QR tracking redirect links.
// Must be set in production to your actual backend domain.
const BACKEND_PUBLIC_URL = (process.env.BACKEND_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// Validate STAFF_JWT_SECRET before startup
if (!process.env.STAFF_JWT_SECRET || process.env.STAFF_JWT_SECRET.length < 32) {
  console.error('ERROR: STAFF_JWT_SECRET must be set (minimum 32 characters)');
  process.exit(1);
}

// Initialize database on startup
initializeDatabase()
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { req.rawBody = buf; } })); // org logos stored as base64 need extra headroom; rawBody needed for Stripe webhook sig verification

// ===== RATE LIMITING =====
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  skip: () => NODE_ENV === 'test',
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  skip: () => NODE_ENV === 'test',
});

app.use('/api', generalLimiter);
app.use('/api/volunteers',  (req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());
app.use('/api/events',      (req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());
app.use('/api/applications',(req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());
app.use('/api/folders',         (req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());
app.use('/api/files',           (req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());
app.use('/api/training',        (req, res, next) => req.method !== 'GET' ? writeLimiter(req, res, next) : next());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== AUTH MIDDLEWARE =====
function parseUserAgent(ua) {
  if (!ua) return 'Unknown device';
  let browser = 'Browser';
  if (/EdgA?\//.test(ua))           browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua))  browser = 'Opera';
  else if (/Chrome\//.test(ua))     browser = 'Chrome';
  else if (/Firefox\//.test(ua))    browser = 'Firefox';
  else if (/Safari\//.test(ua))     browser = 'Safari';
  let os = 'Unknown OS';
  if (/iPhone/.test(ua))            os = 'iPhone';
  else if (/iPad/.test(ua))         os = 'iPad';
  else if (/Android/.test(ua))      os = 'Android';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows/.test(ua))      os = 'Windows';
  else if (/Linux/.test(ua))        os = 'Linux';
  return `${os} — ${browser}`;
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    if (req.user.sid) {
      setImmediate(() =>
        pool.query('UPDATE user_sessions SET last_seen = NOW() WHERE id = $1', [req.user.sid]).catch(() => {})
      );
    }
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ===== HELPERS =====
function parseIntParam(value, fallback, min = 1, max = Infinity) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < min || n > max) return fallback;
  return n;
}
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function jsn(v) {
  return v === undefined || v === null ? null : JSON.stringify(v);
}

// ── Audit helper ──────────────────────────────────────────────────────────────
/**
 * Write a non-blocking audit log entry.
 * @param {object} opts
 * @param {object} [opts.req]       - Express request (for user + IP)
 * @param {string} opts.category    - e.g. 'volunteer'
 * @param {string} opts.verb        - e.g. 'created'
 * @param {string} opts.resource    - human-readable subject, e.g. 'Jane Doe'
 * @param {string} [opts.detail]    - extra context
 */
function logAudit({ req, category, verb, resource, detail = '' }) {
  const userId   = req?.user?.sub        || '';
  const userName = req?.user?.fullName   || 'System';
  const userRole = req?.user?.role       || 'system';
  const ip       = req
    ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
    : '';
  const id = `aud_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  pool.query(
    `INSERT INTO audit_logs (id, user_id, user_name, user_role, category, verb, resource, detail, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, userId, userName, userRole, category, verb, resource, detail.slice(0, 500), ip]
  ).catch((err) => console.error('[audit] write error:', err.message));
}

// ── Row mappers ───────────────────────────────────────────────────────────────
function mapVolunteer(r) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    location: r.location,
    joinDate: r.join_date,
    avatar: r.avatar,
    skills: r.skills ?? [],
    hoursContributed: r.hours_contributed,
    status: r.status,
  };
}

function mapEvent(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    location: r.location,
    address: r.address,
    startDate: r.start_date,
    endDate: r.end_date,
    spotsAvailable: r.spots_available,
    maxVolunteers: r.max_volunteers,
    status: r.status,
    visibility: r.visibility,
    tags: r.tags ?? [],
    coverImage: r.cover_image,
    images: r.images ?? [],
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    notes: r.notes,
    registrationDeadline: r.registration_deadline,
    shifts: r.shifts ?? [],
    eligibility: r.eligibility ?? { allowedStatuses: ['approved'], requireApplication: false, requireBackgroundCheck: false, customRequirements: [] },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    participantCount: parseInt(r.participant_count ?? 0, 10),
    applicationCount: parseInt(r.application_count ?? 0, 10),
  };
}

function mapApplication(r) {
  const base = {
    id: r.id,
    volunteerId: r.volunteer_id,
    eventId: r.event_id,
    message: r.message,
    status: r.status,
    vettingStage: r.vetting_stage ?? 'applied',
    rating: r.rating ?? null,
    flagged: r.flagged ?? false,
    notes: r.notes ?? [],
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
  if (r.vol_first_name !== undefined) {
    base.volunteer = {
      id: r.volunteer_id,
      firstName: r.vol_first_name,
      lastName: r.vol_last_name,
      email: r.vol_email,
    };
  }
  if (r.ev_title !== undefined) {
    base.event = { id: r.event_id, title: r.ev_title };
  }
  return base;
}

function mapFolder(r) {
  return { id: r.id, name: r.name, color: r.color };
}

function mapFile(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    size: r.size,
    folderId: r.folder_id,
    url: r.url,
    storagePath: r.storage_path ?? '',
    uploadedBy: r.uploaded_by,
    uploadedAt: r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : (r.created_at ?? '').split('T')[0],
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== ALLOWED FIELDS =====
const VOLUNTEER_UPDATABLE = ['firstName', 'lastName', 'email', 'phone', 'location', 'joinDate', 'avatar', 'skills', 'status', 'hoursContributed'];
const VOLUNTEER_COL_MAP = {
  firstName: 'first_name', lastName: 'last_name', email: 'email',
  phone: 'phone', location: 'location', joinDate: 'join_date',
  avatar: 'avatar', skills: 'skills', hoursContributed: 'hours_contributed', status: 'status',
};
const VOLUNTEER_JSONB = new Set(['skills']);

const EVENT_UPDATABLE = [
  'title','description','category','location','address','startDate','endDate',
  'spotsAvailable','maxVolunteers','status','visibility','tags','coverImage',
  'images','contactName','contactEmail','contactPhone','notes',
  'registrationDeadline','shifts','eligibility',
];
const EVENT_COL_MAP = {
  title: 'title', description: 'description', category: 'category',
  location: 'location', address: 'address', startDate: 'start_date', endDate: 'end_date',
  spotsAvailable: 'spots_available', maxVolunteers: 'max_volunteers',
  status: 'status', visibility: 'visibility', tags: 'tags', coverImage: 'cover_image',
  images: 'images', contactName: 'contact_name', contactEmail: 'contact_email',
  contactPhone: 'contact_phone', notes: 'notes',
  registrationDeadline: 'registration_deadline', shifts: 'shifts', eligibility: 'eligibility',
};
const EVENT_JSONB = new Set(['tags', 'images', 'shifts', 'eligibility']);

const APPLICATION_UPDATABLE = ['status', 'message', 'vettingStage', 'rating', 'flagged', 'notes'];
const APPLICATION_COL_MAP = {
  status: 'status', message: 'message', vettingStage: 'vetting_stage',
  rating: 'rating', flagged: 'flagged', notes: 'notes',
};
const APPLICATION_JSONB = new Set(['notes']);
const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const VETTING_STAGES = ['applied', 'screening', 'background', 'interview', 'approved', 'rejected'];
const VOLUNTEER_STATUSES = ['ACTIVE', 'PENDING', 'INACTIVE'];
const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

function pick(obj, keys) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));
}

/** Build a SET clause for an UPDATE from a camelCase updates object. */
function buildSet(updates, colMap, jsonbCols) {
  const sets = [];
  const params = [];
  let idx = 1;
  for (const [camel, val] of Object.entries(updates)) {
    const col = colMap[camel];
    if (!col) continue;
    sets.push(`${col} = $${idx++}`);
    params.push(jsonbCols.has(camel) ? jsn(val) : val);
  }
  return { sets, params, nextIdx: idx };
}

// ===== HEALTH CHECK =====
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unavailable', timestamp: new Date().toISOString() });
  }
});

app.get('/api', (_req, res) => {
  res.json({
    message: 'VolunteerFlow API v2.0.0',
    endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/volunteers', '/api/events', '/api/applications', '/api/dashboard/stats'],
  });
});

// ===== AUTH ROUTES =====
app.post('/api/auth/register', writeLimiter, async (req, res) => {
  try {
    const { fullName, email, password, orgName } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO users (id, email, password_hash, full_name, org_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, org_name, role',
      [id, email.trim().toLowerCase(), hash, fullName.trim(), (orgName || '').trim()]
    );
    const user = rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, fullName: user.full_name, role: user.role },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );
    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, fullName: user.full_name, orgName: user.org_name, role: user.role } },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/api/auth/login', writeLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, full_name, org_name, role FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const sid = crypto.randomUUID();
    await pool.query(
      'INSERT INTO user_sessions (id, user_id, user_agent, ip_address) VALUES ($1, $2, $3, $4)',
      [sid, user.id, req.headers['user-agent'] || '', req.ip || '']
    );
    const token = jwt.sign(
      { sub: user.id, email: user.email, fullName: user.full_name, role: user.role, sid },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );
    logAudit({ req, category: 'auth', verb: 'login', resource: 'System',
      detail: `Login from ${req.headers['user-agent']?.slice(0, 80) || 'unknown client'}` });
    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, fullName: user.full_name, orgName: user.org_name, role: user.role } },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, org_name, role FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const u = rows[0];
    res.json({ success: true, data: { id: u.id, email: u.email, fullName: u.full_name, orgName: u.org_name, role: u.role } });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

app.get('/api/auth/security-settings', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT two_factor_enabled, session_timeout FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { twoFactorEnabled: rows[0].two_factor_enabled, sessionTimeout: rows[0].session_timeout } });
  } catch (err) {
    console.error('GET /api/auth/security-settings error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch security settings' });
  }
});

app.put('/api/auth/security-settings', requireAuth, async (req, res) => {
  try {
    const { twoFactorEnabled, sessionTimeout } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;
    if (typeof twoFactorEnabled === 'boolean') { updates.push(`two_factor_enabled = $${idx++}`); params.push(twoFactorEnabled); }
    if (typeof sessionTimeout === 'string' && sessionTimeout.trim()) { updates.push(`session_timeout = $${idx++}`); params.push(sessionTimeout.trim()); }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });
    params.push(req.user.sub);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    logAudit({ req, category: 'settings', verb: 'update', resource: 'Security settings' });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/auth/security-settings error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save security settings' });
  }
});

app.get('/api/auth/sessions', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, user_agent, ip_address, created_at, last_seen FROM user_sessions WHERE user_id = $1 ORDER BY last_seen DESC',
      [req.user.sub]
    );
    const currentSid = req.user.sid || null;
    const sessions = rows.map(s => ({
      id: s.id,
      device: parseUserAgent(s.user_agent),
      ipAddress: s.ip_address,
      createdAt: s.created_at,
      lastSeen: s.last_seen,
      current: s.id === currentSid,
    }));
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('GET /api/auth/sessions error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

app.delete('/api/auth/sessions/:id', requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (sessionId === req.user.sid) {
      return res.status(400).json({ success: false, error: 'Cannot revoke your current session. Sign out instead.' });
    }
    const { rowCount } = await pool.query(
      'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.sub]
    );
    if (!rowCount) return res.status(404).json({ success: false, error: 'Session not found' });
    logAudit({ req, category: 'auth', verb: 'revoke', resource: 'Session', detail: sessionId });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/auth/sessions/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

// ===== TWO-FACTOR AUTHENTICATION =====
app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT email, two_factor_enabled FROM users WHERE id = $1', [req.user.sub]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    if (rows[0].two_factor_enabled) return res.status(400).json({ success: false, error: '2FA is already enabled' });
    const secret = generateSecret();
    const otpauth = generateURI({ secret, label: rows[0].email, issuer: 'VolunteerFlow' });
    res.json({ success: true, data: { secret, otpauth } });
  } catch (err) {
    console.error('POST /api/auth/2fa/setup error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to initiate 2FA setup' });
  }
});

app.post('/api/auth/2fa/verify', requireAuth, async (req, res) => {
  try {
    const { secret, token } = req.body;
    if (!secret || !token) return res.status(400).json({ success: false, error: 'secret and token are required' });
    const result = verifySync({ token: String(token).replace(/\s/g, ''), secret });
    if (!result?.valid) return res.status(400).json({ success: false, error: 'Invalid code. Check your authenticator app and try again.' });
    await pool.query(
      'UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = $1 WHERE id = $2',
      [secret, req.user.sub]
    );
    logAudit({ req, category: 'security', verb: 'enable', resource: '2FA' });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/auth/2fa/verify error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to enable 2FA' });
  }
});

app.delete('/api/auth/2fa', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: 'Password is required to disable 2FA' });
    const { rows } = await pool.query('SELECT password_hash, two_factor_enabled FROM users WHERE id = $1', [req.user.sub]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    if (!rows[0].two_factor_enabled) return res.status(400).json({ success: false, error: '2FA is not enabled' });
    if (!(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }
    await pool.query('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1', [req.user.sub]);
    logAudit({ req, category: 'security', verb: 'disable', resource: '2FA' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/auth/2fa error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to disable 2FA' });
  }
});

// ===== BILLING =====
const VALID_PLANS = ['discover', 'grow', 'enterprise'];
const VALID_CYCLES = ['monthly', 'yearly'];

app.get('/api/billing/plan', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT plan, billing_cycle, plan_updated_at, subscription_status, billing_provider FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const { plan, billing_cycle, plan_updated_at, subscription_status, billing_provider } = rows[0];
    const base = new Date(plan_updated_at);
    const renewsAt = new Date(base);
    if (billing_cycle === 'yearly') renewsAt.setFullYear(renewsAt.getFullYear() + 1);
    else renewsAt.setMonth(renewsAt.getMonth() + 1);
    res.json({ success: true, data: {
      plan, billingCycle: billing_cycle, renewsAt: renewsAt.toISOString(),
      subscriptionStatus: subscription_status || null,
      billingProvider: billing_provider || null,
    }});
  } catch (err) {
    console.error('GET /api/billing/plan error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch billing info' });
  }
});

app.put('/api/billing/plan', requireAuth, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    if (!VALID_PLANS.includes(plan)) return res.status(400).json({ success: false, error: 'Invalid plan' });
    if (!VALID_CYCLES.includes(billingCycle)) return res.status(400).json({ success: false, error: 'Invalid billing cycle' });
    await pool.query(
      'UPDATE users SET plan = $1, billing_cycle = $2, plan_updated_at = NOW() WHERE id = $3',
      [plan, billingCycle, req.user.sub]
    );
    logAudit({ req, category: 'billing', verb: 'update', resource: 'Plan', detail: `${plan} (${billingCycle})` });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/billing/plan error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

// ── Billing: invoices ─────────────────────────────────────────────────────────
app.get('/api/billing/invoices', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.sub]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/billing/invoices error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// ── Billing: Stripe checkout ──────────────────────────────────────────────────
app.post('/api/billing/stripe/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Stripe is not configured on this server' });
  try {
    const { plan, billingCycle } = req.body;
    const priceId = STRIPE_PRICE_IDS[plan]?.[billingCycle];
    if (!priceId) return res.status(400).json({ success: false, error: 'No Stripe price configured for this plan/cycle' });

    const { rows } = await pool.query(
      'SELECT stripe_customer_id, email, full_name FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    let { stripe_customer_id } = rows[0];
    if (!stripe_customer_id) {
      const customer = await stripe.customers.create({ email: rows[0].email, name: rows[0].full_name });
      stripe_customer_id = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [stripe_customer_id, req.user.sub]);
    }

    const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      customer: stripe_customer_id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/settings?tab=billing&stripe=success`,
      cancel_url:  `${FRONTEND_URL}/settings?tab=billing`,
      metadata:    { userId: req.user.sub, plan, billingCycle },
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('POST /api/billing/stripe/checkout error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ── Billing: Stripe customer portal ──────────────────────────────────────────
app.post('/api/billing/stripe/portal', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Stripe is not configured on this server' });
  try {
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.sub]);
    if (!rows.length || !rows[0].stripe_customer_id) {
      return res.status(400).json({ success: false, error: 'No Stripe customer on file' });
    }
    const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer:   rows[0].stripe_customer_id,
      return_url: `${FRONTEND_URL}/settings?tab=billing`,
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('POST /api/billing/stripe/portal error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to open billing portal' });
  }
});

// ── Billing: Stripe webhook ───────────────────────────────────────────────────
app.post('/api/billing/stripe/webhook', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(400).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.subscription) {
          const { plan, billingCycle } = s.metadata || {};
          await pool.query(
            `UPDATE users SET stripe_subscription_id = $1, subscription_status = 'active',
             billing_provider = 'stripe', plan_updated_at = NOW() WHERE stripe_customer_id = $2`,
            [s.subscription, s.customer]
          );
          if (plan && VALID_PLANS.includes(plan))
            await pool.query('UPDATE users SET plan = $1 WHERE stripe_customer_id = $2', [plan, s.customer]);
          if (billingCycle && VALID_CYCLES.includes(billingCycle))
            await pool.query('UPDATE users SET billing_cycle = $1 WHERE stripe_customer_id = $2', [billingCycle, s.customer]);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';
        await pool.query(
          `UPDATE users SET stripe_subscription_id = $1, subscription_status = $2 WHERE stripe_customer_id = $3`,
          [sub.id, status, sub.customer]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE users SET subscription_status = 'canceled', stripe_subscription_id = NULL WHERE stripe_customer_id = $1`,
          [sub.customer]
        );
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object;
        if (!inv.subscription) break;
        const { rows } = await pool.query('SELECT id FROM users WHERE stripe_customer_id = $1', [inv.customer]);
        if (!rows.length) break;
        const desc = inv.lines?.data?.[0]?.description || inv.description || '';
        await pool.query(
          `INSERT INTO invoices (id, user_id, provider, amount_cents, currency, status, description, invoice_url, invoice_pdf, period_start, period_end)
           VALUES ($1,$2,'stripe',$3,$4,'paid',$5,$6,$7,to_timestamp($8),to_timestamp($9))
           ON CONFLICT (id) DO NOTHING`,
          [inv.id, rows[0].id, inv.amount_paid, inv.currency, desc,
           inv.hosted_invoice_url || '', inv.invoice_pdf || '',
           inv.period_start || null, inv.period_end || null]
        );
        break;
      }
    }
  } catch (err) {
    console.error('Stripe webhook processing error:', err.message);
  }
  res.json({ received: true });
});

// ── Billing: PayPal plan ID lookup ────────────────────────────────────────────
app.get('/api/billing/paypal/plan-id', requireAuth, (req, res) => {
  const { plan, cycle } = req.query;
  const planId = PAYPAL_PLAN_IDS[plan]?.[cycle];
  if (!planId) return res.status(400).json({ success: false, error: 'No PayPal plan configured for this plan/cycle' });
  res.json({ success: true, data: { planId } });
});

// ── Billing: PayPal activate subscription ────────────────────────────────────
app.post('/api/billing/paypal/activate', requireAuth, async (req, res) => {
  try {
    const { subscriptionId, plan, billingCycle } = req.body;
    if (!subscriptionId) return res.status(400).json({ success: false, error: 'subscriptionId required' });
    if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ success: false, error: 'Invalid plan' });
    if (billingCycle && !VALID_CYCLES.includes(billingCycle)) return res.status(400).json({ success: false, error: 'Invalid billing cycle' });
    await pool.query(
      `UPDATE users SET paypal_subscription_id = $1, subscription_status = 'active', billing_provider = 'paypal',
       plan_updated_at = NOW() WHERE id = $2`,
      [subscriptionId, req.user.sub]
    );
    if (plan) await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, req.user.sub]);
    if (billingCycle) await pool.query('UPDATE users SET billing_cycle = $1 WHERE id = $2', [billingCycle, req.user.sub]);
    logAudit({ req, category: 'billing', verb: 'subscribe', resource: 'PayPal', detail: `${plan} (${billingCycle})` });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/billing/paypal/activate error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to activate PayPal subscription' });
  }
});

// ── Billing: PayPal webhook ───────────────────────────────────────────────────
app.post('/api/billing/paypal/webhook', async (req, res) => {
  try {
    const { event_type, resource } = req.body;
    if (!event_type || !resource) return res.status(400).json({ error: 'Invalid payload' });

    switch (event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await pool.query(
          `UPDATE users SET subscription_status = 'active' WHERE paypal_subscription_id = $1`,
          [resource.id]
        );
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await pool.query(
          `UPDATE users SET subscription_status = 'canceled', paypal_subscription_id = NULL WHERE paypal_subscription_id = $1`,
          [resource.id]
        );
        break;
      case 'PAYMENT.SALE.COMPLETED':
        if (resource.billing_agreement_id) {
          const { rows } = await pool.query(
            'SELECT id FROM users WHERE paypal_subscription_id = $1', [resource.billing_agreement_id]
          );
          if (rows.length) {
            const amountCents = Math.round(parseFloat(resource.amount?.total || '0') * 100);
            const currency = (resource.amount?.currency || 'usd').toLowerCase();
            await pool.query(
              `INSERT INTO invoices (id, user_id, provider, amount_cents, currency, status, description)
               VALUES ($1,$2,'paypal',$3,$4,'paid','PayPal subscription payment') ON CONFLICT (id) DO NOTHING`,
              [resource.id, rows[0].id, amountCents, currency]
            );
          }
        }
        break;
    }
  } catch (err) {
    console.error('PayPal webhook processing error:', err.message);
  }
  res.json({ received: true });
});

// ===== DATA EXPORT / RETENTION / DANGER ZONE =====

/** Convert array of row objects to CSV string. */
function toCSV(rows, columns) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map(c => escape(row[c])).join(','));
  return lines.join('\n');
}

app.get('/api/data/export', requireAuth, async (req, res) => {
  const type = String(req.query.type || '');
  try {
    let csv, filename;
    switch (type) {
      case 'volunteers': {
        const { rows } = await pool.query('SELECT * FROM volunteers ORDER BY created_at');
        const cols = ['id','first_name','last_name','email','phone','location','join_date','status','hours_contributed','created_at'];
        csv = toCSV(rows, cols);
        filename = `volunteers-${Date.now()}.csv`;
        break;
      }
      case 'events': {
        const { rows } = await pool.query(
          'SELECT id,title,category,location,start_date,end_date,status,spots_available,max_volunteers,created_at FROM events ORDER BY created_at'
        );
        const cols = ['id','title','category','location','start_date','end_date','status','spots_available','max_volunteers','created_at'];
        csv = toCSV(rows, cols);
        filename = `events-${Date.now()}.csv`;
        break;
      }
      case 'applications': {
        const { rows } = await pool.query(`
          SELECT a.id, v.first_name || ' ' || v.last_name AS volunteer_name, v.email AS volunteer_email,
                 e.title AS event_title, a.status, a.vetting_stage, a.message, a.rating, a.created_at
          FROM applications a
          JOIN volunteers v ON a.volunteer_id = v.id
          JOIN events e ON a.event_id = e.id
          ORDER BY a.created_at
        `);
        const cols = ['id','volunteer_name','volunteer_email','event_title','status','vetting_stage','message','rating','created_at'];
        csv = toCSV(rows, cols);
        filename = `applications-${Date.now()}.csv`;
        break;
      }
      case 'hours': {
        const { rows } = await pool.query(
          'SELECT id,first_name,last_name,email,hours_contributed,status,created_at FROM volunteers ORDER BY hours_contributed DESC'
        );
        const cols = ['id','first_name','last_name','email','hours_contributed','status','created_at'];
        csv = toCSV(rows, cols);
        filename = `hours-${Date.now()}.csv`;
        break;
      }
      case 'full': {
        const [vols, evts, apps, mbrs, tcomp] = await Promise.all([
          pool.query('SELECT * FROM volunteers ORDER BY created_at'),
          pool.query('SELECT * FROM events ORDER BY created_at'),
          pool.query('SELECT * FROM applications ORDER BY created_at'),
          pool.query('SELECT * FROM members ORDER BY created_at').catch(() => ({ rows: [] })),
          pool.query('SELECT * FROM training_completions ORDER BY created_at').catch(() => ({ rows: [] })),
        ]);
        const bundle = {
          exportedAt: new Date().toISOString(),
          volunteers: vols.rows,
          events: evts.rows,
          applications: apps.rows,
          members: mbrs.rows,
          training_completions: tcomp.rows,
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="full-export-${Date.now()}.json"`);
        return res.send(JSON.stringify(bundle, null, 2));
      }
      default:
        return res.status(400).json({ success: false, error: 'Invalid export type. Use: volunteers, events, applications, hours, full' });
    }
    logAudit({ req, category: 'data', verb: 'export', resource: type, detail: '' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('GET /api/data/export error:', err.message);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

app.get('/api/data/retention', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT retention_volunteers, retention_events, retention_applications FROM org_settings WHERE id = $1',
      ['default']
    );
    const r = rows[0] || {};
    res.json({ success: true, data: {
      volunteers:   r.retention_volunteers   || '12',
      events:       r.retention_events       || '36',
      applications: r.retention_applications || '24',
    }});
  } catch (err) {
    console.error('GET /api/data/retention error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load retention settings' });
  }
});

app.put('/api/data/retention', requireAuth, async (req, res) => {
  const VALID = ['6', '12', '24', '36', 'forever'];
  const { volunteers, events, applications } = req.body;
  for (const v of [volunteers, events, applications]) {
    if (v !== undefined && !VALID.includes(v))
      return res.status(400).json({ success: false, error: 'Invalid retention value' });
  }
  try {
    await pool.query(`
      INSERT INTO org_settings (id, retention_volunteers, retention_events, retention_applications)
      VALUES ('default', $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        retention_volunteers   = EXCLUDED.retention_volunteers,
        retention_events       = EXCLUDED.retention_events,
        retention_applications = EXCLUDED.retention_applications
    `, [volunteers || '12', events || '36', applications || '24']);
    logAudit({ req, category: 'data', verb: 'update', resource: 'Retention', detail: `vol:${volunteers} ev:${events} app:${applications}` });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/data/retention error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save retention settings' });
  }
});

// Danger zone: wipe all application records
app.delete('/api/data/applications', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM applications');
    logAudit({ req, category: 'data', verb: 'delete', resource: 'Applications', detail: `${rowCount} records wiped` });
    res.json({ success: true, deleted: rowCount });
  } catch (err) {
    console.error('DELETE /api/data/applications error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to reset applications' });
  }
});

// Danger zone: wipe entire org data
app.delete('/api/data/account', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM applications');
    await pool.query('DELETE FROM events');
    await pool.query('DELETE FROM volunteers');
    await pool.query('DELETE FROM members');
    await pool.query('DELETE FROM employees');
    await pool.query('DELETE FROM files');
    await pool.query('DELETE FROM folders');
    await pool.query('DELETE FROM training_completions');
    await pool.query('DELETE FROM training_assignments');
    await pool.query('DELETE FROM training_courses');
    await pool.query('DELETE FROM invoices WHERE user_id = $1', [req.user.sub]);
    await pool.query(`UPDATE users SET plan = 'discover', billing_cycle = 'monthly', plan_updated_at = NOW(),
      stripe_subscription_id = NULL, paypal_subscription_id = NULL, subscription_status = NULL, billing_provider = NULL
      WHERE id = $1`, [req.user.sub]);
    await pool.query(`UPDATE org_settings SET org_name='', org_email='', phone='', address='', description='',
      logo_url='', logo_base64='', tax_id='', portal_name='', portal_subdomain='', welcome_heading='', welcome_subtext='', footer_text='' WHERE id='default'`);
    logAudit({ req, category: 'data', verb: 'delete', resource: 'Organization', detail: 'Full org wipe' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/data/account error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete organization data' });
  }
});

// ===== STAFF ROUTER =====
app.use('/api/staff', createStaffRouter(pool));

// ===== VOLUNTEERS CRUD =====
app.get('/api/volunteers', requireAuth, async (req, res) => {
  try {
    const page = parseIntParam(req.query.page, 1, 1);
    const limit = parseIntParam(req.query.limit, 10, 1, 100);
    const { search, status } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (search && typeof search === 'string') {
      const s = `%${search.toLowerCase()}%`;
      conditions.push(`(LOWER(first_name || ' ' || last_name) LIKE $${idx} OR LOWER(email) LIKE $${idx + 1})`);
      params.push(s, s);
      idx += 2;
    }
    if (status && typeof status === 'string') {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM volunteers ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT * FROM volunteers ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      success: true,
      data: dataRes.rows.map(mapVolunteer),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/volunteers error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch volunteers' });
  }
});

app.get('/api/volunteers/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM volunteers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Volunteer not found' });
    res.json({ success: true, data: mapVolunteer(rows[0]) });
  } catch (err) {
    console.error('GET /api/volunteers/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch volunteer' });
  }
});

app.post('/api/volunteers', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, location, joinDate, avatar, skills, status } = req.body;

    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ success: false, error: 'firstName is required' });
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ success: false, error: 'lastName is required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }
    if (status && !VOLUNTEER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VOLUNTEER_STATUSES.join(', ')}` });
    }

    const id = generateId();
    const { rows } = await pool.query(
      `INSERT INTO volunteers
         (id, first_name, last_name, email, phone, location, join_date, avatar, skills, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id,
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        typeof phone === 'string' ? phone.trim() : '',
        typeof location === 'string' ? location.trim() : '',
        typeof joinDate === 'string' ? joinDate : new Date().toISOString().split('T')[0],
        typeof avatar === 'string' ? avatar : '',
        jsn(Array.isArray(skills) ? skills.filter((s) => typeof s === 'string') : []),
        status || 'PENDING',
      ]
    );
    const v = rows[0];
    logAudit({ req, category: 'volunteer', verb: 'created',
      resource: `${v.first_name} ${v.last_name}`,
      detail: `New volunteer profile created (${v.email})` });
    res.status(201).json({ success: true, data: mapVolunteer(v), message: 'Volunteer created' });
  } catch (err) {
    console.error('POST /api/volunteers error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create volunteer' });
  }
});

app.put('/api/volunteers/:id', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM volunteers WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, error: 'Volunteer not found' });

    const updates = pick(req.body, VOLUNTEER_UPDATABLE);
    if (updates.status && !VOLUNTEER_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VOLUNTEER_STATUSES.join(', ')}` });
    }
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const { sets, params, nextIdx } = buildSet(updates, VOLUNTEER_COL_MAP, VOLUNTEER_JSONB);
    if (!sets.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE volunteers SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      params
    );
    const v = rows[0];
    const changedFields = Object.keys(updates).join(', ');
    logAudit({ req, category: 'volunteer', verb: 'updated',
      resource: `${v.first_name} ${v.last_name}`,
      detail: `Updated fields: ${changedFields}` });
    res.json({ success: true, data: mapVolunteer(v), message: 'Volunteer updated' });
  } catch (err) {
    console.error('PUT /api/volunteers/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update volunteer' });
  }
});

app.delete('/api/volunteers/:id', requireAuth, async (req, res) => {
  try {
    const { rows: volRows } = await pool.query('SELECT first_name, last_name FROM volunteers WHERE id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM volunteers WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Volunteer not found' });
    if (volRows.length) {
      logAudit({ req, category: 'volunteer', verb: 'deleted',
        resource: `${volRows[0].first_name} ${volRows[0].last_name}`,
        detail: 'Volunteer profile permanently deleted' });
    }
    res.json({ success: true, message: 'Volunteer deleted' });
  } catch (err) {
    console.error('DELETE /api/volunteers/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete volunteer' });
  }
});

// ===== EVENTS CRUD =====
const EVENTS_LIST_SQL = `
  SELECT e.*,
    (SELECT COUNT(*) FROM applications a WHERE a.event_id = e.id AND a.status = 'APPROVED') AS participant_count,
    (SELECT COUNT(*) FROM applications a WHERE a.event_id = e.id) AS application_count
  FROM events e
`;

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const page = parseIntParam(req.query.page, 1, 1);
    const limit = parseIntParam(req.query.limit, 10, 1, 100);
    const { status, category } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status && typeof status === 'string') {
      conditions.push(`e.status = $${idx++}`);
      params.push(status);
    }
    if (category && typeof category === 'string') {
      conditions.push(`e.category = $${idx++}`);
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM events e ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `${EVENTS_LIST_SQL} ${where} ORDER BY e.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      success: true,
      data: dataRes.rows.map(mapEvent),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/events error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

app.get('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`${EVENTS_LIST_SQL} WHERE e.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Event not found' });

    const appRows = await pool.query(
      'SELECT * FROM applications WHERE event_id = $1',
      [req.params.id]
    );

    const event = mapEvent(rows[0]);
    event.applications = appRows.rows.map(mapApplication);
    event.stats = {
      participantCount: event.participantCount,
      applicationCount: event.applicationCount,
      spotsRemaining: event.spotsAvailable - event.participantCount,
    };

    res.json({ success: true, data: event });
  } catch (err) {
    console.error('GET /api/events/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch event' });
  }
});

app.post('/api/events', requireAuth, async (req, res) => {
  try {
    const {
      title, description, category, location, address,
      startDate, endDate, spotsAvailable, maxVolunteers, status, visibility,
      tags, coverImage, images, contactName, contactEmail, contactPhone,
      notes, registrationDeadline, shifts, eligibility,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ success: false, error: 'category is required' });
    }
    if (status && !EVENT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${EVENT_STATUSES.join(', ')}` });
    }

    const spots = parseInt(maxVolunteers ?? spotsAvailable, 10);
    const now = new Date().toISOString().split('T')[0];
    const id = generateId();

    const { rows } = await pool.query(
      `INSERT INTO events
         (id, title, description, category, location, address, start_date, end_date,
          spots_available, max_volunteers, status, visibility, tags, cover_image, images,
          contact_name, contact_email, contact_phone, notes, registration_deadline,
          shifts, eligibility, created_at, updated_at)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [
        id,
        title.trim(),
        typeof description === 'string' ? description.trim() : '',
        category.trim(),
        typeof location === 'string' ? location.trim() : '',
        typeof address === 'string' ? address.trim() : '',
        startDate || null,
        endDate || null,
        Number.isNaN(spots) ? 10 : spots,
        Number.isNaN(spots) ? 10 : spots,
        status || 'DRAFT',
        typeof visibility === 'string' ? visibility.toUpperCase() : 'PUBLIC',
        jsn(Array.isArray(tags) ? tags : []),
        typeof coverImage === 'string' ? coverImage : '',
        jsn(Array.isArray(images) ? images : []),
        typeof contactName === 'string' ? contactName.trim() : '',
        typeof contactEmail === 'string' ? contactEmail.trim() : '',
        typeof contactPhone === 'string' ? contactPhone.trim() : '',
        typeof notes === 'string' ? notes.trim() : '',
        typeof registrationDeadline === 'string' ? registrationDeadline : '',
        jsn(Array.isArray(shifts) ? shifts : []),
        jsn(eligibility && typeof eligibility === 'object' ? eligibility : { allowedStatuses: ['approved'], requireApplication: false, requireBackgroundCheck: false, customRequirements: [] }),
        now,
        now,
      ]
    );
    logAudit({ req, category: 'event', verb: 'created',
      resource: rows[0].title,
      detail: `New event created (${rows[0].status})` });
    res.status(201).json({ success: true, data: mapEvent(rows[0]), message: 'Event created' });
  } catch (err) {
    console.error('POST /api/events error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id, status, title FROM events WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, error: 'Event not found' });

    const updates = pick(req.body, EVENT_UPDATABLE);
    if (updates.status && !EVENT_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${EVENT_STATUSES.join(', ')}` });
    }

    const { sets, params, nextIdx } = buildSet(updates, EVENT_COL_MAP, EVENT_JSONB);
    if (!sets.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    // Always stamp updatedAt
    sets.push(`updated_at = $${nextIdx}`);
    params.push(new Date().toISOString().split('T')[0]);
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE events SET ${sets.join(', ')} WHERE id = $${nextIdx + 1} RETURNING *`,
      params
    );
    // Notify registered volunteers when event is cancelled (non-blocking)
    if (updates.status === 'CANCELLED' && existing.rows[0].status !== 'CANCELLED') {
      const eventTitle = existing.rows[0].title;
      pool.query(
        `SELECT DISTINCT v.email, v.phone FROM volunteers v
         JOIN applications a ON a.volunteer_id = v.id
         WHERE a.event_id = $1 AND a.status NOT IN ('REJECTED')`,
        [req.params.id]
      ).then(({ rows: vols }) => {
        if (vols.length) {
          return getOrgSettings().then((cfg) =>
            dispatchBulk('email', vols,
              `Event cancelled: ${eventTitle}`,
              `We regret to inform you that "${eventTitle}" has been cancelled. We apologise for any inconvenience.`,
              buildFrom(cfg)
            )
          );
        }
      }).catch(() => {});
    }
    const changedFields = Object.keys(updates).join(', ');
    logAudit({ req, category: 'event', verb: 'updated',
      resource: existing.rows[0].title,
      detail: `Updated fields: ${changedFields}` });
    res.json({ success: true, data: mapEvent(rows[0]), message: 'Event updated' });
  } catch (err) {
    console.error('PUT /api/events/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const { rows: evRows } = await pool.query('SELECT title FROM events WHERE id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Event not found' });
    if (evRows.length) {
      logAudit({ req, category: 'event', verb: 'deleted',
        resource: evRows[0].title, detail: 'Event permanently deleted' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    console.error('DELETE /api/events/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

// ===== APPLICATIONS CRUD =====
const APPS_JOIN_SQL = `
  SELECT a.*,
    v.first_name AS vol_first_name, v.last_name AS vol_last_name, v.email AS vol_email,
    e.title AS ev_title
  FROM applications a
  LEFT JOIN volunteers v ON v.id = a.volunteer_id
  LEFT JOIN events e ON e.id = a.event_id
`;

app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const page = parseIntParam(req.query.page, 1, 1);
    const limit = parseIntParam(req.query.limit, 10, 1, 100);
    const { status, eventId, volunteerId } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status && typeof status === 'string') {
      conditions.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (eventId && typeof eventId === 'string') {
      conditions.push(`a.event_id = $${idx++}`);
      params.push(eventId);
    }
    if (volunteerId && typeof volunteerId === 'string') {
      conditions.push(`a.volunteer_id = $${idx++}`);
      params.push(volunteerId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM applications a ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `${APPS_JOIN_SQL} ${where} ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      success: true,
      data: dataRes.rows.map(mapApplication),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/applications error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

app.post('/api/applications', requireAuth, async (req, res) => {
  try {
    const { volunteerId, eventId, message } = req.body;
    if (!volunteerId || typeof volunteerId !== 'string') {
      return res.status(400).json({ success: false, error: 'volunteerId is required' });
    }
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }

    const volCheck = await pool.query('SELECT id FROM volunteers WHERE id = $1', [volunteerId]);
    if (!volCheck.rows.length) return res.status(400).json({ success: false, error: 'Volunteer not found' });

    const evCheck = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (!evCheck.rows.length) return res.status(400).json({ success: false, error: 'Event not found' });

    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO applications (id, volunteer_id, event_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, volunteerId, eventId, typeof message === 'string' ? message.trim().slice(0, 2000) : '']
    );
    // Lookup volunteer name for audit
    pool.query('SELECT first_name, last_name FROM volunteers WHERE id = $1', [volunteerId])
      .then(({ rows: vr }) => {
        const name = vr.length ? `${vr[0].first_name} ${vr[0].last_name}` : volunteerId;
        logAudit({ req, category: 'application', verb: 'created',
          resource: name, detail: 'New application submitted' });
      }).catch(() => {});
    // Fire application_received notification (non-blocking)
    dispatchJobNotif(pool, 'application_received', {
      volunteerId,
      subject: 'Application received',
      body: 'Thank you for applying! We will review your application and be in touch soon.',
    }).catch(() => {});
    res.status(201).json({ success: true, data: mapApplication(rows[0]), message: 'Application submitted' });
  } catch (err) {
    console.error('POST /api/applications error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

app.put('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id, volunteer_id, status FROM applications WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, error: 'Application not found' });

    const updates = pick(req.body, APPLICATION_UPDATABLE);
    if (updates.status && !APPLICATION_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${APPLICATION_STATUSES.join(', ')}` });
    }
    if (updates.vettingStage && !VETTING_STAGES.includes(updates.vettingStage)) {
      return res.status(400).json({ success: false, error: `vettingStage must be one of: ${VETTING_STAGES.join(', ')}` });
    }
    if (updates.message) updates.message = String(updates.message).slice(0, 2000);
    if (updates.rating !== undefined && updates.rating !== null) {
      updates.rating = Math.max(1, Math.min(5, parseInt(updates.rating, 10)));
    }

    const { sets, params, nextIdx } = buildSet(updates, APPLICATION_COL_MAP, APPLICATION_JSONB);
    if (!sets.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE applications SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      params
    );
    // Audit status change
    if (updates.status && updates.status !== existing.rows[0].status) {
      pool.query('SELECT first_name, last_name FROM volunteers WHERE id = $1', [existing.rows[0].volunteer_id])
        .then(({ rows: vr }) => {
          const name = vr.length ? `${vr[0].first_name} ${vr[0].last_name}` : existing.rows[0].volunteer_id;
          const verb = updates.status === 'APPROVED' ? 'approved' : updates.status === 'REJECTED' ? 'rejected' : 'updated';
          logAudit({ req, category: 'application', verb,
            resource: name, detail: `Application status changed to ${updates.status}` });
        }).catch(() => {});
    }
    // Fire job notifications when status changes (non-blocking)
    if (updates.status && updates.status !== existing.rows[0].status) {
      const notifEvent = updates.status === 'APPROVED' ? 'application_approved'
        : updates.status === 'REJECTED' ? 'application_rejected' : null;
      if (notifEvent) {
        dispatchJobNotif(pool, notifEvent, {
          volunteerId: existing.rows[0].volunteer_id,
        }).catch(() => {});
      }
    }
    res.json({ success: true, data: mapApplication(rows[0]), message: 'Application updated' });
  } catch (err) {
    console.error('PUT /api/applications/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update application' });
  }
});

// ===== FOLDERS CRUD =====
app.get('/api/folders', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM folders ORDER BY name ASC');
    res.json({ success: true, data: rows.map(mapFolder) });
  } catch (err) {
    console.error('GET /api/folders error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch folders' });
  }
});

app.post('/api/folders', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO folders (id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [id, name.trim().slice(0, 100), typeof color === 'string' ? color : '#6366f1']
    );
    res.status(201).json({ success: true, data: mapFolder(rows[0]) });
  } catch (err) {
    console.error('POST /api/folders error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create folder' });
  }
});

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Folder deleted' });
  } catch (err) {
    console.error('DELETE /api/folders/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete folder' });
  }
});

// ===== FILES CRUD =====
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.query;
    let query = 'SELECT * FROM files';
    const params = [];
    if (folderId && typeof folderId === 'string') {
      query += ' WHERE folder_id = $1';
      params.push(folderId);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows.map(mapFile) });
  } catch (err) {
    console.error('GET /api/files error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch files' });
  }
});

app.post('/api/files', requireAuth, upload.single('file'), async (req, res) => {
  try {
    let fileUrl = '';
    let storagePath = '';
    let fileName = '';
    let fileType = 'other';
    let fileSize = '';
    let folderId = null;
    let uploadedBy = '';

    if (req.file) {
      // ── Real file upload ──────────────────────────────────────────────────
      if (!storageEnabled) {
        return res.status(503).json({ success: false, error: 'File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.' });
      }

      const originalName = req.file.originalname || 'untitled';
      const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
      storagePath = `${req.user.id}/${generateId()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError.message);
        return res.status(500).json({ success: false, error: 'File upload to storage failed.' });
      }

      const { data: { publicUrl } } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
      fileUrl = publicUrl;
      fileName = (typeof req.body.name === 'string' && req.body.name.trim()) || originalName;
      fileSize = formatBytes(req.file.size);
      folderId = req.body.folderId || null;
      uploadedBy = req.body.uploadedBy || '';

      // Guess type from original filename/mimetype
      const ext = originalName.split('.').pop()?.toLowerCase() ?? '';
      if (ext === 'pdf' || req.file.mimetype === 'application/pdf') fileType = 'pdf';
      else if (['doc', 'docx'].includes(ext)) fileType = 'doc';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (ext === 'csv' || req.file.mimetype === 'text/csv') fileType = 'csv';

    } else {
      // ── URL / metadata only ───────────────────────────────────────────────
      const { name, type, size, url, uploadedBy: ub } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      fileName = name.trim().slice(0, 255);
      fileType = typeof type === 'string' ? type : 'other';
      fileSize = typeof size === 'string' ? size.slice(0, 20) : '';
      folderId = req.body.folderId || null;
      fileUrl = typeof url === 'string' ? url.slice(0, 2000) : '';
      uploadedBy = typeof ub === 'string' ? ub.slice(0, 100) : '';
    }

    if (folderId) {
      const folderCheck = await pool.query('SELECT id FROM folders WHERE id = $1', [folderId]);
      if (!folderCheck.rows.length) {
        // Clean up uploaded file if folder doesn't exist
        if (storagePath && supabase) await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);
        return res.status(400).json({ success: false, error: 'Folder not found' });
      }
    }

    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO files (id, name, type, size, folder_id, url, storage_path, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, fileName, fileType, fileSize, folderId, fileUrl, storagePath, uploadedBy]
    );
    const f = rows[0];
    logAudit({ req, category: 'file', verb: 'uploaded',
      resource: f.name, detail: `Uploaded${f.size ? ` (${f.size})` : ''}` });
    res.status(201).json({ success: true, data: mapFile(f) });
  } catch (err) {
    console.error('POST /api/files error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create file' });
  }
});

app.delete('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, storage_path FROM files WHERE id = $1', [req.params.id]);
    if (rows.length && rows[0].storage_path && supabase) {
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([rows[0].storage_path]);
      if (error) console.warn('Storage delete warning:', error.message);
    }
    const fileName = rows[0]?.name || req.params.id;
    await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
    logAudit({ req, category: 'file', verb: 'deleted',
      resource: fileName, detail: 'File deleted' });
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('DELETE /api/files/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const [volStats, evStats, appStats, hoursRes, catRes] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active
        FROM volunteers`),
      pool.query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('UPCOMING','PUBLISHED')) AS upcoming
        FROM events`),
      pool.query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved
        FROM applications`),
      pool.query('SELECT COALESCE(SUM(hours_contributed), 0) AS total FROM volunteers'),
      pool.query(`SELECT category, COUNT(*) AS count FROM events GROUP BY category ORDER BY count DESC`),
    ]);

    res.json({
      success: true,
      data: {
        totalVolunteers: parseInt(volStats.rows[0].total, 10),
        activeVolunteers: parseInt(volStats.rows[0].active, 10),
        totalHours: parseInt(hoursRes.rows[0].total, 10),
        totalEvents: parseInt(evStats.rows[0].total, 10),
        upcomingEvents: parseInt(evStats.rows[0].upcoming, 10),
        totalApplications: parseInt(appStats.rows[0].total, 10),
        pendingApplications: parseInt(appStats.rows[0].pending, 10),
        approvedApplications: parseInt(appStats.rows[0].approved, 10),
        eventsByCategory: catRes.rows.map((r) => ({ category: r.category, count: parseInt(r.count, 10) })),
      },
    });
  } catch (err) {
    console.error('GET /api/dashboard/stats error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ===== TRAINING =====

function mapCourse(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    color: r.color,
    estimatedMinutes: r.estimated_minutes,
    sections: r.sections ?? [],
    published: r.published,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : (r.created_at ?? '').split('T')[0],
  };
}

function mapModule(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    courseIds: r.course_ids ?? [],
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : (r.created_at ?? '').split('T')[0],
  };
}

function mapCompletion(r) {
  return {
    id: r.id,
    courseId: r.course_id,
    volunteerId: r.volunteer_id,
    volunteerName: r.volunteer_name,
    completedAt: r.completed_at,
    submittedFiles: r.submitted_files ?? [],
    notes: r.notes ?? '',
  };
}

// ── Courses ───────────────────────────────────────────────────────────────────
app.get('/api/training/courses', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM training_courses ORDER BY created_at DESC');
    res.json({ success: true, data: rows.map(mapCourse) });
  } catch (err) {
    console.error('GET /api/training/courses error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

app.post('/api/training/courses', requireAuth, async (req, res) => {
  try {
    const { title, description, category, color, estimatedMinutes, sections, published } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    const id = generateId();
    const { rows } = await pool.query(
      `INSERT INTO training_courses (id, title, description, category, color, estimated_minutes, sections, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        title.trim().slice(0, 200),
        typeof description === 'string' ? description.slice(0, 2000) : '',
        typeof category === 'string' ? category.slice(0, 100) : 'Other',
        typeof color === 'string' ? color.slice(0, 20) : '#2563eb',
        parseInt(estimatedMinutes, 10) || 30,
        jsn(Array.isArray(sections) ? sections : []),
        Boolean(published),
      ]
    );
    res.status(201).json({ success: true, data: mapCourse(rows[0]) });
  } catch (err) {
    console.error('POST /api/training/courses error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

app.put('/api/training/courses/:id', requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT id FROM training_courses WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Course not found' });

    const { title, description, category, color, estimatedMinutes, sections, published } = req.body;
    const { rows } = await pool.query(
      `UPDATE training_courses SET
        title=$1, description=$2, category=$3, color=$4,
        estimated_minutes=$5, sections=$6, published=$7
       WHERE id=$8 RETURNING *`,
      [
        typeof title === 'string' ? title.trim().slice(0, 200) : existing[0].title,
        typeof description === 'string' ? description.slice(0, 2000) : '',
        typeof category === 'string' ? category.slice(0, 100) : 'Other',
        typeof color === 'string' ? color.slice(0, 20) : '#2563eb',
        parseInt(estimatedMinutes, 10) || 30,
        jsn(Array.isArray(sections) ? sections : []),
        Boolean(published),
        req.params.id,
      ]
    );
    res.json({ success: true, data: mapCourse(rows[0]) });
  } catch (err) {
    console.error('PUT /api/training/courses/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

app.delete('/api/training/courses/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM training_courses WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    console.error('DELETE /api/training/courses/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
});

// ── Modules ───────────────────────────────────────────────────────────────────
app.get('/api/training/modules', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM training_modules ORDER BY created_at DESC');
    res.json({ success: true, data: rows.map(mapModule) });
  } catch (err) {
    console.error('GET /api/training/modules error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch modules' });
  }
});

app.post('/api/training/modules', requireAuth, async (req, res) => {
  try {
    const { name, description, color, courseIds } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO training_modules (id, name, description, color, course_ids) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, name.trim().slice(0, 200), typeof description === 'string' ? description.slice(0, 1000) : '',
       typeof color === 'string' ? color.slice(0, 20) : '#2563eb', jsn(Array.isArray(courseIds) ? courseIds : [])]
    );
    res.status(201).json({ success: true, data: mapModule(rows[0]) });
  } catch (err) {
    console.error('POST /api/training/modules error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create module' });
  }
});

app.put('/api/training/modules/:id', requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT id FROM training_modules WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Module not found' });

    const { name, description, color, courseIds } = req.body;
    const { rows } = await pool.query(
      'UPDATE training_modules SET name=$1, description=$2, color=$3, course_ids=$4 WHERE id=$5 RETURNING *',
      [typeof name === 'string' ? name.trim().slice(0, 200) : '',
       typeof description === 'string' ? description.slice(0, 1000) : '',
       typeof color === 'string' ? color.slice(0, 20) : '#2563eb',
       jsn(Array.isArray(courseIds) ? courseIds : []), req.params.id]
    );
    res.json({ success: true, data: mapModule(rows[0]) });
  } catch (err) {
    console.error('PUT /api/training/modules/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update module' });
  }
});

app.delete('/api/training/modules/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM training_modules WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Module deleted' });
  } catch (err) {
    console.error('DELETE /api/training/modules/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete module' });
  }
});

// ── Completions ───────────────────────────────────────────────────────────────
app.get('/api/training/completions', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    let query = 'SELECT * FROM training_completions';
    const params = [];
    if (courseId && typeof courseId === 'string') {
      query += ' WHERE course_id = $1';
      params.push(courseId);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows.map(mapCompletion) });
  } catch (err) {
    console.error('GET /api/training/completions error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch completions' });
  }
});

app.post('/api/training/completions', requireAuth, async (req, res) => {
  try {
    const { courseId, volunteerId, volunteerName, completedAt, submittedFiles, notes } = req.body;
    if (!courseId || !volunteerId || !completedAt) {
      return res.status(400).json({ success: false, error: 'courseId, volunteerId, and completedAt are required' });
    }
    const courseCheck = await pool.query('SELECT id FROM training_courses WHERE id = $1', [courseId]);
    if (!courseCheck.rows.length) return res.status(400).json({ success: false, error: 'Course not found' });

    const id = generateId();
    const { rows } = await pool.query(
      `INSERT INTO training_completions (id, course_id, volunteer_id, volunteer_name, completed_at, submitted_files, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, courseId, volunteerId, typeof volunteerName === 'string' ? volunteerName.slice(0, 200) : '',
       completedAt, jsn(Array.isArray(submittedFiles) ? submittedFiles : []),
       typeof notes === 'string' ? notes.slice(0, 1000) : '']
    );
    res.status(201).json({ success: true, data: mapCompletion(rows[0]) });
  } catch (err) {
    console.error('POST /api/training/completions error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record completion' });
  }
});

app.delete('/api/training/completions/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM training_completions WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Completion deleted' });
  } catch (err) {
    console.error('DELETE /api/training/completions/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete completion' });
  }
});

// ─── Training Assignments ─────────────────────────────────────────────────────

function mapAssignment(row) {
  return {
    id:         row.id,
    courseId:   row.course_id,
    personId:   row.person_id   || row.volunteer_id   || '',
    personName: row.person_name || row.volunteer_name || '',
    personType: row.person_type || 'volunteer',
    assignedAt: row.assigned_at,
    dueDate:    row.due_date || null,
  };
}

// Accept any non-empty string as person_type (supports 'volunteer' and dynamic group IDs)

// GET /api/training/assignments?courseId=...
app.get('/api/training/assignments', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const { rows } = courseId
      ? await pool.query('SELECT * FROM training_assignments WHERE course_id = $1 ORDER BY assigned_at ASC', [courseId])
      : await pool.query('SELECT * FROM training_assignments ORDER BY assigned_at ASC');
    res.json({ success: true, data: rows.map(mapAssignment) });
  } catch (err) {
    console.error('GET /api/training/assignments error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// POST /api/training/assignments — body: { courseId, people: [{id, name, type}], dueDate? }
app.post('/api/training/assignments', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { courseId, people, dueDate } = req.body;
    if (!courseId || !Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ success: false, error: 'courseId and people[] are required' });
    }
    const created = [];
    for (const person of people) {
      const personType = (typeof person.type === 'string' && person.type.trim()) ? person.type.trim() : 'volunteer';
      const id = Math.random().toString(36).slice(2, 10);
      const { rows } = await pool.query(
        `INSERT INTO training_assignments (id, course_id, person_id, person_name, person_type, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (course_id, person_id, person_type) DO UPDATE SET due_date = EXCLUDED.due_date
         RETURNING *`,
        [id, courseId, person.id, person.name || '', personType, dueDate || null]
      );
      created.push(mapAssignment(rows[0]));
    }
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('POST /api/training/assignments error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create assignments' });
  }
});

// DELETE /api/training/assignments/:id
app.delete('/api/training/assignments/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM training_assignments WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    console.error('DELETE /api/training/assignments/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete assignment' });
  }
});

// ─── Members ──────────────────────────────────────────────────────────────────

app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 100, 1, 500);
    const { rows } = await pool.query(
      `SELECT * FROM members WHERE status != 'inactive' ORDER BY name ASC LIMIT $1`, [limit]
    );
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, email: r.email, membershipType: r.membership_type, status: r.status })) });
  } catch (err) {
    console.error('GET /api/members error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// ─── Employees ────────────────────────────────────────────────────────────────

app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 100, 1, 500);
    const { rows } = await pool.query(
      `SELECT * FROM employees WHERE status = 'active' ORDER BY name ASC LIMIT $1`, [limit]
    );
    res.json({ success: true, data: rows.map(r => ({ id: r.id, name: r.name, email: r.email, department: r.department, title: r.title, status: r.status })) });
  } catch (err) {
    console.error('GET /api/employees error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// ─── People Groups ────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
}
function mapGroup(r) {
  return { id: r.id, name: r.name, slug: r.slug, color: r.color, createdAt: r.created_at };
}
function mapGroupMember(r) {
  return { id: r.id, groupId: r.group_id, name: r.name, email: r.email, phone: r.phone, status: r.status, notes: r.notes, joinedAt: r.joined_at };
}

app.get('/api/people/groups', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM people_groups ORDER BY name ASC');
    res.json({ success: true, data: rows.map(mapGroup) });
  } catch (err) {
    console.error('GET /api/people/groups error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

app.post('/api/people/groups', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const id = generateId();
    const baseSlug = slugify(name.trim());
    let slug = baseSlug;
    let attempt = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const check = await pool.query('SELECT id FROM people_groups WHERE slug = $1', [slug]);
      if (!check.rows.length) break;
      slug = `${baseSlug}-${attempt++}`;
    }
    const { rows } = await pool.query(
      'INSERT INTO people_groups (id, name, slug, color) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, name.trim().slice(0, 100), slug, typeof color === 'string' ? color.slice(0, 20) : '#6366f1']
    );
    res.status(201).json({ success: true, data: mapGroup(rows[0]) });
  } catch (err) {
    console.error('POST /api/people/groups error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

app.put('/api/people/groups/:id', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, color } = req.body;
    const { rows } = await pool.query(
      'UPDATE people_groups SET name=$1, color=$2 WHERE id=$3 RETURNING *',
      [typeof name === 'string' ? name.trim().slice(0, 100) : '', typeof color === 'string' ? color.slice(0, 20) : '#6366f1', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Group not found' });
    res.json({ success: true, data: mapGroup(rows[0]) });
  } catch (err) {
    console.error('PUT /api/people/groups/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update group' });
  }
});

app.delete('/api/people/groups/:id', requireAuth, writeLimiter, async (req, res) => {
  try {
    await pool.query('DELETE FROM people_groups WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Group deleted' });
  } catch (err) {
    console.error('DELETE /api/people/groups/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete group' });
  }
});

// ─── Group Members ────────────────────────────────────────────────────────────

app.get('/api/people/groups/:groupId/members', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 ORDER BY name ASC',
      [req.params.groupId]
    );
    res.json({ success: true, data: rows.map(mapGroupMember) });
  } catch (err) {
    console.error('GET /api/people/groups/:groupId/members error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

app.post('/api/people/groups/:groupId/members', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, email, phone, status, notes } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const id = generateId();
    const { rows } = await pool.query(
      'INSERT INTO group_members (id, group_id, name, email, phone, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, req.params.groupId, name.trim().slice(0, 200),
       typeof email === 'string' ? email.trim().slice(0, 200) : '',
       typeof phone === 'string' ? phone.trim().slice(0, 50) : '',
       typeof status === 'string' ? status : 'active',
       typeof notes === 'string' ? notes.slice(0, 1000) : '']
    );
    res.status(201).json({ success: true, data: mapGroupMember(rows[0]) });
  } catch (err) {
    console.error('POST /api/people/groups/:groupId/members error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add member' });
  }
});

app.put('/api/people/groups/:groupId/members/:memberId', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, email, phone, status, notes } = req.body;
    const { rows } = await pool.query(
      'UPDATE group_members SET name=$1, email=$2, phone=$3, status=$4, notes=$5 WHERE id=$6 AND group_id=$7 RETURNING *',
      [typeof name === 'string' ? name.trim().slice(0, 200) : '',
       typeof email === 'string' ? email.trim().slice(0, 200) : '',
       typeof phone === 'string' ? phone.trim().slice(0, 50) : '',
       typeof status === 'string' ? status : 'active',
       typeof notes === 'string' ? notes.slice(0, 1000) : '',
       req.params.memberId, req.params.groupId]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Member not found' });
    res.json({ success: true, data: mapGroupMember(rows[0]) });
  } catch (err) {
    console.error('PUT /api/people/groups/:groupId/members/:memberId error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update member' });
  }
});

app.delete('/api/people/groups/:groupId/members/:memberId', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM group_members WHERE id = $1 AND group_id = $2', [req.params.memberId, req.params.groupId]);
    res.json({ success: true, message: 'Member deleted' });
  } catch (err) {
    console.error('DELETE /api/people/groups/:groupId/members/:memberId error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete member' });
  }
});

// ===== QR HELPERS =====

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + 'vf_qr_v1').digest('hex').slice(0, 16);
}

function detectDevice(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return 'Tablet';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(lower)) return 'Mobile';
  return 'Desktop';
}

// ===== QR CAMPAIGNS =====

function mapQrCampaign(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    color: row.color,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapQrCode(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    content: row.content,
    displayValue: row.display_value,
    fgColor: row.fg_color,
    bgColor: row.bg_color,
    style: row.style,
    size: row.size,
    includeMargin: row.include_margin,
    status: row.status,
    campaignId: row.campaign_id || undefined,
    totalScans: row.total_scans,
    lastScannedAt: row.last_scanned_at || undefined,
    createdAt: row.created_at,
  };
}

app.get('/api/qr/campaigns', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM qr_campaigns ORDER BY created_at DESC');
    res.json({ success: true, data: rows.map(mapQrCampaign) });
  } catch (err) {
    console.error('GET /api/qr/campaigns error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/qr/campaigns', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, description, color, status } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const id = 'cmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const { rows } = await pool.query(
      'INSERT INTO qr_campaigns (id, name, description, color, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id,
       name.trim().slice(0, 200),
       typeof description === 'string' ? description.trim().slice(0, 500) : '',
       typeof color === 'string' ? color.trim() : '#3b82f6',
       typeof status === 'string' ? status : 'active']
    );
    res.status(201).json({ success: true, data: mapQrCampaign(rows[0]) });
  } catch (err) {
    console.error('POST /api/qr/campaigns error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

app.put('/api/qr/campaigns/:id', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, description, color, status } = req.body;
    const { rows } = await pool.query(
      'UPDATE qr_campaigns SET name=$1, description=$2, color=$3, status=$4 WHERE id=$5 RETURNING *',
      [typeof name === 'string' ? name.trim().slice(0, 200) : '',
       typeof description === 'string' ? description.trim().slice(0, 500) : '',
       typeof color === 'string' ? color.trim() : '#3b82f6',
       typeof status === 'string' ? status : 'active',
       req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, data: mapQrCampaign(rows[0]) });
  } catch (err) {
    console.error('PUT /api/qr/campaigns/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

app.delete('/api/qr/campaigns/:id', requireAuth, async (req, res) => {
  try {
    // Unlink QR codes from this campaign before deleting
    await pool.query('UPDATE qr_codes SET campaign_id = NULL WHERE campaign_id = $1', [req.params.id]);
    await pool.query('DELETE FROM qr_campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('DELETE /api/qr/campaigns/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// ===== QR CODES =====

app.get('/api/qr/codes', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM qr_codes ORDER BY created_at DESC');
    res.json({ success: true, data: rows.map(mapQrCode) });
  } catch (err) {
    console.error('GET /api/qr/codes error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch QR codes' });
  }
});

app.post('/api/qr/codes', requireAuth, writeLimiter, async (req, res) => {
  try {
    const { name, type, content, displayValue, fgColor, bgColor, style, size, includeMargin, status, campaignId } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }
    const qrType = typeof type === 'string' ? type : 'URL';
    const id = 'qr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    // URL-type QR codes use a tracking redirect so scans are recorded.
    // All other types (WIFI, VCARD, EMAIL, PHONE, TEXT) embed content directly.
    const effectiveContent = qrType === 'URL'
      ? `${BACKEND_PUBLIC_URL}/api/qr/redirect/${id}`
      : content.trim();
    const { rows } = await pool.query(
      `INSERT INTO qr_codes (id, name, type, content, display_value, fg_color, bg_color, style, size, include_margin, status, campaign_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id,
       typeof name === 'string' ? name.trim().slice(0, 200) : 'QR Code',
       qrType,
       effectiveContent,
       typeof displayValue === 'string' ? displayValue.trim() : content.trim(),
       typeof fgColor === 'string' ? fgColor : '#1e3a5f',
       typeof bgColor === 'string' ? bgColor : '#ffffff',
       typeof style === 'string' ? style : 'rounded',
       Number.isInteger(size) ? size : 256,
       includeMargin !== false,
       typeof status === 'string' ? status : 'active',
       campaignId || null]
    );
    res.status(201).json({ success: true, data: mapQrCode(rows[0]) });
  } catch (err) {
    console.error('POST /api/qr/codes error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create QR code' });
  }
});

app.patch('/api/qr/codes/:id', requireAuth, writeLimiter, async (req, res) => {
  try {
    const allowed = ['name', 'status', 'campaign_id', 'total_scans', 'last_scanned_at'];
    const sets = [];
    const vals = [];
    let idx = 1;

    const fieldMap = { name: 'name', status: 'status', campaignId: 'campaign_id', totalScans: 'total_scans', lastScannedAt: 'last_scanned_at' };
    for (const [jsKey, colKey] of Object.entries(fieldMap)) {
      if (req.body[jsKey] !== undefined) {
        sets.push(`${colKey} = $${idx++}`);
        vals.push(req.body[jsKey] ?? null);
      }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE qr_codes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'QR code not found' });
    res.json({ success: true, data: mapQrCode(rows[0]) });
  } catch (err) {
    console.error('PATCH /api/qr/codes/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update QR code' });
  }
});

app.delete('/api/qr/codes/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM qr_codes WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'QR code deleted' });
  } catch (err) {
    console.error('DELETE /api/qr/codes/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete QR code' });
  }
});

// ===== QR SCAN REDIRECT (public — no auth) =====

app.get('/api/qr/redirect/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM qr_codes WHERE id = $1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).send('QR code not found.');
    }
    const qr = rows[0];
    if (qr.status === 'paused' || qr.status === 'archived') {
      return res.status(410).send('This QR code is no longer active.');
    }

    // Record scan asynchronously — redirect immediately, don't block on DB write
    const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim()
      || (req.socket && req.socket.remoteAddress) || '';
    const ua   = (req.headers['user-agent'] || '').slice(0, 500);
    const ref  = (req.headers['referer'] || '').slice(0, 500);
    const scanId = 'sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    pool.query(
      'INSERT INTO qr_scans (id, qr_id, ip_hash, user_agent, device_type, referrer) VALUES ($1,$2,$3,$4,$5,$6)',
      [scanId, qr.id, hashIp(ip), ua, detectDevice(ua), ref]
    ).then(() =>
      pool.query(
        'UPDATE qr_codes SET total_scans = total_scans + 1, last_scanned_at = NOW() WHERE id = $1',
        [qr.id]
      )
    ).catch((err) => console.error('[QR scan] record error:', err.message));

    res.redirect(302, qr.display_value);
  } catch (err) {
    console.error('GET /api/qr/redirect/:id error:', err.message);
    res.status(500).send('Internal server error.');
  }
});

// ===== QR ANALYTICS =====

app.get('/api/qr/codes/:id/analytics', requireAuth, async (req, res) => {
  try {
    const qrId = req.params.id;
    const { rows: check } = await pool.query('SELECT id FROM qr_codes WHERE id = $1', [qrId]);
    if (!check.length) return res.status(404).json({ success: false, error: 'QR code not found' });

    const [totalsRes, timelineRes, devicesRes, referrersRes, hourlyRes] = await Promise.all([
      // Totals: all-time + today + this week
      pool.query(`
        SELECT
          COUNT(*)                                                                     AS total,
          COUNT(DISTINCT ip_hash)                                                      AS unique_count,
          COUNT(*) FILTER (WHERE DATE(scanned_at AT TIME ZONE 'UTC') = CURRENT_DATE)  AS today,
          COUNT(*) FILTER (WHERE scanned_at >= date_trunc('week', NOW() AT TIME ZONE 'UTC')) AS this_week
        FROM qr_scans WHERE qr_id = $1
      `, [qrId]),

      // Timeline — last 30 days, zero-filled
      pool.query(`
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
          )::date AS date
        ),
        daily AS (
          SELECT DATE(scanned_at AT TIME ZONE 'UTC') AS date, COUNT(*) AS scans
          FROM qr_scans
          WHERE qr_id = $1 AND scanned_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(scanned_at AT TIME ZONE 'UTC')
        )
        SELECT d.date::text, COALESCE(dl.scans, 0)::int AS scans
        FROM dates d LEFT JOIN daily dl ON d.date = dl.date
        ORDER BY d.date
      `, [qrId]),

      // Device breakdown
      pool.query(`
        SELECT device_type AS name, COUNT(*)::int AS value
        FROM qr_scans WHERE qr_id = $1
        GROUP BY device_type
        ORDER BY value DESC
      `, [qrId]),

      // Top referrers
      pool.query(`
        SELECT
          CASE WHEN referrer = '' THEN 'Direct scan' ELSE referrer END AS source,
          COUNT(*)::int AS scans
        FROM qr_scans WHERE qr_id = $1
        GROUP BY referrer
        ORDER BY scans DESC
        LIMIT 8
      `, [qrId]),

      // Hourly heatmap (hour 0–23), zero-filled
      pool.query(`
        WITH hours AS (SELECT generate_series(0, 23) AS hour),
        hourly AS (
          SELECT EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'UTC')::int AS hour, COUNT(*)::int AS count
          FROM qr_scans WHERE qr_id = $1
          GROUP BY EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'UTC')::int
        )
        SELECT h.hour, COALESCE(hd.count, 0)::int AS count
        FROM hours h LEFT JOIN hourly hd ON h.hour = hd.hour
        ORDER BY h.hour
      `, [qrId]),
    ]);

    const t = totalsRes.rows[0];
    const DEVICE_COLORS = { Mobile: '#3b82f6', Desktop: '#8b5cf6', Tablet: '#10b981', unknown: '#6b7280' };

    res.json({
      success: true,
      data: {
        qrId,
        totalScans:    parseInt(t.total,        10),
        uniqueScans:   parseInt(t.unique_count, 10),
        scansToday:    parseInt(t.today,        10),
        scansThisWeek: parseInt(t.this_week,    10),
        timeline:      timelineRes.rows,
        devices:       devicesRes.rows.map((r) => ({
          name:  r.name,
          value: r.value,
          fill:  DEVICE_COLORS[r.name] || '#6b7280',
        })),
        topLocations:  [],  // Requires geo-IP service
        topReferrers:  referrersRes.rows,
        hourlyHeatmap: hourlyRes.rows.map((r) => r.count),
      },
    });
  } catch (err) {
    console.error('GET /api/qr/codes/:id/analytics error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// ===== MESSAGES =====

// ── Helpers ───────────────────────────────────────────────────────────────────
function mapTemplate(r) {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel,
    subject: r.subject,
    body: r.body,
    createdAt: r.created_at,
  };
}

function mapReminder(r) {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel,
    triggerHours: parseFloat(r.trigger_hours),
    templateId: r.template_id,
    customBody: r.custom_body,
    enabled: r.enabled,
    eventScope: r.event_scope,
    createdAt: r.created_at,
  };
}

function mapSentMessage(r) {
  return {
    id: r.id,
    channel: r.channel,
    subject: r.subject,
    body: r.body,
    recipients: r.recipients,
    sentAt: r.sent_at,
    status: r.status,
  };
}

function mapLoginNotif(r) {
  const seenBy = Array.isArray(r.seen_by) ? r.seen_by : (r.seen_by || []);
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    active: r.active,
    seenBy,
    createdAt: r.created_at,
  };
}

function mapNotifRule(r) {
  return {
    id: r.id,
    event: r.event,
    label: r.label,
    description: r.description,
    group: r.grp,
    volunteerChannel: r.volunteer_channel,
    leaderChannel: r.leader_channel,
    adminChannel: r.admin_channel,
  };
}

// ── Portal Designer Settings ──────────────────────────────────────────────────

const PORTAL_TYPES = new Set(['volunteer', 'member', 'employee']);

function mapPortalSettings(row) {
  return {
    portalType: row.portal_type,
    themeId:    row.theme_id,
    customHtml: row.custom_html,
    useCustom:  row.use_custom,
  };
}

// Public — no auth needed (volunteers/members need to access the portal HTML)
app.get('/api/portal/settings/:type', async (req, res) => {
  const { type } = req.params;
  if (!PORTAL_TYPES.has(type)) return res.status(400).json({ error: 'Invalid portal type' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM portal_settings WHERE portal_type = $1',
      [type]
    );
    if (!rows.length) return res.json({ portalType: type, themeId: 'default', customHtml: '', useCustom: false });
    res.json(mapPortalSettings(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/settings/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  if (!PORTAL_TYPES.has(type)) return res.status(400).json({ error: 'Invalid portal type' });
  const { themeId, customHtml, useCustom } = req.body;
  try {
    await pool.query(
      `INSERT INTO portal_settings (portal_type, theme_id, custom_html, use_custom, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (portal_type) DO UPDATE SET
         theme_id   = EXCLUDED.theme_id,
         custom_html = EXCLUDED.custom_html,
         use_custom = EXCLUDED.use_custom,
         updated_at = NOW()`,
      [type, themeId || 'default', customHtml || '', useCustom === true]
    );
    const { rows } = await pool.query(
      'SELECT * FROM portal_settings WHERE portal_type = $1', [type]
    );
    res.json(mapPortalSettings(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Org Settings ──────────────────────────────────────────────────────────────

/** Fetch the single org_settings row (always id='default'). */
async function getOrgSettings() {
  const { rows } = await pool.query("SELECT * FROM org_settings WHERE id = 'default'");
  return rows[0] || {};
}

function mapOrgSettings(s) {
  return {
    emailFromName:    s.email_from_name    || '',
    emailFromAddress: s.email_from_address || '',
    smsFromName:      s.sms_from_name      || '',
    orgName:          s.org_name           || '',
    website:          s.website            || '',
    orgEmail:         s.org_email          || '',
    phone:            s.phone              || '',
    address:          s.address            || '',
    timezone:         s.timezone           || 'America/New_York',
    language:         s.language           || 'English (US)',
    description:      s.description        || '',
    taxId:            s.tax_id             || '',
    logoUrl:          s.logo_url           || '',
  };
}

app.get('/api/settings', requireAuth, async (_req, res) => {
  try {
    const s = await getOrgSettings();
    res.json(mapOrgSettings(s));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const {
    emailFromName, emailFromAddress, smsFromName,
    orgName, website, orgEmail, phone, address, timezone, language, description, taxId, logoUrl,
  } = req.body;
  try {
    await pool.query(
      `UPDATE org_settings
       SET email_from_name    = $1,
           email_from_address = $2,
           sms_from_name      = $3,
           org_name           = $4,
           website            = $5,
           org_email          = $6,
           phone              = $7,
           address            = $8,
           timezone           = $9,
           language           = $10,
           description        = $11,
           tax_id             = $12,
           logo_url           = $13,
           updated_at         = NOW()
       WHERE id = 'default'`,
      [
        (emailFromName    || '').trim().slice(0, 100),
        (emailFromAddress || '').trim().slice(0, 200),
        (smsFromName      || '').trim().slice(0, 20),
        (orgName          || '').trim().slice(0, 200),
        (website          || '').trim().slice(0, 500),
        (orgEmail         || '').trim().slice(0, 200),
        (phone            || '').trim().slice(0, 50),
        (address          || '').trim().slice(0, 500),
        (timezone         || 'America/New_York').trim().slice(0, 100),
        (language         || 'English (US)').trim().slice(0, 50),
        (description      || '').trim().slice(0, 2000),
        (taxId            || '').trim().slice(0, 50),
        (logoUrl          || '').slice(0, 2000000), // base64 data URL ≤ ~1.5 MB image
      ]
    );
    logAudit({ req, category: 'settings', verb: 'updated',
      resource: 'Organization', detail: 'Settings updated' });
    const s = await getOrgSettings();
    res.json(mapOrgSettings(s));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notification preferences ──────────────────────────────────────────────────

const DEFAULT_NOTIF_PREFS = {
  email_new_app: true, email_app_approved: true, email_app_rejected: false,
  email_event_reminder: true, email_new_volunteer: true, email_weekly_digest: true,
  email_billing: true,
  push_new_app: false, push_event_reminder: true, push_new_volunteer: false,
  digest_frequency: 'weekly',
  quiet_hours_enabled: false, quiet_start: '22:00', quiet_end: '08:00',
};

app.get('/api/notifications', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT notif_prefs FROM org_settings WHERE id = 'default'");
    const stored = (rows[0]?.notif_prefs && typeof rows[0].notif_prefs === 'object')
      ? rows[0].notif_prefs : {};
    res.json({ success: true, data: { ...DEFAULT_NOTIF_PREFS, ...stored } });
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch notification preferences' });
  }
});

app.put('/api/notifications', requireAuth, writeLimiter, async (req, res) => {
  const prefs = req.body;
  if (!prefs || typeof prefs !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid preferences payload' });
  }
  const merged = { ...DEFAULT_NOTIF_PREFS, ...prefs };
  try {
    await pool.query(
      "UPDATE org_settings SET notif_prefs = $1, updated_at = NOW() WHERE id = 'default'",
      [JSON.stringify(merged)]
    );
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('PUT /api/notifications error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save notification preferences' });
  }
});

// ── Messaging settings ────────────────────────────────────────────────────────

app.put('/api/messaging', requireAuth, writeLimiter, async (req, res) => {
  const { emailFromName = '', emailFromAddress = '', smsFromName = '' } = req.body;
  try {
    await pool.query(
      `UPDATE org_settings SET email_from_name=$1, email_from_address=$2, sms_from_name=$3, updated_at=NOW() WHERE id='default'`,
      [emailFromName.trim().slice(0, 100), emailFromAddress.trim().slice(0, 200), smsFromName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11)]
    );
    res.json({ success: true, data: {
      emailFromName: emailFromName.trim().slice(0, 100),
      emailFromAddress: emailFromAddress.trim().slice(0, 200),
      smsFromName: smsFromName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11),
    }});
  } catch (err) {
    console.error('PUT /api/messaging error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save messaging settings' });
  }
});

// ── Branding settings ─────────────────────────────────────────────────────────

app.get('/api/branding', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT portal_name, portal_subdomain, brand_primary, brand_accent,
              welcome_heading, welcome_subtext, footer_text, show_powered_by, logo_base64
       FROM org_settings WHERE id = 'default'`
    );
    const r = rows[0] || {};
    res.json({ success: true, data: {
      portalName:     r.portal_name     || '',
      subdomain:      r.portal_subdomain || '',
      primaryColor:   r.brand_primary   || '#10b981',
      accentColor:    r.brand_accent    || '#0d9488',
      welcomeHeading: r.welcome_heading  || '',
      welcomeSubtext: r.welcome_subtext  || '',
      footerText:     r.footer_text      || '',
      showPoweredBy:  r.show_powered_by !== false,
      logoBase64:     r.logo_base64     || '',
    }});
  } catch (err) {
    console.error('GET /api/branding error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch branding settings' });
  }
});

app.put('/api/branding', requireAuth, writeLimiter, async (req, res) => {
  const {
    portalName = '', subdomain = '', primaryColor = '#10b981', accentColor = '#0d9488',
    welcomeHeading = '', welcomeSubtext = '', footerText = '', showPoweredBy = true, logoBase64 = '',
  } = req.body;
  try {
    const cleaned = {
      portalName:     String(portalName).trim().slice(0, 200),
      subdomain:      String(subdomain).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63),
      primaryColor:   String(primaryColor).slice(0, 20),
      accentColor:    String(accentColor).slice(0, 20),
      welcomeHeading: String(welcomeHeading).trim().slice(0, 200),
      welcomeSubtext: String(welcomeSubtext).trim().slice(0, 500),
      footerText:     String(footerText).trim().slice(0, 300),
      showPoweredBy:  Boolean(showPoweredBy),
      logoBase64:     String(logoBase64).slice(0, 500000),
    };
    await pool.query(
      `UPDATE org_settings SET
         portal_name=$1, portal_subdomain=$2, brand_primary=$3, brand_accent=$4,
         welcome_heading=$5, welcome_subtext=$6, footer_text=$7, show_powered_by=$8,
         logo_base64=$9, updated_at=NOW()
       WHERE id='default'`,
      [cleaned.portalName, cleaned.subdomain, cleaned.primaryColor, cleaned.accentColor,
       cleaned.welcomeHeading, cleaned.welcomeSubtext, cleaned.footerText, cleaned.showPoweredBy,
       cleaned.logoBase64]
    );
    logAudit({ req, category: 'settings', verb: 'updated', resource: 'Branding', detail: 'Branding settings updated' });
    res.json({ success: true, data: cleaned });
  } catch (err) {
    console.error('PUT /api/branding error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save branding settings' });
  }
});

// ── Password change ────────────────────────────────────────────────────────────

app.put('/api/auth/password', requireAuth, writeLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
  }
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.sub]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.sub]);
    logAudit({ req, category: 'auth', verb: 'updated', resource: 'Password', detail: 'Password changed successfully' });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /api/auth/password error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// ── Org roles ─────────────────────────────────────────────────────────────────

app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM org_roles ORDER BY sort_order ASC, name ASC');
    res.json({ success: true, data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      color: r.color,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
      isSystem: r.is_system,
      sortOrder: r.sort_order,
    })) });
  } catch (err) {
    console.error('GET /api/roles error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

app.post('/api/roles', requireAuth, writeLimiter, async (req, res) => {
  const { name, description = '', color = 'bg-gray-500', permissions = {} } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  const id = `role_custom_${Date.now()}`;
  try {
    const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(sort_order),0) AS m FROM org_roles');
    const sortOrder = (parseInt(maxRows[0].m, 10) || 0) + 1;
    const { rows } = await pool.query(
      `INSERT INTO org_roles (id, name, description, color, permissions, is_system, sort_order)
       VALUES ($1,$2,$3,$4,$5,FALSE,$6) RETURNING *`,
      [id, name.trim(), description.trim(), color, JSON.stringify(permissions), sortOrder]
    );
    const r = rows[0];
    res.status(201).json({ success: true, data: {
      id: r.id, name: r.name, description: r.description, color: r.color,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
      isSystem: r.is_system, sortOrder: r.sort_order,
    }});
  } catch (err) {
    console.error('POST /api/roles error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

app.put('/api/roles/:id', requireAuth, writeLimiter, async (req, res) => {
  const { name, description, color, permissions } = req.body;
  const { id } = req.params;
  try {
    const { rows: existing } = await pool.query('SELECT * FROM org_roles WHERE id = $1', [id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Role not found' });
    const role = existing[0];
    const updName = name !== undefined ? name.trim() : role.name;
    const updDesc = description !== undefined ? description.trim() : role.description;
    const updColor = color !== undefined ? color : role.color;
    const updPerms = permissions !== undefined ? JSON.stringify(permissions) : JSON.stringify(role.permissions || {});
    const { rows } = await pool.query(
      `UPDATE org_roles SET name=$1, description=$2, color=$3, permissions=$4 WHERE id=$5 RETURNING *`,
      [updName, updDesc, updColor, updPerms, id]
    );
    const r = rows[0];
    res.json({ success: true, data: {
      id: r.id, name: r.name, description: r.description, color: r.color,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
      isSystem: r.is_system, sortOrder: r.sort_order,
    }});
  } catch (err) {
    console.error('PUT /api/roles/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

app.delete('/api/roles/:id', requireAuth, writeLimiter, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT is_system FROM org_roles WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Role not found' });
    if (rows[0].is_system) return res.status(400).json({ success: false, error: 'Cannot delete system roles' });
    await pool.query('DELETE FROM org_roles WHERE id = $1', [id]);
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    console.error('DELETE /api/roles/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
});

// ── Team management ────────────────────────────────────────────────────────────

app.get('/api/team', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at ASC'
    );
    res.json({ success: true, data: rows.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      joinedAt: u.created_at instanceof Date ? u.created_at.toISOString().split('T')[0] : (u.created_at || '').split('T')[0],
    })) });
  } catch (err) {
    console.error('GET /api/team error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

app.put('/api/team/:id/role', requireAuth, writeLimiter, async (req, res) => {
  const { role } = req.body;
  if (!role || typeof role !== 'string') {
    return res.status(400).json({ success: false, error: 'role is required' });
  }
  const { rows: roleCheck } = await pool.query('SELECT id FROM org_roles WHERE id = $1', [role]);
  if (!roleCheck.length) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ success: false, error: 'You cannot change your own role' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role, created_at',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    logAudit({ req, category: 'settings', verb: 'updated', resource: rows[0].full_name,
      detail: `Role changed to ${role}` });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('PUT /api/team/:id/role error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

app.delete('/api/team/:id', requireAuth, writeLimiter, async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ success: false, error: 'You cannot remove yourself' });
  }
  try {
    const { rows } = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'User not found' });
    if (rows.length) {
      logAudit({ req, category: 'settings', verb: 'deleted', resource: rows[0].full_name,
        detail: 'Team member removed' });
    }
    res.json({ success: true, message: 'Team member removed' });
  } catch (err) {
    console.error('DELETE /api/team/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to remove team member' });
  }
});

// ── Message Templates ─────────────────────────────────────────────────────────

app.get('/api/messages/templates', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM message_templates ORDER BY created_at ASC');
    res.json(rows.map(mapTemplate));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/templates', requireAuth, async (req, res) => {
  const { name, channel, subject, body } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'name and body required' });
  const id = 'tpl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    const { rows } = await pool.query(
      'INSERT INTO message_templates (id, name, channel, subject, body) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, name.trim(), channel || 'email', (subject || '').trim(), body.trim()]
    );
    res.json(mapTemplate(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/templates/:id', requireAuth, async (req, res) => {
  const { name, channel, subject, body } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE message_templates SET name=$1, channel=$2, subject=$3, body=$4 WHERE id=$5 RETURNING *',
      [(name || '').trim(), channel || 'email', (subject || '').trim(), (body || '').trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapTemplate(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/templates/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM message_templates WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── Auto Reminders ────────────────────────────────────────────────────────────

app.get('/api/messages/reminders', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM auto_reminders ORDER BY created_at ASC');
    res.json(rows.map(mapReminder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/reminders', requireAuth, async (req, res) => {
  const { name, channel, triggerHours, templateId, customBody, enabled, eventScope } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = 'rem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    const { rows } = await pool.query(
      `INSERT INTO auto_reminders (id, name, channel, trigger_hours, template_id, custom_body, enabled, event_scope)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name.trim(), channel || 'email', triggerHours ?? 24, templateId || null, customBody || '', enabled !== false, eventScope || 'all']
    );
    res.json(mapReminder(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/reminders/:id', requireAuth, async (req, res) => {
  const { name, channel, triggerHours, templateId, customBody, enabled, eventScope } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE auto_reminders SET name=$1, channel=$2, trigger_hours=$3, template_id=$4,
       custom_body=$5, enabled=$6, event_scope=$7 WHERE id=$8 RETURNING *`,
      [(name || '').trim(), channel || 'email', triggerHours ?? 24, templateId || null, customBody || '', enabled !== false, eventScope || 'all', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapReminder(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/reminders/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM auto_reminders WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── Sent Messages / History ───────────────────────────────────────────────────

app.get('/api/messages/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sent_messages ORDER BY sent_at DESC LIMIT 200');
    res.json(rows.map(mapSentMessage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/send', requireAuth, async (req, res) => {
  const { channel, subject, body, recipientMode, eventId, volunteerIds } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  try {
    // Resolve recipients from DB
    let recipientRows = [];
    if (recipientMode === 'event' && eventId) {
      const { rows } = await pool.query(
        `SELECT v.email, v.phone FROM volunteers v
         JOIN applications a ON a.volunteer_id = v.id
         WHERE a.event_id = $1 AND a.status NOT IN ('REJECTED')`,
        [eventId]
      );
      recipientRows = rows;
    } else if (recipientMode === 'select' && Array.isArray(volunteerIds) && volunteerIds.length) {
      const { rows } = await pool.query(
        'SELECT email, phone FROM volunteers WHERE id = ANY($1)',
        [volunteerIds]
      );
      recipientRows = rows;
    } else {
      // 'all' — send to all ACTIVE volunteers
      const { rows } = await pool.query(
        "SELECT email, phone FROM volunteers WHERE status = 'ACTIVE'"
      );
      recipientRows = rows;
    }

    // Resolve custom sender from org settings
    const orgSettings  = await getOrgSettings();
    const emailFrom    = buildFrom(orgSettings);

    // Dispatch messages via Resend / Twilio (or log if not configured)
    const { sent, failed } = await dispatchBulk(channel || 'email', recipientRows, subject || '', body, emailFrom);
    const finalStatus = failed === 0 ? 'delivered' : sent === 0 ? 'failed' : 'partial';

    // Record in DB
    const id = 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const { rows } = await pool.query(
      'INSERT INTO sent_messages (id, channel, subject, body, recipients, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, channel || 'email', subject || '', body, sent, finalStatus]
    );
    logAudit({ req, category: 'message', verb: 'sent',
      resource: `${(channel || 'email').toUpperCase()} Blast`,
      detail: `Sent to ${sent} recipient${sent !== 1 ? 's' : ''} — "${(subject || body).slice(0, 60)}"` });
    res.json(mapSentMessage(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Login Notifications ───────────────────────────────────────────────────────

app.get('/api/messages/login-notifications', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM login_notifications ORDER BY created_at DESC');
    res.json(rows.map(mapLoginNotif));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/login-notifications', requireAuth, async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  const id = 'ln_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    const { rows } = await pool.query(
      `INSERT INTO login_notifications (id, title, message, type, active, seen_by)
       VALUES ($1,$2,$3,$4,true,'[]') RETURNING *`,
      [id, title.trim(), message.trim(), type || 'info']
    );
    res.json(mapLoginNotif(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/login-notifications/:id', requireAuth, async (req, res) => {
  const { title, message, type } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE login_notifications SET title=$1, message=$2, type=$3 WHERE id=$4 RETURNING *',
      [(title || '').trim(), (message || '').trim(), type || 'info', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapLoginNotif(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/messages/login-notifications/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE login_notifications SET active = NOT active,
       seen_by = CASE WHEN active THEN seen_by ELSE '[]'::jsonb END
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapLoginNotif(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/login-notifications/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM login_notifications WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── Job Notification Rules ────────────────────────────────────────────────────

app.get('/api/messages/notif-rules', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM job_notif_rules ORDER BY id ASC');
    res.json(rows.map(mapNotifRule));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/notif-rules', requireAuth, async (req, res) => {
  const rules = req.body;
  if (!Array.isArray(rules)) return res.status(400).json({ error: 'expected array' });
  try {
    for (const r of rules) {
      await pool.query(
        `UPDATE job_notif_rules SET volunteer_channel=$1, leader_channel=$2, admin_channel=$3 WHERE event=$4`,
        [r.volunteerChannel || 'none', r.leaderChannel || 'none', r.adminChannel || 'none', r.event]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Event volunteer count (for Compose tab) ───────────────────────────────────
app.get('/api/events/:id/volunteer-count', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM applications WHERE event_id=$1 AND status NOT IN ('REJECTED')`,
      [req.params.id]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUDIT LOG =====
app.get('/api/audit', requireAuth, async (req, res) => {
  try {
    const page     = parseIntParam(req.query.page, 1, 1);
    const limit    = parseIntParam(req.query.limit, 50, 1, 200);
    const { search, category, verb, userName } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (search && typeof search === 'string') {
      const q = `%${search.toLowerCase()}%`;
      conditions.push(`(LOWER(user_name) LIKE $${idx} OR LOWER(resource) LIKE $${idx+1} OR LOWER(detail) LIKE $${idx+2} OR LOWER(verb) LIKE $${idx+3})`);
      params.push(q, q, q, q);
      idx += 4;
    }
    if (category && typeof category === 'string') {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (verb && typeof verb === 'string') {
      conditions.push(`verb = $${idx++}`);
      params.push(verb);
    }
    if (userName && typeof userName === 'string') {
      conditions.push(`user_name = $${idx++}`);
      params.push(userName);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes, dataRes, usersRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params),
      pool.query(
        `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx+1}`,
        [...params, limit, (page - 1) * limit]
      ),
      pool.query('SELECT DISTINCT user_name FROM audit_logs ORDER BY user_name ASC'),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: dataRes.rows.map((r) => ({
        id:        r.id,
        timestamp: r.timestamp,
        userId:    r.user_id,
        user:      r.user_name,
        userRole:  r.user_role,
        category:  r.category,
        verb:      r.verb,
        resource:  r.resource,
        detail:    r.detail,
        ip:        r.ip || undefined,
      })),
      users: usersRes.rows.map((r) => r.user_name),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/audit error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
  }
});

// ===== 404 HANDLER =====
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ===== ERROR HANDLER =====
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ===== AUTO-REMINDER SCHEDULER ==============================================
// Runs every 15 minutes. For each enabled reminder it finds events whose
// start_date falls within a ±8-minute window around (now + triggerHours) and
// sends the configured message to registered volunteers.
// The sent_auto_reminders table ensures each (reminder, event) pair is only
// delivered once, even if the server restarts.

async function processAutoReminders() {
  try {
    const { rows: reminders } = await pool.query(
      'SELECT * FROM auto_reminders WHERE enabled = true'
    );
    if (!reminders.length) return;

    const now = new Date();
    for (const reminder of reminders) {
      const triggerMs   = parseFloat(reminder.trigger_hours) * 60 * 60 * 1000;
      const windowStart = new Date(now.getTime() + triggerMs - 8 * 60 * 1000).toISOString();
      const windowEnd   = new Date(now.getTime() + triggerMs + 8 * 60 * 1000).toISOString();

      const { rows: events } = await pool.query(
        `SELECT id, title FROM events
         WHERE status IN ('PUBLISHED','UPCOMING')
           AND start_date >= $1 AND start_date <= $2`,
        [windowStart, windowEnd]
      );

      for (const event of events) {
        // Skip if already sent for this reminder + event pair
        const { rows: already } = await pool.query(
          'SELECT 1 FROM sent_auto_reminders WHERE reminder_id = $1 AND event_id = $2',
          [reminder.id, event.id]
        );
        if (already.length) continue;

        // Resolve recipients
        let vols;
        if (reminder.event_scope === 'specific') {
          ({ rows: vols } = await pool.query(
            `SELECT v.email, v.phone FROM volunteers v
             JOIN applications a ON a.volunteer_id = v.id
             WHERE a.event_id = $1 AND a.status NOT IN ('REJECTED')`,
            [event.id]
          ));
        } else {
          ({ rows: vols } = await pool.query(
            "SELECT email, phone FROM volunteers WHERE status = 'ACTIVE'"
          ));
        }
        if (!vols.length) continue;

        // Determine message body (custom_body > template > fallback)
        let msgBody = reminder.custom_body || '';
        if (!msgBody && reminder.template_id) {
          const { rows: tmpl } = await pool.query(
            'SELECT body FROM message_templates WHERE id = $1',
            [reminder.template_id]
          );
          if (tmpl.length) msgBody = tmpl[0].body;
        }
        if (!msgBody) msgBody = `Reminder: "${event.title}" is coming up soon!`;
        msgBody = msgBody.replace(/\{event_title\}/g, event.title);

        const orgCfg   = await getOrgSettings();
        const emailFrom = buildFrom(orgCfg);
        await dispatchBulk(reminder.channel, vols, `Reminder: ${event.title}`, msgBody, emailFrom);

        // Mark as sent
        await pool.query(
          'INSERT INTO sent_auto_reminders (reminder_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [reminder.id, event.id]
        );
        console.log(`[AutoReminder] "${reminder.name}" → "${event.title}" (${vols.length} recipients)`);
      }
    }
  } catch (err) {
    console.error('[AutoReminder] Error:', err.message);
  }
}

// ===== STARTUP =====
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[Server] VolunteerFlow API running on port ${PORT} (${NODE_ENV})`);
      if (NODE_ENV !== 'test') {
        setInterval(processAutoReminders, 15 * 60 * 1000);
        processAutoReminders(); // also run once immediately on startup
      }
    });
  } catch (err) {
    console.error('[Startup] Failed to initialise database:', err.message);
    console.error('Ensure PostgreSQL is running and DATABASE_URL is set correctly.');
    process.exit(1);
  }
}

start();
