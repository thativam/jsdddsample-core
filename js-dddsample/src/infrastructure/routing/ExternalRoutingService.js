'use strict';

const Itinerary = require('../../domain/model/cargo/Itinerary');
const Leg = require('../../domain/model/cargo/Leg');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const UnLocode = require('../../domain/model/location/UnLocode');

/**
 * Bridges our domain routing service to the graph traversal service (external context boundary).
 */
class ExternalRoutingService {
  constructor(graphTraversalService, locationRepository, voyageRepository) {
    this._graphTraversalService = graphTraversalService;
    this._locationRepository = locationRepository;
    this._voyageRepository = voyageRepository;
  }

  /**
   * @param {import('../../domain/model/cargo/RouteSpecification')} routeSpecification
   * @returns {Itinerary[]}
   */
  fetchRoutesForSpecification(routeSpecification) {
    const origin = routeSpecification.origin();
    const destination = routeSpecification.destination();

    const transitPaths = this._graphTraversalService.findShortestPath(
      origin.unLocode().idString(),
      destination.unLocode().idString(),
      { DEADLINE: routeSpecification.arrivalDeadline().toISOString() }
    );

    return transitPaths
      .map(path => this._toItinerary(path))
      .filter(it => it !== null)
      .filter(it => routeSpecification.isSatisfiedBy(it));
  }

  _toItinerary(transitPath) {
    try {
      const legs = transitPath.transitEdges.map(edge => this._toLeg(edge));
      return new Itinerary(legs);
    } catch (e) {
      return null;
    }
  }

  _toLeg(edge) {
    const voyage = this._voyageRepository.find(new VoyageNumber(edge.edge));
    const loadLoc = this._locationRepository.find(new UnLocode(edge.fromNode));
    const unloadLoc = this._locationRepository.find(new UnLocode(edge.toNode));
    if (!voyage || !loadLoc || !unloadLoc) return null;
    return new Leg(voyage, loadLoc, unloadLoc, edge.fromDate, edge.toDate);
  }
}

module.exports = ExternalRoutingService;
