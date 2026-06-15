'use strict';

const HandlingEvent = require('../../../src/domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../src/domain/model/handling/HandlingEventType');
const Cargo = require('../../../src/domain/model/cargo/Cargo');
const TrackingId = require('../../../src/domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../src/domain/model/cargo/RouteSpecification');
const { HONGKONG, MELBOURNE, STOCKHOLM, HELSINKI } = require('../../../src/infrastructure/sampledata/SampleLocations');
const { v100 } = require('../../../src/infrastructure/sampledata/SampleVoyages');

function makeCargo(id = 'TEST1') {
  return new Cargo(
    new TrackingId(id),
    new RouteSpecification(HONGKONG, STOCKHOLM, new Date('2009-12-31'))
  );
}

describe('HandlingEvent', () => {
  const now = new Date();
  const cargo = makeCargo();

  test('creates a RECEIVE event (no voyage)', () => {
    const ev = new HandlingEvent(cargo, now, now, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev.type()).toBe(HandlingEventType.RECEIVE);
    expect(ev.location()).toBe(HONGKONG);
  });

  test('creates a LOAD event (with voyage)', () => {
    const ev = new HandlingEvent(cargo, now, now, HandlingEventType.LOAD, HONGKONG, v100);
    expect(ev.type()).toBe(HandlingEventType.LOAD);
    expect(ev.voyage()).toBe(v100);
  });

  test('LOAD without voyage throws', () => {
    expect(() => new HandlingEvent(cargo, now, now, HandlingEventType.LOAD, HONGKONG))
      .toThrow();
  });

  test('RECEIVE with voyage throws', () => {
    expect(() => new HandlingEvent(cargo, now, now, HandlingEventType.RECEIVE, HONGKONG, v100))
      .toThrow();
  });

  test('CLAIM without voyage is valid', () => {
    const ev = new HandlingEvent(cargo, now, now, HandlingEventType.CLAIM, STOCKHOLM);
    expect(ev.type()).toBe(HandlingEventType.CLAIM);
  });

  test('CUSTOMS without voyage is valid', () => {
    const ev = new HandlingEvent(cargo, now, now, HandlingEventType.CUSTOMS, STOCKHOLM);
    expect(ev.type()).toBe(HandlingEventType.CUSTOMS);
  });

  test('UNLOAD requires voyage', () => {
    expect(() => new HandlingEvent(cargo, now, now, HandlingEventType.UNLOAD, STOCKHOLM))
      .toThrow();
    const ev = new HandlingEvent(cargo, now, now, HandlingEventType.UNLOAD, STOCKHOLM, v100);
    expect(ev.type()).toBe(HandlingEventType.UNLOAD);
  });

  test('sameEventAs is true for identical events', () => {
    const t = new Date('2009-03-01');
    const ev1 = new HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = new HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(true);
  });

  test('sameEventAs is false when type differs', () => {
    const t = new Date('2009-03-01');
    const ev1 = new HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = new HandlingEvent(cargo, t, t, HandlingEventType.CLAIM, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(false);
  });

  test('sameEventAs is false when time differs', () => {
    const ev1 = new HandlingEvent(cargo, new Date('2009-03-01'), now, HandlingEventType.RECEIVE, HONGKONG);
    const ev2 = new HandlingEvent(cargo, new Date('2009-03-02'), now, HandlingEventType.RECEIVE, HONGKONG);
    expect(ev1.sameEventAs(ev2)).toBe(false);
  });

  test('cargo required', () => {
    expect(() => new HandlingEvent(null, now, now, HandlingEventType.RECEIVE, HONGKONG)).toThrow();
  });

  test('HandlingEvent.Type alias works', () => {
    expect(HandlingEvent.Type.LOAD).toBe(HandlingEventType.LOAD);
  });
});
