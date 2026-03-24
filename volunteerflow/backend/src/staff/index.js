'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth', require('./auth')(pool));
  // TODO: add orgs, support, audit, employees, roles in subsequent tasks
  return router;
};
