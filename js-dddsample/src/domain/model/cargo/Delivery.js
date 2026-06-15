'use strict';

const RoutingStatus = require('./RoutingStatus');
const TransportStatus = require('./TransportStatus');
const HandlingActivity = require('./HandlingActivity');
const Location = require('../location/Location');
const Voyage = require('../voyage/Voyage');
const HandlingEventType = require('../handling/HandlingEventType');

/**
 * The actual transportation state of the cargo.
 * Derived from the route specification, itinerary and handling history.
 */
class Delivery {
  /**
   * @param {import('../handling/HandlingEvent')|null} lastEvent
   * @param {import('./Itinerary')|null} itinerary
   * @param {import('./RouteSpecification')} routeSpecification
   */
  constructor(lastEvent, itinerary, routeSpecification) {
    this._calculatedAt = new Date();
    this._lastEvent = lastEvent;

    this._misdirected = this._calculateMisdirectionStatus(itinerary);
    this._routingStatus = this._calculateRoutingStatus(itinerary, routeSpecification);
    this._transportStatus = this._calculateTransportStatus();
    this._lastKnownLocation = this._calculateLastKnownLocation();
    this._currentVoyage = this._calculateCurrentVoyage();
    this._eta = this._calculateEta(itinerary);
    this._nextExpectedActivity = this._calculateNextExpectedActivity(routeSpecification, itinerary);
    this._isUnloadedAtDestination = this._calculateUnloadedAtDestination(routeSpecification);
  }

  /**
   * Factory: create delivery when routing changes (no new handling).
   * @param {import('./RouteSpecification')} routeSpec
   * @param {import('./Itinerary')|null} itinerary
   * @returns {Delivery}
   */
  updateOnRouting(routeSpec, itinerary) {
    if (!routeSpec) throw new Error('Route specification is required');
    return new Delivery(this._lastEvent, itinerary, routeSpec);
  }

  /**
   * Factory: create from full handling history.
   * @param {import('./RouteSpecification')} routeSpec
   * @param {import('./Itinerary')|null} itinerary
   * @param {import('../handling/HandlingHistory')} handlingHistory
   * @returns {Delivery}
   */
  static derivedFrom(routeSpec, itinerary, handlingHistory) {
    if (!routeSpec) throw new Error('Route specification is required');
    if (!handlingHistory) throw new Error('Handling history is required');
    const lastEvent = handlingHistory.mostRecentlyCompletedEvent();
    return new Delivery(lastEvent, itinerary, routeSpec);
  }

  transportStatus()          { return this._transportStatus; }
  lastKnownLocation()        { return this._lastKnownLocation || Location.UNKNOWN; }
  currentVoyage()            { return this._currentVoyage || Voyage.NONE; }
  isMisdirected()            { return this._misdirected; }
  estimatedTimeOfArrival()   { return this._eta || null; }
  nextExpectedActivity()     { return this._nextExpectedActivity || null; }
  isUnloadedAtDestination()  { return this._isUnloadedAtDestination; }
  routingStatus()            { return this._routingStatus; }
  calculatedAt()             { return this._calculatedAt; }

  // ---- internal calculations ----

  _calculateTransportStatus() {
    if (!this._lastEvent) return TransportStatus.NOT_RECEIVED;
    switch (this._lastEvent.type()) {
      case HandlingEventType.LOAD:    return TransportStatus.ONBOARD_CARRIER;
      case HandlingEventType.UNLOAD:
      case HandlingEventType.RECEIVE:
      case HandlingEventType.CUSTOMS: return TransportStatus.IN_PORT;
      case HandlingEventType.CLAIM:   return TransportStatus.CLAIMED;
      default:                        return TransportStatus.UNKNOWN;
    }
  }

  _calculateLastKnownLocation() {
    return this._lastEvent ? this._lastEvent.location() : null;
  }

  _calculateCurrentVoyage() {
    if (this._calculateTransportStatus() === TransportStatus.ONBOARD_CARRIER && this._lastEvent) {
      return this._lastEvent.voyage();
    }
    return null;
  }

  _calculateMisdirectionStatus(itinerary) {
    if (!this._lastEvent || !itinerary) return false;
    return !itinerary.isExpected(this._lastEvent);
  }

  _calculateEta(itinerary) {
    if (this._onTrack()) return itinerary.finalArrivalDate();
    return null;
  }

  _calculateNextExpectedActivity(routeSpec, itinerary) {
    if (!this._onTrack()) return null;

    if (!this._lastEvent) {
      return new HandlingActivity(HandlingEventType.RECEIVE, routeSpec.origin());
    }

    const legs = itinerary.legs();
    switch (this._lastEvent.type()) {
      case HandlingEventType.LOAD: {
        for (const leg of legs) {
          if (leg.loadLocation().sameIdentityAs(this._lastEvent.location())) {
            return new HandlingActivity(HandlingEventType.UNLOAD, leg.unloadLocation(), leg.voyage());
          }
        }
        return null;
      }

      case HandlingEventType.UNLOAD: {
        for (let i = 0; i < legs.length; i++) {
          if (legs[i].unloadLocation().sameIdentityAs(this._lastEvent.location())) {
            if (i + 1 < legs.length) {
              const next = legs[i + 1];
              return new HandlingActivity(HandlingEventType.LOAD, next.loadLocation(), next.voyage());
            } else {
              return new HandlingActivity(HandlingEventType.CLAIM, legs[i].unloadLocation());
            }
          }
        }
        return null;
      }

      case HandlingEventType.RECEIVE: {
        const first = legs[0];
        return new HandlingActivity(HandlingEventType.LOAD, first.loadLocation(), first.voyage());
      }

      default:
        return null;
    }
  }

  _calculateRoutingStatus(itinerary, routeSpec) {
    if (!itinerary) return RoutingStatus.NOT_ROUTED;
    return routeSpec.isSatisfiedBy(itinerary) ? RoutingStatus.ROUTED : RoutingStatus.MISROUTED;
  }

  _calculateUnloadedAtDestination(routeSpec) {
    return this._lastEvent !== null &&
      this._lastEvent !== undefined &&
      this._lastEvent.type() === HandlingEventType.UNLOAD &&
      routeSpec.destination().sameIdentityAs(this._lastEvent.location());
  }

  _onTrack() {
    return this._routingStatus === RoutingStatus.ROUTED && !this._misdirected;
  }

  sameValueAs(other) {
    if (!(other instanceof Delivery)) return false;
    return this._transportStatus === other._transportStatus &&
      this._routingStatus === other._routingStatus &&
      this._misdirected === other._misdirected &&
      this._isUnloadedAtDestination === other._isUnloadedAtDestination;
  }

  equals(other) { return this.sameValueAs(other); }
}

module.exports = Delivery;
