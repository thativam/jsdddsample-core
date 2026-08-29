import express from 'express';
import TrackingId from '../../domain/model/cargo/TrackingId.js';
import CargoTrackingViewAdapter, { HandlingEventViewAdapter } from '../../interfaces/tracking/CargoTrackingViewAdapter.js';
import { cargoRepository, handlingEventRepository } from '../../ServiceContext.js';

export default function trackingRoutes() {
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
      console.log("[trackingRoutes] Cargo is ", cargo)
      const delivery  = cargo.delivery();
      const itinerary = cargo.itinerary();
      const nextAct   = delivery.nextExpectedActivity();
      const handlingEvents = history.distinctEventsByCompletionTime();
      const adapter = CargoTrackingViewAdapter(
        cargo.trackingId().idString(),
        cargo.origin().name(),
        cargo.routeSpecification().destination().name(),
        delivery.isMisdirected(),
        delivery.transportStatus(),
        delivery.lastKnownLocation() ? delivery.lastKnownLocation().name() : '',
        delivery.currentVoyage() ? delivery.currentVoyage().voyageNumber().idString() : '',
        delivery.estimatedTimeOfArrival(),
        nextAct ? {
          type:         nextAct.type(),
          locationName: nextAct.location().name(),
          voyageNumber: nextAct.voyage() ? nextAct.voyage().voyageNumber().idString() : null,
        } : null,
        handlingEvents.map(e => HandlingEventViewAdapter(
          e.location().name(),
          e.completionTime(),
          e.type(),
          e.voyage() && e.voyage().voyageNumber().idString() !== '' ? e.voyage().voyageNumber().idString() : '',
          itinerary ? itinerary.isExpected(e) : false,
        )),
      );
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
