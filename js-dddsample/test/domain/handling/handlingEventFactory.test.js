import HandlingEventFactory from '../../../src/domain/model/handling/HandlingEventFactory.js';
import {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} from '../../../src/domain/model/handling/exceptions.js';
import HandlingEventType from '../../../src/domain/model/handling/HandlingEventType.js';
import Cargo              from '../../../src/domain/model/cargo/Cargo.js';
import TrackingId         from '../../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../src/domain/model/cargo/RouteSpecification.js';
import LocationRepositoryInMem from '../../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem   from '../../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';
import { configure as configureServiceContext } from '../../../src/ServiceContext.js';
import { TOKYO, HELSINKI, STOCKHOLM } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

const trackingId = TrackingId('ABC');
const cargo = Cargo(trackingId, RouteSpecification(TOKYO, HELSINKI, new Date('2099-12-31')));

// A mock cargo repo that finds 'ABC' and nothing else
const foundCargoRepo = {
  find:          async (tid) => tid.idString() === 'ABC' ? cargo : null,
  store:         async () => {},
  getAll:        async () => [],
  nextTrackingId: async () => TrackingId('NEXT'),
};
const notFoundCargoRepo = {
  ...foundCargoRepo,
  find: async () => null,
};

beforeEach(() => {
  configureServiceContext(
    {
      cargoRepository:    foundCargoRepo,
      voyageRepository:   VoyageRepositoryInMem(),
      locationRepository: LocationRepositoryInMem(),
    },
    null
  );
});

describe('HandlingEventFactory', () => {
  test('createHandlingEvent with voyage returns correct event', async () => {
    const voyageNumber = v100.voyageNumber();
    const unLocode     = STOCKHOLM.unLocode();

    const event = await HandlingEventFactory.createHandlingEvent(
      new Date(), new Date(100), trackingId.idString(), voyageNumber.idString(), unLocode.idString(), HandlingEventType.LOAD
    );

    expect(event).not.toBeNull();
    expect(event.location().sameIdentityAs(STOCKHOLM)).toBe(true);
    expect(event.voyage().voyageNumber().idString()).toBe(voyageNumber.idString());
    expect(event.cargo().trackingId().idString()).toBe('ABC');
    expect(event.completionTime().getTime()).toBe(100);
  });

  test('createHandlingEvent without voyage returns event with no voyage', async () => {
    const event = await HandlingEventFactory.createHandlingEvent(
      new Date(), new Date(100), trackingId.idString(), null, STOCKHOLM.unLocode().idString(), HandlingEventType.CLAIM
    );

    expect(event).not.toBeNull();
    expect(event.location().sameIdentityAs(STOCKHOLM)).toBe(true);
    // No voyage → returns Voyage.NONE (empty voyage number)
    expect(event.voyage().voyageNumber().idString()).toBe('');
    expect(event.cargo().trackingId().idString()).toBe('ABC');
  });

  test('unknown location throws CannotCreateHandlingEventException wrapping UnknownLocationException', async () => {
    await expect(
      HandlingEventFactory.createHandlingEvent(
        new Date(), new Date(), trackingId.idString(), v100.voyageNumber().idString(), 'NOEXT', HandlingEventType.LOAD
      )
    ).rejects.toThrow(CannotCreateHandlingEventException);
  });

  test('unknown voyage throws CannotCreateHandlingEventException wrapping UnknownVoyageException', async () => {
    await expect(
      HandlingEventFactory.createHandlingEvent(
        new Date(), new Date(), trackingId.idString(), 'XXXXX', STOCKHOLM.unLocode().idString(), HandlingEventType.LOAD
      )
    ).rejects.toThrow(CannotCreateHandlingEventException);
  });

  test('unknown tracking ID throws CannotCreateHandlingEventException wrapping UnknownCargoException', async () => {
    configureServiceContext(
      {
        cargoRepository:    notFoundCargoRepo,
        voyageRepository:   VoyageRepositoryInMem(),
        locationRepository: LocationRepositoryInMem(),
      },
      null
    );

    await expect(
      HandlingEventFactory.createHandlingEvent(
        new Date(), new Date(), 'GHOST', v100.voyageNumber().idString(), STOCKHOLM.unLocode().idString(), HandlingEventType.LOAD
      )
    ).rejects.toThrow(CannotCreateHandlingEventException);
  });
});
