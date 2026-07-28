import express from 'express';
import { parse } from '../../interfaces/handling/HandlingReportParser.js';

export default function handlingRoutes(applicationEvents) {
  const router = express.Router();

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
}
