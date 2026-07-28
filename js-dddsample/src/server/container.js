import HandlingEventFactory  from '../domain/model/handling/HandlingEventFactory.js';
import CargoFactory          from '../domain/model/cargo/CargoFactory.js';

import * as BookingService         from '../application/BookingService.js';
import * as HandlingEventService   from '../application/HandlingEventService.js';
import * as CargoInspectionService from '../application/CargoInspectionService.js';

import * as GraphDAOStub           from '../infrastructure/routing/GraphDAOStub.js';
import * as GraphTraversalService  from '../infrastructure/routing/GraphTraversalService.js';
import * as ExternalRoutingService from '../infrastructure/routing/ExternalRoutingService.js';

import * as BookingServiceFacade   from '../interfaces/booking/BookingServiceFacade.js';
import * as SampleDataGenerator    from '../infrastructure/sampledata/SampleDataGenerator.js';

// ── Repository factories ──────────────────────────────────────────────────────

async function buildInMemoryRepos() {
  const { default: CargoRepositoryInMem }         = await import('../infrastructure/persistence/inmemory/CargoRepositoryInMem.js');
  const { default: HandlingEventRepositoryInMem } = await import('../infrastructure/persistence/inmemory/HandlingEventRepositoryInMem.js');
  const { default: LocationRepositoryInMem }      = await import('../infrastructure/persistence/inmemory/LocationRepositoryInMem.js');
  const { default: VoyageRepositoryInMem }        = await import('../infrastructure/persistence/inmemory/VoyageRepositoryInMem.js');
  return {
    cargoRepository:         CargoRepositoryInMem(),
    handlingEventRepository: HandlingEventRepositoryInMem(),
    locationRepository:      LocationRepositoryInMem(),
    voyageRepository:        VoyageRepositoryInMem(),
    disconnect: async () => {},
  };
}

async function buildMongoRepos() {
  const { MongoClient }                           = await import('mongodb');
  const { default: CargoRepositoryMongo }         = await import('../infrastructure/persistence/mongodb/CargoRepositoryMongo.js');
  const { default: HandlingEventRepositoryMongo } = await import('../infrastructure/persistence/mongodb/HandlingEventRepositoryMongo.js');
  const { default: LocationRepositoryMongo }      = await import('../infrastructure/persistence/mongodb/LocationRepositoryMongo.js');
  const { default: VoyageRepositoryMongo }        = await import('../infrastructure/persistence/mongodb/VoyageRepositoryMongo.js');

  const uri    = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB  || 'dddsample';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const locationRepository = LocationRepositoryMongo(db.collection('locations'));
  const voyageRepository   = VoyageRepositoryMongo(
    db.collection('voyages'),
    (unLocode) => locationRepository.find(unLocode)
  );

  let cargoRepository;
  const handlingEventRepository = HandlingEventRepositoryMongo(
    db.collection('handlingEvents'),
    (trackingId)   => cargoRepository.find(trackingId),
    (unLocode)     => locationRepository.find(unLocode),
    (voyageNumber) => voyageRepository.find(voyageNumber)
  );
  cargoRepository = CargoRepositoryMongo(
    db.collection('cargos'),
    (unLocode)     => locationRepository.find(unLocode),
    (voyageNumber) => voyageRepository.find(voyageNumber),
    (trackingId)   => handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId)
  );

  return { cargoRepository, handlingEventRepository, locationRepository, voyageRepository, disconnect: () => client.close() };
}

async function buildMySQLRepos() {
  const mysql2                               = (await import('mysql2/promise')).default;
  const { default: CargoRepositoryMySQL }         = await import('../infrastructure/persistence/mysql/CargoRepositoryMySQL.js');
  const { default: HandlingEventRepositoryMySQL } = await import('../infrastructure/persistence/mysql/HandlingEventRepositoryMySQL.js');
  const { default: LocationRepositoryMySQL }      = await import('../infrastructure/persistence/mysql/LocationRepositoryMySQL.js');
  const { default: VoyageRepositoryMySQL }        = await import('../infrastructure/persistence/mysql/VoyageRepositoryMySQL.js');

  const pool = mysql2.createPool({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     Number(process.env.MYSQL_PORT || 3306),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'dddsample',
    waitForConnections: true,
    connectionLimit: 10,
  });

  const locationRepository = LocationRepositoryMySQL(pool);
  const voyageRepository   = VoyageRepositoryMySQL(pool, (unLocode) => locationRepository.find(unLocode));

  let cargoRepository;
  const handlingEventRepository = HandlingEventRepositoryMySQL(
    pool,
    (trackingId)   => cargoRepository.find(trackingId),
    (unLocode)     => locationRepository.find(unLocode),
    (voyageNumber) => voyageRepository.find(voyageNumber)
  );
  cargoRepository = CargoRepositoryMySQL(
    pool,
    (unLocode)     => locationRepository.find(unLocode),
    (voyageNumber) => voyageRepository.find(voyageNumber),
    (trackingId)   => handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId)
  );

  return { cargoRepository, handlingEventRepository, locationRepository, voyageRepository, disconnect: () => pool.end() };
}

