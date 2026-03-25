const express = require('express');
const { Pool } = require('pg');

// In-process test pool — uses TEST_DATABASE_URL env var
// Set TEST_DATABASE_URL in your shell or .env.test before running tests
// Example: TEST_DATABASE_URL=postgresql://localhost/volunteerflow_test
function createTestPool() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL must be set to run tests. Example: TEST_DATABASE_URL=postgresql://localhost/volunteerflow_test');
  }
  return new Pool({ connectionString });
}

function buildTestApp(router, pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff', router(pool));
  return app;
}

module.exports = { createTestPool, buildTestApp };
