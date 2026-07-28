import HandlingEvent     from '../../../src/domain/model/handling/HandlingEvent.js';
import HandlingEventType from '../../../src/domain/model/handling/HandlingEventType.js';
import Cargo             from '../../../src/domain/model/cargo/Cargo.js';
import TrackingId        from '../../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../src/domain/model/cargo/RouteSpecification.js';
import { HONGKONG, STOCKHOLM } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 }                from '../../../src/infrastructure/sampledata/SampleVoyages.js';

function makeCargo(id = 'TEST1') {
  return Cargo(
    TrackingId(id),
    RouteSpecification(HONGKONG, STOCKHOLM, new Date('2009-12-31'))
  );
}

describe('HandlingEvent', () => {
  const now = new Date();
  const cargo = makeCargo();

  test('creates a RECEIVE event (no voyage)', () => {
    const ev = HandlingEvent(cargo, now, now, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev.type()).toBe(HandlingEventType.RECEIVE);
    expect(ev.location()).toBe(HONGKONG);
  });

  test('creates a LOAD event (with voyage)', () => {
    const ev = HandlingEvent(cargo, now, now, HandlingEventType.LOAD, HONGKONG, v100);
    expect(ev.type()).toBe(HandlingEventType.LOAD);
    expect(ev.voyage()).toBe(v100);
  });

  test('LOAD without voyage throws', () => {
    expect(() => HandlingEvent(cargo, now, now, HandlingEventType.LOAD, HONGKONG)).toThrow();
  });

  test('RECEIVE with voyage throws', () => {
    expect(() => HandlingEvent(cargo, now, now, HandlingEventType.RECEIVE, HONGKONG, v100)).toThrow();
  });

  test('CLAIM without voyage is valid', () => {
    const ev = HandlingEvent(cargo, now, now, HandlingEventType.CLAIM, STOCKHOLM);
    expect(ev.type()).toBe(HandlingEventType.CLAIM);
  });

  test('CUSTOMS without voyage is valid', () => {
    const ev = HandlingEvent(cargo, now, now, HandlingEventType.CUSTOMS, STOCKHOLM);
    expect(ev.type()).toBe(HandlingEventType.CUSTOMS);
  });

  test('UNLOAD requires voyage', () => {
    expect(() => HandlingEvent(cargo, now, now, HandlingEventType.UNLOAD, STOCKHOLM)).toThrow();
    const ev = HandlingEvent(cargo, now, now, HandlingEventType.UNLOAD, STOCKHOLM, v100);
    expect(ev.type()).toBe(HandlingEventType.UNLOAD);
  });

  test('sameEventAs is true for identical events', () => {
    const t = new Date('2009-03-01');
    const ev1 = HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(true);
  });

  test('sameEventAs is false when type differs', () => {
    const t = new Date('2009-03-01');
    const ev1 = HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = HandlingEvent(cargo, t, t, HandlingEventType.CLAIM, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(false);
  });

  test('sameEventAs is false when time differs', () => {
    const ev1 = HandlingEvent(cargo, new Date('2009-03-01'), now, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = HandlingEvent(cargo, new Date('2009-03-02'), now, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(false);
  });

  test('cargo required', () => {
    expect(() => HandlingEvent(null, now, now, HandlingEventType.RECEIVE, HONGKONG)).toThrow();
  });

  test('HandlingEvent.Type alias works', () => {
    expect(HandlingEvent.Type.LOAD).toBe(HandlingEventType.LOAD);
  });
});
