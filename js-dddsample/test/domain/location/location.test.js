import Location from '../../../src/domain/model/location/Location.js';
import UnLocode  from '../../../src/domain/model/location/UnLocode.js';

const ATEST = Location(UnLocode('ATEST'), 'test-name');
const TESTB = Location(UnLocode('TESTB'), 'other-name');

describe('Location', () => {
  test('sameIdentityAs: same UnLocode → true', () => {
    const a = Location(UnLocode('ATEST'), 'test-name');
    const b = Location(UnLocode('ATEST'), 'test-name');
    expect(a.sameIdentityAs(b)).toBe(true);
  });

  test('sameIdentityAs: different UnLocode → false', () => {
    expect(ATEST.sameIdentityAs(TESTB)).toBe(false);
  });

  test('sameIdentityAs: itself → true', () => {
    expect(ATEST.sameIdentityAs(ATEST)).toBe(true);
  });

  test('sameIdentityAs: null → false', () => {
    expect(ATEST.sameIdentityAs(null)).toBe(false);
  });

  test('equals mirrors sameIdentityAs', () => {
    const copy = Location(UnLocode('ATEST'), 'test-name');
    expect(ATEST.equals(copy)).toBe(true);
    expect(ATEST.equals(TESTB)).toBe(false);
  });

  test('UNKNOWN location exists and equals itself', () => {
    expect(Location.UNKNOWN).toBeDefined();
    expect(Location.UNKNOWN.sameIdentityAs(Location.UNKNOWN)).toBe(true);
  });

  test('name and unLocode accessors work', () => {
    const loc = Location(UnLocode('SESTO'), 'Stockholm');
    expect(loc.name()).toBe('Stockholm');
    expect(loc.unLocode().idString()).toBe('SESTO');
  });

  test('toString formats as "Name [CODE]"', () => {
    const loc = Location(UnLocode('SESTO'), 'Stockholm');
    expect(loc.toString()).toBe('Stockholm [SESTO]');
  });
});
