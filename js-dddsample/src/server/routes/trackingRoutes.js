import express from 'express';
import TrackingId from '../../domain/model/cargo/TrackingId.js';
import CargoTrackingViewAdapter from '../../interfaces/tracking/CargoTrackingViewAdapter.js';

export default function trackingRoutes(cargoRepository, handlingEventRepository) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { trackingId } = req.query;
    if (!trackingId) {
      return res.status(400).json({ error: 'trackingId query parameter is required' });
    }
    try {
      const trkId = TrackingId(trackingId);
      const [cargo, history] = await Promise.all([
        cargoRepository.find(trkId),
        handlingEventRepository.lookupHandlingHistoryOfCargo(trkId),
      ]);
      if (!cargo) {
        return res.status(404).json({ error: `Unknown tracking id: ${trackingId}` });
      }
      const handlingEvents = history.distinctEventsByCompletionTime();
      const adapter = CargoTrackingViewAdapter(cargo, handlingEvents);
      res.json({
        trackingId:           adapter.getTrackingId(),
        origin:               adapter.getOrigin(),
        destination:          adapter.getDestination(),
        statusText:           adapter.getStatusText(),
        eta:                  adapter.getEta(),
        nextExpectedActivity: adapter.getNextExpectedActivity(),
        misdirected:          adapter.isMisdirected(),
        events: adapter.getEvents().map(e => ({
          location:     e.getLocation(),
          time:         e.getTime(),
          type:         e.getType(),
          voyageNumber: e.getVoyageNumber(),
          expected:     e.isExpected(),
          description:  e.getDescription(),
        })),
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
