import Itinerary    from '../../domain/model/cargo/Itinerary.js';
import Leg          from '../../domain/model/cargo/Leg.js';
import VoyageNumber from '../../domain/model/voyage/VoyageNumber.js';
import UnLocode     from '../../domain/model/location/UnLocode.js';
import { findShortestPath } from './GraphTraversalService.js';
import { listAllNodes, getTransitEdge } from './GraphDAOStub.js';
import { locationRepository, voyageRepository } from '../../ServiceContext.js';

async function toLeg(edge) {
  const [voyage, loadLoc, unloadLoc] = await Promise.all([
    voyageRepository.find(VoyageNumber(edge.edge)),
    locationRepository.find(UnLocode(edge.fromNode)),
    locationRepository.find(UnLocode(edge.toNode)),
  ]);
  if (!voyage || !loadLoc || !unloadLoc) return null;
  return Leg(voyage, loadLoc, unloadLoc, edge.fromDate, edge.toDate);
}

async function toItinerary(transitPath) {
  try {
    const legs = (await Promise.all(
      transitPath.transitEdges.map(e => toLeg(e))
    )).filter(Boolean);
    if (legs.length === 0) return null;
    return Itinerary(legs);
  } catch (e) {
    return null;
  }
}

async function fetchRoutesForSpecification(routeSpecification) {
  const origin      = routeSpecification.origin();
  const destination = routeSpecification.destination();
  const transitPaths = findShortestPath(
    listAllNodes, getTransitEdge,
    origin.unLocode().idString(),
    destination.unLocode().idString(),
    { DEADLINE: routeSpecification.arrivalDeadline().toISOString() }
  );
  const itineraries = await Promise.all(
    transitPaths.map(tp => toItinerary(tp))
  );
  return itineraries
    .filter(it => it !== null)
    .filter(it => routeSpecification.isSatisfiedBy(it));
}

export { fetchRoutesForSpecification };
