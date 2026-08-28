import { configure as configureServiceContext, configureRouting } from '../ServiceContext.js';

import * as HandlingEventService   from '../application/HandlingEventService.js';
import * as CargoInspectionService from '../application/CargoInspectionService.js';
import * as BookingService         from '../application/BookingService.js';
import * as ExternalRoutingService from '../infrastructure/routing/ExternalRoutingService.js';
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
    // Use findShallow here — it loads the cargo document without triggering
    // lookupHandlingHistoryOfCargo, which would loop back into this same mapper.
    (trackingId)   => cargoRepository.findShallow(trackingId),
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
  const mysql2                                     = (await import('mysql2/promise')).default;
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
  return import('../infrastructure/messaging/AsyncApplicationEvents.js').then(mod => {
    const _emitter = mod.createEmitter();
    const applicationEvents = {
      on:   (event, handler) => mod.on(_emitter, event, handler),
      emit: (event, ...args) => mod.emit(_emitter, event, ...args),
      receivedHandlingEventRegistrationAttempt: (attempt) =>
        mod.receivedHandlingEventRegistrationAttempt(_emitter, attempt),
      cargoWasHandled:     (event) => mod.cargoWasHandled(_emitter, event),
      cargoWasMisdirected: (cargo) => mod.cargoWasMisdirected(_emitter, cargo),
      cargoHasArrived:     (cargo) => mod.cargoHasArrived(_emitter, cargo),
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

  // Populate ServiceContext — from this point all application/facade/route functions
  // can be called with value-only parameters.
  configureServiceContext(repos, applicationEvents);
  configureRouting(ExternalRoutingService);

  // ── Event subscriptions ───────────────────────────────────────────────────────

  if (mqDriver === 'rabbitmq') {
    const { mq } = mqHandle;
    await mq.onHandlingEventAttempt(async (payload) => {
      try {
        const { default: HandlingEventType } = await import('../domain/model/handling/HandlingEventType.js');
        await HandlingEventService.registerHandlingEvent(
          new Date(payload.completionTime),
          payload.trackingId,
          payload.voyageNumber ?? null,
          payload.unLocode,
          HandlingEventType[payload.type]
        );
      } catch (e) { console.error('[RabbitMQ:handlingEventQueue]', e.message); }
    });

    await mq.onCargoHandled(async (payload) => {
      try {
        await CargoInspectionService.inspectCargo(payload.cargoTrackingId);
      } catch (e) { console.error('[RabbitMQ:cargoHandledQueue]', e.message); }
    });

    await mq.onCargoMisdirected((p) => console.warn(`[RabbitMQ] Cargo ${p.trackingId} is misdirected`));
    await mq.onCargoArrived((p)    => console.info(`[RabbitMQ] Cargo ${p.trackingId} arrived`));

  } else {
    applicationEvents.on('handlingEventQueue', async (attempt) => {
      try {
        await HandlingEventService.registerHandlingEvent(
          attempt.completionTime, attempt.trackingId, attempt.voyageNumber, attempt.unLocode, attempt.type
        );
      } catch (e) { console.error('[handlingEventQueue]', e.message); }
    });
    applicationEvents.on('cargoHandledQueue', async (event) => {
      try { await CargoInspectionService.inspectCargo(event.cargo().trackingId().idString()); }
      catch (e) { console.error('[cargoHandledQueue]', e.message); }
    });
    applicationEvents.on('misdirectedCargoQueue', (cargo) =>
      console.warn(`[misdirectedCargoQueue] Cargo ${cargo.trackingId().idString()} is misdirected`));
    applicationEvents.on('deliveredCargoQueue', (cargo) =>
      console.info(`[deliveredCargoQueue] Cargo ${cargo.trackingId().idString()} arrived`));
  }

  // ── Sample data ───────────────────────────────────────────────────────────────
  // In-memory repos reset on every restart, so always seed them.
  // For persistent drivers (mongo, mysql) seed only when the DB is empty.
  // locationRepository.getAll() is safe to use as a sentinel: it has no joins
  // and no circular dependencies, unlike cargoRepository.getAll().

  if (dbDriver === 'inmemory') {
    await SampleDataGenerator.generate();
  } else {
    const locs = await locationRepository.getAll();
    if (locs.length === 0) await SampleDataGenerator.generate();
  }

  return {
    cargoRepository,
    handlingEventRepository,
    locationRepository,
    voyageRepository,
    bookingService:          BookingService,
    handlingEventService:    HandlingEventService,
    cargoInspectionService:  CargoInspectionService,
    applicationEvents,
    disconnect: async () => { await repos.disconnect(); await mqHandle.disconnect(); },
  };
}

export { createContainer };
