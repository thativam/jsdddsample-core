import * as BookingService           from '../../src/application/BookingService.js';
import * as HandlingEventService     from '../../src/application/HandlingEventService.js';
import * as CargoInspectionService   from '../../src/application/CargoInspectionService.js';
import * as ExternalRoutingService   from '../../src/infrastructure/routing/ExternalRoutingService.js';
import * as SynchronousApplicationEvents from '../../src/infrastructure/messaging/SynchronousApplicationEvents.js';
import { configure as configureServiceContext, configureRouting } from '../../src/ServiceContext.js';

import CargoRepositoryInMem         from '../../src/infrastructure/persistence/inmemory/CargoRepositoryInMem.js';
import HandlingEventRepositoryInMem from '../../src/infrastructure/persistence/inmemory/HandlingEventRepositoryInMem.js';
import LocationRepositoryInMem      from '../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem        from '../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';

import Itinerary         from '../../src/domain/model/cargo/Itinerary.js';
import Leg               from '../../src/domain/model/cargo/Leg.js';
import HandlingEventType from '../../src/domain/model/handling/HandlingEventType.js';
import RoutingStatus     from '../../src/domain/model/cargo/RoutingStatus.js';
import TransportStatus   from '../../src/domain/model/cargo/TransportStatus.js';

import { HONGKONG, STOCKHOLM, NEWYORK, CHICAGO } from '../../src/infrastructure/sampledata/SampleLocations.js';
import { v100, v200, v300 } from '../../src/infrastructure/sampledata/SampleVoyages.js';

let cargoRepo;

beforeEach(() => {
  cargoRepo         = CargoRepositoryInMem();
  const handlingEventRepo = HandlingEventRepositoryInMem();
  const locationRepo      = LocationRepositoryInMem();
  const voyageRepo        = VoyageRepositoryInMem();

  const eventsRef = SynchronousApplicationEvents.createRef();
  const applicationEvents = {
    setCargoInspectionService: (svc) =>
      SynchronousApplicationEvents.setCargoInspectionService(eventsRef, svc),
    cargoWasHandled:     (e) => SynchronousApplicationEvents.cargoWasHandled(eventsRef, e),
    cargoWasMisdirected: (c) => SynchronousApplicationEvents.cargoWasMisdirected(eventsRef, c),
    cargoHasArrived:     (c) => SynchronousApplicationEvents.cargoHasArrived(eventsRef, c),
  };

  configureServiceContext(
    {
      cargoRepository:         cargoRepo,
      handlingEventRepository: handlingEventRepo,
      locationRepository:      locationRepo,
      voyageRepository:        voyageRepo,
    },
    applicationEvents
  );
  configureRouting(ExternalRoutingService);

  applicationEvents.setCargoInspectionService({ inspectCargo: CargoInspectionService.inspectCargo });
});

async function register(trackingId, type, location, voyage, date) {
  await HandlingEventService.registerHandlingEvent(
    new Date(date),
    trackingId.idString(),
    voyage ?? null,
    location,
    type
  );
}

describe('Cargo lifecycle scenario', () => {
  test('full lifecycle from booking to arrival at destination', async () => {
    const trackingId = await BookingService.bookNewCargo(
      'CNHKG', 'SESTO', new Date('2009-03-18')
    );

    let cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.NOT_ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);

    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  CHICAGO,   new Date('2009-03-10'), new Date('2009-03-14')),
      Leg(v200, CHICAGO,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]);
    await BookingService.assignCargoToRoute(itinerary, trackingId.idString());

    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);

    await register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(HONGKONG)).toBe(true);

    await register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V100', '2009-03-03');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V100');

    await register(trackingId, HandlingEventType.UNLOAD, 'USNYC', 'V100', '2009-03-09');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(NEWYORK)).toBe(true);

    await register(trackingId, HandlingEventType.LOAD, 'USNYC', 'V200', '2009-03-10');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);

    await register(trackingId, HandlingEventType.UNLOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);

    await register(trackingId, HandlingEventType.LOAD, 'USCHI', 'V200', '2009-03-14');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);

    await register(trackingId, HandlingEventType.UNLOAD, 'SESTO', 'V200', '2009-03-16');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().isUnloadedAtDestination()).toBe(true);

    await register(trackingId, HandlingEventType.CLAIM, 'SESTO', null, '2009-03-17');
    cargo = await cargoRepo.find(trackingId);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.CLAIMED);
  });

  test('misdirected cargo detected when loaded on wrong voyage', async () => {
    const trackingId = await BookingService.bookNewCargo(
      'CNHKG', 'SESTO', new Date('2009-03-18')
    );
    await BookingService.assignCargoToRoute(Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]), trackingId);

    await register(trackingId, HandlingEventType.RECEIVE, 'CNHKG', null, '2009-03-01');
    await register(trackingId, HandlingEventType.LOAD, 'CNHKG', 'V300', '2009-03-03');

    expect((await cargoRepo.find(trackingId)).delivery().isMisdirected()).toBe(true);
  });

  test('change destination causes MISROUTED if itinerary does not satisfy new spec', async () => {
    const trackingId = await BookingService.bookNewCargo(
      'CNHKG', 'SESTO', new Date('2009-03-18')
    );
    await BookingService.assignCargoToRoute(Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
    ]), trackingId);

    await BookingService.changeDestination(trackingId.idString(), 'FIHEL');
    expect((await cargoRepo.find(trackingId)).delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });
});
