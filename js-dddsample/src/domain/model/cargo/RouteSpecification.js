'use strict';

const { Specification } = require('../../shared/Specification');
const Location = require('../location/Location');

/**
 * Route specification — describes where cargo goes and when it must arrive.
 * Also acts as a Specification<Itinerary>.
 */
class RouteSpecification extends Specification {
  /**
   * @param {Location} origin
   * @param {Location} destination
   * @param {Date} arrivalDeadline
   */
  constructor(origin, destination, arrivalDeadline) {
    super();
    if (!origin) throw new Error('Origin is required');
    if (!destination) throw new Error('Destination is required');
    if (!arrivalDeadline) throw new Error('Arrival deadline is required');
    if (origin.sameIdentityAs(destination)) {
      throw new Error(`Origin and destination can't be the same: ${origin}`);
    }
    this._origin = origin;
    this._destination = destination;
    this._arrivalDeadline = arrivalDeadline instanceof Date ? arrivalDeadline : new Date(arrivalDeadline);
  }

  origin()          { return this._origin; }
  destination()     { return this._destination; }
  arrivalDeadline() { return this._arrivalDeadline; }

  /** @param {Itinerary} itinerary */
  isSatisfiedBy(itinerary) {
    return itinerary != null &&
      this._origin.sameIdentityAs(itinerary.initialDepartureLocation()) &&
      this._destination.sameIdentityAs(itinerary.finalArrivalLocation()) &&
      this._arrivalDeadline > itinerary.finalArrivalDate();
  }

  sameValueAs(other) {
    return other instanceof RouteSpecification &&
      this._origin.equals(other._origin) &&
      this._destination.equals(other._destination) &&
      this._arrivalDeadline.getTime() === other._arrivalDeadline.getTime();
  }

  equals(other) { return this.sameValueAs(other); }
}

module.exports = RouteSpecification;
