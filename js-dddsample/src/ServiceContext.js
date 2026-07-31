/**
 * ServiceContext — live bindings populated by container.js at startup.
 *
 * ESM live bindings: any module that imports these names will see the
 * current value at call time (not at import time), so configure() must
 * be called before any of the three application functions are invoked.
 */

export let cargoRepository         = null;
export let handlingEventRepository = null;
export let locationRepository      = null;
export let voyageRepository        = null;
export let applicationEvents       = null;
export let routingService          = null;

export function configure(repos, events) {
  cargoRepository         = repos.cargoRepository         ?? null;
  handlingEventRepository = repos.handlingEventRepository ?? null;
  locationRepository      = repos.locationRepository      ?? null;
  voyageRepository        = repos.voyageRepository        ?? null;
  applicationEvents       = events;
}

export function configureRouting(svc) {
  routingService = svc;
}
