'use strict';

const HandlingHistory = require('../../../src/domain/model/handling/HandlingHistory');
const HandlingEvent = require('../../../src/domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../src/domain/model/handling/HandlingEventType');
const Cargo = require('../../../src/domain/model/cargo/Cargo');
const TrackingId = require('../../../src/domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../src/domain/model/cargo/RouteSpecification');
const { HONGKONG, STOCKHOLM, MELBOURNE } = require('../../../src/infrastructure/sampledata/SampleLocations');
const { v100 } = require('../../../src/infrastructure/sampledata/SampleVoyages');

function makeCargo(id) {
  return Cargo(TrackingId(id), RouteSpecification(HONGKONG, STOCKHOLM, new Date('2009-12-31')));
}

describe('HandlingHistory', () => {
  test('EMPTY history has no events', () => {
    expect(HandlingHistory.EMPTY.mostRecentlyCompletedEvent()).toBeNull();
    expect(HandlingHistory.EMPTY.distinctEventsByCompletionTime()).toHaveLength(0);
  });

  test('mostRecentlyCompletedEvent returns last by time', () => {
    const cargo = makeCargo('XYZ99');
    const t1 = new Date('2009-03-01');
    const t2 = new Date('2009-03-05');
    const t3 = new Date('2009-03-10');
    const e1 = HandlingEvent(cargo, t1, t1, HandlingEventType.RECEIVE, HONGKONG);
    const e2 = HandlingEvent(cargo, t2, t2, HandlingEventType.LOAD, HONGKONG, v100);
    const e3 = HandlingEvent(cargo, t3, t3, HandlingEventType.UNLOAD, STOCKHOLM, v100);

    const history = HandlingHistory([e3, e1, e2]); // intentionally unordered
    expect(history.mostRecentlyCompletedEvent().type()).toBe(HandlingEventType.UNLOAD);
  });

  test('distinctEventsByCompletionTime deduplicates', () => {
    const cargo = makeCargo('DUP01');
    const t = new Date('2009-03-01');
    const e = HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const history = HandlingHistory([e, e]);
    expect(history.distinctEventsByCompletionTime()).toHaveLength(1);
  });

  test('distinctEventsByCompletionTime sorts ascending', () => {
    const cargo = makeCargo('SRT01');
    const t1 = new Date('2009-03-01');
    const t2 = new Date('2009-03-05');
    const e1 = HandlingEvent(cargo, t1, t1, HandlingEventType.RECEIVE, HONGKONG);
    const e2 = HandlingEvent(cargo, t2, t2, HandlingEventType.LOAD, HONGKONG, v100);
    const history = HandlingHistory([e2, e1]);
    const sorted = history.distinctEventsByCompletionTime();
    expect(sorted[0].type()).toBe(HandlingEventType.RECEIVE);
    expect(sorted[1].type()).toBe(HandlingEventType.LOAD);
  });

  test('filterOnCargo returns only matching cargo events', () => {
    const cargo1 = makeCargo('AAA11');
    const cargo2 = makeCargo('BBB22');
    const t = new Date('2009-03-01');
    const e1 = HandlingEvent(cargo1, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const e2 = HandlingEvent(cargo2, t, t, HandlingEventType.RECEIVE, HONGKONG);
    const history = HandlingHistory([e1, e2]);
    const filtered = history.filterOnCargo(TrackingId('AAA11'));
    expect(filtered.distinctEventsByCompletionTime()).toHaveLength(1);
    expect(filtered.mostRecentlyCompletedEvent().cargo().trackingId().idString()).toBe('AAA11');
  });
});
