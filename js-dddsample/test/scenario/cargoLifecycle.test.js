'use strict';

/**
 * Cargo lifecycle scenario test — mirrors CargoLifecycleScenarioTest.java.
 *
 * Scenario:
 *   Cargo booked: Hongkong → Stockholm, deadline 2009-03-18
 *   Itinerary: HKG -[V100]-> TOKYO -[V100]-> NEWYORK -[V200]-> CHICAGO -[V200]-> STOCKHOLM
 *   (using the v-series voyages from SampleVoyages)
 */

const BookingService = require('../../src/application/BookingService');
const HandlingEventService = require('../../src/application/HandlingEventService');
const CargoInspectionService = require('../../src/application/CargoInspectionService');
const CargoRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem');
const HandlingEventRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
const LocationRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem');
const CargoFactory = require('../../src/domain/model/cargo/CargoFactory');
const HandlingEventFactory = require('../../src/domain/model/handling/HandlingEventFactory');
const ExternalRoutingService = require('../../src/infrastructure/routing/ExternalRoutingService');
const GraphTraversalService = require('../../src/infrastructure/routing/GraphTraversalService');
const GraphDAOStub = require('../../src/infrastructure/routing/GraphDAOStub');
const SynchronousApplicationEvents = require('../../src/infrastructure/messaging/SynchronousApplicationEvents');

const UnLocode = require('../../src/domain/model/location/UnLocode');
const VoyageNumber = require('../../src/domain/model/voyage/VoyageNumber');
const Itinerary = require('../../src/domain/model/cargo/Itinerary');
const Leg = require('../../src/domain/model/cargo/Leg');
const HandlingEventType = require('../../src/domain/model/handling/HandlingEventType');
const RoutingStatus = require('../../src/domain/model/cargo/RoutingStatus');
const TransportStatus = require('../../src/domain/model/cargo/TransportStatus');

const {
  HONGKONG, STOCKHOLM, TOKYO, NEWYORK, CHICAGO, HAMBURG,
} = require('../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200, v300, v400 } = require('../../src/infrastructure/sampledata/SampleVoyages');

// ─── build the application container ────────────────────────────────────────
let cargoRepo, handlingEventRepo, locationRepo, voyageRepo;
let bookingService, handlingEventService, cargoInspectionService;
let applicationEvents;

beforeEach(() => {
  cargoRepo           = new CargoRepositoryInMem();
  handlingEventRepo   = new HandlingEventRepositoryInMem();
  locationRepo        = new LocationRepositoryInMem();
  voyageRepo          = new VoyageRepositoryInMem();

  applicationEvents = new SynchronousApplicationEvents();

  const graphDAO       = new GraphDAOStub();
  const graphService   = new GraphTraversalService(graphDAO);
  const routingService = new ExternalRoutingService(graphService, locationRepo, voyageRepo);
  const cargoFactory   = new CargoFactory(locationRepo, cargoRepo);
  const eventFactory   = new HandlingEventFactory(cargoRepo, voyageRepo, locationRepo);

  bookingService = new BookingService(cargoRepo, locationRepo, routingService, cargoFactory);

  cargoInspectionService = new CargoInspectionService(
    applicationEvents, cargoRepo, handlingEventRepo
  );
  applicationEvents.setCargoInspectionService(cargoInspectionService);

  handlingEventService = new HandlingEventService(
    handlingEventRepo, applicationEvents, eventFactory
  );
});

// ─── helper ─────────────────────────────────────────────────────────────────
function register(trackingId, type, location, voyage, date) {
  handlingEventService.registerHandlingEvent(
    new Date(date),
    trackingId,
    voyage ? new VoyageNumber(voyage) : null,
    new UnLocode(location),
    type
  );
}

// ─── scenario ───────────────────────────────────────────────────────────────
describe('Cargo lifecycle scenario', () => {
  test('full lifecycle from booking to arrival at destination', () => {
    // 1. Book
    const trackingId = bookingService.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-03-18')
    );

    let cargo = cargoRepo.find(trackingId);
    expect(cargo).not.toBeNull();
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.NOT_ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);
    expect(cargo.delivery().isMisdirected()).toBe(false);
    expect(cargo.delivery().estimatedTimeOfArrival()).toBeNull();

    // 2. Route: HKG -[V100]-> NEWYORK -[V200]-> CHICAGO -[V200]-> STOCKHOLM
    const itinerary = new Itinerary([
      new Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      new Leg(v200, NEWYORK,  CHICAGO,   new Date('2009-03-10'), new Date('2009-03-14')),
      new Leg(v200, CHICAGO,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
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
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-03-18')
    );
    const itinerary = new Itinerary([
      new Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      new Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
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
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-03-18')
    );
    const itinerary = new Itinerary([
      new Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      new Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    bookingService.assignCargoToRoute(itinerary, trackingId);

    // Change destination to Helsinki — itinerary ends at Stockholm, so MISROUTED
    bookingService.changeDestination(trackingId, new UnLocode('FIHEL'));

    const cargo = cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });
});
