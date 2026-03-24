const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://volunteerflow:volunteerflow@localhost/volunteerflow',
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Read and execute staff schema
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
