'use strict';

const Cargo = require('../../domain/model/cargo/Cargo');
const TrackingId = require('../../domain/model/cargo/TrackingId');
const RouteSpecification = require('../../domain/model/cargo/RouteSpecification');
const Itinerary = require('../../domain/model/cargo/Itinerary');
const Leg = require('../../domain/model/cargo/Leg');
const HandlingEventFactory = require('../../domain/model/handling/HandlingEventFactory');
const HandlingEvent = require('../../domain/model/handling/HandlingEvent');
const SampleLocations = require('./SampleLocations');
const SampleVoyages = require('./SampleVoyages');

const { toDate } = SampleVoyages;
const {
  HONGKONG, HANGZHOU, NEWYORK, DALLAS, HELSINKI, STOCKHOLM,
} = SampleLocations;
const {
  HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI, DALLAS_TO_HELSINKI_ALT, HELSINKI_TO_HONGKONG,
} = SampleVoyages;

/**
 * Loads sample data into the in-memory repositories.
 */
class SampleDataGenerator {
  constructor(cargoRepository, voyageRepository, locationRepository, handlingEventRepository) {
    this._cargoRepository = cargoRepository;
    this._voyageRepository = voyageRepository;
    this._locationRepository = locationRepository;
    this._handlingEventRepository = handlingEventRepository;
  }

  generate() {
    // Store all locations
    for (const location of SampleLocations.getAll()) {
      this._locationRepository.store(location);
    }

    // Store all voyages
    for (const voyage of [
      HONGKONG_TO_NEW_YORK, NEW_YORK_TO_DALLAS, DALLAS_TO_HELSINKI, DALLAS_TO_HELSINKI_ALT, HELSINKI_TO_HONGKONG
    ]) {
      this._voyageRepository.store(voyage);
    }

    const factory = new HandlingEventFactory(
      this._cargoRepository, this._voyageRepository, this._locationRepository
    );

    // Cargo ABC123: Hongkong → Helsinki
    const trackingId1 = new TrackingId('ABC123');
    const routeSpec1 = new RouteSpecification(HONGKONG, HELSINKI, toDate('2009-03-15'));
    const abc123 = new Cargo(trackingId1, routeSpec1);
    const itinerary1 = new Itinerary([
      new Leg(HONGKONG_TO_NEW_YORK, HONGKONG, NEWYORK, toDate('2009-03-02'), toDate('2009-03-05')),
      new Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,  toDate('2009-03-06'), toDate('2009-03-08')),
      new Leg(DALLAS_TO_HELSINKI,   DALLAS,   HELSINKI, toDate('2009-03-09'), toDate('2009-03-12')),
    ]);
    abc123.assignToRoute(itinerary1);
    this._cargoRepository.store(abc123);

    try {
      const e1 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-01'), trackingId1, null,
        HONGKONG.unLocode(), HandlingEvent.Type.RECEIVE
      );
      this._handlingEventRepository.store(e1);

      const e2 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-02'), trackingId1,
        HONGKONG_TO_NEW_YORK.voyageNumber(), HONGKONG.unLocode(), HandlingEvent.Type.LOAD
      );
      this._handlingEventRepository.store(e2);

      const e3 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-05'), trackingId1,
        HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.UNLOAD
      );
      this._handlingEventRepository.store(e3);
    } catch (e) {
      throw new Error(e);
    }

    const history1 = this._handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId1);
    abc123.deriveDeliveryProgress(history1);
    this._cargoRepository.store(abc123);

    // Cargo JKL567: Hangzhou → Stockholm
    const trackingId2 = new TrackingId('JKL567');
    const routeSpec2 = new RouteSpecification(HANGZHOU, STOCKHOLM, toDate('2009-03-18'));
    const jkl567 = new Cargo(trackingId2, routeSpec2);
    const itinerary2 = new Itinerary([
      new Leg(HONGKONG_TO_NEW_YORK, HANGZHOU, NEWYORK,   toDate('2009-03-03'), toDate('2009-03-05')),
      new Leg(NEW_YORK_TO_DALLAS,   NEWYORK,  DALLAS,    toDate('2009-03-06'), toDate('2009-03-08')),
      new Leg(DALLAS_TO_HELSINKI,   DALLAS,   STOCKHOLM, toDate('2009-03-09'), toDate('2009-03-11')),
    ]);
    jkl567.assignToRoute(itinerary2);
    this._cargoRepository.store(jkl567);

    try {
      const e1 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-01'), trackingId2, null,
        HANGZHOU.unLocode(), HandlingEvent.Type.RECEIVE
      );
      this._handlingEventRepository.store(e1);

      const e2 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-03'), trackingId2,
        HONGKONG_TO_NEW_YORK.voyageNumber(), HANGZHOU.unLocode(), HandlingEvent.Type.LOAD
      );
      this._handlingEventRepository.store(e2);

      const e3 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-05'), trackingId2,
        HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.UNLOAD
      );
      this._handlingEventRepository.store(e3);

      const e4 = factory.createHandlingEvent(
        new Date(), toDate('2009-03-06'), trackingId2,
        HONGKONG_TO_NEW_YORK.voyageNumber(), NEWYORK.unLocode(), HandlingEvent.Type.LOAD
      );
      this._handlingEventRepository.store(e4);
    } catch (e) {
      throw new Error(e);
    }

    const history2 = this._handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId2);
    jkl567.deriveDeliveryProgress(history2);
    this._cargoRepository.store(jkl567);

    console.info('Sample data loaded.');
  }
}

module.exports = SampleDataGenerator;