// ── Messaging factories ───────────────────────────────────────────────────────

function buildLocalEvents() {
  const AsyncApplicationEvents = { createEmitter: null, on: null, emit: null,
    receivedHandlingEventRegistrationAttempt: null, cargoWasHandled: null,
    cargoWasMisdirected: null, cargoHasArrived: null };

  // Inline to avoid top-level await
  return import('../infrastructure/messaging/AsyncApplicationEvents.js').then(mod => {
    Object.assign(AsyncApplicationEvents, mod);
    const _emitter = AsyncApplicationEvents.createEmitter();
    const applicationEvents = {
      on:   (event, handler) => AsyncApplicationEvents.on(_emitter, event, handler),
      emit: (event, ...args) => AsyncApplicationEvents.emit(_emitter, event, ...args),
      receivedHandlingEventRegistrationAttempt: (attempt) =>
        AsyncApplicationEvents.receivedHandlingEventRegistrationAttempt(_emitter, attempt),
      cargoWasHandled:     (event) => AsyncApplicationEvents.cargoWasHandled(_emitter, event),
      cargoWasMisdirected: (cargo) => AsyncApplicationEvents.cargoWasMisdirected(_emitter, cargo),
      cargoHasArrived:     (cargo) => AsyncApplicationEvents.cargoHasArrived(_emitter, cargo),
    };
    return { applicationEvents, mq: null, disconnect: async () => {} };
  });
}

async function buildRabbitMQEvents() {
  const RabbitMQ = await import('../infrastructure/messaging/rabbitmq/RabbitMQApplicationEvents.js');
  const mq       = await RabbitMQ.connect();
  return { applicationEvents: mq.publisher, mq, disconnect: () => mq.close() };
}

// ── Main factory ─────────────────────────────────────────────────────────────

