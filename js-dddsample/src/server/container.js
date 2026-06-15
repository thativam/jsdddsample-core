'use strict';

/**
 * Manual dependency injection / composition root.
 * Wires all components together.
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
const SynchronousApplicationEvents = require('../infrastructure/messaging/SynchronousApplicationEvents');

// Repositories
const cargoRepository = new CargoRepositoryInMem();
const handlingEventRepository = new HandlingEventRepositoryInMem();
const locationRepository = new LocationRepositoryInMem();
const voyageRepository = new VoyageRepositoryInMem();

// Factories
const handlingEventFactory = new HandlingEventFactory(cargoRepository, voyageRepository, locationRepository);
const cargoFactory = new CargoFactory(locationRepository, cargoRepository);

// Routing
const graphTraversalService = new GraphTraversalService(new GraphDAOStub());
const routingService = new ExternalRoutingService(graphTraversalService, locationRepository, voyageRepository);

// Application services
const applicationEvents = new SynchronousApplicationEvents();
const bookingService = new BookingService(cargoRepository, locationRepository, routingService, cargoFactory);
const handlingEventService = new HandlingEventService(handlingEventRepository, applicationEvents, handlingEventFactory);
const cargoInspectionService = new CargoInspectionService(applicationEvents, cargoRepository, handlingEventRepository);

// Wire circular dependency
applicationEvents.setCargoInspectionService(cargoInspectionService);

// Facade
const bookingServiceFacade = new BookingServiceFacade(bookingService, locationRepository, cargoRepository, voyageRepository);

// Load sample data
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
