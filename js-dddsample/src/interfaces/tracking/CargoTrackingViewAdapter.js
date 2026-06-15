'use strict';

const HandlingEventType = require('../../domain/model/handling/HandlingEventType');
const TransportStatus = require('../../domain/model/cargo/TransportStatus');

/**
 * View adapter for displaying a cargo in the tracking UI.
 * Mirrors CargoTrackingViewAdapter.java — converts domain objects to view-friendly strings.
 */
class CargoTrackingViewAdapter {
  /**
   * @param {import('../../domain/model/cargo/Cargo')} cargo
   * @param {import('../../domain/model/handling/HandlingEvent')[]} handlingEvents
   */
  constructor(cargo, handlingEvents) {
    this._cargo = cargo;
    this._events = handlingEvents.map(e => new HandlingEventViewAdapter(cargo, e));
  }

  getTrackingId() { return this._cargo.trackingId().idString(); }

  getDestination() { return this._cargo.routeSpecification().destination().name(); }

  getOrigin() { return this._cargo.origin().name(); }

  getStatusText() {
    const delivery = this._cargo.delivery();
    switch (delivery.transportStatus()) {
      case TransportStatus.IN_PORT:
        return `In port ${delivery.lastKnownLocation().name()}`;
      case TransportStatus.ONBOARD_CARRIER:
        return `Onboard voyage ${delivery.currentVoyage().voyageNumber().idString()}`;
      case TransportStatus.CLAIMED:
        return 'Claimed';
      case TransportStatus.NOT_RECEIVED:
        return 'Not received';
      default:
        return 'Unknown';
    }
  }

  getEta() {
    const eta = this._cargo.delivery().estimatedTimeOfArrival();
    if (!eta) return '?';
    return eta.toISOString().slice(0, 16).replace('T', ' ');
  }

  getNextExpectedActivity() {
    const activity = this._cargo.delivery().nextExpectedActivity();
    if (!activity) return '';
    const type = activity.type();
    const loc = activity.location().name();
    const text = 'Next expected activity is to ';
    if (type === HandlingEventType.LOAD || type === HandlingEventType.UNLOAD) {
      const voy = activity.voyage() ? activity.voyage().voyageNumber().idString() : '';
      return type === HandlingEventType.LOAD
        ? `${text}load cargo onto voyage ${voy} in ${loc}`
        : `${text}unload cargo off of ${voy} in ${loc}`;
    }
    return `${text}${type.name.toLowerCase()} cargo in ${loc}`;
  }

  isMisdirected() { return this._cargo.delivery().isMisdirected(); }

  getEvents() { return this._events; }
}

class HandlingEventViewAdapter {
  constructor(cargo, handlingEvent) {
    this._cargo = cargo;
    this._event = handlingEvent;
  }

  getLocation() { return this._event.location().name(); }

  getTime() { return this._event.completionTime().toISOString().slice(0, 16).replace('T', ' '); }

  getType() { return this._event.type().name; }

  getVoyageNumber() {
    const voyage = this._event.voyage();
    return voyage ? voyage.voyageNumber().idString() : '';
  }

  isExpected() {
    const itinerary = this._cargo.itinerary();
    return itinerary ? itinerary.isExpected(this._event) : false;
  }

  getDescription() {
    const type = this._event.type();
    const loc = this._event.location().name();
    const time = this._event.completionTime().toISOString().slice(0, 10);
    switch (type) {
      case HandlingEventType.LOAD:
        return `Loaded onto voyage ${this._event.voyage().voyageNumber()} in ${loc} on ${time}.`;
      case HandlingEventType.UNLOAD:
        return `Unloaded off voyage ${this._event.voyage().voyageNumber()} in ${loc} on ${time}.`;
      case HandlingEventType.RECEIVE:
        return `Received in ${loc} on ${time}.`;
      case HandlingEventType.CLAIM:
        return `Claimed in ${loc} on ${time}.`;
      case HandlingEventType.CUSTOMS:
        return `Customs inspection in ${loc} on ${time}.`;
      default:
        return '';
    }
  }
}

module.exports = CargoTrackingViewAdapter;
