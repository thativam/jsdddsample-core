import * as ExternalRoutingService from '../../../src/infrastructure/routing/ExternalRoutingService.js';
import RouteSpecification          from '../../../src/domain/model/cargo/RouteSpecification.js';
import LocationRepositoryInMem     from '../../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import { configure as configureServiceContext, configureRouting } from '../../../src/ServiceContext.js';
import { HONGKONG, HELSINKI } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

// Voyage repo that returns a known voyage for any voyage number,
// matching the Java test approach (mock returns CM002 for any VoyageNumber).
const anyVoyageRepo = {
  find:  async () => v100,
  store: async () => {},
};

beforeEach(() => {
  configureServiceContext(
    {
      locationRepository: LocationRepositoryInMem(),
      voyageRepository:   anyVoyageRepo,
    },
    null
  );
  configureRouting(ExternalRoutingService);
});

describe('ExternalRoutingService', () => {
  test('fetchRoutesForSpecification returns a non-null array', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    expect(Array.isArray(candidates)).toBe(true);
  });

  test('every itinerary has at least one leg', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    for (const itinerary of candidates) {
      expect(itinerary.legs().length).toBeGreaterThan(0);
    }
  });

  test('first leg origin matches cargo origin', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    for (const itinerary of candidates) {
      const firstLeg = itinerary.legs()[0];
      expect(firstLeg.loadLocation().sameIdentityAs(HONGKONG)).toBe(true);
    }
  });

  test('last leg destination matches cargo destination', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    for (const itinerary of candidates) {
      const legs    = itinerary.legs();
      const lastLeg = legs[legs.length - 1];
      expect(lastLeg.unloadLocation().sameIdentityAs(HELSINKI)).toBe(true);
    }
  });

  test('consecutive legs are connected (unload → next load)', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    for (const itinerary of candidates) {
      const legs = itinerary.legs();
      for (let i = 0; i < legs.length - 1; i++) {
        expect(legs[i].unloadLocation().sameIdentityAs(legs[i + 1].loadLocation())).toBe(true);
      }
    }
  });

  test('all returned itineraries satisfy the route specification', async () => {
    const spec = RouteSpecification(HONGKONG, HELSINKI, new Date('2099-12-31'));
    const candidates = await ExternalRoutingService.fetchRoutesForSpecification(spec);
    for (const itinerary of candidates) {
      expect(spec.isSatisfiedBy(itinerary)).toBe(true);
    }
  });
});
