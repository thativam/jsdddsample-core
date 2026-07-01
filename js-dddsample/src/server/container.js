'use strict';

/**
 * Composition root — manual dependency injection.
 *
 * Mirrors Spring's application context / @Bean wiring.
 *
 * Each module now exports top-level independent functions (Spring-style service methods).
 * This file creates the "bean" instances by partially applying their dep parameters,
 * producing objects whose methods require only business arguments — identical to how
 * Spring wires @Autowired constructor deps before exposing the service bean.
 *
 * Repositories are stateful factory calls (their Map/array is the equivalent of
 * a JPA EntityManager — state inherent to the bean, not a separate injection).
 */

const CargoRepositoryInMem         = require('../infrastructure/persistence/inmemory/CargoRepositoryInMem');
const HandlingEventRepositoryInMem = require('../infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
const LocationRepositoryInMem      = require('../infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem        = require('../infrastructure/persistence/inmemory/VoyageRepositoryInMem');

const HandlingEventFactory = require('../domain/model/handling/HandlingEventFactory');
const CargoFactory         = require('../domain/model/cargo/CargoFactory');

const BookingService        = require('../application/BookingService');
const HandlingEventService  = require('../application/HandlingEventService');
const CargoInspectionService = require('../application/CargoInspectionService');

const GraphDAOStub          = require('../infrastructure/routing/GraphDAOStub');
const GraphTraversalService = require('../infrastructure/routing/GraphTraversalService');
const ExternalRoutingService = require('../infrastructure/routing/ExternalRoutingService');

const BookingServiceFacade  = require('../interfaces/booking/BookingServiceFacade');
const SampleDataGenerator   = require('../infrastructure/sampledata/SampleDataGenerator');
const AsyncApplicationEvents = require('../infrastructure/messaging/AsyncApplicationEvents');

// ── Repositories (stateful — factory creates the bean instance) ──────────────
const cargoRepository          = CargoRepositoryInMem();
const handlingEventRepository  = HandlingEventRepositoryInMem();
const locationRepository       = LocationRepositoryInMem();
const voyageRepository         = VoyageRepositoryInMem();

// ── Factories (bound to their repos) ─────────────────────────────────────────
//
//   Java: @Autowired CargoFactory(locationRepo, cargoRepo)
//   JS:   bind locationRepository and cargoRepository as first params
//
const handlingEventFactory = {
  createHandlingEvent: (regTime, compTime, trackingId, voyageNum, unlocode, type) =>
    HandlingEventFactory.createHandlingEvent(cargoRepository, voyageRepository, locationRepository, regTime, compTime, trackingId, voyageNum, unlocode, type),
};

const cargoFactory = {
  createCargo: (originUnLocode, destinationUnLocode, arrivalDeadline) =>
    CargoFactory.createCargo(locationRepository, cargoRepository, originUnLocode, destinationUnLocode, arrivalDeadline),
};

// ── Routing (Pathfinder bounded context) ─────────────────────────────────────
//
//   GraphDAOStub is now a plain module (no factory call) — its functions are
//   passed directly as the dao object.
//
const graphTraversalService = {
  findShortestPath: (originNode, destinationNode, limitations) =>
    GraphTraversalService.findShortestPath(GraphDAOStub, originNode, destinationNode, limitations),
};

const routingService = {
  fetchRoutesForSpecification: (routeSpecification) =>
    ExternalRoutingService.fetchRoutesForSpecification(graphTraversalService, locationRepository, voyageRepository, routeSpecification),
};

// ── Async message queue (mirrors JmsApplicationEventsImpl) ────────────────────
//
//   The EventEmitter is the "state" injected into every async-events function.
//
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

// ── Application services (bound — expose same API as before) ─────────────────
const bookingService = {
  bookNewCargo: (originUnLocode, destinationUnLocode, arrivalDeadline) =>
    BookingService.bookNewCargo(cargoRepository, cargoFactory, originUnLocode, destinationUnLocode, arrivalDeadline),
  requestPossibleRoutesForCargo: (trackingId) =>
    BookingService.requestPossibleRoutesForCargo(cargoRepository, routingService, trackingId),
  assignCargoToRoute: (itinerary, trackingId) =>
    BookingService.assignCargoToRoute(cargoRepository, itinerary, trackingId),
  changeDestination: (trackingId, unLocode) =>
    BookingService.changeDestination(cargoRepository, locationRepository, trackingId, unLocode),
};

const handlingEventService = {
  registerHandlingEvent: (completionTime, trackingId, voyageNumber, unLocode, type) =>
    HandlingEventService.registerHandlingEvent(handlingEventRepository, applicationEvents, handlingEventFactory, completionTime, trackingId, voyageNumber, unLocode, type),
};

const cargoInspectionService = {
  inspectCargo: (trackingId) =>
    CargoInspectionService.inspectCargo(applicationEvents, cargoRepository, handlingEventRepository, trackingId),
};

// ── Wire queue consumers (equivalent to @MessageDriven beans in Java) ─────────
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

// ── Facade (bound — proxies all calls to top-level BookingServiceFacade fns) ─
const bookingServiceFacade = {
  listShippingLocations: () =>
    BookingServiceFacade.listShippingLocations(locationRepository),
  bookNewCargo: (origin, destination, arrivalDeadline) =>
    BookingServiceFacade.bookNewCargo(bookingService, origin, destination, arrivalDeadline),
  loadCargoForRouting: (trackingId) =>
    BookingServiceFacade.loadCargoForRouting(cargoRepository, trackingId),
  assignCargoToRoute: (trackingId, routeDTO) =>
    BookingServiceFacade.assignCargoToRoute(bookingService, voyageRepository, locationRepository, trackingId, routeDTO),
  changeDestination: (trackingId, unLocode) =>
    BookingServiceFacade.changeDestination(bookingService, trackingId, unLocode),
  listAllCargos: () =>
    BookingServiceFacade.listAllCargos(cargoRepository),
  requestPossibleRoutesForCargo: (trackingId) =>
    BookingServiceFacade.requestPossibleRoutesForCargo(bookingService, trackingId),
};

// ── Sample data ───────────────────────────────────────────────────────────────
SampleDataGenerator.generate(cargoRepository, voyageRepository, locationRepository, handlingEventRepository);

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
