'use strict';

const express = require('express');
const router = express.Router();

/**
 * @param {import('../../interfaces/booking/BookingServiceFacade')} bookingServiceFacade
 */
module.exports = function adminRoutes(bookingServiceFacade) {

  // GET /admin/registration — show booking form
  router.get('/registration', (req, res) => {
    const locations = bookingServiceFacade.listShippingLocations();
    res.json({ locations });
  });

  // POST /admin/register — book new cargo
  router.post('/register', (req, res) => {
    try {
      const { originUnlocode, destinationUnlocode, arrivalDeadline } = req.body;
      const deadline = new Date(arrivalDeadline);
      const trackingId = bookingServiceFacade.bookNewCargo(originUnlocode, destinationUnlocode, deadline);
      res.status(201).json({ trackingId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // GET /admin/list — list all cargos
  router.get('/list', (req, res) => {
    const cargoList = bookingServiceFacade.listAllCargos();
    res.json({ cargoList });
  });

  // GET /admin/show?trackingId=... — show cargo details
  router.get('/show', (req, res) => {
    const { trackingId } = req.query;
    const cargo = bookingServiceFacade.loadCargoForRouting(trackingId);
    if (!cargo) return res.status(404).json({ error: 'Cargo not found' });
    res.json({ cargo });
  });

  // GET /admin/selectItinerary?trackingId=... — list route candidates
  router.get('/selectItinerary', (req, res) => {
    const { trackingId } = req.query;
    const routeCandidates = bookingServiceFacade.requestPossibleRoutesForCargo(trackingId);
    const cargo = bookingServiceFacade.loadCargoForRouting(trackingId);
    res.json({ routeCandidates, cargo });
  });

  // POST /admin/assignItinerary — assign a route
  router.post('/assignItinerary', (req, res) => {
    try {
      const { trackingId, itinerary, legs } = req.body;
      bookingServiceFacade.assignCargoToRoute(trackingId, itinerary || { legs });
      res.status(200).json({ trackingId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // GET /admin/pickNewDestination?trackingId=... — show destination picker
  router.get('/pickNewDestination', (req, res) => {
    const { trackingId } = req.query;
    const locations = bookingServiceFacade.listShippingLocations();
    const cargo = bookingServiceFacade.loadCargoForRouting(trackingId);
    res.json({ locations, cargo });
  });

  // POST /admin/changeDestination
  router.post('/changeDestination', (req, res) => {
    try {
      const { trackingId, unlocode } = req.body;
      bookingServiceFacade.changeDestination(trackingId, unlocode);
      res.status(200).json({ trackingId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
