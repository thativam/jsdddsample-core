import {
  parseUnLocode,
  parseTrackingId,
  parseVoyageNumber,
  parseEventType,
  parseDate,
} from '../../../src/interfaces/handling/HandlingReportParser.js';
import HandlingEventType from '../../../src/domain/model/handling/HandlingEventType.js';

describe('HandlingReportParser — parseUnLocode', () => {
  test('null input throws with descriptive message', () => {
    expect(() => parseUnLocode(null)).toThrow('Failed to parse UNLO code: null');
  });

  test('empty input throws with descriptive message', () => {
    expect(() => parseUnLocode('')).toThrow('Failed to parse UNLO code: ');
  });

  test('invalid code throws with descriptive message', () => {
    expect(() => parseUnLocode('XXX')).toThrow('Failed to parse UNLO code: XXX');
  });

  test('valid code returns a UnLocode', () => {
    const result = parseUnLocode('SESTO');
    expect(result).not.toBeNull();
    expect(result.idString()).toBe('SESTO');
  });
});

describe('HandlingReportParser — parseTrackingId', () => {
  test('null throws with descriptive message', () => {
    expect(() => parseTrackingId(null)).toThrow('Failed to parse trackingId: null');
  });

  test('empty throws with descriptive message', () => {
    expect(() => parseTrackingId('')).toThrow('Failed to parse trackingId: ');
  });

  test('valid string returns a TrackingId', () => {
    const result = parseTrackingId('ABC123');
    expect(result).not.toBeNull();
    expect(result.idString()).toBe('ABC123');
  });
});

describe('HandlingReportParser — parseVoyageNumber', () => {
  test('null returns null', () => {
    expect(parseVoyageNumber(null)).toBeNull();
  });

  test('empty string returns null', () => {
    expect(parseVoyageNumber('')).toBeNull();
  });

  test('whitespace-only string returns null', () => {
    expect(parseVoyageNumber('   ')).toBeNull();
  });

  test('valid string returns a VoyageNumber', () => {
    const result = parseVoyageNumber('V100');
    expect(result).not.toBeNull();
    expect(result.idString()).toBe('V100');
  });
});

describe('HandlingReportParser — parseEventType', () => {
  test('empty string throws with descriptive message', () => {
    expect(() => parseEventType('')).toThrow('is not a valid handling event type');
  });

  test('invalid type throws with descriptive message', () => {
    expect(() => parseEventType('XXX')).toThrow('XXX is not a valid handling event type');
  });

  test.each(['LOAD', 'UNLOAD', 'RECEIVE', 'CLAIM', 'CUSTOMS'])(
    'valid type %s returns correct HandlingEventType', (typeName) => {
      const result = parseEventType(typeName);
      expect(result).not.toBeNull();
      expect(result.name).toBe(typeName);
    }
  );
});

describe('HandlingReportParser — parseDate', () => {
  test('null throws with descriptive message', () => {
    expect(() => parseDate(null)).toThrow('Invalid date format: null');
  });

  test('empty string throws with descriptive message', () => {
    expect(() => parseDate('')).toThrow('Invalid date format: ');
  });

  test('invalid string throws with descriptive message', () => {
    expect(() => parseDate('XXX')).toThrow('Invalid date format: XXX');
  });

  test('valid ISO-8601 string "2022-10-29 13:37" returns a Date', () => {
    const result = parseDate('2022-10-29 13:37');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });
});
