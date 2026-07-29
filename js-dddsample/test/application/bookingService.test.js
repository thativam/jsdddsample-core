import * as BookingService         from '../../src/application/BookingService.js';
import CargoFactory                from '../../src/domain/model/cargo/CargoFactory.js';
import * as ExternalRoutingService from '../../src/infrastructure/routing/ExternalRoutingService.js';
import * as GraphTraversalService  from '../../src/infrastructure/routing/GraphTraversalService.js';
import * as GraphDAOStub           from '../../src/infrastructure/routing/GraphDAOStub.js';
import CargoRepositoryInMem        from '../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem.js';
import LocationRepositoryInMem     from '../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem       from '../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';
import { configure as configureServiceContext } from '../../src/ServiceContext.js';

import UnLocode      from '../../src/domain/model/location/UnLocode.js';
import TrackingId    from '../../src/domain/model/cargo/TrackingId.js';
import RoutingStatus from '../../src/domain/model/cargo/RoutingStatus.js';
import Itinerary     from '../../src/domain/model/cargo/Itinerary.js';
import Leg           from '../../src/domain/model/cargo/Leg.js';
import { HONGKONG, STOCKHOLM, HELSINKI } from '../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 }     from '../../src/infrastructure/sampledata/SampleVoyages.js';

function makeService() {
  const cargoRepo    = CargoRepositoryInMem();
  const locationRepo = LocationRepositoryInMem();
  const voyageRepo   = VoyageRepositoryInMem();

  configureServiceContext(
    { cargoRepository: cargoRepo, locationRepository: locationRepo, voyageRepository: voyageRepo },
    null
  );

  const boundFindShortestPath = (o, d, lim) =>
    GraphTraversalService.findShortestPath(GraphDAOStub.listAllNodes, GraphDAOStub.getTransitEdge, o, d, lim);

  const boundFetchRoutes = (spec) =>
    ExternalRoutingService.fetchRoutesForSpecification(boundFindShortestPath, locationRepo.find, voyageRepo.find, spec);

  const service = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(CargoFactory.createCargo, cargoRepo.store, o, d, dl),
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
