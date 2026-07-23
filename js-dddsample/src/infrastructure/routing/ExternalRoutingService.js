'use strict';

const Itinerary    = require('../../domain/model/cargo/Itinerary');
const Leg          = require('../../domain/model/cargo/Leg');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../domain/model/location/UnLocode');

/**
 * Anti-corruption layer: translates TransitPath/TransitEdge to Itinerary/Leg.
 * All functions receive individual callbacks instead of repository/service objects.
 *
 *   findShortestPath = graphTraversalService.findShortestPath (bound)
 *   findVoyage       = voyageRepository.find
 *   findLocation     = locationRepository.find
 *
 * Mirrors ExternalRoutingService.java.
 */

function toLeg(findVoyage, findLocation, edge) {
  const voyage    = findVoyage(VoyageNumber(edge.edge));
  const loadLoc   = findLocation(UnLocode(edge.fromNode));
  const unloadLoc = findLocation(UnLocode(edge.toNode));
  if (!voyage || !loadLoc || !unloadLoc) return null;
  return Leg(voyage, loadLoc, unloadLoc, edge.fromDate, edge.toDate);
}

function toItinerary(findVoyage, findLocation, transitPath) {
  try {
    const legs = transitPath.transitEdges
      .map(e => toLeg(findVoyage, findLocation, e))
      .filter(Boolean);
    if (legs.length === 0) return null;
    return Itinerary(legs);
  } catch (e) {
    return null;
  }
}

function fetchRoutesForSpecification(findShortestPath, findLocation, findVoyage, routeSpecification) {
  const origin      = routeSpecification.origin();
  const destination = routeSpecification.destination();
  const transitPaths = findShortestPath(
    origin.unLocode().idString(),
    destination.unLocode().idString(),
    { DEADLINE: routeSpecification.arrivalDeadline().toISOString() }
  );
  return transitPaths
    .map(tp => toItinerary(findVoyage, findLocation, tp))
    .filter(it => it !== null)
    .filter(it => routeSpecification.isSatisfiedBy(it));
}

module.exports = { fetchRoutesForSpecification };
