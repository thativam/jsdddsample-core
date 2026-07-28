import RoutingStatus     from './RoutingStatus.js';
import TransportStatus   from './TransportStatus.js';
import HandlingActivity  from './HandlingActivity.js';
import Location          from '../location/Location.js';
import Voyage            from '../voyage/Voyage.js';
import HandlingEventType from '../handling/HandlingEventType.js';

function Delivery(lastEvent, itinerary, routeSpecification) {

  function calcTransportStatus() {
    if (!lastEvent) return TransportStatus.NOT_RECEIVED;
    switch (lastEvent.type()) {
      case HandlingEventType.LOAD:    return TransportStatus.ONBOARD_CARRIER;
      case HandlingEventType.UNLOAD:
      case HandlingEventType.RECEIVE:
      case HandlingEventType.CUSTOMS: return TransportStatus.IN_PORT;
      case HandlingEventType.CLAIM:   return TransportStatus.CLAIMED;
      default:                        return TransportStatus.UNKNOWN;
    }
  }

  function calcLastKnownLocation() {
    return lastEvent ? lastEvent.location() : null;
  }

  function calcCurrentVoyage() {
    return (_transportStatus === TransportStatus.ONBOARD_CARRIER && lastEvent)
      ? lastEvent.voyage() : null;
  }

  function calcMisdirected() {
    if (!lastEvent || !itinerary) return false;
    return !itinerary.isExpected(lastEvent);
  }

  function calcRoutingStatus() {
    if (!itinerary) return RoutingStatus.NOT_ROUTED;
    return routeSpecification.isSatisfiedBy(itinerary) ? RoutingStatus.ROUTED : RoutingStatus.MISROUTED;
  }

  const _transportStatus = calcTransportStatus();
  const _misdirected     = calcMisdirected();
  const _routingStatus   = calcRoutingStatus();
  const _calculatedAt    = new Date();
  const _lastKnown       = calcLastKnownLocation();
  const _currentVoyage   = calcCurrentVoyage();

  function onTrack() {
    return _routingStatus === RoutingStatus.ROUTED && !_misdirected;
  }

  function calcEta() {
    return onTrack() ? itinerary.finalArrivalDate() : null;
  }

  function calcNextExpectedActivity() {
    if (!onTrack()) return null;
    if (!lastEvent) {
      return HandlingActivity(HandlingEventType.RECEIVE, routeSpecification.origin());
    }
    const legs = itinerary.legs();
    switch (lastEvent.type()) {
      case HandlingEventType.LOAD: {
        for (const leg of legs) {
          if (leg.loadLocation().sameIdentityAs(lastEvent.location())) {
            return HandlingActivity(HandlingEventType.UNLOAD, leg.unloadLocation(), leg.voyage());
          }
        }
        return null;
      }
      case HandlingEventType.UNLOAD: {
        for (let i = 0; i < legs.length; i++) {
          if (legs[i].unloadLocation().sameIdentityAs(lastEvent.location())) {
            if (i + 1 < legs.length) {
              const next = legs[i + 1];
              return HandlingActivity(HandlingEventType.LOAD, next.loadLocation(), next.voyage());
            }
            return HandlingActivity(HandlingEventType.CLAIM, legs[i].unloadLocation());
          }
        }
        return null;
      }
      case HandlingEventType.RECEIVE: {
        const first = legs[0];
        return HandlingActivity(HandlingEventType.LOAD, first.loadLocation(), first.voyage());
      }
      default:
        return null;
    }
  }

  function calcUnloadedAtDestination() {
    return lastEvent != null &&
      lastEvent.type() === HandlingEventType.UNLOAD &&
      routeSpecification.destination().sameIdentityAs(lastEvent.location());
  }

  const _eta                  = calcEta();
  const _nextExpectedActivity = calcNextExpectedActivity();
  const _isUnloadedAtDest     = calcUnloadedAtDestination();

  function transportStatus()        { return _transportStatus; }
  function lastKnownLocation()      { return _lastKnown || Location.UNKNOWN; }
  function currentVoyage()          { return _currentVoyage || Voyage.NONE; }
  function isMisdirected()          { return _misdirected; }
  function estimatedTimeOfArrival() { return _eta || null; }
  function nextExpectedActivity()   { return _nextExpectedActivity || null; }
  function isUnloadedAtDestination(){ return _isUnloadedAtDest; }
  function routingStatus()          { return _routingStatus; }
  function calculatedAt()           { return _calculatedAt; }

  function updateOnRouting(newRouteSpec, newItinerary) {
    if (!newRouteSpec) throw new Error('Route specification is required');
    return Delivery(lastEvent, newItinerary, newRouteSpec);
  }

  function sameValueAs(other) {
    if (!other || typeof other.routingStatus !== 'function') return false;
    return _transportStatus === other.transportStatus() &&
      _routingStatus === other.routingStatus() &&
      _misdirected === other.isMisdirected() &&
      _isUnloadedAtDest === other.isUnloadedAtDestination();
  }
  function equals(other) { return sameValueAs(other); }

  return { transportStatus, lastKnownLocation, currentVoyage, isMisdirected, estimatedTimeOfArrival, nextExpectedActivity, isUnloadedAtDestination, routingStatus, calculatedAt, updateOnRouting, sameValueAs, equals };
}

Delivery.derivedFrom = function(routeSpec, itinerary, handlingHistory) {
  if (!routeSpec) throw new Error('Route specification is required');
  if (!handlingHistory) throw new Error('Handling history is required');
  const lastEvent = handlingHistory.mostRecentlyCompletedEvent();
  return Delivery(lastEvent, itinerary, routeSpec);
};

export default Delivery;
