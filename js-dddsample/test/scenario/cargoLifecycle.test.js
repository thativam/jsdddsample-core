'use strict';

/**
 * Cargo lifecycle scenario test — mirrors CargoLifecycleScenarioTest.java.
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

const { HONGKONG, STOCKHOLM, NEWYORK, CHICAGO } =
  require('../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200, v300 } = require('../../src/infrastructure/sampledata/SampleVoyages');

let cargoRepo, handlingEventRepo, locationRepo, voyageRepo;
let bookingService, handlingEventService, applicationEvents;

beforeEach(() => {
  cargoRepo         = CargoRepositoryInMem();
  handlingEventRepo = HandlingEventRepositoryInMem();
  locationRepo      = LocationRepositoryInMem();
  voyageRepo        = VoyageRepositoryInMem();

  // ── SynchronousApplicationEvents via ref object ────
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

  // ── Individual callbacks ────
  const boundCreateCargo = (o, d, dl) =>
    CargoFactory.createCargo(cargoRepo.nextTrackingId, locationRepo.find, o, d, dl);

  const boundCreateHandlingEvent = (reg, comp, tid, vn, ul, t) =>
    HandlingEventFactory.createHandlingEvent(
      cargoRepo.find, voyageRepo.find, locationRepo.find,
      reg, comp, tid, vn, ul, t
    );

  const boundFindShortestPath = (o, d, lim) =>
    GraphTraversalService.findShortestPath(GraphDAOStub.listAllNodes, GraphDAOStub.getTransitEdge, o, d, lim);

  const boundFetchRoutes = (spec) =>
    ExternalRoutingService.fetchRoutesForSpecification(boundFindShortestPath, locationRepo.find, voyageRepo.find, spec);

  // ── CargoInspectionService — wire the circular ref before handing it to events ──
  const cargoInspectionService = {
    inspectCargo: (trackingId) =>
      CargoInspectionService.inspectCargo(
        cargoRepo.find,
        cargoRepo.store,
        handlingEventRepo.lookupHandlingHistoryOfCargo,
        applicationEvents.cargoWasMisdirected,
        applicationEvents.cargoHasArrived,
        trackingId
      ),
  };
  applicationEvents.setCargoInspectionService(cargoInspectionService);

  // ── Bound service objects ────
  bookingService = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(boundCreateCargo, cargoRepo.store, o, d, dl),
    requestPossibleRoutesForCargo: (tid) =>
      BookingService.requestPossibleRoutesForCargo(cargoRepo.find, boundFetchRoutes, tid),
    assignCargoToRoute: (itin, tid) =>
      BookingService.assignCargoToRoute(cargoRepo.find, cargoRepo.store, itin, tid),
    changeDestination: (tid, ul) =>
      BookingService.changeDestination(cargoRepo.find, locationRepo.find, cargoRepo.store, tid, ul),
  };

  handlingEventService = {
    registerHandlingEvent: (ct, tid, vn, ul, t) =>
      HandlingEventService.registerHandlingEvent(
        handlingEventRepo.store,
        applicationEvents.cargoWasHandled,
        boundCreateHandlingEvent,
        ct, tid, vn, ul, t
      ),
  };
});

function register(trackingId, type, location, voyage, date) {
  handlingEventService.registerHandlingEvent(
    new Date(date),
    trackingId,
    voyage ? VoyageNumber(voyage) : null,
    UnLocode(location),
    type
  );
}

describe('Cargo lifecycle scenario', () => {
  test('full lifecycle from booking to arrival at destination', () => {
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-03-18')
    );

    let cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.NOT_ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);

    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  CHICAGO,   new Date('2009-03-10'), new Date('2009-03-14')),
      Leg(v200, CHICAGO,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    bookingService.assignCargoToRoute(itinerary, trackingId);

    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);

    register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(HONGKONG)).toBe(true);

    register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V100', '2009-03-03');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V100');

    register(trackingId, HandlingEventType.UNLOAD, 'USNYC', 'V100', '2009-03-09');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(NEWYORK)).toBe(true);

    register(trackingId, HandlingEventType.LOAD, 'USNYC', 'V200', '2009-03-10');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);

    register(trackingId, HandlingEventType.UNLOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);

    register(trackingId, HandlingEventType.LOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);

    register(trackingId, HandlingEventType.UNLOAD, 'SESTO', 'V200', '2009-03-16');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().isUnloadedAtDestination()).toBe(true);

    register(trackingId, HandlingEventType.CLAIM, 'SESTO', null, '2009-03-17');
    cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.CLAIMED);
  });

  test('misdirected cargo detected when loaded on wrong voyage', () => {
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-03-18')
    );
    bookingService.assignCargoToRoute(Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]), trackingId);

    register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V300', '2009-03-03');

    expect(cargoRepo.find(trackingId).delivery().isMisdirected()).toBe(true);
  });

  test('change destination causes MISROUTED if itinerary does not satisfy new spec', () => {
    const trackingId = bookingService.bookNewCargo(
      UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-03-18')
    );
    bookingService.assignCargoToRoute(Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]), trackingId);

    bookingService.changeDestination(trackingId, UnLocode('FIHEL'));
    expect(cargoRepo.find(trackingId).delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });
});
