'use strict';

const BookingService         = require('../../src/application/BookingService');
const CargoFactory           = require('../../src/domain/model/cargo/CargoFactory');
const ExternalRoutingService = require('../../src/infrastructure/routing/ExternalRoutingService');
const GraphTraversalService  = require('../../src/infrastructure/routing/GraphTraversalService');
const GraphDAOStub           = require('../../src/infrastructure/routing/GraphDAOStub');
const CargoRepositoryInMem   = require('../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem');
const LocationRepositoryInMem = require('../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem   = require('../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem');

const UnLocode      = require('../../src/domain/model/location/UnLocode');
const TrackingId    = require('../../src/domain/model/cargo/TrackingId');
const RoutingStatus = require('../../src/domain/model/cargo/RoutingStatus');
const Itinerary     = require('../../src/domain/model/cargo/Itinerary');
const Leg           = require('../../src/domain/model/cargo/Leg');
const { HONGKONG, STOCKHOLM, HELSINKI } = require('../../src/infrastructure/sampledata/SampleLocations');
const { v100 }     = require('../../src/infrastructure/sampledata/SampleVoyages');

function makeService() {
  const cargoRepo    = CargoRepositoryInMem();
  const locationRepo = LocationRepositoryInMem();
  const voyageRepo   = VoyageRepositoryInMem();

  const boundCreateCargo = (o, d, dl) =>
    CargoFactory.createCargo(cargoRepo.nextTrackingId, locationRepo.find, o, d, dl);

  const boundFindShortestPath = (o, d, lim) =>
    GraphTraversalService.findShortestPath(GraphDAOStub.listAllNodes, GraphDAOStub.getTransitEdge, o, d, lim);

  const boundFetchRoutes = (spec) =>
    ExternalRoutingService.fetchRoutesForSpecification(boundFindShortestPath, locationRepo.find, voyageRepo.find, spec);

  const service = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(boundCreateCargo, cargoRepo.store, o, d, dl),
    requestPossibleRoutesForCargo: (tid) =>
      BookingService.requestPossibleRoutesForCargo(cargoRepo.find, boundFetchRoutes, tid),
    assignCargoToRoute: (itin, tid) =>
      BookingService.assignCargoToRoute(cargoRepo.find, cargoRepo.store, itin, tid),
    changeDestination: (tid, ul) =>
      BookingService.changeDestination(cargoRepo.find, locationRepo.find, cargoRepo.store, tid, ul),
  };
  return { service, cargoRepo, locationRepo };
}

describe('BookingService', () => {
  test('bookNewCargo returns a TrackingId', async () => {
    const { service } = makeService();
    const trackingId = await service.bookNewCargo(
      UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-12-31')
    );
    expect(trackingId).toBeTruthy();
    expect(trackingId.idString()).toBeTruthy();
  });

  test('booked cargo can be found in repository', async () => {
    const { service, cargoRepo } = makeService();
    const trackingId = await service.bookNewCargo(
      UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-12-31')
    );
    const cargo = await cargoRepo.find(trackingId);
    expect(cargo).not.toBeNull();
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns array', async () => {
    const { service } = makeService();
    const tid = await service.bookNewCargo(UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2099-12-31'));
    const routes = await service.requestPossibleRoutesForCargo(tid);
    expect(Array.isArray(routes)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns empty array for unknown cargo', async () => {
    const { service } = makeService();
    const routes = await service.requestPossibleRoutesForCargo(TrackingId('NOTEX'));
    expect(routes).toHaveLength(0);
  });

  test('assignCargoToRoute sets routing status ROUTED', async () => {
    const { service, cargoRepo } = makeService();
    const tid = await service.bookNewCargo(UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-12-31'));
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, STOCKHOLM, new Date('2009-03-03'), new Date('2009-03-16')),
    ]);
    await service.assignCargoToRoute(itinerary, tid);
    const cargo = await cargoRepo.find(tid);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
  });

  test('changeDestination updates route specification', async () => {
    const { service, cargoRepo } = makeService();
    const tid = await service.bookNewCargo(UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-12-31'));
    await service.changeDestination(tid, UnLocode('FIHEL'));
    const cargo = await cargoRepo.find(tid);
    expect(cargo.routeSpecification().destination().sameIdentityAs(HELSINKI)).toBe(true);
  });

  test('changeDestination preserves origin', async () => {
    const { service, cargoRepo } = makeService();
    const tid = await service.bookNewCargo(UnLocode('CNHKG'), UnLocode('SESTO'), new Date('2009-12-31'));
    await service.changeDestination(tid, UnLocode('FIHEL'));
    const cargo = await cargoRepo.find(tid);
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });
});
