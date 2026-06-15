'use strict';

const BookingService = require('../../src/application/BookingService');
const CargoRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem');
const LocationRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem');
const CargoFactory = require('../../src/domain/model/cargo/CargoFactory');
const ExternalRoutingService = require('../../src/infrastructure/routing/ExternalRoutingService');
const GraphTraversalService = require('../../src/infrastructure/routing/GraphTraversalService');
const GraphDAOStub = require('../../src/infrastructure/routing/GraphDAOStub');
const UnLocode = require('../../src/domain/model/location/UnLocode');
const TrackingId = require('../../src/domain/model/cargo/TrackingId');
const RoutingStatus = require('../../src/domain/model/cargo/RoutingStatus');
const Itinerary = require('../../src/domain/model/cargo/Itinerary');
const Leg = require('../../src/domain/model/cargo/Leg');
const { HONGKONG, STOCKHOLM, HELSINKI, MELBOURNE } = require('../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200 } = require('../../src/infrastructure/sampledata/SampleVoyages');

function makeService() {
  const cargoRepo = new CargoRepositoryInMem();
  const locationRepo = new LocationRepositoryInMem();
  const voyageRepo = new VoyageRepositoryInMem();
  const graphDAO = new GraphDAOStub();
  const graphService = new GraphTraversalService(graphDAO);
  const routingService = new ExternalRoutingService(graphService, locationRepo, voyageRepo);
  const factory = new CargoFactory(locationRepo, cargoRepo);
  const service = new BookingService(cargoRepo, locationRepo, routingService, factory);
  return { service, cargoRepo, locationRepo };
}

describe('BookingService', () => {
  test('bookNewCargo returns a TrackingId', () => {
    const { service } = makeService();
    const trackingId = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    expect(trackingId).toBeTruthy();
    expect(trackingId.idString()).toBeTruthy();
  });

  test('booked cargo can be found in repository', () => {
    const { service, cargoRepo } = makeService();
    const trackingId = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    const cargo = cargoRepo.find(trackingId);
    expect(cargo).not.toBeNull();
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns array', () => {
    const { service } = makeService();
    const tid = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2099-12-31')
    );
    const routes = service.requestPossibleRoutesForCargo(tid);
    expect(Array.isArray(routes)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns empty array for unknown cargo', () => {
    const { service } = makeService();
    const routes = service.requestPossibleRoutesForCargo(new TrackingId('NOTEX'));
    expect(routes).toHaveLength(0);
  });

  test('assignCargoToRoute sets routing status ROUTED', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    const itinerary = new Itinerary([
      new Leg(v100, HONGKONG, STOCKHOLM, new Date('2009-03-03'), new Date('2009-03-16')),
    ]);
    service.assignCargoToRoute(itinerary, tid);
    const cargo = cargoRepo.find(tid);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
  });

  test('changeDestination updates route specification', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    service.changeDestination(tid, new UnLocode('FIHEL'));
    const cargo = cargoRepo.find(tid);
    expect(cargo.routeSpecification().destination().sameIdentityAs(HELSINKI)).toBe(true);
  });

  test('changeDestination preserves origin', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      new UnLocode('CNHKG'),
      new UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    service.changeDestination(tid, new UnLocode('FIHEL'));
    const cargo = cargoRepo.find(tid);
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });
});
