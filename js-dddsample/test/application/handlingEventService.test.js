import * as HandlingEventService from '../../src/application/HandlingEventService.js';
import HandlingEventType from '../../src/domain/model/handling/HandlingEventType.js';
import Cargo              from '../../src/domain/model/cargo/Cargo.js';
import TrackingId         from '../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../src/domain/model/cargo/RouteSpecification.js';
import LocationRepositoryInMem from '../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem   from '../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';
import { configure as configureServiceContext } from '../../src/ServiceContext.js';
import { HAMBURG, TOKYO, STOCKHOLM } from '../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../src/infrastructure/sampledata/SampleVoyages.js';

const trackingId = TrackingId('ABC');
const cargo = Cargo(trackingId, RouteSpecification(HAMBURG, TOKYO, new Date('2099-12-31')));

let storedEvents;
let handledEvents;

beforeEach(() => {
  storedEvents  = [];
  handledEvents = [];

  const mockCargoRepo = {
    find:           async (tid) => tid.idString() === 'ABC' ? cargo : null,
    store:          async () => {},
    getAll:         async () => [],
    nextTrackingId: async () => TrackingId('NEXT'),
  };
  const mockHandlingEventRepo = {
    store: async (event) => { storedEvents.push(event); },
    lookupHandlingHistoryOfCargo: async () => ({ handlingEvents: () => [] }),
  };
  const mockAppEvents = {
    cargoWasHandled:     (event) => { handledEvents.push(event); },
    cargoWasMisdirected: () => {},
    cargoHasArrived:     () => {},
  };

  configureServiceContext(
    {
      cargoRepository:         mockCargoRepo,
      handlingEventRepository: mockHandlingEventRepo,
      voyageRepository:        VoyageRepositoryInMem(),
      locationRepository:      LocationRepositoryInMem(),
    },
    mockAppEvents
  );
});

describe('HandlingEventService', () => {
  test('registerHandlingEvent stores the event', async () => {
    await HandlingEventService.registerHandlingEvent(
      new Date(), trackingId.idString(), v100.voyageNumber().idString(), STOCKHOLM.unLocode().idString(), HandlingEventType.LOAD
    );
    expect(storedEvents).toHaveLength(1);
  });

  test('registerHandlingEvent fires cargoWasHandled', async () => {
    await HandlingEventService.registerHandlingEvent(
      new Date(), trackingId.idString(), v100.voyageNumber().idString(), STOCKHOLM.unLocode().idString(), HandlingEventType.LOAD
    );
    expect(handledEvents).toHaveLength(1);
  });

  test('registerHandlingEvent stores event before firing event', async () => {
    const order = [];
    const mockHandlingEventRepo2 = {
      store: async (e) => { order.push('stored'); storedEvents.push(e); },
      lookupHandlingHistoryOfCargo: async () => ({ handlingEvents: () => [] }),
    };
    const mockAppEvents2 = {
      cargoWasHandled:     () => { order.push('fired'); },
      cargoWasMisdirected: () => {},
      cargoHasArrived:     () => {},
    };
    const mockCargoRepo2 = {
      find:           async () => cargo,
      store:          async () => {},
      getAll:         async () => [],
      nextTrackingId: async () => TrackingId('NEXT'),
    };

    configureServiceContext(
      {
        cargoRepository:         mockCargoRepo2,
        handlingEventRepository: mockHandlingEventRepo2,
        voyageRepository:        VoyageRepositoryInMem(),
        locationRepository:      LocationRepositoryInMem(),
      },
      mockAppEvents2
    );

    await HandlingEventService.registerHandlingEvent(
      new Date(), trackingId.idString(), v100.voyageNumber().idString(), STOCKHOLM.unLocode().idString(), HandlingEventType.LOAD
    );

    expect(order).toEqual(['stored', 'fired']);
  });
});
