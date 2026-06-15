'use strict';

const Itinerary = require('../../../domain/model/cargo/Itinerary');
const Leg = require('../../../domain/model/cargo/Leg');
const VoyageNumber = require('../../../domain/model/voyage/VoyageNumber');
const UnLocode = require('../../../domain/model/location/UnLocode');

/**
 * Assembles RouteCandidateDTO from Itinerary and vice versa.
 */
class ItineraryCandidateDTOAssembler {
  /**
   * @param {import('../../../domain/model/cargo/Itinerary')} itinerary
   * @returns {object} RouteCandidateDTO
   */
  toDTO(itinerary) {
    return {
      legs: itinerary.legs().map(leg => ({
        voyageNumber: leg.voyage().voyageNumber().idString(),
        from: leg.loadLocation().unLocode().idString(),
        to: leg.unloadLocation().unLocode().idString(),
        loadTime: leg.loadTime(),
        unloadTime: leg.unloadTime(),
      })),
    };
  }

  /**
   * @param {object} dto - RouteCandidateDTO
   * @param {object} voyageRepository
   * @param {object} locationRepository
   * @returns {Itinerary}
   */
  fromDTO(dto, voyageRepository, locationRepository) {
    const legs = dto.legs.map(legDTO => {
      const voyage = voyageRepository.find(new VoyageNumber(legDTO.voyageNumber));
      const loadLoc = locationRepository.find(new UnLocode(legDTO.from));
      const unloadLoc = locationRepository.find(new UnLocode(legDTO.to));
      return new Leg(voyage, loadLoc, unloadLoc, new Date(legDTO.loadTime), new Date(legDTO.unloadTime));
    });
    return new Itinerary(legs);
  }
}

module.exports = ItineraryCandidateDTOAssembler;
