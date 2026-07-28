function CarrierMovement(departureLocation, arrivalLocation, departureTime, arrivalTime) {
  if (!departureLocation || !arrivalLocation || !departureTime || !arrivalTime) {
    throw new Error('All CarrierMovement fields are required');
  }
  const _depTime = departureLocation instanceof Date ? departureTime : new Date(departureTime);
  const _arrTime = arrivalTime instanceof Date ? arrivalTime : new Date(arrivalTime);

  function departureLocation_() { return departureLocation; }
  function arrivalLocation_()   { return arrivalLocation; }
  function departureTime_()     { return _depTime; }
  function arrivalTime_()       { return _arrTime; }

  function sameValueAs(other) {
    return other != null &&
      typeof other.departureLocation === 'function' &&
      departureLocation.equals(other.departureLocation()) &&
      arrivalLocation.equals(other.arrivalLocation()) &&
      _depTime.getTime() === other.departureTime().getTime() &&
      _arrTime.getTime() === other.arrivalTime().getTime();
  }
  function equals(other) { return sameValueAs(other); }

  return { departureLocation: departureLocation_, arrivalLocation: arrivalLocation_, departureTime: departureTime_, arrivalTime: arrivalTime_, sameValueAs, equals };
}

export default CarrierMovement;
