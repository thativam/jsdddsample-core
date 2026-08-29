import * as BookingService         from '../../src/application/BookingService.js';
import * as ExternalRoutingService from '../../src/infrastructure/routing/ExternalRoutingService.js';
import CargoRepositoryInMem        from '../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem.js';
import LocationRepositoryInMem     from '../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem       from '../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';
import { configure as configureServiceContext, configureRouting } from '../../src/ServiceContext.js';

import TrackingId    from '../../src/domain/model/cargo/TrackingId.js';
import RoutingStatus from '../../src/domain/model/cargo/RoutingStatus.js';
import Itinerary     from '../../src/domain/model/cargo/Itinerary.js';
import Leg           from '../../src/domain/model/cargo/Leg.js';
import { HONGKONG, STOCKHOLM, HELSINKI } from '../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 }     from '../../src/infrastructure/sampledata/SampleVoyages.js';

function makeRepos() {
  const cargoRepo    = CargoRepositoryInMem();
  const locationRepo = LocationRepositoryInMem();
  const voyageRepo   = VoyageRepositoryInMem();

  configureServiceContext(
    { cargoRepository: cargoRepo, locationRepository: locationRepo, voyageRepository: voyageRepo },
    null
  );
  configureRouting(ExternalRoutingService);

  return { cargoRepo, locationRepo };
}

describe('BookingService', () => {
  test('bookNewCargo returns a tracking ID string', async () => {
    makeRepos();
    const trackingId = await BookingService.bookNewCargo(
      'CNHKG', 'SESTO', new Date('2009-12-31')
    );
    expect(trackingId).toBeTruthy();
    expect(typeof trackingId).toBe('string');
  });

  test('booked cargo can be found in repository', async () => {
    const { cargoRepo } = makeRepos();
    const trackingId = await BookingService.bookNewCargo(
      'CNHKG', 'SESTO', new Date('2009-12-31')
    );
    const cargo = await cargoRepo.find(TrackingId(trackingId));
    expect(cargo).not.toBeNull();
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns array', async () => {
    makeRepos();
    const tid = await BookingService.bookNewCargo('CNHKG', 'SESTO', new Date('2099-12-31'));
    const routes = await BookingService.requestPossibleRoutesForCargo(tid);
    expect(Array.isArray(routes)).toBe(true);
  });

  test('requestPossibleRoutesForCargo returns empty array for unknown cargo', async () => {
    makeRepos();
    const routes = await BookingService.requestPossibleRoutesForCargo('NOTEX');
    expect(routes).toHaveLength(0);
  });

  test('assignCargoToRoute sets routing status ROUTED', async () => {
    const { cargoRepo } = makeRepos();
    const tid = await BookingService.bookNewCargo('CNHKG', 'SESTO', new Date('2009-12-31'));
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, STOCKHOLM, new Date('2009-03-03'), new Date('2009-03-16')),
    ]);
    await BookingService.assignCargoToRoute(itinerary, tid);
    const cargo = await cargoRepo.find(TrackingId(tid));
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
  });

  test('changeDestination updates route specification', async () => {
    const { cargoRepo } = makeRepos();
    const tid = await BookingService.bookNewCargo('CNHKG', 'SESTO', new Date('2009-12-31'));
    await BookingService.changeDestination(tid, 'FIHEL');
    const cargo = await cargoRepo.find(TrackingId(tid));
    expect(cargo.routeSpecification().destination().sameIdentityAs(HELSINKI)).toBe(true);
  });

  test('changeDestination preserves origin', async () => {
    const { cargoRepo } = makeRepos();
    const tid = await BookingService.bookNewCargo('CNHKG', 'SESTO', new Date('2009-12-31'));
    await BookingService.changeDestination(tid, 'FIHEL');
    const cargo = await cargoRepo.find(TrackingId(tid));
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });
});
