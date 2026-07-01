'use strict';

const express = require('express');
const router = express.Router();
const TrackingId = require('../../domain/model/cargo/TrackingId');
const CargoTrackingViewAdapter = require('../../interfaces/tracking/CargoTrackingViewAdapter');

/**
 * @param {object} cargoRepository
 * @param {object} handlingEventRepository
 */
module.exports = function trackingRoutes(cargoRepository, handlingEventRepository) {

  // GET /track?trackingId=... — track a cargo (REST API)
  router.get('/', (req, res) => {
    const { trackingId } = req.query;
    if (!trackingId) {
      return res.status(400).json({ error: 'trackingId query parameter is required' });
    }

    try {
      const trkId = TrackingId(trackingId);
      const cargo = cargoRepository.find(trkId);
      if (!cargo) {
        return res.status(404).json({ error: `Unknown tracking id: ${trackingId}` });
      }

      const handlingEvents = handlingEventRepository
        .lookupHandlingHistoryOfCargo(trkId)
        .distinctEventsByCompletionTime();

      const adapter = CargoTrackingViewAdapter(cargo, handlingEvents);

      res.json({
        trackingId: adapter.getTrackingId(),
        origin: adapter.getOrigin(),
        destination: adapter.getDestination(),
        statusText: adapter.getStatusText(),
        eta: adapter.getEta(),
        nextExpectedActivity: adapter.getNextExpectedActivity(),
        misdirected: adapter.isMisdirected(),
        events: adapter.getEvents().map(e => ({
          location: e.getLocation(),
          time: e.getTime(),
          type: e.getType(),
          voyageNumber: e.getVoyageNumber(),
          expected: e.isExpected(),
          description: e.getDescription(),
        })),
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
