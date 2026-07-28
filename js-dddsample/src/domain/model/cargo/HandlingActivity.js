function HandlingActivity(type, location, voyage) {

  function type_()     { return type; }
  function location_() { return location; }
  function voyage_()   { return voyage || null; }

  function sameValueAs(other) {
    return other != null &&
      typeof other.type === 'function' &&
      type === other.type() &&
      location.equals(other.location());
  }
  function equals(other) { return sameValueAs(other); }

  return { type: type_, location: location_, voyage: voyage_, sameValueAs, equals };
}

export default HandlingActivity;
