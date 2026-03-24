#!/usr/bin/env node
/**
 * Bootstrap script: creates the first staff owner account.
 * Run once on fresh deployment: node scripts/create-staff-owner.js
 *
 * Requires env vars: DATABASE_URL, STAFF_OWNER_EMAIL, STAFF_OWNER_PASSWORD
 * Optional: STAFF_OWNER_NAME (defaults to "Owner")
 */
'use strict';

require('dotenv').config(); // load .env if present

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

async function main() {
  const email = process.env.STAFF_OWNER_EMAIL;
  const password = process.env.STAFF_OWNER_PASSWORD;
  const name = process.env.STAFF_OWNER_NAME || 'Owner';

  if (!email || !password) {
    console.error('ERROR: STAFF_OWNER_EMAIL and STAFF_OWNER_PASSWORD env vars required');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('ERROR: Password must be at least 12 characters');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://volunteerflow:volunteerflow@localhost/volunteerflow',
  });

  try {
    // Check if any staff owner already exists
    const existing = await pool.query(
      "SELECT COUNT(*) FROM staff_users WHERE role_id = 'role_owner'"
    );
    const ownerCount = parseInt(existing.rows[0].count);

    if (ownerCount > 0) {
      console.error(`ERROR: ${ownerCount} owner account(s) already exist. Bootstrap only runs once.`);
      console.error('To add another owner, use the employee management UI.');
      process.exit(1);
    }

    // Check role_owner exists
    const roleCheck = await pool.query("SELECT id FROM staff_roles WHERE id = 'role_owner'");
    if (!roleCheck.rows.length) {
      console.error('ERROR: role_owner not found in staff_roles table. Run the database schema first.');
      process.exit(1);
    }

    // Create the owner account
    const passwordHash = await bcrypt.hash(password, 12);
    const id = `su_${randomUUID()}`;

    await pool.query(
      `INSERT INTO staff_users (id, email, full_name, password_hash, role_id, is_active, created_by)
       VALUES ($1, $2, $3, $4, 'role_owner', true, $1)`,
      [id, email.toLowerCase().trim(), name, passwordHash]
    );

    console.log('✓ Staff owner account created successfully');
    console.log(`  Email: ${email}`);
    console.log(`  Name:  ${name}`);
    console.log(`  ID:    ${id}`);
    console.log('');
    console.log('Login at /staff/login');

  } catch (err) {
    console.error('ERROR creating owner account:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
