import Location from '../location/Location.js';
import HandlingEventType from '../handling/HandlingEventType.js';

function Itinerary(legs) {
  if (!legs) throw new Error('Legs list is required');
  if (legs.length === 0) throw new Error('Itinerary must have at least one leg');
  const _legs = [...legs];

  function lastLeg() {
    return _legs.length === 0 ? null : _legs[_legs.length - 1];
  }

  function legs_() { return [..._legs]; }
  function initialDepartureLocation() { return _legs.length === 0 ? Location.UNKNOWN : _legs[0].loadLocation(); }
  function finalArrivalLocation()     { return _legs.length === 0 ? Location.UNKNOWN : lastLeg().unloadLocation(); }
  function finalArrivalDate()         { return lastLeg() ? lastLeg().unloadTime() : new Date(8640000000000000); }

  function isExpected(event) {
    if (_legs.length === 0) return true;
    const T = HandlingEventType;
    if (event.type() === T.RECEIVE) {
      return _legs[0].loadLocation().equals(event.location());
    }
    if (event.type() === T.LOAD) {
      return _legs.some(leg =>
        leg.loadLocation().sameIdentityAs(event.location()) &&
        leg.voyage().sameIdentityAs(event.voyage())
      );
    }
    if (event.type() === T.UNLOAD) {
      return _legs.some(leg =>
        leg.unloadLocation().equals(event.location()) &&
        leg.voyage().equals(event.voyage())
      );
    }
    if (event.type() === T.CLAIM) {
      return lastLeg().unloadLocation().equals(event.location());
    }
    return true;
  }

  function sameValueAs(other) {
    if (!other || typeof other.legs !== 'function') return false;
    const ol = other.legs();
    if (_legs.length !== ol.length) return false;
    return _legs.every((l, i) => l.equals(ol[i]));
  }
  function equals(other) { return sameValueAs(other); }

  return { legs: legs_, lastLeg, initialDepartureLocation, finalArrivalLocation, finalArrivalDate, isExpected, sameValueAs, equals };
}

Itinerary.EMPTY_ITINERARY = null;

export default Itinerary;
