import { toDTO } from '../../../../src/interfaces/booking/assembler/CargoRoutingDTOAssembler.js';
import Cargo              from '../../../../src/domain/model/cargo/Cargo.js';
import TrackingId         from '../../../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../../src/domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../../../src/domain/model/cargo/Itinerary.js';
import Leg                from '../../../../src/domain/model/cargo/Leg.js';
import { STOCKHOLM, MELBOURNE, SHANGHAI, ROTTERDAM } from '../../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../../../src/infrastructure/sampledata/SampleVoyages.js';

const NOW = new Date();

function makeCargo() {
  return Cargo(new TrackingId('XYZ'), new RouteSpecification(STOCKHOLM, MELBOURNE, new Date('2099-12-31')));
}

describe('CargoRoutingDTOAssembler', () => {
  test('toDTO with itinerary serialises legs correctly', () => {
    const cargo = makeCargo();
    const itinerary = Itinerary([
      Leg(v100, STOCKHOLM,  SHANGHAI,  NOW, NOW),
      Leg(v100, ROTTERDAM,  MELBOURNE, NOW, NOW),
    ]);
    cargo.assignToRoute(itinerary);

    const dto = toDTO(cargo);

    expect(dto.legs).toHaveLength(2);

    const leg0 = dto.legs[0];
    expect(leg0.voyageNumber).toBe(v100.voyageNumber().idString());
    expect(leg0.from).toBe('SESTO');
    expect(leg0.to).toBe('CNSHA');

    const leg1 = dto.legs[1];
    expect(leg1.voyageNumber).toBe(v100.voyageNumber().idString());
    expect(leg1.from).toBe('NLRTM');
    expect(leg1.to).toBe('AUMEL');
  });

  test('toDTO without itinerary returns trackingId, origin, destination and empty legs', () => {
    const cargo = makeCargo();
    const dto   = toDTO(cargo);

    expect(dto.trackingId).toBe('XYZ');
    expect(dto.origin).toBe('SESTO');
    expect(dto.finalDestination).toBe('AUMEL');
    expect(dto.legs).toHaveLength(0);
    expect(dto.routed).toBe(false);
  });
});
