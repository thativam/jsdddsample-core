'use strict';

/**
 * Composition root — manual dependency injection.
 *
 * Mirrors Spring's application context / @Bean wiring.
 *
 * Each module exports top-level functions that accept individual callbacks
 * (not complex objects). This file extracts the specific methods from each
 * repository/service and binds them as callbacks — equivalent to how Spring
 * resolves @Autowired constructor parameters before the bean is usable.
 *
 * Repositories keep their factory pattern (stateful; Map = equivalent of JPA
 * EntityManager — state intrinsic to the bean, not an injectable dependency).
 */

const CargoRepositoryInMem         = require('../infrastructure/persistence/inmemory/CargoRepositoryInMem');
const HandlingEventRepositoryInMem = require('../infrastructure/persistence/inmemory/HandlingEventRepositoryInMem');
const LocationRepositoryInMem      = require('../infrastructure/persistence/inmemory/LocationRepositoryInMem');
const VoyageRepositoryInMem        = require('../infrastructure/persistence/inmemory/VoyageRepositoryInMem');

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
const AsyncApplicationEvents = require('../infrastructure/messaging/AsyncApplicationEvents');

// ── Repositories (stateful — factory creates the bean instance) ──────────────
const cargoRepository         = CargoRepositoryInMem();
const handlingEventRepository = HandlingEventRepositoryInMem();
const locationRepository      = LocationRepositoryInMem();
const voyageRepository        = VoyageRepositoryInMem();

// ── Async message queue ───────────────────────────────────────────────────────
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

// ── Individual callback bindings ──────────────────────────────────────────────
//
// Each arrow function is a named, single-purpose callback — the "wired" form of
// a specific method from a repository or service.  This is the JS equivalent of
// Spring resolving @Autowired at startup.

// CargoFactory callbacks
const boundNextTrackingId = () => cargoRepository.nextTrackingId();
const boundFindLocationForFactory = (unLocode) => locationRepository.find(unLocode);
const boundCreateCargo = (originUnLocode, destinationUnLocode, arrivalDeadline) =>
  CargoFactory.createCargo(boundNextTrackingId, boundFindLocationForFactory, originUnLocode, destinationUnLocode, arrivalDeadline);

// HandlingEventFactory callbacks
const boundCreateHandlingEvent = (regTime, compTime, trackingId, voyageNum, unlocode, type) =>
  HandlingEventFactory.createHandlingEvent(
    cargoRepository.find,
    voyageRepository.find,
    locationRepository.find,
    regTime, compTime, trackingId, voyageNum, unlocode, type
  );

// Routing callbacks
const boundFindShortestPath = (originNode, destinationNode, limitations) =>
  GraphTraversalService.findShortestPath(
    GraphDAOStub.listAllNodes,
    GraphDAOStub.getTransitEdge,
    originNode, destinationNode, limitations
  );

const boundFetchRoutes = (routeSpecification) =>
  ExternalRoutingService.fetchRoutesForSpecification(
    boundFindShortestPath,
    locationRepository.find,
    voyageRepository.find,
    routeSpecification
  );

// ── Application services (bound — expose same external API as before) ─────────
const bookingService = {
  bookNewCargo: (originUnLocode, destinationUnLocode, arrivalDeadline) =>
    BookingService.bookNewCargo(boundCreateCargo, cargoRepository.store, originUnLocode, destinationUnLocode, arrivalDeadline),
  requestPossibleRoutesForCargo: (trackingId) =>
    BookingService.requestPossibleRoutesForCargo(cargoRepository.find, boundFetchRoutes, trackingId),
  assignCargoToRoute: (itinerary, trackingId) =>
    BookingService.assignCargoToRoute(cargoRepository.find, cargoRepository.store, itinerary, trackingId),
  changeDestination: (trackingId, unLocode) =>
    BookingService.changeDestination(cargoRepository.find, locationRepository.find, cargoRepository.store, trackingId, unLocode),
};

const handlingEventService = {
  registerHandlingEvent: (completionTime, trackingId, voyageNumber, unLocode, type) =>
    HandlingEventService.registerHandlingEvent(
      handlingEventRepository.store,
      applicationEvents.cargoWasHandled,
      boundCreateHandlingEvent,
      completionTime, trackingId, voyageNumber, unLocode, type
    ),
};

const cargoInspectionService = {
  inspectCargo: (trackingId) =>
    CargoInspectionService.inspectCargo(
      cargoRepository.find,
      cargoRepository.store,
      handlingEventRepository.lookupHandlingHistoryOfCargo,
      applicationEvents.cargoWasMisdirected,
      applicationEvents.cargoHasArrived,
      trackingId
    ),
};

// ── Wire queue consumers (equivalent to @MessageDriven beans in Java) ─────────
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

applicationEvents.on('cargoHandledQueue', (event) => {
  try {
    cargoInspectionService.inspectCargo(event.cargo().trackingId());
  } catch (e) {
    console.error('[cargoHandledQueue] Failed to inspect cargo:', e.message);
  }
});

applicationEvents.on('misdirectedCargoQueue', (cargo) => {
  console.warn(`[misdirectedCargoQueue] Cargo ${cargo.trackingId().idString()} is misdirected`);
});

applicationEvents.on('deliveredCargoQueue', (cargo) => {
  console.info(`[deliveredCargoQueue] Cargo ${cargo.trackingId().idString()} has arrived at destination`);
});

// ── Facade (bound — individual callbacks for each operation) ──────────────────
const bookingServiceFacade = {
  listShippingLocations: () =>
    BookingServiceFacade.listShippingLocations(locationRepository.getAll),
  bookNewCargo: (origin, destination, arrivalDeadline) =>
    BookingServiceFacade.bookNewCargo(bookingService.bookNewCargo, origin, destination, arrivalDeadline),
  loadCargoForRouting: (trackingId) =>
    BookingServiceFacade.loadCargoForRouting(cargoRepository.find, trackingId),
  assignCargoToRoute: (trackingId, routeDTO) =>
    BookingServiceFacade.assignCargoToRoute(
      bookingService.assignCargoToRoute,
      voyageRepository.find,
      locationRepository.find,
      trackingId, routeDTO
    ),
  changeDestination: (trackingId, unLocode) =>
    BookingServiceFacade.changeDestination(bookingService.changeDestination, trackingId, unLocode),
  listAllCargos: () =>
    BookingServiceFacade.listAllCargos(cargoRepository.getAll),
  requestPossibleRoutesForCargo: (trackingId) =>
    BookingServiceFacade.requestPossibleRoutesForCargo(bookingService.requestPossibleRoutesForCargo, trackingId),
};

// ── Sample data ───────────────────────────────────────────────────────────────
SampleDataGenerator.generate(
  locationRepository.store,
  voyageRepository.store,
  cargoRepository.store,
  handlingEventRepository.store,
  boundCreateHandlingEvent,
  handlingEventRepository.lookupHandlingHistoryOfCargo
);

module.exports = {
  cargoRepository,
  handlingEventRepository,
  locationRepository,
  voyageRepository,
  bookingService,
  handlingEventService,
  cargoInspectionService,
  bookingServiceFacade,
  applicationEvents,
};
