'use strict';

const { withCombinators } = require('../../shared/Specification');

/**
 * Route specification — a specification that an itinerary must satisfy.
 */
function RouteSpecification(origin, destination, arrivalDeadline) {
  if (!origin) throw new Error('Origin is required');
  if (!destination) throw new Error('Destination is required');
  if (!arrivalDeadline) throw new Error('Arrival deadline is required');

  const _deadline = arrivalDeadline instanceof Date ? arrivalDeadline : new Date(arrivalDeadline);

  function isSatisfiedBy(itinerary) {
    return itinerary != null &&
      origin.sameIdentityAs(itinerary.initialDepartureLocation()) &&
      destination.sameIdentityAs(itinerary.finalArrivalLocation()) &&
      _deadline > itinerary.finalArrivalDate();
  }

  function origin_()          { return origin; }
  function destination_()     { return destination; }
  function arrivalDeadline_() { return _deadline; }

  function sameValueAs(other) {
    return other != null &&
      typeof other.origin === 'function' &&
      origin.sameIdentityAs(other.origin()) &&
      destination.sameIdentityAs(other.destination()) &&
      _deadline.getTime() === other.arrivalDeadline().getTime();
  }
  function equals(other) { return sameValueAs(other); }

  return withCombinators({ isSatisfiedBy, origin: origin_, destination: destination_, arrivalDeadline: arrivalDeadline_, sameValueAs, equals });
}

module.exports = RouteSpecification;
