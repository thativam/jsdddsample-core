'use strict';

const Itinerary    = require('../../../domain/model/cargo/Itinerary');
const Leg          = require('../../../domain/model/cargo/Leg');
const VoyageNumber = require('../../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../../domain/model/location/UnLocode');

/**
 * Assembles RouteCandidateDTO from Itinerary and vice versa.
 * Pure top-level functions — no factory wrapper.
 * fromDTO receives repositories as explicit parameters.
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

function fromDTO(dto, voyageRepository, locationRepository) {
  const legs = dto.legs.map(legDTO => {
    const voyage    = voyageRepository.find(VoyageNumber(legDTO.voyageNumber));
    const loadLoc   = locationRepository.find(UnLocode(legDTO.from));
    const unloadLoc = locationRepository.find(UnLocode(legDTO.to));
    return Leg(voyage, loadLoc, unloadLoc, new Date(legDTO.loadTime), new Date(legDTO.unloadTime));
  });
  return Itinerary(legs);
}

module.exports = { toDTO, fromDTO };
