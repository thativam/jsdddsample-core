import { EventEmitter } from 'events';

function createEmitter() {
  return new EventEmitter();
}

function on(emitter, event, handler) {
  emitter.on(event, handler);
}

function emit(emitter, event, ...args) {
  emitter.emit(event, ...args);
}

function receivedHandlingEventRegistrationAttempt(emitter, attempt) {
  setImmediate(() => emitter.emit('handlingEventQueue', attempt));
}

function cargoWasHandled(emitter, eventData) {
  setImmediate(() => emitter.emit('cargoHandledQueue', eventData));
}

function cargoWasMisdirected(emitter, cargoTrackingId) {
  setImmediate(() => emitter.emit('misdirectedCargoQueue', cargoTrackingId));
}

function cargoHasArrived(emitter, cargoTrackingId) {
  setImmediate(() => emitter.emit('deliveredCargoQueue', cargoTrackingId));
}

export { createEmitter, on, emit, receivedHandlingEventRegistrationAttempt, cargoWasHandled, cargoWasMisdirected, cargoHasArrived };
