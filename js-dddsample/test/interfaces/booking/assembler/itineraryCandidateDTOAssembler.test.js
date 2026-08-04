import { toDTO, fromDTO } from '../../../../src/interfaces/booking/assembler/ItineraryCandidateDTOAssembler.js';
import Itinerary    from '../../../../src/domain/model/cargo/Itinerary.js';
import Leg          from '../../../../src/domain/model/cargo/Leg.js';
import LocationRepositoryInMem from '../../../../src/infrastructure/persistence/inmemory/LocationRepositoryInMem.js';
import VoyageRepositoryInMem   from '../../../../src/infrastructure/persistence/inmemory/VoyageRepositoryInMem.js';
import { configure as configureServiceContext } from '../../../../src/ServiceContext.js';
import { STOCKHOLM, SHANGHAI, ROTTERDAM, MELBOURNE } from '../../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../../../src/infrastructure/sampledata/SampleVoyages.js';

const NOW = new Date();

beforeEach(() => {
  configureServiceContext(
    {
      locationRepository: LocationRepositoryInMem(),
      voyageRepository:   VoyageRepositoryInMem(),
    },
    null
  );
});

describe('ItineraryCandidateDTOAssembler', () => {
  test('toDTO serialises legs with voyageNumber, from, to', () => {
    const itinerary = Itinerary([
      Leg(v100, STOCKHOLM, SHANGHAI,  NOW, NOW),
      Leg(v100, ROTTERDAM, MELBOURNE, NOW, NOW),
    ]);

    const dto = toDTO(itinerary);

    expect(dto.legs).toHaveLength(2);

    const leg0 = dto.legs[0];
    expect(leg0.voyageNumber).toBe(v100.voyageNumber().idString());
    expect(leg0.from).toBe('SESTO');
    expect(leg0.to).toBe('CNSHA');

    const leg1 = dto.legs[1];
    expect(leg1.from).toBe('NLRTM');
    expect(leg1.to).toBe('AUMEL');
  });

  test('fromDTO reconstructs itinerary with correct locations', async () => {
    // V100 goes HONGKONG → TOKYO → NEWYORK; use known in-mem locations
    const dto = {
      legs: [
        { voyageNumber: 'V100', from: 'CNHKG', to: 'JNTKO', loadTime: NOW, unloadTime: NOW },
        { voyageNumber: 'V100', from: 'JNTKO', to: 'USNYC', loadTime: NOW, unloadTime: NOW },
      ],
    };

    const itinerary = await fromDTO(dto);

    expect(itinerary).not.toBeNull();
    expect(itinerary.legs()).toHaveLength(2);

    const leg1 = itinerary.legs()[0];
    expect(leg1.loadLocation().unLocode().idString()).toBe('CNHKG');
    expect(leg1.unloadLocation().unLocode().idString()).toBe('JNTKO');

    const leg2 = itinerary.legs()[1];
    expect(leg2.loadLocation().unLocode().idString()).toBe('JNTKO');
    expect(leg2.unloadLocation().unLocode().idString()).toBe('USNYC');
  });
});
