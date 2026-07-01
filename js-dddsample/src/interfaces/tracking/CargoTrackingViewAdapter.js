'use strict';

const HandlingEventType = require('../../domain/model/handling/HandlingEventType');
const TransportStatus   = require('../../domain/model/cargo/TransportStatus');

/**
 * View adapter for a single handling event in the tracking UI.
 */
function HandlingEventViewAdapter(cargo, handlingEvent) {

  function getLocation() {
    return handlingEvent.location().name();
  }

  function getTime() {
    return handlingEvent.completionTime().toISOString().slice(0, 16).replace('T', ' ');
  }

  function getType() {
    return handlingEvent.type().name;
  }

  function getVoyageNumber() {
    const v = handlingEvent.voyage();
    return v ? v.voyageNumber().idString() : '';
  }

  function isExpected() {
    const itinerary = cargo.itinerary();
    return itinerary ? itinerary.isExpected(handlingEvent) : false;
  }

  function getDescription() {
    const type = handlingEvent.type();
    const loc  = handlingEvent.location().name();
    const time = handlingEvent.completionTime().toISOString().slice(0, 10);
    switch (type) {
      case HandlingEventType.LOAD:    return `Loaded onto voyage ${handlingEvent.voyage().voyageNumber()} in ${loc} on ${time}.`;
      case HandlingEventType.UNLOAD:  return `Unloaded off voyage ${handlingEvent.voyage().voyageNumber()} in ${loc} on ${time}.`;
      case HandlingEventType.RECEIVE: return `Received in ${loc} on ${time}.`;
      case HandlingEventType.CLAIM:   return `Claimed in ${loc} on ${time}.`;
      case HandlingEventType.CUSTOMS: return `Customs inspection in ${loc} on ${time}.`;
      default: return '';
    }
  }

  return { getLocation, getTime, getType, getVoyageNumber, isExpected, getDescription };
}

/**
 * View adapter for the cargo tracking UI.
 */
function CargoTrackingViewAdapter(cargo, handlingEvents) {
  const _events = handlingEvents.map(e => HandlingEventViewAdapter(cargo, e));

  function getTrackingId() {
    return cargo.trackingId().idString();
  }

  function getDestination() {
    return cargo.routeSpecification().destination().name();
  }

  function getOrigin() {
    return cargo.origin().name();
  }

  function isMisdirected() {
    return cargo.delivery().isMisdirected();
  }

  function getEvents() {
    return _events;
  }

  function getStatusText() {
    const delivery = cargo.delivery();
    switch (delivery.transportStatus()) {
      case TransportStatus.IN_PORT:         return `In port ${delivery.lastKnownLocation().name()}`;
      case TransportStatus.ONBOARD_CARRIER: return `Onboard voyage ${delivery.currentVoyage().voyageNumber().idString()}`;
      case TransportStatus.CLAIMED:         return 'Claimed';
      case TransportStatus.NOT_RECEIVED:    return 'Not received';
      default:                              return 'Unknown';
    }
  }

  function getEta() {
    const eta = cargo.delivery().estimatedTimeOfArrival();
    if (!eta) return '?';
    return eta.toISOString().slice(0, 16).replace('T', ' ');
  }

  function getNextExpectedActivity() {
    const activity = cargo.delivery().nextExpectedActivity();
    if (!activity) return '';
    const type = activity.type();
    const loc  = activity.location().name();
    const text = 'Next expected activity is to ';
    if (type === HandlingEventType.LOAD || type === HandlingEventType.UNLOAD) {
      const voy = activity.voyage() ? activity.voyage().voyageNumber().idString() : '';
      return type === HandlingEventType.LOAD
        ? `${text}load cargo onto voyage ${voy} in ${loc}`
        : `${text}unload cargo off of ${voy} in ${loc}`;
    }
    return `${text}${type.name.toLowerCase()} cargo in ${loc}`;
  }

  return { getTrackingId, getDestination, getOrigin, isMisdirected, getEvents, getStatusText, getEta, getNextExpectedActivity };
}

module.exports = CargoTrackingViewAdapter;
