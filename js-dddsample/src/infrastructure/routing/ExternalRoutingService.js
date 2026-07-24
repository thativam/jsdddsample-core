'use strict';

const Itinerary    = require('../../domain/model/cargo/Itinerary');
const Leg          = require('../../domain/model/cargo/Leg');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../domain/model/location/UnLocode');

/**
 * Anti-corruption layer: translates TransitPath/TransitEdge to Itinerary/Leg.
 * All find callbacks are async (repo methods).
 */

async function toLeg(findVoyage, findLocation, edge) {
  const [voyage, loadLoc, unloadLoc] = await Promise.all([
    findVoyage(VoyageNumber(edge.edge)),
    findLocation(UnLocode(edge.fromNode)),
    findLocation(UnLocode(edge.toNode)),
  ]);
  if (!voyage || !loadLoc || !unloadLoc) return null;
  return Leg(voyage, loadLoc, unloadLoc, edge.fromDate, edge.toDate);
}

async function toItinerary(findVoyage, findLocation, transitPath) {
  try {
    const legs = (await Promise.all(
      transitPath.transitEdges.map(e => toLeg(findVoyage, findLocation, e))
    )).filter(Boolean);
    if (legs.length === 0) return null;
    return Itinerary(legs);
  } catch (e) {
    return null;
  }
}

async function fetchRoutesForSpecification(findShortestPath, findLocation, findVoyage, routeSpecification) {
  const origin      = routeSpecification.origin();
  const destination = routeSpecification.destination();
  const transitPaths = findShortestPath(
    origin.unLocode().idString(),
    destination.unLocode().idString(),
    { DEADLINE: routeSpecification.arrivalDeadline().toISOString() }
  );
  const itineraries = await Promise.all(
    transitPaths.map(tp => toItinerary(findVoyage, findLocation, tp))
  );
  return itineraries
    .filter(it => it !== null)
    .filter(it => routeSpecification.isSatisfiedBy(it));
}

module.exports = { fetchRoutesForSpecification };
