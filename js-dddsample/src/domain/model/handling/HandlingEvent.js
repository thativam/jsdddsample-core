'use strict';

const HandlingEventType = require('./HandlingEventType');
const Voyage = require('../voyage/Voyage');

/**
 * HandlingEvent aggregate root - records an actual handling of cargo.
 */
function HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage) {
  if (!cargo) throw new Error('Cargo is required');
  if (!completionTime) throw new Error('Completion time is required');
  if (!registrationTime) throw new Error('Registration time is required');
  if (!type) throw new Error('Handling event type is required');
  if (!location) throw new Error('Location is required');

  if (type.voyageRequired && !voyage) {
    throw new Error('Voyage is required for event type ' + type.name);
  }
  if (!type.voyageRequired && voyage) {
    throw new Error('Voyage is not allowed with event type ' + type.name);
  }

  var _completionTime   = completionTime instanceof Date ? completionTime : new Date(completionTime);
  var _registrationTime = registrationTime instanceof Date ? registrationTime : new Date(registrationTime);
  var _voyage = voyage || null;

  var event = {
    type:             function() { return type; },
    voyage:           function() { return _voyage || Voyage.NONE; },
    completionTime:   function() { return _completionTime; },
    registrationTime: function() { return _registrationTime; },
    location:         function() { return location; },
    cargo:            function() { return cargo; },

    sameEventAs: function(other) {
      if (other == null || typeof other.cargo !== 'function') return false;
      if (!cargo.sameIdentityAs(other.cargo())) return false;
      if (_completionTime.getTime() !== other.completionTime().getTime()) return false;
      if (!location.equals(other.location())) return false;
      if (type !== other.type()) return false;
      // Compare voyage IDs as strings: null and Voyage.NONE both produce ''
      var myId = _voyage ? _voyage.voyageNumber().idString() : '';
      var otherV = other.voyage();
      var otherId = (otherV && typeof otherV.voyageNumber === 'function')
        ? otherV.voyageNumber().idString()
        : '';
      return myId === otherId;
    },

    equals: function(other) { return this.sameEventAs(other); },

    toString: function() {
      var s = 'HandlingEvent[cargo=' + cargo.trackingId() + ', type=' + type.name + ', location=' + location + ', completed=' + _completionTime;
      if (_voyage) s += ', voyage=' + _voyage.voyageNumber();
      return s + ']';
    },
  };

  return event;
}

HandlingEvent.Type = HandlingEventType;

module.exports = HandlingEvent;
