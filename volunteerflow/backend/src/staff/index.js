'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth', require('./auth')(pool));
  router.use('/orgs', require('./orgs')(pool));
  // TODO: add support, audit, employees, roles in subsequent tasks
  return router;
};
