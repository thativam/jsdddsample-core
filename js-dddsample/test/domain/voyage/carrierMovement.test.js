import CarrierMovement from '../../../src/domain/model/voyage/CarrierMovement.js';
import { STOCKHOLM, HAMBURG } from '../../../src/infrastructure/sampledata/SampleLocations.js';

const T1 = new Date('2009-03-01');
const T2 = new Date('2009-03-05');

describe('CarrierMovement', () => {
  test('rejects null departureLocation', () => {
    expect(() => CarrierMovement(null, HAMBURG, T1, T2)).toThrow();
  });

  test('rejects null arrivalLocation', () => {
    expect(() => CarrierMovement(STOCKHOLM, null, T1, T2)).toThrow();
  });

  test('rejects null departureTime', () => {
    expect(() => CarrierMovement(STOCKHOLM, HAMBURG, null, T2)).toThrow();
  });

  test('rejects null arrivalTime', () => {
    expect(() => CarrierMovement(STOCKHOLM, HAMBURG, T1, null)).toThrow();
  });

  test('valid construction provides correct accessors', () => {
    const cm = CarrierMovement(STOCKHOLM, HAMBURG, T1, T2);
    expect(cm.departureLocation()).toBe(STOCKHOLM);
    expect(cm.arrivalLocation()).toBe(HAMBURG);
    expect(cm.departureTime().getTime()).toBe(T1.getTime());
    expect(cm.arrivalTime().getTime()).toBe(T2.getTime());
  });

  test('sameValueAs: same values → true', () => {
    const cm1 = CarrierMovement(STOCKHOLM, HAMBURG, T1, T2);
    const cm2 = CarrierMovement(STOCKHOLM, HAMBURG, new Date(T1.getTime()), new Date(T2.getTime()));
    expect(cm1.sameValueAs(cm2)).toBe(true);
    expect(cm1.equals(cm2)).toBe(true);
  });

  test('sameValueAs: different departure → false', () => {
    const cm1 = CarrierMovement(STOCKHOLM, HAMBURG, T1, T2);
    const cm2 = CarrierMovement(HAMBURG, STOCKHOLM, T1, T2);
    expect(cm1.sameValueAs(cm2)).toBe(false);
    expect(cm1.equals(cm2)).toBe(false);
  });

  test('sameValueAs: null → false', () => {
    const cm = CarrierMovement(STOCKHOLM, HAMBURG, T1, T2);
    expect(cm.sameValueAs(null)).toBe(false);
  });
});
