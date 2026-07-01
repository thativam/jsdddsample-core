'use strict';

/**
 * Cargo lifecycle scenario test — mirrors CargoLifecycleScenarioTest.java.
 *
 * Scenario:
 *   Cargo booked: Hongkong → Stockholm, deadline 2009-03-18
 *   Itinerary: HKG -[V100]-> NEWYORK -[V200]-> CHICAGO -[V200]-> STOCKHOLM
 */

const BookingService           = require('../../src/application/BookingService');
const HandlingEventService     = require('../../src/application/HandlingEventService');
const CargoInspectionService   = require('../../src/application/CargoInspectionService');
const CargoFactory             = require('../../src/domain/model/cargo/CargoFactory');
const HandlingEventFactory     = require('../../src/domain/model/handling/HandlingEventFactory');
const ExternalRoutingService   = require('../../src/infrastructure/routing/ExternalRoutingService');
const GraphTraversalService    = require('../../src/infrastructure/routing/GraphTraversalService');
const GraphDAOStub             = require('../../src/infrastructure/routing/GraphDAOStub');
const SynchronousApplicationEvents = require('../../src/infrastructure/messaging/SynchronousApplicationEvents');

const CargoRepositoryInMem         = require('../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem');
const HandlingEventRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
const LocationRepositoryInMem      = require('../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem        = require('../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem');

const UnLocode          = require('../../src/domain/model/location/UnLocode');
const VoyageNumber      = require('../../src/domain/model/voyage/VoyageNumber');
const Itinerary         = require('../../src/domain/model/cargo/Itinerary');
const Leg               = require('../../src/domain/model/cargo/Leg');
const HandlingEventType = require('../../src/domain/model/handling/HandlingEventType');
const RoutingStatus     = require('../../src/domain/model/cargo/RoutingStatus');
const TransportStatus   = require('../../src/domain/model/cargo/TransportStatus');

const {
  HONGKONG, STOCKHOLM, TOKYO, NEWYORK, CHICAGO, HAMBURG,
} = require('../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200, v300, v400 } = require('../../src/infrastructure/sampledata/SampleVoyages');

// ─── module-level vars — assigned fresh in each beforeEach ───────────────────
let cargoRepo, handlingEventRepo, locationRepo, voyageRepo;
let bookingService, handlingEventService, applicationEvents;

beforeEach(() => {
  cargoRepo          = CargoRepositoryInMem();
  handlingEventRepo  = HandlingEventRepositoryInMem();
  locationRepo       = LocationRepositoryInMem();
  voyageRepo         = VoyageRepositoryInMem();

  // ── SynchronousApplicationEvents ───
  // createRef() holds the mutable back-reference to cargoInspectionService.
  // applicationEvents is a bound wrapper over the top-level functions.
  const eventsRef = SynchronousApplicationEvents.createRef();

  applicationEvents = {
    setCargoInspectionService: (svc) =>
      SynchronousApplicationEvents.setCargoInspectionService(eventsRef, svc),
    cargoWasHandled: (e) =>
      SynchronousApplicationEvents.cargoWasHandled(eventsRef, e),
    cargoWasMisdirected: (c) =>
      SynchronousApplicationEvents.cargoWasMisdirected(eventsRef, c),
    cargoHasArrived: (c) =>
      SynchronousApplicationEvents.cargoHasArrived(eventsRef, c),
    receivedHandlingEventRegistrationAttempt: (a) =>
      SynchronousApplicationEvents.receivedHandlingEventRegistrationAttempt(eventsRef, a),
  };

  // ── CargoInspectionService bound bean ───
  const cargoInspectionService = {
    inspectCargo: (trackingId) =>
      CargoInspectionService.inspectCargo(applicationEvents, cargoRepo, handlingEventRepo, trackingId),
  };
  // Wire circular ref: applicationEvents.cargoWasHandled → cargoInspectionService.inspectCargo
  applicationEvents.setCargoInspectionService(cargoInspectionService);

  // ── Routing ───
  const graphTraversalService = {
    findShortestPath: (o, d, lim) => GraphTraversalService.findShortestPath(GraphDAOStub, o, d, lim),
  };
  const routingService = {
    fetchRoutesForSpecification: (spec) =>
      ExternalRoutingService.fetchRoutesForSpecification(graphTraversalService, locationRepo, voyageRepo, spec),
  };

  // ── Factories ───
  const cargoFactory = {
    createCargo: (o, d, dl) => CargoFactory.createCargo(locationRepo, cargoRepo, o, d, dl),
  };
  const eventFactory = {
    createHandlingEvent: (reg, comp, tid, vn, ul, t) =>
      HandlingEventFactory.createHandlingEvent(cargoRepo, voyageRepo, locationRepo, reg, comp, tid, vn, ul, t),
  };

  // ── Bound service objects ───
  bookingService = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(cargoRepo, cargoFactory, o, d, dl),
    requestPossibleRoutesForCargo: (tid) =>
      BookingService.requestPossibleRoutesForCargo(cargoRepo, routingService, tid),
    assignCargoToRoute: (itin, tid) =>
      BookingService.assignCargoToRoute(cargoRepo, itin, tid),
    changeDestination: (tid, ul) =>
      BookingService.changeDestination(cargoRepo, locationRepo, tid, ul),
  };

  handlingEventService = {
    registerHandlingEvent: (ct, tid, vn, ul, t) =>
      HandlingEventService.registerHandlingEvent(handlingEventRepo, applicationEvents, eventFactory, ct, tid, vn, ul, t),
  };
});

// ─── helper ─────────────────────────────────────────────────────────────────
function register(trackingId, type, location, voyage, date) {
  handlingEventService.registerHandlingEvent(
    new Date(date),
    trackingId,
    voyage ? VoyageNumber(voyage) : null,
    UnLocode(location),
    type
  );
}

// ─── scenario ───────────────────────────────────────────────────────────────
describe('Cargo lifecycle scenario', () => {
  test('full lifecycle from booking to arrival at destination', () => {
    // 1. Book
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-03-18')
    );

    let cargo = cargoRepo.find(trackingId);
    expect(cargo).not.toBeNull();
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.NOT_ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);
    expect(cargo.delivery().isMisdirected()).toBe(false);
    expect(cargo.delivery().estimatedTimeOfArrival()).toBeNull();

    // 2. Route: HKG -[V100]-> NEWYORK -[V200]-> CHICAGO -[V200]-> STOCKHOLM
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  CHICAGO,   new Date('2009-03-10'), new Date('2009-03-14')),
      Leg(v200, CHICAGO,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    bookingService.assignCargoToRoute(itinerary, trackingId);

    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);
    expect(cargo.delivery().estimatedTimeOfArrival()).not.toBeNull();

    // 3. Received in Hongkong
    register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(HONGKONG)).toBe(true);
    expect(cargo.delivery().isMisdirected()).toBe(false);

    // 4. Loaded in Hongkong onto V100
    register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V100', '2009-03-03');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V100');
    expect(cargo.delivery().isMisdirected()).toBe(false);

    // 5. Unloaded in New York
    register(trackingId, HandlingEventType.UNLOAD, 'USNYC', 'V100', '2009-03-09');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(NEWYORK)).toBe(true);
    expect(cargo.delivery().isMisdirected()).toBe(false);

    // 6. Loaded in New York onto V200
    register(trackingId, HandlingEventType.LOAD, 'USNYC', 'V200', '2009-03-10');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V200');

    // 7. Unloaded in Chicago
    register(trackingId, HandlingEventType.UNLOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().isMisdirected()).toBe(false);

    // 8. Loaded in Chicago onto V200 (towards Stockholm)
    register(trackingId, HandlingEventType.LOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);

    // 9. Unloaded in Stockholm — final destination
    register(trackingId, HandlingEventType.UNLOAD, 'SESTO', 'V200', '2009-03-16');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().isUnloadedAtDestination()).toBe(true);

    // 10. Claimed
    register(trackingId, HandlingEventType.CLAIM, 'SESTO', null, '2009-03-17');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.CLAIMED);
  });

  test('misdirected cargo detected when loaded on wrong voyage', () => {
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-03-18')
    );
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    bookingService.assignCargoToRoute(itinerary, trackingId);

    // Receive at correct location
    register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    // Load on wrong voyage (V300 instead of V100)
    register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V300', '2009-03-03');

    const cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().isMisdirected()).toBe(true);
  });

  test('change destination causes MISROUTED if itinerary does not satisfy new spec', () => {
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-03-18')
    );
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    bookingService.assignCargoToRoute(itinerary, trackingId);

    // Change destination to Helsinki — itinerary ends at Stockholm, so MISROUTED
    bookingService.changeDestination(trackingId, UnLocode('FIHEL'));

    const cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });
});
