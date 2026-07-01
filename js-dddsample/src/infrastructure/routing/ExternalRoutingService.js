'use strict';

const Itinerary    = require('../../domain/model/cargo/Itinerary');
const Leg          = require('../../domain/model/cargo/Leg');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../domain/model/location/UnLocode');

/**
 * Anti-corruption layer: translates TransitPath/TransitEdge (pathfinder context)
 * to Itinerary/Leg (cargo context).
 *
 * All functions are top-level; repositories are injected as first parameters.
 * Helper functions (toLeg, toItinerary) are also top-level with explicit dep params.
 *
 * Mirrors ExternalRoutingService.java.
 */

function toLeg(voyageRepository, locationRepository, edge) {
  const voyage    = voyageRepository.find(VoyageNumber(edge.edge));
  const loadLoc   = locationRepository.find(UnLocode(edge.fromNode));
  const unloadLoc = locationRepository.find(UnLocode(edge.toNode));
  if (!voyage || !loadLoc || !unloadLoc) return null;
  return Leg(voyage, loadLoc, unloadLoc, edge.fromDate, edge.toDate);
}

function toItinerary(voyageRepository, locationRepository, transitPath) {
  try {
    const legs = transitPath.transitEdges
      .map(e => toLeg(voyageRepository, locationRepository, e))
      .filter(Boolean);
    if (legs.length === 0) return null;
    return Itinerary(legs);
  } catch (e) {
    return null;
  }
}

function fetchRoutesForSpecification(graphTraversalService, locationRepository, voyageRepository, routeSpecification) {
  const origin      = routeSpecification.origin();
  const destination = routeSpecification.destination();
  const transitPaths = graphTraversalService.findShortestPath(
    origin.unLocode().idString(),
    destination.unLocode().idString(),
    { DEADLINE: routeSpecification.arrivalDeadline().toISOString() }
  );
  return transitPaths
    .map(tp => toItinerary(voyageRepository, locationRepository, tp))
    .filter(it => it !== null)
    .filter(it => routeSpecification.isSatisfiedBy(it));
}

module.exports = { fetchRoutesForSpecification };
