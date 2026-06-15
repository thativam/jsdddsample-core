'use strict';

const Location = require('../location/Location');
const HandlingEventType = require('../handling/HandlingEventType');

const END_OF_DAYS = new Date(8640000000000000);

/**
 * An itinerary — ordered list of Legs.
 */
class Itinerary {
  /** @param {import('./Leg')[]} legs */
  constructor(legs) {
    if (!legs) throw new Error('Legs list is required');
    if (legs.length === 0) throw new Error('Itinerary must have at least one leg');
    this._legs = [...legs];
  }

  /** @returns {import('./Leg')[]} */
  legs() { return [...this._legs]; }

  /**
   * Check whether a handling event is expected on this itinerary.
   * @param {import('../handling/HandlingEvent')} event
   * @returns {boolean}
   */
  isExpected(event) {
    if (this._legs.length === 0) return true;
    const Type = HandlingEventType;

    if (event.type() === Type.RECEIVE) {
      return this._legs[0].loadLocation().equals(event.location());
    }

    if (event.type() === Type.LOAD) {
      return this._legs.some(leg =>
        leg.loadLocation().sameIdentityAs(event.location()) &&
        leg.voyage().sameIdentityAs(event.voyage())
      );
    }

    if (event.type() === Type.UNLOAD) {
      return this._legs.some(leg =>
        leg.unloadLocation().equals(event.location()) &&
        leg.voyage().equals(event.voyage())
      );
    }

    if (event.type() === Type.CLAIM) {
      return this.lastLeg().unloadLocation().equals(event.location());
    }

    // CUSTOMS
    return true;
  }

  /** @returns {Location} */
  initialDepartureLocation() {
    return this._legs.length === 0 ? Location.UNKNOWN : this._legs[0].loadLocation();
  }

  /** @returns {Location} */
  finalArrivalLocation() {
    return this._legs.length === 0 ? Location.UNKNOWN : this.lastLeg().unloadLocation();
  }

  /** @returns {Date} */
  finalArrivalDate() {
    const last = this.lastLeg();
    return last ? last.unloadTime() : END_OF_DAYS;
  }

  /** @returns {import('./Leg')|null} */
  lastLeg() {
    return this._legs.length === 0 ? null : this._legs[this._legs.length - 1];
  }

  sameValueAs(other) {
    if (!(other instanceof Itinerary)) return false;
    if (this._legs.length !== other._legs.length) return false;
    return this._legs.every((l, i) => l.equals(other._legs[i]));
  }

  equals(other) { return this.sameValueAs(other); }
}

Itinerary.EMPTY_ITINERARY = null; // Null object — used when no itinerary assigned

module.exports = Itinerary;
