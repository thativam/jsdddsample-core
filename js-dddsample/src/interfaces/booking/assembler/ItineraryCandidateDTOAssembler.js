'use strict';

const Itinerary    = require('../../../domain/model/cargo/Itinerary');
const Leg          = require('../../../domain/model/cargo/Leg');
const VoyageNumber = require('../../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../../domain/model/location/UnLocode');

/**
 * Assembles RouteCandidateDTO from Itinerary and vice versa.
 * fromDTO receives individual lookup callbacks instead of repository objects.
 */

function toDTO(itinerary) {
  return {
    legs: itinerary.legs().map(leg => ({
      voyageNumber: leg.voyage().voyageNumber().idString(),
      from:         leg.loadLocation().unLocode().idString(),
      to:           leg.unloadLocation().unLocode().idString(),
      loadTime:     leg.loadTime(),
      unloadTime:   leg.unloadTime(),
    })),
  };
}

function fromDTO(dto, findVoyage, findLocation) {
  const legs = dto.legs.map(legDTO => {
    const voyage    = findVoyage(VoyageNumber(legDTO.voyageNumber));
    const loadLoc   = findLocation(UnLocode(legDTO.from));
    const unloadLoc = findLocation(UnLocode(legDTO.to));
    return Leg(voyage, loadLoc, unloadLoc, new Date(legDTO.loadTime), new Date(legDTO.unloadTime));
  });
  return Itinerary(legs);
}

module.exports = { toDTO, fromDTO };
