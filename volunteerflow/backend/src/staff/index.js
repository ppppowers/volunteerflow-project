'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth', require('./auth')(pool));
  router.use('/orgs', require('./orgs')(pool));
  router.use('/support', require('./support')(pool));
  // TODO: add audit, employees, roles in subsequent tasks
  return router;
};
