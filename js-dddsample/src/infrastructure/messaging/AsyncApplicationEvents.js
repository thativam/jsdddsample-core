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

function cargoWasHandled(emitter, event) {
  setImmediate(() => emitter.emit('cargoHandledQueue', event));
}

function cargoWasMisdirected(emitter, cargo) {
  setImmediate(() => emitter.emit('misdirectedCargoQueue', cargo));
}

function cargoHasArrived(emitter, cargo) {
  setImmediate(() => emitter.emit('deliveredCargoQueue', cargo));
}

export { createEmitter, on, emit, receivedHandlingEventRegistrationAttempt, cargoWasHandled, cargoWasMisdirected, cargoHasArrived };
