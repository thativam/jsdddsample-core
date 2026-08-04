import UnLocode from '../../../src/domain/model/location/UnLocode.js';

describe('UnLocode', () => {
  describe('valid codes are accepted', () => {
    test.each(['AA234', 'AAA9B', 'AAAAA'])('accepts %s', (code) => {
      expect(() => UnLocode(code)).not.toThrow();
      expect(UnLocode(code)).toBeDefined();
    });
  });

  describe('invalid codes are rejected', () => {
    test.each(['AAAA', 'AAAAAA', '22AAA', 'AA111'])('rejects %s', (code) => {
      expect(() => UnLocode(code)).toThrow();
    });
  });

  test('rejects null', () => {
    expect(() => UnLocode(null)).toThrow();
  });

  test('rejects empty string', () => {
    expect(() => UnLocode('')).toThrow();
  });

  test('idString normalises to uppercase', () => {
    expect(UnLocode('AbcDe').idString()).toBe('ABCDE');
  });

  test('sameValueAs is case-insensitive', () => {
    const allCaps   = UnLocode('ABCDE');
    const mixedCase = UnLocode('aBcDe');
    expect(allCaps.sameValueAs(mixedCase)).toBe(true);
    expect(mixedCase.sameValueAs(allCaps)).toBe(true);
  });

  test('sameValueAs: same code → true', () => {
    expect(UnLocode('ABCDE').sameValueAs(UnLocode('ABCDE'))).toBe(true);
  });

  test('sameValueAs: different code → false', () => {
    expect(UnLocode('ABCDE').sameValueAs(UnLocode('FGHIJ'))).toBe(false);
  });

  test('sameValueAs: null → false', () => {
    expect(UnLocode('ABCDE').sameValueAs(null)).toBe(false);
  });

  test('equals mirrors sameValueAs', () => {
    expect(UnLocode('ABCDE').equals(UnLocode('aBcDe'))).toBe(true);
    expect(UnLocode('ABCDE').equals(UnLocode('FGHIJ'))).toBe(false);
  });
});
