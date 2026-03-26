'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth', require('./auth')(pool));
  router.use('/orgs', require('./orgs')(pool));
  router.use('/support', require('./support')(pool));
  router.use('/audit', require('./audit')(pool));
  router.use('/feedback', require('./feedback')(pool));
  router.use('/employees', require('./employees')(pool));
  router.use('/roles', require('./roles')(pool));
  router.use('/help', require('./help')(pool));
  router.use('/settings', require('./settings')(pool));
  return router;
};
