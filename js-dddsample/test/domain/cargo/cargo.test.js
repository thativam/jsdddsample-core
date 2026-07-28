import Cargo              from '../../../src/domain/model/cargo/Cargo.js';
import TrackingId         from '../../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../src/domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../../src/domain/model/cargo/Itinerary.js';
import Leg                from '../../../src/domain/model/cargo/Leg.js';
import HandlingHistory    from '../../../src/domain/model/handling/HandlingHistory.js';
import HandlingEvent      from '../../../src/domain/model/handling/HandlingEvent.js';
import HandlingEventType  from '../../../src/domain/model/handling/HandlingEventType.js';
import RoutingStatus      from '../../../src/domain/model/cargo/RoutingStatus.js';
import TransportStatus    from '../../../src/domain/model/cargo/TransportStatus.js';
import { HONGKONG, STOCKHOLM, MELBOURNE, NEWYORK, HELSINKI } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100, v200, v300 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

const DEADLINE = new Date('2009-12-31');

function makeCargo(origin, dest) {
  return Cargo(
    TrackingId('TEST1'),
    RouteSpecification(origin || HONGKONG, dest || STOCKHOLM, DEADLINE)
  );
}

function goodItinerary() {
  return Itinerary([
    Leg(v100, HONGKONG, NEWYORK,   new Date('2009-03-03'), new Date('2009-03-09')),
    Leg(v200, NEWYORK,  STOCKHOLM, new Date('2009-03-14'), new Date('2009-03-16')),
  ]);
}

describe('Cargo', () => {
  test('constructor requires trackingId and routeSpec', () => {
    expect(() => Cargo(null, RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE))).toThrow();
    expect(() => Cargo(TrackingId('A1234'), null)).toThrow();
  });

  test('origin is locked at booking time', () => {
    const cargo = makeCargo(HONGKONG, STOCKHOLM);
    cargo.specifyNewRoute(RouteSpecification(MELBOURNE, STOCKHOLM, DEADLINE));
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
    cargo.specifyNewRoute(RouteSpecification(HONGKONG, HELSINKI, DEADLINE));
    expect(cargo.delivery().routingStatus()).toBe(RoutingStatus.MISROUTED);
  });

  test('sameIdentityAs compares by tracking ID', () => {
    const c1 = Cargo(TrackingId('ABC12'), RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE));
    const c2 = Cargo(TrackingId('ABC12'), RouteSpecification(MELBOURNE, STOCKHOLM, DEADLINE));
    const c3 = Cargo(TrackingId('XYZ99'), RouteSpecification(HONGKONG, STOCKHOLM, DEADLINE));
    expect(c1.sameIdentityAs(c2)).toBe(true);
    expect(c1.sameIdentityAs(c3)).toBe(false);
  });

  test('deriveDeliveryProgress updates transport status from handling', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const receiveEvent = HandlingEvent(cargo, t, t, HandlingEventType.RECEIVE, HONGKONG);
    cargo.deriveDeliveryProgress(HandlingHistory([receiveEvent]));
    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.IN_PORT);
    expect(cargo.delivery().lastKnownLocation().sameIdentityAs(HONGKONG)).toBe(true);

    const nea = cargo.delivery().nextExpectedActivity();
    expect(nea).not.toBeNull();
    expect(nea.type()).toBe(HandlingEventType.LOAD);
    expect(nea.location().sameIdentityAs(HONGKONG)).toBe(true);
  });

  test('LOAD event sets transport status to ONBOARD_CARRIER', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const ev = HandlingEvent(cargo, t, t, HandlingEventType.LOAD, HONGKONG, v100);
    cargo.deriveDeliveryProgress(HandlingHistory([ev]));

    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.ONBOARD_CARRIER);
    expect(cargo.delivery().currentVoyage().voyageNumber().idString()).toBe('V100');
  });

  test('CLAIM event sets transport status to CLAIMED', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-20');
    const ev = HandlingEvent(cargo, t, t, HandlingEventType.CLAIM, STOCKHOLM);
    cargo.deriveDeliveryProgress(HandlingHistory([ev]));

    expect(cargo.delivery().transportStatus()).toBe(TransportStatus.CLAIMED);
  });

  test('misdirected cargo detected', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-03');
    const ev = HandlingEvent(cargo, t, t, HandlingEventType.LOAD, HONGKONG, v300);
    cargo.deriveDeliveryProgress(HandlingHistory([ev]));

    expect(cargo.delivery().isMisdirected()).toBe(true);
  });

  test('unloaded at destination sets isUnloadedAtDestination', () => {
    const cargo = makeCargo();
    cargo.assignToRoute(goodItinerary());

    const t = new Date('2009-03-16');
    const ev = HandlingEvent(cargo, t, t, HandlingEventType.UNLOAD, STOCKHOLM, v200);
    cargo.deriveDeliveryProgress(HandlingHistory([ev]));

    expect(cargo.delivery().isUnloadedAtDestination()).toBe(true);
  });
});
