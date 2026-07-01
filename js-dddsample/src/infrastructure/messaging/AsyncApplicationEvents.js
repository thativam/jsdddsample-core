'use strict';

const EventEmitter = require('events');

/**
 * Async, EventEmitter-based ApplicationEvents — top-level independent functions.
 * The EventEmitter instance is the "state bean" — created via createEmitter()
 * and injected as the first parameter into every function.
 *
 * Mirrors Java's JmsApplicationEventsImpl.
 *
 *   Java JMS queue          → Node.js event
 *   ─────────────────────────────────────────
 *   handlingEventQueue      → 'handlingEventQueue'
 *   cargoHandledQueue       → 'cargoHandledQueue'
 *   misdirectedCargoQueue   → 'misdirectedCargoQueue'
 *   deliveredCargoQueue     → 'deliveredCargoQueue'
 */

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

module.exports = { createEmitter, on, emit, receivedHandlingEventRegistrationAttempt, cargoWasHandled, cargoWasMisdirected, cargoHasArrived };
