'use strict';

const BookingService       = require('../../src/application/BookingService');
const CargoFactory         = require('../../src/domain/model/cargo/CargoFactory');
const ExternalRoutingService = require('../../src/infrastructure/routing/ExternalRoutingService');
const GraphTraversalService  = require('../../src/infrastructure/routing/GraphTraversalService');
const GraphDAOStub           = require('../../src/infrastructure/routing/GraphDAOStub');
const CargoRepositoryInMem   = require('../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem');
const LocationRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem   = require('../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem');

const UnLocode     = require('../../src/domain/model/location/UnLocode');
const TrackingId   = require('../../src/domain/model/cargo/TrackingId');
const RoutingStatus = require('../../src/domain/model/cargo/RoutingStatus');
const Itinerary    = require('../../src/domain/model/cargo/Itinerary');
const Leg          = require('../../src/domain/model/cargo/Leg');
const { HONGKONG, STOCKHOLM, HELSINKI } = require('../../src/infrastructure/sampledata/SampleLocations');
const { v100 }     = require('../../src/infrastructure/sampledata/SampleVoyages');

/**
 * Build a wired service object from top-level functions — mirrors what container.js does.
 * Each call injects the repository/factory deps; callers only pass business args.
 */
function makeService() {
  const cargoRepo    = CargoRepositoryInMem();
  const locationRepo = LocationRepositoryInMem();
  const voyageRepo   = VoyageRepositoryInMem();

  const graphTraversalService = {
    findShortestPath: (o, d, lim) => GraphTraversalService.findShortestPath(GraphDAOStub, o, d, lim),
  };
  const routingService = {
    fetchRoutesForSpecification: (spec) =>
      ExternalRoutingService.fetchRoutesForSpecification(graphTraversalService, locationRepo, voyageRepo, spec),
  };
  const cargoFactory = {
    createCargo: (o, d, dl) => CargoFactory.createCargo(locationRepo, cargoRepo, o, d, dl),
  };

  const service = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(cargoRepo, cargoFactory, o, d, dl),
    requestPossibleRoutesForCargo: (tid) =>
      BookingService.requestPossibleRoutesForCargo(cargoRepo, routingService, tid),
    assignCargoToRoute: (itin, tid) =>
      BookingService.assignCargoToRoute(cargoRepo, itin, tid),
    changeDestination: (tid, ul) =>
      BookingService.changeDestination(cargoRepo, locationRepo, tid, ul),
  };
  return { service, cargoRepo, locationRepo };
}

describe('BookingService', () => {
  test('bookNewCargo returns a TrackingId', () => {
    const { service } = makeService();
    const trackingId = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    expect(trackingId).toBeTruthy();
    expect(trackingId.idString()).toBeTruthy();
  });

  test('booked cargo can be found in repository', () => {
    const { service, cargoRepo } = makeService();
    const trackingId = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    const cargo = cargoRepo.find(trackingId);
    expect(cargo).not.toBeNull();
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns array', () => {
    const { service } = makeService();
    const tid = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2099-12-31')
    );
    const routes = service.requestPossibleRoutesForCargo(tid);
    expect(Array.isArray(routes)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns empty array for unknown cargo', () => {
    const { service } = makeService();
    const routes = service.requestPossibleRoutesForCargo(TrackingId('NOTEX'));
    expect(routes).toHaveLength(0);
  });

  test('assignCargoToRoute sets routing status ROUTED', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, STOCKHOLM, new Date('2009-03-03'), new Date('2009-03-16')),
    ]);
    service.assignCargoToRoute(itinerary, tid);
    const cargo = cargoRepo.find(tid);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
  });

  test('changeDestination updates route specification', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    service.changeDestination(tid, UnLocode('FIHEL'));
    const cargo = cargoRepo.find(tid);
    expect(cargo.routeSpecification().destination().sameIdentityAs(HELSINKI)).toBe(true);
  });

  test('changeDestination preserves origin', () => {
    const { service, cargoRepo } = makeService();
    const tid = service.bookNewCargo(
      UnLocode('CNHKG'),
      UnLocode('SESTO'),
      new Date('2009-12-31')
    );
    service.changeDestination(tid, UnLocode('FIHEL'));
    const cargo = cargoRepo.find(tid);
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });
});
