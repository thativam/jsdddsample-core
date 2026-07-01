'use strict';

const TrackingId = require('./TrackingId');
const Delivery   = require('./Delivery');

/**
 * Cargo aggregate root.
 */
function Cargo(trackingId, routeSpecification, itinerary) {
  if (!trackingId) throw new Error('Tracking ID is required');
  if (!routeSpecification) throw new Error('Route specification is required');

  const HandlingHistory = require('../handling/HandlingHistory');

  const _id     = typeof trackingId.idString === 'function' ? trackingId.idString() : String(trackingId);
  const _origin = routeSpecification.origin();

  let _routeSpec = routeSpecification;
  let _itinerary = itinerary || null;
  let _delivery  = Delivery.derivedFrom(_routeSpec, _itinerary, HandlingHistory.EMPTY);

  function trackingId_()         { return TrackingId(_id); }
  function origin()              { return _origin; }
  function delivery()            { return _delivery; }
  function itinerary_()          { return _itinerary; }
  function routeSpecification_() { return _routeSpec; }

  function specifyNewRoute(newRouteSpec) {
    if (!newRouteSpec) throw new Error('Route specification is required');
    _routeSpec = newRouteSpec;
    _delivery  = _delivery.updateOnRouting(_routeSpec, _itinerary);
  }

  function assignToRoute(newItinerary) {
    if (!newItinerary) throw new Error('Itinerary is required for assignment');
    _itinerary = newItinerary;
    _delivery  = _delivery.updateOnRouting(_routeSpec, _itinerary);
  }

  function deriveDeliveryProgress(handlingHistory) {
    _delivery = Delivery.derivedFrom(_routeSpec, _itinerary,
      handlingHistory.filterOnCargo(TrackingId(_id)));
  }

  function sameIdentityAs(other) {
    return other != null && typeof other.trackingId === 'function' && _id === other.trackingId().idString();
  }
  function equals(other) { return sameIdentityAs(other); }
  function toString()    { return _id; }

  return { trackingId: trackingId_, origin, delivery, itinerary: itinerary_, routeSpecification: routeSpecification_, specifyNewRoute, assignToRoute, deriveDeliveryProgress, sameIdentityAs, equals, toString };
}

module.exports = Cargo;
