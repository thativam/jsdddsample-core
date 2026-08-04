import Leg      from '../../../src/domain/model/cargo/Leg.js';
import Itinerary from '../../../src/domain/model/cargo/Itinerary.js';
import { HONGKONG, STOCKHOLM, NEWYORK } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100, v200 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

const LOAD   = new Date('2009-03-03');
const UNLOAD = new Date('2009-03-09');

describe('Leg', () => {
  test('rejects null voyage', () => {
    expect(() => Leg(null, HONGKONG, NEWYORK, LOAD, UNLOAD)).toThrow();
  });

  test('rejects null loadLocation', () => {
    expect(() => Leg(v100, null, NEWYORK, LOAD, UNLOAD)).toThrow();
  });

  test('rejects null unloadLocation', () => {
    expect(() => Leg(v100, HONGKONG, null, LOAD, UNLOAD)).toThrow();
  });

  test('rejects null loadTime', () => {
    expect(() => Leg(v100, HONGKONG, NEWYORK, null, UNLOAD)).toThrow();
  });

  test('rejects null unloadTime', () => {
    expect(() => Leg(v100, HONGKONG, NEWYORK, LOAD, null)).toThrow();
  });

  test('valid construction returns correct field values', () => {
    const leg = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    expect(leg.voyage()).toBe(v100);
    expect(leg.loadLocation()).toBe(HONGKONG);
    expect(leg.unloadLocation()).toBe(NEWYORK);
    expect(leg.loadTime().getTime()).toBe(LOAD.getTime());
    expect(leg.unloadTime().getTime()).toBe(UNLOAD.getTime());
  });

  test('sameValueAs is true for identical legs', () => {
    const leg1 = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    const leg2 = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    expect(leg1.sameValueAs(leg2)).toBe(true);
    expect(leg1.equals(leg2)).toBe(true);
  });

  test('sameValueAs is false when voyage differs', () => {
    const leg1 = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    const leg2 = Leg(v200, HONGKONG, NEWYORK, LOAD, UNLOAD);
    expect(leg1.sameValueAs(leg2)).toBe(false);
  });

  test('sameValueAs is false when location differs', () => {
    const leg1 = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    const leg2 = Leg(v100, HONGKONG, STOCKHOLM, LOAD, UNLOAD);
    expect(leg1.sameValueAs(leg2)).toBe(false);
  });

  test('sameValueAs is false when time differs', () => {
    const leg1 = Leg(v100, HONGKONG, NEWYORK, LOAD, UNLOAD);
    const leg2 = Leg(v100, HONGKONG, NEWYORK, new Date('2009-03-04'), UNLOAD);
    expect(leg1.sameValueAs(leg2)).toBe(false);
  });

  test('legs can be used to build an Itinerary', () => {
    const itinerary = Itinerary([
      Leg(v100, HONGKONG, NEWYORK,   LOAD, UNLOAD),
      Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-10'), new Date('2009-03-16')),
    ]);
    expect(itinerary.legs()).toHaveLength(2);
    expect(itinerary.initialDepartureLocation().sameIdentityAs(HONGKONG)).toBe(true);
    expect(itinerary.finalArrivalLocation().sameIdentityAs(STOCKHOLM)).toBe(true);
  });
});
