/**
 * Email (Resend) and SMS (Twilio) delivery module.
 *
 * Gracefully degrades: if credentials are missing, messages are logged to the
 * console so the app remains fully functional without delivery services configured.
 *
 * Email provider: Resend  https://resend.com
 * SMS provider:   Twilio  https://twilio.com
 */

const RESEND_API_KEY    = process.env.RESEND_API_KEY || '';
const RESEND_FROM       = process.env.RESEND_FROM || 'VolunteerFlow <noreply@volunteerflow.com>';
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Lazily initialise the Twilio client (only if the package is installed and vars set)
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch {
    console.warn('[Mailer] twilio package not installed — SMS delivery disabled');
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

/**
 * Send a single email via the Resend REST API.
 * Uses Node 18+ native fetch — no additional package required.
 *
 * @param {string} to       Recipient address
 * @param {string} subject
 * @param {string} body     Plain-text body
 * @param {string} [from]   Optional "From" header override (e.g. "ACME <hi@acme.org>")
 */
async function sendEmail(to, subject, body, from) {
  if (!to) return;
  const sender = from || RESEND_FROM;
  if (!RESEND_API_KEY) {
    console.log(`[Mailer] Email (no RESEND_API_KEY) from="${sender}" → ${to} | ${subject}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: sender, to: [to], subject, text: body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

// ── SMS ───────────────────────────────────────────────────────────────────────

/**
 * Send a single SMS via Twilio.
 *
 * @param {string} to   E.164 phone number, e.g. +12125551234
 * @param {string} body Message text (≤160 chars for single segment)
 */
async function sendSms(to, body) {
  if (!to) return;
  if (!twilioClient) {
    console.log(`[Mailer] SMS (Twilio not configured) → ${to} | ${body.slice(0, 50)}`);
    return;
  }
  await twilioClient.messages.create({ from: TWILIO_PHONE_NUMBER, to, body });
}

// ── Bulk dispatch ─────────────────────────────────────────────────────────────

/**
 * Convert a display name or subdomain to a safe email local part.
 * @param {string} str
 * @returns {string}
 */
function toEmailSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'noreply';
}

/**
 * Build a RFC 5321 "From" string from an org_settings row.
 * Always uses @volunteerflow.us — no custom domain needed.
 *
 * @param {{ email_from_name?: string, portal_subdomain?: string, org_name?: string }|null} settings
 * @returns {string}
 */
function buildFrom(settings) {
  const name = (settings?.email_from_name || '').trim();
  const slug = (settings?.portal_subdomain || '').trim() || toEmailSlug(name || (settings?.org_name || ''));
  const addr = `${slug}@volunteerflow.us`;
  return name ? `${name} <${addr}>` : addr;
}

/**
 * Send a message to a list of recipients, collecting sent/failed counts.
 *
 * @param {'email'|'sms'} channel
 * @param {Array<{email: string, phone: string}>} recipients
 * @param {string} subject
 * @param {string} body
 * @param {string|undefined} [emailFrom]  Optional "From" header (built via buildFrom)
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function dispatchBulk(channel, recipients, subject, body, emailFrom) {
  let sent = 0;
  let failed = 0;
  const errors = [];
  for (const r of recipients) {
    try {
      if (channel === 'sms') {
        await sendSms(r.phone, body);
      } else {
        await sendEmail(r.email, subject, body, emailFrom);
      }
      sent++;
    } catch (err) {
      console.error(`[Mailer] Failed → ${r.email || r.phone}:`, err.message);
      errors.push(`${r.email || r.phone}: ${err.message}`);
      failed++;
    }
  }
  return { sent, failed, errors };
}

// ── Job notifications ─────────────────────────────────────────────────────────

/**
 * Look up a job_notif_rule by event name and notify the target volunteer.
 * Errors are swallowed — this is always fire-and-forget.
 *
 * @param {import('pg').Pool} pool
 * @param {string} eventName        e.g. 'application_approved'
 * @param {{ volunteerId?: string, subject?: string, body?: string }} data
 */
async function dispatchJobNotif(pool, eventName, data = {}) {
  try {
    const { rows: rules } = await pool.query(
      'SELECT * FROM job_notif_rules WHERE event = $1',
      [eventName]
    );
    if (!rules.length) return;

    const rule    = rules[0];
    const subject = data.subject || rule.label;
    const body    = data.body    || `VolunteerFlow: ${rule.description || rule.label}`;

    if (data.volunteerId && rule.volunteer_channel && rule.volunteer_channel !== 'none') {
      const [volRes, settingsRes] = await Promise.all([
        pool.query('SELECT email, phone FROM volunteers WHERE id = $1', [data.volunteerId]),
        pool.query("SELECT * FROM org_settings WHERE id = 'default'"),
      ]);
      const vols      = volRes.rows;
      const emailFrom = buildFrom(settingsRes.rows[0] || null);
      if (vols.length) {
        await dispatchBulk(rule.volunteer_channel, vols, subject, body, emailFrom);
      }
    }
  } catch (err) {
    console.error(`[Mailer] dispatchJobNotif(${eventName}) error:`, err.message);
  }
}

module.exports = { sendEmail, sendSms, dispatchBulk, dispatchJobNotif, buildFrom };
