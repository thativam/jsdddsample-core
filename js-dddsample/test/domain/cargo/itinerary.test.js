'use strict';

const Itinerary = require('../../../src/domain/model/cargo/Itinerary');
const Leg = require('../../../src/domain/model/cargo/Leg');
const HandlingEvent = require('../../../src/domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../src/domain/model/handling/HandlingEventType');
const Cargo = require('../../../src/domain/model/cargo/Cargo');
const TrackingId = require('../../../src/domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../src/domain/model/cargo/RouteSpecification');
const { HONGKONG, STOCKHOLM, MELBOURNE, NEWYORK, TOKYO } = require('../../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200 } = require('../../../src/infrastructure/sampledata/SampleVoyages');

function makeCargo() {
  return new Cargo(new TrackingId('TEST1'), new RouteSpecification(HONGKONG, STOCKHOLM, new Date('2009-12-31')));
}

// Itinerary: HONGKONG -[v100]-> NEWYORK -[v200]-> STOCKHOLM
function makeItinerary() {
  const leg1 = new Leg(v100, HONGKONG, NEWYORK, new Date('2009-03-03'), new Date('2009-03-09'));
  const leg2 = new Leg(v200, NEWYORK, STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16'));
  return new Itinerary([leg1, leg2]);
}

describe('Itinerary', () => {
  test('requires at least one leg', () => {
    expect(() => new Itinerary([])).toThrow();
    expect(() => new Itinerary(null)).toThrow();
  });

  test('initialDepartureLocation returns first leg load location', () => {
    expect(makeItinerary().initialDepartureLocation().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('finalArrivalLocation returns last leg unload location', () => {
    expect(makeItinerary().finalArrivalLocation().sameIdentityAs(STOCKHOLM)).toBe(true);
  });

  test('finalArrivalDate returns last leg unload time', () => {
    const eta = makeItinerary().finalArrivalDate();
    expect(eta.getTime()).toBe(new Date('2009-03-16').getTime());
  });

  describe('isExpected', () => {
    const cargo = makeCargo();
    const itinerary = makeItinerary();

    test('RECEIVE at origin is expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.RECEIVE, HONGKONG);
      expect(itinerary.isExpected(ev)).toBe(true);
    });

    test('RECEIVE at wrong location is not expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.RECEIVE, MELBOURNE);
      expect(itinerary.isExpected(ev)).toBe(false);
    });

    test('LOAD at correct leg is expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.LOAD, HONGKONG, v100);
      expect(itinerary.isExpected(ev)).toBe(true);
    });

    test('LOAD at wrong leg voyage is not expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.LOAD, HONGKONG, v200);
      expect(itinerary.isExpected(ev)).toBe(false);
    });

    test('UNLOAD at correct leg is expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.UNLOAD, NEWYORK, v100);
      expect(itinerary.isExpected(ev)).toBe(true);
    });

    test('CLAIM at final destination is expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.CLAIM, STOCKHOLM);
      expect(itinerary.isExpected(ev)).toBe(true);
    });

    test('CLAIM at non-final location is not expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.CLAIM, NEWYORK);
      expect(itinerary.isExpected(ev)).toBe(false);
    });

    test('CUSTOMS is always expected', () => {
      const ev = new HandlingEvent(cargo, new Date(), new Date(), HandlingEventType.CUSTOMS, NEWYORK);
      expect(itinerary.isExpected(ev)).toBe(true);
    });
  });
});
