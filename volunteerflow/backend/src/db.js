const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://volunteerflow:volunteerflow@localhost/volunteerflow',
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // 1. Customer schema (creates users, volunteers, events, applications, etc.)
    //    Must run BEFORE staff schema because staff/schema.sql references users(id)
    //    via the org_notes table foreign key.
    const customerSchema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(customerSchema);

    // 2. Staff schema (creates staff_roles, staff_users, staff_sessions, org_notes, etc.
    //    Depends on: users table from customer schema)
    const staffSchema = fs.readFileSync(path.join(__dirname, 'staff/schema.sql'), 'utf8');
    await pool.query(staffSchema);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase,
};
