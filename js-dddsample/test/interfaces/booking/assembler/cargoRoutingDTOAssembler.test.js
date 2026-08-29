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
  return Cargo(TrackingId('XYZ'), RouteSpecification(STOCKHOLM, MELBOURNE, new Date('2099-12-31')));
}

function extractLegs(cargo) {
  const itinerary = cargo.itinerary();
  return itinerary ? itinerary.legs().map(leg => ({
    voyageNumber: leg.voyage().voyageNumber().idString(),
    from:         leg.loadLocation().unLocode().idString(),
    to:           leg.unloadLocation().unLocode().idString(),
    loadTime:     leg.loadTime(),
    unloadTime:   leg.unloadTime(),
  })) : [];
}

function cargoToDTO(cargo) {
  const legs = extractLegs(cargo);
  return toDTO(
    cargo.trackingId().idString(),
    cargo.origin().unLocode().idString(),
    cargo.routeSpecification().destination().unLocode().idString(),
    cargo.routeSpecification().arrivalDeadline(),
    legs,
    cargo.delivery().routingStatus() === 'MISROUTED',
  );
}

describe('CargoRoutingDTOAssembler', () => {
  test('toDTO with itinerary serialises legs correctly', () => {
    const cargo = makeCargo();
    const itinerary = Itinerary([
      Leg(v100, STOCKHOLM,  SHANGHAI,  NOW, NOW),
      Leg(v100, ROTTERDAM,  MELBOURNE, NOW, NOW),
    ]);
    cargo.assignToRoute(itinerary);

    const dto = cargoToDTO(cargo);

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
    const dto   = cargoToDTO(cargo);

    expect(dto.trackingId).toBe('XYZ');
    expect(dto.origin).toBe('SESTO');
    expect(dto.finalDestination).toBe('AUMEL');
    expect(dto.legs).toHaveLength(0);
    expect(dto.routed).toBe(false);
  });
});
