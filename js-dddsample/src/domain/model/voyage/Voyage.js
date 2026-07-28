import VoyageNumber from './VoyageNumber.js';
import Schedule from './Schedule.js';
import CarrierMovement from './CarrierMovement.js';

function Voyage(voyageNumber, schedule) {
  if (!voyageNumber) throw new Error('Voyage number is required');
  if (!schedule) throw new Error('Schedule is required');
  const _num       = typeof voyageNumber.idString === 'function' ? voyageNumber.idString() : String(voyageNumber);
  const _movements = typeof schedule.carrierMovements === 'function' ? schedule.carrierMovements() : [];

  function voyageNumber_()    { return VoyageNumber(_num); }
  function schedule_()        { return Schedule(_movements); }
  function sameIdentityAs(other) {
    return other != null && typeof other.voyageNumber === 'function' && _num === other.voyageNumber().idString();
  }
  function equals(other)      { return sameIdentityAs(other); }
  function toString()         { return `Voyage ${_num}`; }

  return { voyageNumber: voyageNumber_, schedule: schedule_, sameIdentityAs, equals, toString };
}

Voyage.NONE = Voyage(VoyageNumber(''), Schedule.EMPTY);

function VoyageBuilder(voyageNumber, departureLocation) {
  if (!voyageNumber) throw new Error('Voyage number is required');
  if (!departureLocation) throw new Error('Departure location is required');
  const _movements = [];
  let _lastLocation = departureLocation;

  function addMovement(arrivalLocation, departureTime, arrivalTime) {
    _movements.push(CarrierMovement(_lastLocation, arrivalLocation, departureTime, arrivalTime));
    _lastLocation = arrivalLocation;
    return builder;
  }

  function build() {
    return Voyage(voyageNumber, Schedule(_movements));
  }

  const builder = { addMovement, build };
  return builder;
}

Voyage.Builder = VoyageBuilder;

export default Voyage;
