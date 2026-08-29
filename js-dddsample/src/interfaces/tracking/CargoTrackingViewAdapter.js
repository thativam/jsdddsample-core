import HandlingEventType from '../../domain/model/handling/HandlingEventType.js';
import TransportStatus   from '../../domain/model/cargo/TransportStatus.js';

function HandlingEventViewAdapter(locationName, completionTime, type, voyageNumber, isEventExpected) {
  function getLocation()     { return locationName; }
  function getTime()         { return completionTime.toISOString().slice(0, 16).replace('T', ' '); }
  function getType()         { return type.name; }
  function getVoyageNumber() { return voyageNumber; }
  function isExpected()      { return isEventExpected; }
  function getDescription() {
    const loc  = locationName;
    const time = completionTime.toISOString().slice(0, 10);
    switch (type) {
      case HandlingEventType.LOAD:    return `Loaded onto voyage ${voyageNumber} in ${loc} on ${time}.`;
      case HandlingEventType.UNLOAD:  return `Unloaded off voyage ${voyageNumber} in ${loc} on ${time}.`;
      case HandlingEventType.RECEIVE: return `Received in ${loc} on ${time}.`;
      case HandlingEventType.CLAIM:   return `Claimed in ${loc} on ${time}.`;
      case HandlingEventType.CUSTOMS: return `Customs inspection in ${loc} on ${time}.`;
      default: return '';
    }
  }
  return { getLocation, getTime, getType, getVoyageNumber, isExpected, getDescription };
}

/**
 * @param {string}  trackingId
 * @param {string}  originName
 * @param {string}  destinationName
 * @param {boolean} isMisdirectedFlag
 * @param {*}       transportStatus       TransportStatus value
 * @param {string}  lastKnownLocationName
 * @param {string}  currentVoyageNumber
 * @param {Date|null} eta
 * @param {{type, locationName: string, voyageNumber: string|null}|null} nextActivity
 * @param {ReturnType<typeof HandlingEventViewAdapter>[]} events
 */
function CargoTrackingViewAdapter(
  trackingId, originName, destinationName, isMisdirectedFlag,
  transportStatus, lastKnownLocationName, currentVoyageNumber,
  eta, nextActivity, events,
) {
  function getTrackingId()  { return trackingId; }
  function getDestination() { return destinationName; }
  function getOrigin()      { return originName; }
  function isMisdirected()  { return isMisdirectedFlag; }
  function getEvents()      { return events; }

  function getStatusText() {
    switch (transportStatus) {
      case TransportStatus.IN_PORT:         return `In port ${lastKnownLocationName}`;
      case TransportStatus.ONBOARD_CARRIER: return `Onboard voyage ${currentVoyageNumber}`;
      case TransportStatus.CLAIMED:         return 'Claimed';
      case TransportStatus.NOT_RECEIVED:    return 'Not received';
      default:                              return 'Unknown';
    }
  }

  function getEta() {
    if (!eta) return '?';
    return eta.toISOString().slice(0, 16).replace('T', ' ');
  }

  function getNextExpectedActivity() {
    if (!nextActivity) return '';
    const { type, locationName, voyageNumber } = nextActivity;
    const text = 'Next expected activity is to ';
    if (type === HandlingEventType.LOAD || type === HandlingEventType.UNLOAD) {
      return type === HandlingEventType.LOAD
        ? `${text}load cargo onto voyage ${voyageNumber} in ${locationName}`
        : `${text}unload cargo off of ${voyageNumber} in ${locationName}`;
    }
    return `${text}${type.name.toLowerCase()} cargo in ${locationName}`;
  }

  return { getTrackingId, getDestination, getOrigin, isMisdirected, getEvents, getStatusText, getEta, getNextExpectedActivity };
}

export { HandlingEventViewAdapter };
export default CargoTrackingViewAdapter;
