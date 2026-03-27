/**
 * Demo org seed script — Greenwood Community Center
 *
 * Usage:
 *   cd volunteerflow/backend
 *   node scripts/seed-demo-org.js
 *
 * Requires DATABASE_URL in your .env (or environment).
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ORG_ID   = 'demo-greenwood-1';
const EMAIL    = 'demo@greenwoodcc.org';
const PASSWORD = 'Demo1234!';
const NOW      = new Date().toISOString();
const TODAY    = NOW.slice(0, 10);

function d(offsetDays) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Owner account ───────────────────────────────────────────────────────
    const hash = await bcrypt.hash(PASSWORD, 12);
    await client.query(`
      INSERT INTO users (id, org_id, email, password_hash, full_name, org_name, role, plan, billing_cycle, status, contact_name, contact_email, created_at)
      VALUES ($1,$1,$2,$3,'Sarah Mitchell','Greenwood Community Center','admin','grow','monthly','active','Sarah Mitchell',$2,$4)
      ON CONFLICT (id) DO NOTHING
    `, [ORG_ID, EMAIL, hash, NOW]);

    // ── 2. Org settings ───────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO org_settings (id, org_name, email_from_name, email_from_address, website, org_email, phone, address, timezone, description, portal_name, portal_subdomain, brand_primary, brand_accent, welcome_heading, welcome_subtext, footer_text, show_powered_by, updated_at)
      VALUES ($1,'Greenwood Community Center','Greenwood Community Center','hello@greenwoodcc.org','https://greenwoodcc.org','hello@greenwoodcc.org','(555) 234-7890','428 Elm Street, Greenwood, OH 44101','America/New_York','A nonprofit serving Greenwood residents through food assistance, youth education, and community wellness programs since 1987.','Greenwood Volunteer Hub','greenwood','#10b981','#059669','Welcome to Greenwood Community Center','Join us in making Greenwood a better place for everyone. Find upcoming events and sign up to volunteer below.','© 2024 Greenwood Community Center. All rights reserved.',true,$2)
      ON CONFLICT (id) DO NOTHING
    `, [ORG_ID, NOW]);

    // ── 3. Volunteers ─────────────────────────────────────────────────────────
    const volunteers = [
      { id: 'demo-vol-01', first: 'James',    last: 'Carter',    email: 'james.carter@email.com',    phone: '(555) 301-1001', location: 'Greenwood, OH', join: d(-180), skills: ['Food Service','Logistics'], hours: 124, status: 'ACTIVE' },
      { id: 'demo-vol-02', first: 'Maria',    last: 'Rodriguez', email: 'maria.rodriguez@email.com',  phone: '(555) 301-1002', location: 'Greenwood, OH', join: d(-210), skills: ['Tutoring','Spanish'], hours: 88,  status: 'ACTIVE' },
      { id: 'demo-vol-03', first: 'David',    last: 'Chen',      email: 'david.chen@email.com',       phone: '(555) 301-1003', location: 'Fairview, OH',  join: d(-90),  skills: ['Construction','Landscaping'], hours: 56, status: 'ACTIVE' },
      { id: 'demo-vol-04', first: 'Emily',    last: 'Thompson',  email: 'emily.thompson@email.com',   phone: '(555) 301-1004', location: 'Greenwood, OH', join: d(-14),  skills: ['Event Planning'], hours: 0,   status: 'PENDING' },
      { id: 'demo-vol-05', first: 'Robert',   last: 'Johnson',   email: 'robert.johnson@email.com',   phone: '(555) 301-1005', location: 'Greenwood, OH', join: d(-365), skills: ['Driving','First Aid'], hours: 210, status: 'ACTIVE' },
      { id: 'demo-vol-06', first: 'Lisa',     last: 'Park',      email: 'lisa.park@email.com',        phone: '(555) 301-1006', location: 'Greenwood, OH', join: d(-60),  skills: ['Photography','Social Media'], hours: 32, status: 'ACTIVE' },
      { id: 'demo-vol-07', first: 'Marcus',   last: 'Williams',  email: 'marcus.williams@email.com',  phone: '(555) 301-1007', location: 'Fairview, OH',  join: d(-120), skills: ['Mentoring','Sports Coaching'], hours: 76, status: 'ACTIVE' },
      { id: 'demo-vol-08', first: 'Jennifer', last: 'Adams',     email: 'jennifer.adams@email.com',   phone: '(555) 301-1008', location: 'Greenwood, OH', join: d(-45),  skills: ['Healthcare','CPR'], hours: 18,  status: 'ACTIVE' },
    ];

    for (const v of volunteers) {
      await client.query(`
        INSERT INTO volunteers (id, org_id, first_name, last_name, email, phone, location, join_date, skills, hours_contributed, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `, [v.id, ORG_ID, v.first, v.last, v.email, v.phone, v.location, v.join, JSON.stringify(v.skills), v.hours, v.status, NOW]);
    }

    // ── 4. Events ─────────────────────────────────────────────────────────────
    const events = [
      {
        id: 'demo-evt-01',
        title: 'Weekly Food Bank Distribution',
        description: 'Help sort, pack, and distribute food boxes to families in need. Volunteers assist with intake, stocking shelves, and loading vehicles. No experience needed — just a willing heart.',
        category: 'Food Assistance',
        location: 'Greenwood Community Center — Main Hall',
        address: '428 Elm Street, Greenwood, OH 44101',
        start: d(7) + 'T09:00',
        end:   d(7) + 'T13:00',
        spots: 8, max: 12,
        status: 'PUBLISHED',
        contact_name: 'Sarah Mitchell',
        contact_email: EMAIL,
        tags: ['food-bank','families','weekly'],
      },
      {
        id: 'demo-evt-02',
        title: 'Youth After-School Tutoring',
        description: 'Provide one-on-one tutoring to K–8 students in reading, math, and science. Sessions run Monday through Thursday. Background check required — form provided upon signup.',
        category: 'Education',
        location: 'Greenwood Community Center — Room 12B',
        address: '428 Elm Street, Greenwood, OH 44101',
        start: d(3) + 'T15:30',
        end:   d(3) + 'T17:30',
        spots: 5, max: 8,
        status: 'PUBLISHED',
        contact_name: 'Maria Rodriguez',
        contact_email: 'maria.rodriguez@email.com',
        tags: ['education','youth','tutoring'],
      },
      {
        id: 'demo-evt-03',
        title: 'Riverside Park Cleanup',
        description: 'Join us for our quarterly park cleanup along the Greenwood Riverside Trail. Gloves, bags, and refreshments provided. Bring comfortable clothes you don\'t mind getting dirty.',
        category: 'Environment',
        location: 'Riverside Park — Main Entrance',
        address: '100 River Road, Greenwood, OH 44101',
        start: d(21) + 'T08:00',
        end:   d(21) + 'T12:00',
        spots: 14, max: 20,
        status: 'PUBLISHED',
        contact_name: 'David Chen',
        contact_email: 'david.chen@email.com',
        tags: ['environment','cleanup','outdoors'],
      },
      {
        id: 'demo-evt-04',
        title: 'Community Health & Wellness Fair',
        description: 'Annual health fair offering free screenings, wellness resources, and information from local healthcare providers. Volunteers help with registration, booth setup, and guest navigation.',
        category: 'Health',
        location: 'Greenwood High School Gymnasium',
        address: '900 School Road, Greenwood, OH 44102',
        start: d(45) + 'T10:00',
        end:   d(45) + 'T16:00',
        spots: 18, max: 25,
        status: 'PUBLISHED',
        contact_name: 'Jennifer Adams',
        contact_email: 'jennifer.adams@email.com',
        tags: ['health','wellness','community'],
      },
      {
        id: 'demo-evt-05',
        title: 'Senior Companion Visits',
        description: 'Spend time with seniors at Greenwood Manor assisted living facility. Activities include conversation, board games, reading aloud, and light crafts. Makes a huge difference.',
        category: 'Senior Services',
        location: 'Greenwood Manor — Activity Room',
        address: '55 Maple Drive, Greenwood, OH 44101',
        start: d(-7) + 'T14:00',
        end:   d(-7) + 'T16:00',
        spots: 0, max: 6,
        status: 'PUBLISHED',
        contact_name: 'Robert Johnson',
        contact_email: 'robert.johnson@email.com',
        tags: ['seniors','companionship','social'],
      },
    ];

    for (const e of events) {
      await client.query(`
        INSERT INTO events (id, org_id, title, description, category, location, address, start_date, end_date, spots_available, max_volunteers, status, visibility, tags, contact_name, contact_email, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PUBLIC',$13,$14,$15,$16,$16)
        ON CONFLICT (id) DO NOTHING
      `, [e.id, ORG_ID, e.title, e.description, e.category, e.location, e.address, e.start, e.end, e.spots, e.max, e.status, JSON.stringify(e.tags), e.contact_name, e.contact_email, NOW]);
    }

    // ── 5. Applications ───────────────────────────────────────────────────────
    const applications = [
      { id: 'demo-app-01', vol: 'demo-vol-01', evt: 'demo-evt-01', status: 'APPROVED', stage: 'confirmed', msg: 'Happy to help with the food bank again this week!' },
      { id: 'demo-app-02', vol: 'demo-vol-05', evt: 'demo-evt-01', status: 'APPROVED', stage: 'confirmed', msg: 'I can drive and help load vehicles.' },
      { id: 'demo-app-03', vol: 'demo-vol-02', evt: 'demo-evt-02', status: 'APPROVED', stage: 'confirmed', msg: 'I tutored here last month and loved it.' },
      { id: 'demo-app-04', vol: 'demo-vol-07', evt: 'demo-evt-02', status: 'APPROVED', stage: 'confirmed', msg: 'Great with kids, can help with math and reading.' },
      { id: 'demo-app-05', vol: 'demo-vol-03', evt: 'demo-evt-03', status: 'APPROVED', stage: 'confirmed', msg: 'Bringing my own gloves and tools.' },
      { id: 'demo-app-06', vol: 'demo-vol-06', evt: 'demo-evt-03', status: 'APPROVED', stage: 'confirmed', msg: 'I can document the event with photos for social media.' },
      { id: 'demo-app-07', vol: 'demo-vol-04', evt: 'demo-evt-04', status: 'PENDING',  stage: 'applied',   msg: 'Excited to help at the health fair!' },
      { id: 'demo-app-08', vol: 'demo-vol-08', evt: 'demo-evt-04', status: 'APPROVED', stage: 'confirmed', msg: 'I\'m a nurse, happy to assist with screenings.' },
      { id: 'demo-app-09', vol: 'demo-vol-05', evt: 'demo-evt-05', status: 'APPROVED', stage: 'confirmed', msg: 'I visit Greenwood Manor regularly, they know me.' },
      { id: 'demo-app-10', vol: 'demo-vol-01', evt: 'demo-evt-05', status: 'APPROVED', stage: 'confirmed', msg: 'Love visiting with the seniors.' },
    ];

    for (const a of applications) {
      await client.query(`
        INSERT INTO applications (id, org_id, volunteer_id, event_id, message, status, vetting_stage, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `, [a.id, ORG_ID, a.vol, a.evt, a.msg, a.status, a.stage, NOW]);
    }

    // ── 6. Hours logged (past event) ─────────────────────────────────────────
    const hoursTable = await client.query(`SELECT to_regclass('public.volunteer_hours')`);
    if (hoursTable.rows[0].to_regclass) {
      const hoursEntries = [
        { id: 'demo-hrs-01', vol: 'demo-vol-01', evt: 'demo-evt-05', hours: 2, status: 'approved' },
        { id: 'demo-hrs-02', vol: 'demo-vol-05', evt: 'demo-evt-05', hours: 2, status: 'approved' },
      ];
      for (const h of hoursEntries) {
        await client.query(`
          INSERT INTO volunteer_hours (id, org_id, volunteer_id, event_id, hours, date, status, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO NOTHING
        `, [h.id, ORG_ID, h.vol, h.evt, h.hours, d(-7), h.status, NOW]);
      }
    }

    await client.query('COMMIT');

    console.log('');
    console.log('✓ Demo org seeded successfully!');
    console.log('');
    console.log('  Org:      Greenwood Community Center');
    console.log(`  Login:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log('  Plan:     Grow');
    console.log('');
    console.log('  Volunteers: 8');
    console.log('  Events:     5  (4 upcoming, 1 past)');
    console.log('  Applications: 10');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
