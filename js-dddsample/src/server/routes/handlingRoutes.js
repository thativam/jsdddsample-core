'use strict';

const express = require('express');
const router = express.Router();
const { parse } = require('../../interfaces/handling/HandlingReportParser');

/**
 * @param {object} applicationEvents
 */
module.exports = function handlingRoutes(applicationEvents) {

  // POST /handlingReport — submit handling event report
  router.post('/handlingReport', (req, res) => {
    try {
      const attempts = parse(req.body);
      attempts.forEach(a => applicationEvents.receivedHandlingEventRegistrationAttempt(a));
      res.status(201).json({ registered: attempts.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
