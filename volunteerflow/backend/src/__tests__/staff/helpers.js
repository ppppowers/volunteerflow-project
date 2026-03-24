const express = require('express');
const { Pool } = require('pg');

// In-process test pool — uses TEST_DATABASE_URL env var
// Set TEST_DATABASE_URL in your shell or .env.test before running tests
// Example: TEST_DATABASE_URL=postgresql://localhost/volunteerflow_test
function createTestPool() {
  return new Pool({ connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL });
}

function buildTestApp(router, pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff', router(pool));
  return app;
}

module.exports = { createTestPool, buildTestApp };
