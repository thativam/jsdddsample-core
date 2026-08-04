import CargoTrackingViewAdapter from '../../../src/interfaces/tracking/CargoTrackingViewAdapter.js';
import Cargo              from '../../../src/domain/model/cargo/Cargo.js';
import TrackingId         from '../../../src/domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../src/domain/model/cargo/RouteSpecification.js';
import HandlingEvent      from '../../../src/domain/model/handling/HandlingEvent.js';
import HandlingHistory    from '../../../src/domain/model/handling/HandlingHistory.js';
import HandlingEventType  from '../../../src/domain/model/handling/HandlingEventType.js';
import { HANGZHOU, HELSINKI } from '../../../src/infrastructure/sampledata/SampleLocations.js';
import { v100 } from '../../../src/infrastructure/sampledata/SampleVoyages.js';

function makeCargo() {
  return Cargo(TrackingId('XYZ'), RouteSpecification(HANGZHOU, HELSINKI, new Date('2099-12-31')));
}

describe('CargoTrackingViewAdapter', () => {
  test('getTrackingId returns correct id', () => {
    const cargo   = makeCargo();
    const adapter = CargoTrackingViewAdapter(cargo, []);
    expect(adapter.getTrackingId()).toBe('XYZ');
  });

  test('getOrigin returns origin location name', () => {
    const cargo   = makeCargo();
    const adapter = CargoTrackingViewAdapter(cargo, []);
    expect(adapter.getOrigin()).toBe('Hangzhou');
  });

  test('getDestination returns destination name', () => {
    const cargo   = makeCargo();
    const adapter = CargoTrackingViewAdapter(cargo, []);
    expect(adapter.getDestination()).toBe('Helsinki');
  });

  test('getStatusText for IN_PORT shows last known location', () => {
    const cargo = makeCargo();
    const t1    = new Date(1);
    const t2    = new Date(2);
    const events = [
      HandlingEvent(cargo, t1, t2, HandlingEventType.RECEIVE, HANGZHOU),
      HandlingEvent(cargo, new Date(3), new Date(4), HandlingEventType.LOAD,    HANGZHOU, v100),
      HandlingEvent(cargo, new Date(5), new Date(6), HandlingEventType.UNLOAD,  HELSINKI, v100),
    ];
    cargo.deriveDeliveryProgress(HandlingHistory(events));

    const adapter = CargoTrackingViewAdapter(cargo, events);
    expect(adapter.getStatusText()).toBe('In port Helsinki');
  });

  test('getEvents returns one adapter per event', () => {
    const cargo  = makeCargo();
    const events = [
      HandlingEvent(cargo, new Date(1), new Date(2), HandlingEventType.RECEIVE, HANGZHOU),
      HandlingEvent(cargo, new Date(3), new Date(4), HandlingEventType.LOAD,    HANGZHOU, v100),
      HandlingEvent(cargo, new Date(5), new Date(6), HandlingEventType.UNLOAD,  HELSINKI, v100),
    ];
    cargo.deriveDeliveryProgress(HandlingHistory(events));

    const adapter      = CargoTrackingViewAdapter(cargo, events);
    const eventAdapters = adapter.getEvents();
    expect(eventAdapters).toHaveLength(3);
  });

  test('event adapter returns correct type, location, voyageNumber', () => {
    const cargo  = makeCargo();
    const events = [
      HandlingEvent(cargo, new Date(1), new Date(2), HandlingEventType.RECEIVE, HANGZHOU),
      HandlingEvent(cargo, new Date(3), new Date(4), HandlingEventType.LOAD,    HANGZHOU, v100),
      HandlingEvent(cargo, new Date(5), new Date(6), HandlingEventType.UNLOAD,  HELSINKI, v100),
    ];
    cargo.deriveDeliveryProgress(HandlingHistory(events));

    const [receive, load, unload] = CargoTrackingViewAdapter(cargo, events).getEvents();

    expect(receive.getType()).toBe('RECEIVE');
    expect(receive.getLocation()).toBe('Hangzhou');
    expect(receive.getVoyageNumber()).toBe('');

    expect(load.getType()).toBe('LOAD');
    expect(load.getLocation()).toBe('Hangzhou');
    expect(load.getVoyageNumber()).toBe(v100.voyageNumber().idString());

    expect(unload.getType()).toBe('UNLOAD');
    expect(unload.getLocation()).toBe('Helsinki');
    expect(unload.getVoyageNumber()).toBe(v100.voyageNumber().idString());
  });

  test('event adapter isExpected matches itinerary expectations', () => {
    const cargo  = makeCargo();
    const events = [
      HandlingEvent(cargo, new Date(1), new Date(2), HandlingEventType.RECEIVE, HANGZHOU),
    ];
    // No itinerary assigned → isExpected is false
    cargo.deriveDeliveryProgress(HandlingHistory(events));

    const adapter      = CargoTrackingViewAdapter(cargo, events);
    const [receiveEv]  = adapter.getEvents();
    // Without an assigned itinerary the receive event is not expected
    expect(receiveEv.isExpected()).toBe(false);
  });

  test('isMisdirected reflects delivery state', () => {
    const cargo   = makeCargo();
    const adapter = CargoTrackingViewAdapter(cargo, []);
    // No events loaded → not misdirected
    expect(adapter.isMisdirected()).toBe(false);
  });
});
