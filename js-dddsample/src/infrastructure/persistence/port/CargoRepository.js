'use strict';

/**
 * CargoRepository — port interface contract.
 *
 * All implementations MUST fulfil this contract exactly.
 * All methods are async (return Promise). In-memory wraps with Promise.resolve();
 * MongoDB/MySQL use their native async drivers.
 *
 * @interface
 *
 * find(trackingId: TrackingId): Promise<Cargo|null>
 *   Return the cargo with the given tracking id, or null if not found.
 *
 * store(cargo: Cargo): Promise<void>
 *   Persist (insert or update) a cargo aggregate.
 *
 * getAll(): Promise<Cargo[]>
 *   Return all persisted cargos.
 *
 * nextTrackingId(): Promise<TrackingId>
 *   Generate and return a new unique TrackingId.
 */

/**
 * Runtime guard — throws if an implementation is missing a required method.
 * Call this in container.js after building any repo to catch wiring mistakes early.
 *
 * @param {object} impl
 */
function assertCargoRepository(impl) {
  const required = ['find', 'store', 'getAll', 'nextTrackingId'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`CargoRepository implementation is missing method: ${method}`);
    }
  }
}

module.exports = { assertCargoRepository };
