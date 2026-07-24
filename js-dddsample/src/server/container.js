'use strict';

/**
 * Composition root — manual dependency injection.
 *
 * Driver selection via environment variables:
 *
 *   DB_DRIVER = inmemory | mongodb | mysql   (default: inmemory)
 *   MQ_DRIVER = local | rabbitmq             (default: local)
 *
 * MongoDB env:  MONGODB_URI, MONGODB_DB
 * MySQL env:    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 * RabbitMQ env: RABBITMQ_URL
 *
 * Usage:
 *   const container = await createContainer();
 *   app.use('/admin', adminRoutes(container.bookingServiceFacade));
 */

const HandlingEventFactory  = require('../domain/model/handling/HandlingEventFactory');
const CargoFactory          = require('../domain/model/cargo/CargoFactory');

const BookingService         = require('../application/BookingService');
const HandlingEventService   = require('../application/HandlingEventService');
const CargoInspectionService = require('../application/CargoInspectionService');

const GraphDAOStub           = require('../infrastructure/routing/GraphDAOStub');
const GraphTraversalService  = require('../infrastructure/routing/GraphTraversalService');
const ExternalRoutingService = require('../infrastructure/routing/ExternalRoutingService');

const BookingServiceFacade   = require('../interfaces/booking/BookingServiceFacade');
const SampleDataGenerator    = require('../infrastructure/sampledata/SampleDataGenerator');

// ── Repository factories ──────────────────────────────────────────────────────

async function buildInMemoryRepos() {
  const CargoRepositoryInMem         = require('../infrastructure/persistence/inmemory/CargoRepositoryInMem');
  const HandlingEventRepositoryInMem = require('../infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
  const LocationRepositoryInMem      = require('../infrastructure/persistence/inmemory/LocationRepositoryInMem');
  const VoyageRepositoryInMem        = require('../infrastructure/persistence/inmemory/VoyageRepositoryInMem');
  return {
    cargoRepository:         CargoRepositoryInMem(),
    handlingEventRepository: HandlingEventRepositoryInMem(),
    locationRepository:      LocationRepositoryInMem(),
    voyageRepository:        VoyageRepositoryInMem(),
    disconnect: async () => {},
  };
}

async function buildMongoRepos() {
  const { MongoClient }              = require('mongodb');
  const CargoRepositoryMongo         = require('../infrastructure/persistence/mongodb/CargoRepositoryMongo');
  const HandlingEventRepositoryMongo = require('../infrastructure/persistence/mongodb/HandlingEventRepositoryMongo');
  const LocationRepositoryMongo      = require('../infrastructure/persistence/mongodb/LocationRepositoryMongo');
  const VoyageRepositoryMongo        = require('../infrastructure/persistence/mongodb/VoyageRepositoryMongo');

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

  // Lazy refs break the Cargo ↔ HandlingEvent circular dependency
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
  const mysql2                       = require('mysql2/promise');
  const CargoRepositoryMySQL         = require('../infrastructure/persistence/mysql/CargoRepositoryMySQL');
  const HandlingEventRepositoryMySQL = require('../infrastructure/persistence/mysql/HandlingEventRepositoryMySQL');
  const LocationRepositoryMySQL      = require('../infrastructure/persistence/mysql/LocationRepositoryMySQL');
  const VoyageRepositoryMySQL        = require('../infrastructure/persistence/mysql/VoyageRepositoryMySQL');

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
  const AsyncApplicationEvents = require('../infrastructure/messaging/AsyncApplicationEvents');
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
}

async function buildRabbitMQEvents() {
  const RabbitMQ = require('../infrastructure/messaging/rabbitmq/RabbitMQApplicationEvents');
  const mq       = await RabbitMQ.connect();
  return { applicationEvents: mq.publisher, mq, disconnect: () => mq.close() };
}

// ── Main factory ─────────────────────────────────────────────────────────────

async function createContainer() {
  const dbDriver = process.env.DB_DRIVER || 'inmemory';
  const mqDriver = process.env.MQ_DRIVER || 'local';

  // 1. Repos
  let repos;
  if      (dbDriver === 'mongodb') repos = await buildMongoRepos();
  else if (dbDriver === 'mysql')   repos = await buildMySQLRepos();
  else                             repos = await buildInMemoryRepos();
  const { cargoRepository, handlingEventRepository, locationRepository, voyageRepository } = repos;

  // 2. Messaging
  const mqHandle = mqDriver === 'rabbitmq'
    ? await buildRabbitMQEvents()
    : buildLocalEvents();
  const { applicationEvents } = mqHandle;

  // 3. Bound callbacks
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

  // 4. Application services
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

  // 5. Wire consumers
  if (mqDriver === 'rabbitmq') {
    const { mq } = mqHandle;
    const TrackingId        = require('../domain/model/cargo/TrackingId');
    const VoyageNumber      = require('../domain/model/voyage/VoyageNumber');
    const UnLocode          = require('../domain/model/location/UnLocode');
    const HandlingEventType = require('../domain/model/handling/HandlingEventType');

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
        await cargoInspectionService.inspectCargo(TrackingId(payload.cargoTrackingId));
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

  // 6. Facade
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

  // 7. Sample data (in-memory only — other drivers need a migration/seed script)
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

module.exports = { createContainer };
