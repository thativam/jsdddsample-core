/**
 * ServiceContext — shared infrastructure bindings.
 *
 * Repositories are exposed as lazy-initializing proxies: the first call to any
 * repository method automatically runs createContainer() if it hasn't been run
 * yet, then delegates to the real repo. Subsequent calls are direct (no extra
 * cost once initialized).
 *
 * This "reversed responsibility" means no entrypoint is required to call
 * createContainer() explicitly — the repos initialize themselves on demand.
 * Callers that DO want eager initialization (e.g. the web server, to avoid
 * first-request latency) can still import bootstrap.js.
 *
 * Tests: call configure() in beforeEach with test repos. ensureInitialized()
 * sees the repos are already set and skips auto-init entirely.
 */

// ── Internal mutable state ────────────────────────────────────────────────────

const _repos = {
  cargoRepository:         null,
  handlingEventRepository: null,
  locationRepository:      null,
  voyageRepository:        null,
};

// ── Lazy initialization ───────────────────────────────────────────────────────

let _initPromise = null;

function ensureInitialized() {
  // configure() was already called (test setup or bootstrap) → nothing to do.
  if (_repos.cargoRepository !== null) return Promise.resolve();
  // Init already in flight → reuse the same promise (idempotent).
  if (_initPromise) return _initPromise;
  // First call: trigger bootstrap via dynamic import to avoid a static circular
  // dependency (container.js statically imports ServiceContext.js).
  _initPromise = import('./server/container.js')
    .then(({ createContainer }) => createContainer());
  return _initPromise;
}

// ── Lazy proxy factory ────────────────────────────────────────────────────────

function makeProxy(key) {
  return new Proxy({}, {
    get(_, method) {
      return (...args) => {
        const repo = _repos[key];
        if (repo !== null) {
          // Already configured — delegate directly, no extra microtask.
          // This preserves the timing behaviour of the old export-let live bindings,
          // which is relied on by synchronous-event-driven tests.
          return repo[method](...args);
        }
        // Not yet configured — trigger lazy init, then delegate.
        return ensureInitialized().then(() => {
          if (!_repos[key]) throw new Error(`${key} is not configured`);
          return _repos[key][method](...args);
        });
      };
    },
  });
}

// ── Exports ───────────────────────────────────────────────────────────────────

// Stable proxy objects — callers import these once; the proxy handles init.
export const cargoRepository         = makeProxy('cargoRepository');
export const handlingEventRepository = makeProxy('handlingEventRepository');
export const locationRepository      = makeProxy('locationRepository');
export const voyageRepository        = makeProxy('voyageRepository');

// Plain live bindings — always accessed after at least one repo call in the
// normal request flow, so init is guaranteed to be done by the time they're used.
export let applicationEvents = null;
export let routingService    = null;

// ── Configuration (called by container.js) ────────────────────────────────────

export function configure(repos, events) {
  _repos.cargoRepository         = repos.cargoRepository         ?? null;
  _repos.handlingEventRepository = repos.handlingEventRepository ?? null;
  _repos.locationRepository      = repos.locationRepository      ?? null;
  _repos.voyageRepository        = repos.voyageRepository        ?? null;
  applicationEvents              = events;
}

export function configureRouting(svc) {
  routingService = svc;
}