async function createContainer() {
  const dbDriver = process.env.DB_DRIVER || 'inmemory';
  const mqDriver = process.env.MQ_DRIVER || 'local';

  let repos;
  if      (dbDriver === 'mongodb') repos = await buildMongoRepos();
  else if (dbDriver === 'mysql')   repos = await buildMySQLRepos();
  else                             repos = await buildInMemoryRepos();
  const { cargoRepository, handlingEventRepository, locationRepository, voyageRepository } = repos;

  const mqHandle = mqDriver === 'rabbitmq'
    ? await buildRabbitMQEvents()
    : await buildLocalEvents();
  const { applicationEvents } = mqHandle;

  const boundCreateCargo = (originUnLocode, destinationUnLocode, arrivalDeadline) =>
    CargoFactory.createCargo(
      () => cargoRepository.nextTrackingId(),
      locationRepository.find,
      originUnLocode, destinationUnLocode, arrivalDeadline
    );

  const boundCreateHandlingEvent = (regTime, compTime, trackingId, voyageNum, unlocode, type) =>
    HandlingEventFactory.createHandlingEvent(
      cargoRepository.find, voyageRepository.find, locationRepository.find,
      regTime, compTime, trackingId, voyageNum, unlocode, type
    );

  const boundFindShortestPath = (origin, dest, lim) =>
    GraphTraversalService.findShortestPath(GraphDAOStub.listAllNodes, GraphDAOStub.getTransitEdge, origin, dest, lim);

  const boundFetchRoutes = (routeSpec) =>
    ExternalRoutingService.fetchRoutesForSpecification(
      boundFindShortestPath, locationRepository.find, voyageRepository.find, routeSpec
    );

  const bookingService = {
    bookNewCargo: (o, d, dl) =>
      BookingService.bookNewCargo(boundCreateCargo, cargoRepository.store, o, d, dl),
    requestPossibleRoutesForCargo: (tid) =>
      BookingService.requestPossibleRoutesForCargo(cargoRepository.find, boundFetchRoutes, tid),
    assignCargoToRoute: (itin, tid) =>
      BookingService.assignCargoToRoute(cargoRepository.find, cargoRepository.store, itin, tid),
    changeDestination: (tid, ul) =>
      BookingService.changeDestination(cargoRepository.find, locationRepository.find, cargoRepository.store, tid, ul),
  };

  const handlingEventService = {
    registerHandlingEvent: (ct, tid, vn, ul, t) =>
      HandlingEventService.registerHandlingEvent(
        handlingEventRepository.store, applicationEvents.cargoWasHandled, boundCreateHandlingEvent,
        ct, tid, vn, ul, t
      ),
  };

  const cargoInspectionService = {
    inspectCargo: (trackingId) =>
      CargoInspectionService.inspectCargo(
        cargoRepository.find, cargoRepository.store,
        handlingEventRepository.lookupHandlingHistoryOfCargo,
        applicationEvents.cargoWasMisdirected, applicationEvents.cargoHasArrived,
        trackingId
      ),
  };

  if (mqDriver === 'rabbitmq') {
    const { mq } = mqHandle;
    const { default: TrackingId }        = await import('../domain/model/cargo/TrackingId.js');
    const { default: VoyageNumber }      = await import('../domain/model/voyage/VoyageNumber.js');
    const { default: UnLocode }          = await import('../domain/model/location/UnLocode.js');
    const { default: HandlingEventType } = await import('../domain/model/handling/HandlingEventType.js');

    await mq.onHandlingEventAttempt(async (payload) => {
      try {
        await handlingEventService.registerHandlingEvent(
          new Date(payload.completionTime),
          TrackingId(payload.trackingId),
          payload.voyageNumber ? VoyageNumber(payload.voyageNumber) : null,
          UnLocode(payload.unLocode),
          HandlingEventType[payload.type]
        );
      } catch (e) { console.error('[RabbitMQ:handlingEventQueue]', e.message); }
    });

    await mq.onCargoHandled(async (payload) => {
      try {
        const { default: TrackingId2 } = await import('../domain/model/cargo/TrackingId.js');
        await cargoInspectionService.inspectCargo(TrackingId2(payload.cargoTrackingId));
      } catch (e) { console.error('[RabbitMQ:cargoHandledQueue]', e.message); }
    });

    await mq.onCargoMisdirected((p) => console.warn(`[RabbitMQ] Cargo ${p.trackingId} is misdirected`));
    await mq.onCargoArrived((p)    => console.info(`[RabbitMQ] Cargo ${p.trackingId} arrived`));

  } else {
    applicationEvents.on('handlingEventQueue', async (attempt) => {
      try {
        await handlingEventService.registerHandlingEvent(
          attempt.completionTime, attempt.trackingId, attempt.voyageNumber, attempt.unLocode, attempt.type
        );
      } catch (e) { console.error('[handlingEventQueue]', e.message); }
    });
    applicationEvents.on('cargoHandledQueue', async (event) => {
      try { await cargoInspectionService.inspectCargo(event.cargo().trackingId()); }
      catch (e) { console.error('[cargoHandledQueue]', e.message); }
    });
    applicationEvents.on('misdirectedCargoQueue', (cargo) =>
      console.warn(`[misdirectedCargoQueue] Cargo ${cargo.trackingId().idString()} is misdirected`));
    applicationEvents.on('deliveredCargoQueue', (cargo) =>
      console.info(`[deliveredCargoQueue] Cargo ${cargo.trackingId().idString()} arrived`));
  }

  const bookingServiceFacade = {
    listShippingLocations: () =>
      BookingServiceFacade.listShippingLocations(locationRepository.getAll),
    bookNewCargo: (o, d, dl) =>
      BookingServiceFacade.bookNewCargo(bookingService.bookNewCargo, o, d, dl),
    loadCargoForRouting: (tid) =>
      BookingServiceFacade.loadCargoForRouting(cargoRepository.find, tid),
    assignCargoToRoute: (tid, routeDTO) =>
      BookingServiceFacade.assignCargoToRoute(bookingService.assignCargoToRoute, voyageRepository.find, locationRepository.find, tid, routeDTO),
    changeDestination: (tid, ul) =>
      BookingServiceFacade.changeDestination(bookingService.changeDestination, tid, ul),
    listAllCargos: () =>
      BookingServiceFacade.listAllCargos(cargoRepository.getAll),
    requestPossibleRoutesForCargo: (tid) =>
      BookingServiceFacade.requestPossibleRoutesForCargo(bookingService.requestPossibleRoutesForCargo, tid),
  };

  if (dbDriver === 'inmemory') {
    await SampleDataGenerator.generate(
      locationRepository.store,
      voyageRepository.store,
      cargoRepository.store,
      handlingEventRepository.store,
      boundCreateHandlingEvent,
      handlingEventRepository.lookupHandlingHistoryOfCargo
    );
  }

  return {
    cargoRepository,
    handlingEventRepository,
    locationRepository,
    voyageRepository,
    bookingService,
    handlingEventService,
    cargoInspectionService,
    bookingServiceFacade,
    applicationEvents,
    disconnect: async () => { await repos.disconnect(); await mqHandle.disconnect(); },
  };
}

export { createContainer };
