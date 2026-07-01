'use strict';

/**
 * Assembles CargoRoutingDTO from a Cargo domain object.
 * Pure top-level function — no dependencies, no factory wrapper.
 */

function toDTO(cargo) {
  const legs = [];
  const itinerary = cargo.itinerary();
  if (itinerary) {
    for (const leg of itinerary.legs()) {
      legs.push({
        voyageNumber: leg.voyage().voyageNumber().idString(),
        from:         leg.loadLocation().unLocode().idString(),
        to:           leg.unloadLocation().unLocode().idString(),
        loadTime:     leg.loadTime(),
        unloadTime:   leg.unloadTime(),
      });
    }
  }
  return {
    trackingId:       cargo.trackingId().idString(),
    origin:           cargo.origin().unLocode().idString(),
    finalDestination: cargo.routeSpecification().destination().unLocode().idString(),
    arrivalDeadline:  cargo.routeSpecification().arrivalDeadline(),
    legs,
    routed:    legs.length > 0,
    misrouted: cargo.delivery().routingStatus() === 'MISROUTED',
  };
}

module.exports = { toDTO };
