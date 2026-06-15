'use strict';

const VoyageNumber = require('./VoyageNumber');
const Schedule = require('./Schedule');
const CarrierMovement = require('./CarrierMovement');
const Location = require('../location/Location');

/**
 * A Voyage.
 */
class Voyage {
  /**
   * @param {VoyageNumber} voyageNumber
   * @param {Schedule} schedule
   */
  constructor(voyageNumber, schedule) {
    if (!voyageNumber) throw new Error('Voyage number is required');
    if (!schedule) throw new Error('Schedule is required');
    this._voyageNumber = voyageNumber.idString();
    this._carrierMovements = schedule.carrierMovements();
  }

  /** @returns {VoyageNumber} */
  voyageNumber() { return new VoyageNumber(this._voyageNumber); }

  /** @returns {Schedule} */
  schedule() { return new Schedule(this._carrierMovements); }

  /** @param {Voyage} other @returns {boolean} */
  sameIdentityAs(other) {
    return other instanceof Voyage && this._voyageNumber === other._voyageNumber;
  }

  equals(other) { return this.sameIdentityAs(other); }

  toString() { return `Voyage ${this._voyageNumber}`; }
}

/** Null object — no voyage */
Voyage.NONE = new Voyage(new VoyageNumber(''), Schedule.EMPTY);

/**
 * Builder for incremental construction of a Voyage aggregate.
 */
class VoyageBuilder {
  /**
   * @param {VoyageNumber} voyageNumber
   * @param {Location} departureLocation
   */
  constructor(voyageNumber, departureLocation) {
    if (!voyageNumber) throw new Error('Voyage number is required');
    if (!departureLocation) throw new Error('Departure location is required');
    this._voyageNumber = voyageNumber;
    this._departureLocation = departureLocation;
    this._carrierMovements = [];
  }

  /**
   * @param {Location} arrivalLocation
   * @param {Date} departureTime
   * @param {Date} arrivalTime
   * @returns {VoyageBuilder}
   */
  addMovement(arrivalLocation, departureTime, arrivalTime) {
    this._carrierMovements.push(
      new CarrierMovement(this._departureLocation, arrivalLocation, departureTime, arrivalTime)
    );
    this._departureLocation = arrivalLocation;
    return this;
  }

  /** @returns {Voyage} */
  build() {
    return new Voyage(this._voyageNumber, new Schedule(this._carrierMovements));
  }
}

Voyage.Builder = VoyageBuilder;

module.exports = Voyage;
