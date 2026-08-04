import TrackingId from '../../../src/domain/model/cargo/TrackingId.js';

describe('TrackingId', () => {
  test('rejects null', () => {
    expect(() => TrackingId(null)).toThrow();
  });

  test('rejects empty string', () => {
    expect(() => TrackingId('')).toThrow();
  });

  test('idString returns the id', () => {
    expect(TrackingId('ABC123').idString()).toBe('ABC123');
  });

  test('sameValueAs is true for same id', () => {
    expect(TrackingId('ABC').sameValueAs(TrackingId('ABC'))).toBe(true);
  });

  test('sameValueAs is false for different ids', () => {
    expect(TrackingId('ABC').sameValueAs(TrackingId('XYZ'))).toBe(false);
  });

  test('sameValueAs is false for null', () => {
    expect(TrackingId('ABC').sameValueAs(null)).toBe(false);
  });

  test('equals mirrors sameValueAs', () => {
    expect(TrackingId('ABC').equals(TrackingId('ABC'))).toBe(true);
    expect(TrackingId('ABC').equals(TrackingId('XYZ'))).toBe(false);
  });

  test('toString returns the id', () => {
    expect(TrackingId('T1').toString()).toBe('T1');
  });
});
