import Cargo              from '../../domain/model/cargo/Cargo.js';
import TrackingId         from '../../domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../domain/model/cargo/Itinerary.js';
import Leg                from '../../domain/model/cargo/Leg.js';
import HandlingEvent      from '../../domain/model/handling/HandlingEvent.js';
import * as SampleLocations from './SampleLocations.js';
import * as SampleVoyages   from './SampleVoyages.js';

async function generate(storeLocation, storeVoyage, storeCargo, storeEvent, createHandlingEvent, lookupHistory) {
  const { toDate } = SampleVoyages;
  const { HONGKONG, HANGZHOU, NEWYORK, DALLAS, HELSINKI, STOCKHOLM } = SampleLocations;
  const { HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI } = SampleVoyages;

  await Promise.all(SampleLocations.getAll().map(loc => storeLocation(loc)));
  await Promise.all([
    SampleVoyages.HONGKONG_TO_NEW_YORK,
    SampleVoyages.NEW_YORK_TO_DALLAS,
    SampleVoyages.DALLAS_TO_HELSINKI,
    SampleVoyages.DALLAS_TO_HELSINKI_ALT,
    SampleVoyages.HELSINKI_TO_HONGKONG,
  ].map(v => storeVoyage(v)));

  // ── ABC123: Hongkong → Helsinki ───────────────────────────────────────────
  const trackingId1 = TrackingId('ABC123');
  const abc123 = Cargo(trackingId1, RouteSpecification(HONGKONG, HELSINKI, toDate('2009-03-15')));
  abc123.assignToRoute(Itinerary([
    Leg(HONGKONG_TO_NEW_YORK, HONGKONG, NEWYORK,  toDate('2009-03-02'), toDate('2009-03-05')),
    Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,   toDate('2009-03-06'), toDate('2009-03-08')),
    Leg(DALLAS_TO_HELSINKI,   DALLAS,   HELSINKI, toDate('2009-03-09'), toDate('2009-03-12')),
  ]));
  await storeCargo(abc123);

  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-01'), trackingId1, null,                                HONGKONG.unLocode(), HandlingEvent.Type.RECEIVE));
  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-02'), trackingId1, HONGKONG_TO_NEW_YORK.voyageNumber(), HONGKONG.unLocode(), HandlingEvent.Type.LOAD));
  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-05'), trackingId1, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(),  HandlingEvent.Type.UNLOAD));

  abc123.deriveDeliveryProgress(await lookupHistory(trackingId1));
  await storeCargo(abc123);

  // ── JKL567: Hangzhou → Stockholm ─────────────────────────────────────────
  const trackingId2 = TrackingId('JKL567');
  const jkl567 = Cargo(trackingId2, RouteSpecification(HANGZHOU, STOCKHOLM, toDate('2009-03-18')));
  jkl567.assignToRoute(Itinerary([
    Leg(HONGKONG_TO_NEW_YORK, HANGZHOU, NEWYORK,   toDate('2009-03-03'), toDate('2009-03-05')),
    Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,    toDate('2009-03-06'), toDate('2009-03-08')),
    Leg(DALLAS_TO_HELSINKI,   DALLAS,   STOCKHOLM, toDate('2009-03-09'), toDate('2009-03-11')),
  ]));
  await storeCargo(jkl567);

  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-01'), trackingId2, null,                                HANGZHOU.unLocode(), HandlingEvent.Type.RECEIVE));
  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-03'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), HANGZHOU.unLocode(), HandlingEvent.Type.LOAD));
  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-05'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(),  HandlingEvent.Type.UNLOAD));
  await storeEvent(await createHandlingEvent(new Date(), toDate('2009-03-06'), trackingId2, HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(),  HandlingEvent.Type.LOAD));

  jkl567.deriveDeliveryProgress(await lookupHistory(trackingId2));
  await storeCargo(jkl567);

  console.info('Sample data loaded.');
}

export { generate };
