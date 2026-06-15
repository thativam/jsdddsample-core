'use strict';

const TrackingId = require('./TrackingId');
const RouteSpecification = require('./RouteSpecification');
const Itinerary = require('./Itinerary');
const Delivery = require('./Delivery');
const HandlingHistory = require('../handling/HandlingHistory');

/**
 * The central class in the domain model — root of the Cargo aggregate.
 *
 * A cargo is identified by a tracking ID and always has an origin and route specification.
 * Between booking and routing it has no itinerary. The itinerary is attached when the cargo
 * is assigned to a route. Delivery status is re-derived whenever routing or handling changes.
 */
class Cargo {
  /**
   * @param {TrackingId} trackingId
   * @param {RouteSpecification} routeSpecification
   * @param {Itinerary} [itinerary]
   */
  constructor(trackingId, routeSpecification, itinerary) {
    if (!trackingId) throw new Error('Tracking ID is required');
    if (!routeSpecification) throw new Error('Route specification is required');

    this._trackingId = trackingId.idString();
    this._origin = routeSpecification.origin();
    this._routeSpecification = routeSpecification;
    this._itinerary = itinerary || null;

    this._delivery = Delivery.derivedFrom(
      this._routeSpecification,
      this._itinerary,
      HandlingHistory.EMPTY
    );
  }

  /** @returns {TrackingId} */
  trackingId() { return new TrackingId(this._trackingId); }

  /** @returns {import('../location/Location')} */
  origin() { return this._origin; }

  /** @returns {Delivery} */
  delivery() { return this._delivery; }

  /** @returns {Itinerary|null} */
  itinerary() { return this._itinerary; }

  /** @returns {RouteSpecification} */
  routeSpecification() { return this._routeSpecification; }

  /**
   * Specifies a new route for this cargo.
   * @param {RouteSpecification} routeSpecification
   */
  specifyNewRoute(routeSpecification) {
    if (!routeSpecification) throw new Error('Route specification is required');
    this._routeSpecification = routeSpecification;
    this._delivery = this._delivery.updateOnRouting(this._routeSpecification, this._itinerary);
  }

  /**
   * Attach a new itinerary to this cargo.
   * @param {Itinerary} itinerary
   */
  assignToRoute(itinerary) {
    if (!itinerary) throw new Error('Itinerary is required for assignment');
    this._itinerary = itinerary;
    this._delivery = this._delivery.updateOnRouting(this._routeSpecification, this._itinerary);
  }

  /**
   * Re-derive delivery progress from full handling history.
   * @param {import('../handling/HandlingHistory')} handlingHistory
   */
  deriveDeliveryProgress(handlingHistory) {
    this._delivery = Delivery.derivedFrom(
      this._routeSpecification,
      this._itinerary,
      handlingHistory.filterOnCargo(new TrackingId(this._trackingId))
    );
  }

  sameIdentityAs(other) {
    return other instanceof Cargo && this._trackingId === other._trackingId;
  }

  equals(other) { return this.sameIdentityAs(other); }

  toString() { return this._trackingId; }
}

module.exports = Cargo;
