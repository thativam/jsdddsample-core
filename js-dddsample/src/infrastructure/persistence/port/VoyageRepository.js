'use strict';

/**
 * VoyageRepository — port interface contract.
 *
 * @interface
 *
 * find(voyageNumber: VoyageNumber): Promise<Voyage|null>
 * store(voyage: Voyage): Promise<void>
 */

function assertVoyageRepository(impl) {
  const required = ['find', 'store'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`VoyageRepository implementation is missing method: ${method}`);
    }
  }
}

module.exports = { assertVoyageRepository };
