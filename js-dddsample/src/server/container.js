'use strict';

/**
 * Composition root — manual dependency injection.
 *
 * Mirrors Spring's application context / @Bean wiring.
 * Also wires the JMS-equivalent message queue consumers
 * (see AsyncApplicationEvents for the queue ↔ consumer mapping).
 */

const CargoRepositoryInMem = require('../infrastructure/persistence/inmemory/CargoRepositoryInMem');
const HandlingEventRepositoryInMem = require('../infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
const LocationRepositoryInMem = require('../infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem = require('../infrastructure/persistence/inmemory/VoyageRepositoryInMem');

const HandlingEventFactory = require('../domain/model/handling/HandlingEventFactory');
const CargoFactory = require('../domain/model/cargo/CargoFactory');

const BookingService = require('../application/BookingService');
const HandlingEventService = require('../application/HandlingEventService');
const CargoInspectionService = require('../application/CargoInspectionService');

const GraphDAOStub = require('../infrastructure/routing/GraphDAOStub');
const GraphTraversalService = require('../infrastructure/routing/GraphTraversalService');
const ExternalRoutingService = require('../infrastructure/routing/ExternalRoutingService');

const BookingServiceFacade = require('../interfaces/booking/BookingServiceFacade');
const SampleDataGenerator = require('../infrastructure/sampledata/SampleDataGenerator');
const AsyncApplicationEvents = require('../infrastructure/messaging/AsyncApplicationEvents');

// ── Repositories ────────────────────────────────────────────────────────────
const cargoRepository = new CargoRepositoryInMem();
const handlingEventRepository = new HandlingEventRepositoryInMem();
const locationRepository = new LocationRepositoryInMem();
const voyageRepository = new VoyageRepositoryInMem();

// ── Factories ────────────────────────────────────────────────────────────────
const handlingEventFactory = new HandlingEventFactory(cargoRepository, voyageRepository, locationRepository);
const cargoFactory = new CargoFactory(locationRepository, cargoRepository);

// ── Routing (Pathfinder bounded context) ────────────────────────────────────
const graphTraversalService = new GraphTraversalService(new GraphDAOStub());
const routingService = new ExternalRoutingService(graphTraversalService, locationRepository, voyageRepository);

// ── Async message queue (mirrors JmsApplicationEventsImpl) ──────────────────
const applicationEvents = new AsyncApplicationEvents();

// ── Application services ─────────────────────────────────────────────────────
const bookingService = new BookingService(cargoRepository, locationRepository, routingService, cargoFactory);
const handlingEventService = new HandlingEventService(handlingEventRepository, applicationEvents, handlingEventFactory);
const cargoInspectionService = new CargoInspectionService(applicationEvents, cargoRepository, handlingEventRepository);

// ── Wire queue consumers (equivalent to @MessageDriven beans in Java) ────────
//
// Java:  handlingEventQueue  →  HandlingEventRegistrationCommandMDB
//                              → HandlingEventService.registerHandlingEvent()
applicationEvents.on('handlingEventQueue', (attempt) => {
  try {
    handlingEventService.registerHandlingEvent(
      attempt.completionTime,
      attempt.trackingId,
      attempt.voyageNumber,
      attempt.unLocode,
      attempt.type
    );
  } catch (e) {
    console.error('[handlingEventQueue] Failed to process attempt:', e.message);
  }
});

// Java:  cargoHandledQueue  →  CargoHandledPlacerMDB
//                            → CargoInspectionService.inspectCargo()
applicationEvents.on('cargoHandledQueue', (event) => {
  try {
    cargoInspectionService.inspectCargo(event.cargo().trackingId());
  } catch (e) {
    console.error('[cargoHandledQueue] Failed to inspect cargo:', e.message);
  }
});

// Java:  misdirectedCargoQueue  →  MisdirectedCargoMDB (notification)
applicationEvents.on('misdirectedCargoQueue', (cargo) => {
  console.warn(`[misdirectedCargoQueue] Cargo ${cargo.trackingId().idString()} is misdirected`);
});

// Java:  deliveredCargoQueue  →  DeliveredCargoMDB (notification)
applicationEvents.on('deliveredCargoQueue', (cargo) => {
  console.info(`[deliveredCargoQueue] Cargo ${cargo.trackingId().idString()} has arrived at destination`);
});

// ── Facade ───────────────────────────────────────────────────────────────────
const bookingServiceFacade = new BookingServiceFacade(bookingService, locationRepository, cargoRepository, voyageRepository);

// ── Sample data ───────────────────────────────────────────────────────────────
new SampleDataGenerator(cargoRepository, voyageRepository, locationRepository, handlingEventRepository).generate();

module.exports = {
  cargoRepository,
  handlingEventRepository,
  locationRepository,
  voyageRepository,
  bookingService,
  handlingEventService,
  cargoInspectionService,
  bookingServiceFacade,
  handlingEventFactory,
  applicationEvents,
};
