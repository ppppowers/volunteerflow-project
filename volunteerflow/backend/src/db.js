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

    // Seed staff roles (ON CONFLICT DO NOTHING — safe to run on every startup)
    await pool.query(`
      INSERT INTO staff_roles (id, name, description, permissions, is_system, sort_order) VALUES
      ('role_owner', 'Owner', 'Full access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_plan":true,"orgs.edit_status":true,"orgs.edit_billing":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"audit.export":true,"support.view_mode":true,"support.impersonation":true,"employees.view":true,"employees.create":true,"employees.edit":true,"employees.disable":true,"roles.view":true,"roles.manage":true,"feature_flags.manage":true,"dashboard.view_management_metrics":true}', true, 0),
      ('role_super_admin', 'Super Admin', 'All except role/employee management', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_plan":true,"orgs.edit_status":true,"orgs.edit_billing":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"audit.export":true,"support.view_mode":true,"support.impersonation":true,"employees.view":true,"employees.create":true,"employees.edit":true,"roles.view":true,"dashboard.view_management_metrics":true}', true, 1),
      ('role_admin', 'Admin', 'Broad org access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_status":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"support.view_mode":true,"employees.view":true,"roles.view":true,"dashboard.view_management_metrics":true}', true, 2),
      ('role_manager', 'Manager', 'Team oversight', '{"orgs.view":true,"orgs.edit_basic":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"audit.view_org":true,"employees.view":true,"dashboard.view_management_metrics":true}', true, 3),
      ('role_senior_support', 'Senior Support', 'Full support access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"audit.view_org":true,"support.view_mode":true}', true, 4),
      ('role_support_agent', 'Support Agent', 'Basic support', '{"orgs.view":true,"orgs.edit_basic":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"support.view_mode":true}', true, 5),
      ('role_onboarding', 'Onboarding Specialist', 'Onboarding support', '{"orgs.view":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"support.view_mode":true}', true, 6),
      ('role_billing', 'Billing Specialist', 'Billing access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_billing":true,"notes.view":true}', true, 7),
      ('role_read_only', 'Read Only', 'View only', '{"orgs.view":true,"notes.view":true,"audit.view_org":true}', true, 8)
      ON CONFLICT (id) DO NOTHING
    `);

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
