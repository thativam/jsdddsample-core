'use strict';

const Cargo = require('../../../src/domain/model/cargo/Cargo');
const TrackingId = require('../../../src/domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../src/domain/model/cargo/RouteSpecification');
const Itinerary = require('../../../src/domain/model/cargo/Itinerary');
const Leg = require('../../../src/domain/model/cargo/Leg');
const HandlingHistory = require('../../../src/domain/model/handling/HandlingHistory');
const HandlingEvent = require('../../../src/domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../src/domain/model/handling/HandlingEventType');
const RoutingStatus = require('../../../src/domain/model/cargo/RoutingStatus');
const TransportStatus = require('../../../src/domain/model/cargo/TransportStatus');
const { HONGKONG, STOCKHOLM, MELBOURNE, NEWYORK, HELSINKI, CHICAGO } = require('../../../src/infrastructure/sampledata/SampleLocations');
const { v100, v200, v300, v400 } = require('../../../src/infrastructure/sampledata/SampleVoyages');

const DEADLINE = new Date('2009-12-31');

function makeCargo(origin, dest) {
  return new Cargo(
    new TrackingId('TEST1'),
    new RouteSpecification(origin || HONGKONG, dest || STOCKHOLM, DEADLINE)
  );
}

// Standard two-leg itinerary: HKG-[v100]->NYC-[v200]->STO
function goodItinerary() {
  return new Itinerary([
    new Leg(v100, HONGKONG, NEWYORK, new Date('2009-03-03'), new Date('2009-03-09')),
    new Leg(v200, NEWYORK, STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
  ]);
}

describe('Cargo', () => {
  test('constructor requires trackingId and routeSpec', () => {
    expect(() => new Cargo(null, new RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE))).toThrow();
    expect(() => new Cargo(new TrackingId('A1234'), null)).toThrow();
  });

  test('origin is locked at booking time', () => {
    const cargo = makeCargo(HONGKONG, STOCKHOLM);
    cargo.specifyNewRoute(new RouteSpecification(MELBOURNE, STOCKHOLM, DEADLINE));
    expect(cargo.origin().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('initial delivery is NOT_ROUTED', () => {
    const cargo = makeCargo();
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.NOT_ROUTED);
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.NOT_RECEIVED);
  });

  test('assignToRoute changes routingStatus to ROUTED', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.ROUTED);
  });

  test('specifyNewRoute with wrong destination causes MISROUTED', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());
    cargo.specifyNewRoute(new RouteSpecification(HONGKONG, HELSINKI, DEADLINE));
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });

  test('sameIdentityAs compares by tracking ID', () => {
    const c1 = new Cargo(new TrackingId('ABC12'), new RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE));
    const c2 = new Cargo(new TrackingId('ABC12'), new RouteSpecification(MELBOURNE, STOCKHOLM, DEADLINE));
    const c3 = new Cargo(new TrackingId('XYZ99'), new RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE));
    expect(c1.sameIdentityAs(c2)).toBe(true);
    expect(c1.sameIdentityAs(c3)).toBe(false);
  });

  test('deriveDeliveryProgress updates transport status from handling', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const receiveEvent = new HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    cargo.deriveDeliveryProgress(new HandlingHistory([receiveEvent]));
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(HONGKONG)).toBe(true);

    // nextExpectedActivity after RECEIVE: should be LOAD at first leg
    const nea = cargo.delivery().nextExpectedActivity();
    expect(nea).not.toBeNull();
    expect(nea.type()).toBe(HandlingEventType.LOAD);
    expect(nea.location().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('LOAD event sets transport status to ONBOARD_CARRIER', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const ev = new HandlingEvent(cargo, t, t, HandlingEventType.LOAD, HONGKONG, v100);
    cargo.deriveDeliveryProgress(new HandlingHistory([ev]));

    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V100');
  });

  test('CLAIM event sets transport status to CLAIMED', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-20');
    const ev = new HandlingEvent(cargo, t, t, HandlingEventType.CLAIM, STOCKHOLM);
    cargo.deriveDeliveryProgress(new HandlingHistory([ev]));

    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.CLAIMED);
  });

  test('misdirected cargo detected', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const ev = new HandlingEvent(cargo, t, t, HandlingEventType.LOAD, HONGKONG, v300);
    cargo.deriveDeliveryProgress(new HandlingHistory([ev]));

    expect(cargo.delivery().isMisdirected()).toBe(true);
  });

  test('unloaded at destination sets isUnloadedAtDestination', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-16');
    const ev = new HandlingEvent(cargo, t, t, HandlingEventType.UNLOAD, STOCKHOLM, v200);
    cargo.deriveDeliveryProgress(new HandlingHistory([ev]));

    expect(cargo.delivery().isUnloadedAtDestination()).toBe(true);
  });
});
