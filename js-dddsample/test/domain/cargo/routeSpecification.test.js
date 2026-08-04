import RouteSpecification from '../../../src/domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../../src/domain/model/cargo/Itinerary.js';
import Leg                from '../../../src/domain/model/cargo/Leg.js';
import { HONGKONG, NEWYORK, CHICAGO, HANGZHOU, DALLAS } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100, v200 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

// Itinerary: HONGKONG → NEWYORK → CHICAGO, final arrival 2009-02-20
const itinerary = Itinerary([
  Leg(v100, HONGKONG, NEWYORK, new Date('2009-02-01'), new Date('2009-02-10')),
  Leg(v200, NEWYORK,  CHICAGO, new Date('2009-02-12'), new Date('2009-02-20')),
]);

describe('RouteSpecification', () => {
  test('constructor requires origin', () => {
    expect(() => RouteSpecification(null, CHICAGO, new Date('2009-03-01'))).toThrow();
  });

  test('constructor requires destination', () => {
    expect(() => RouteSpecification(HONGKONG, null, new Date('2009-03-01'))).toThrow();
  });

  test('constructor requires arrivalDeadline', () => {
    expect(() => RouteSpecification(HONGKONG, CHICAGO, null)).toThrow();
  });

  test('isSatisfiedBy: correct origin, destination, deadline → true', () => {
    const spec = RouteSpecification(HONGKONG, CHICAGO, new Date('2009-03-01'));
    expect(spec.isSatisfiedBy(itinerary)).toBe(true);
  });

  test('isSatisfiedBy: wrong origin → false', () => {
    const spec = RouteSpecification(HANGZHOU, CHICAGO, new Date('2009-03-01'));
    expect(spec.isSatisfiedBy(itinerary)).toBe(false);
  });

  test('isSatisfiedBy: wrong destination → false', () => {
    const spec = RouteSpecification(HONGKONG, DALLAS, new Date('2009-03-01'));
    expect(spec.isSatisfiedBy(itinerary)).toBe(false);
  });

  test('isSatisfiedBy: deadline before final arrival → false', () => {
    // Final arrival is 2009-02-20; deadline 2009-02-15 is too early
    const spec = RouteSpecification(HONGKONG, CHICAGO, new Date('2009-02-15'));
    expect(spec.isSatisfiedBy(itinerary)).toBe(false);
  });

  test('isSatisfiedBy: null itinerary → false', () => {
    const spec = RouteSpecification(HONGKONG, CHICAGO, new Date('2009-03-01'));
    expect(spec.isSatisfiedBy(null)).toBe(false);
  });

  test('accessors return correct values', () => {
    const deadline = new Date('2009-03-01');
    const spec = RouteSpecification(HONGKONG, CHICAGO, deadline);
    expect(spec.origin()).toBe(HONGKONG);
    expect(spec.destination()).toBe(CHICAGO);
    expect(spec.arrivalDeadline().getTime()).toBe(deadline.getTime());
  });

  test('sameValueAs compares by value', () => {
    const deadline = new Date('2009-03-01');
    const spec1 = RouteSpecification(HONGKONG, CHICAGO, deadline);
    const spec2 = RouteSpecification(HONGKONG, CHICAGO, new Date(deadline.getTime()));
    const spec3 = RouteSpecification(HONGKONG, DALLAS,  deadline);
    expect(spec1.sameValueAs(spec2)).toBe(true);
    expect(spec1.sameValueAs(spec3)).toBe(false);
  });
});
