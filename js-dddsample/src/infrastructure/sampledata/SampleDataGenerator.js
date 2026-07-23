'use strict';

const Cargo               = require('../../domain/model/cargo/Cargo');
const TrackingId          = require('../../domain/model/cargo/TrackingId');
const RouteSpecification  = require('../../domain/model/cargo/RouteSpecification');
const Itinerary           = require('../../domain/model/cargo/Itinerary');
const Leg                 = require('../../domain/model/cargo/Leg');
const HandlingEvent       = require('../../domain/model/handling/HandlingEvent');
const SampleLocations     = require('./SampleLocations');
const SampleVoyages       = require('./SampleVoyages');

/**
 * Loads sample data into in-memory repositories.
 * Receives individual store/lookup functions — no repo objects as params (SHOULD).
 * All data constants are defined inside the function (MUST — no module-level variables).
 *
 * @param storeLocation  locationRepository.store
 * @param storeVoyage    voyageRepository.store
 * @param storeCargo     cargoRepository.store
 * @param storeEvent     handlingEventRepository.store
 * @param createHandlingEvent  bound HandlingEventFactory.createHandlingEvent
 * @param lookupHistory  handlingEventRepository.lookupHandlingHistoryOfCargo
 */
function generate(storeLocation, storeVoyage, storeCargo, storeEvent, createHandlingEvent, lookupHistory) {
  // All data references live inside the function scope
  const { toDate } = SampleVoyages;
  const { HONGKONG, HANGZHOU, NEWYORK, DALLAS, HELSINKI, STOCKHOLM } = SampleLocations;
  const { HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI } = SampleVoyages;

  for (const location of SampleLocations.getAll()) {
    storeLocation(location);
  }
  for (const voyage of [
    SampleVoyages.HONGKONG_TO_NEW_YORK, SampleVoyages.NEW_YORK_TO_DALLAS,
    SampleVoyages.DALLAS_TO_HELSINKI,   SampleVoyages.DALLAS_TO_HELSINKI_ALT,
    SampleVoyages.HELSINKI_TO_HONGKONG,
  ]) {
    storeVoyage(voyage);
  }

  // ── ABC123: Hongkong → Helsinki ─────────────────────────────────────────────
  const trackingId1 = TrackingId('ABC123');
  const routeSpec1  = RouteSpecification(HONGKONG, HELSINKI, toDate('2009-03-15'));
  const abc123 = Cargo(trackingId1, routeSpec1);
  abc123.assignToRoute(Itinerary([
    Leg(HONGKONG_TO_NEW_YORK, HONGKONG, NEWYORK,  toDate('2009-03-02'), toDate('2009-03-05')),
    Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,   toDate('2009-03-06'), toDate('2009-03-08')),
    Leg(DALLAS_TO_HELSINKI,   DALLAS,   HELSINKI, toDate('2009-03-09'), toDate('2009-03-12')),
  ]));
  storeCargo(abc123);

  try {
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-01'), trackingId1, null, HONGKONG.unLocode(), HandlingEvent.Type.RECEIVE));
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-02'), trackingId1, HONGKONG_TO_NEW_YORK.voyageNumber(), HONGKONG.unLocode(), HandlingEvent.Type.LOAD));
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-05'), trackingId1, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.UNLOAD));
  } catch (e) { throw new Error(e); }

  abc123.deriveDeliveryProgress(lookupHistory(trackingId1));
  storeCargo(abc123);

  // ── JKL567: Hangzhou → Stockholm ────────────────────────────────────────────
  const trackingId2 = TrackingId('JKL567');
  const routeSpec2  = RouteSpecification(HANGZHOU, STOCKHOLM, toDate('2009-03-18'));
  const jkl567 = Cargo(trackingId2, routeSpec2);
  jkl567.assignToRoute(Itinerary([
    Leg(HONGKONG_TO_NEW_YORK, HANGZHOU, NEWYORK,   toDate('2009-03-03'), toDate('2009-03-05')),
    Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,    toDate('2009-03-06'), toDate('2009-03-08')),
    Leg(DALLAS_TO_HELSINKI,   DALLAS,   STOCKHOLM, toDate('2009-03-09'), toDate('2009-03-11')),
  ]));
  storeCargo(jkl567);

  try {
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-01'), trackingId2, null, HANGZHOU.unLocode(), HandlingEvent.Type.RECEIVE));
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-03'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), HANGZHOU.unLocode(), HandlingEvent.Type.LOAD));
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-05'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.UNLOAD));
    storeEvent(createHandlingEvent(new Date(), toDate('2009-03-06'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.LOAD));
  } catch (e) { throw new Error(e); }

  jkl567.deriveDeliveryProgress(lookupHistory(trackingId2));
  storeCargo(jkl567);

  console.info('Sample data loaded.');
}

module.exports = { generate };
