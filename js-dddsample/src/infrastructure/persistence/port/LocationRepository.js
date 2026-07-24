'use strict';

/**
 * LocationRepository — port interface contract.
 *
 * @interface
 *
 * find(unLocode: UnLocode): Promise<Location|null>
 * store(location: Location): Promise<void>
 * getAll(): Promise<Location[]>
 */

function assertLocationRepository(impl) {
  const required = ['find', 'store', 'getAll'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`LocationRepository implementation is missing method: ${method}`);
    }
  }
}

module.exports = { assertLocationRepository };
