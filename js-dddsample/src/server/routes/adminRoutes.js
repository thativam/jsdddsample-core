'use strict';

const express = require('express');
const router  = express.Router();

module.exports = function adminRoutes(bookingServiceFacade) {

  router.get('/registration', async (req, res) => {
    try {
      const locations = await bookingServiceFacade.listShippingLocations();
      res.json({ locations });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/register', async (req, res) => {
    try {
      const { originUnlocode, destinationUnlocode, arrivalDeadline } = req.body;
      const trackingId = await bookingServiceFacade.bookNewCargo(
        originUnlocode, destinationUnlocode, new Date(arrivalDeadline)
      );
      res.status(201).json({ trackingId });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/list', async (req, res) => {
    try {
      const cargoList = await bookingServiceFacade.listAllCargos();
      res.json({ cargoList });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/show', async (req, res) => {
    try {
      const cargo = await bookingServiceFacade.loadCargoForRouting(req.query.trackingId);
      if (!cargo) return res.status(404).json({ error: 'Cargo not found' });
      res.json({ cargo });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/selectItinerary', async (req, res) => {
    try {
      const { trackingId } = req.query;
      const [routeCandidates, cargo] = await Promise.all([
        bookingServiceFacade.requestPossibleRoutesForCargo(trackingId),
        bookingServiceFacade.loadCargoForRouting(trackingId),
      ]);
      res.json({ routeCandidates, cargo });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/assignItinerary', async (req, res) => {
    try {
      const { trackingId, itinerary, legs } = req.body;
      await bookingServiceFacade.assignCargoToRoute(trackingId, itinerary || { legs });
      res.status(200).json({ trackingId });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/pickNewDestination', async (req, res) => {
    try {
      const { trackingId } = req.query;
      const [locations, cargo] = await Promise.all([
        bookingServiceFacade.listShippingLocations(),
        bookingServiceFacade.loadCargoForRouting(trackingId),
      ]);
      res.json({ locations, cargo });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/changeDestination', async (req, res) => {
    try {
      const { trackingId, unlocode } = req.body;
      await bookingServiceFacade.changeDestination(trackingId, unlocode);
      res.status(200).json({ trackingId });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  return router;
};
