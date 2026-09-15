import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const registry = new Registry();

collectDefaultMetrics({ register: registry });

// ── HTTP ──────────────────────────────────────────────────────────────────────

const httpRequestDuration = new Histogram({
  name:       'http_request_duration_seconds',
  help:       'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets:    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers:  [registry],
});

const httpRequestsTotal = new Counter({
  name:       'http_requests_total',
  help:       'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers:  [registry],
});

// ── Business ──────────────────────────────────────────────────────────────────

const cargoBookingsTotal = new Counter({
  name:      'cargo_bookings_total',
  help:      'Total number of cargo bookings created',
  registers: [registry],
});

const handlingEventsTotal = new Counter({
  name:       'handling_events_total',
  help:       'Total number of handling events registered',
  labelNames: ['type'],
  registers:  [registry],
});

const cargoInspectionsTotal = new Counter({
  name:      'cargo_inspections_total',
  help:      'Total number of cargo inspections triggered',
  registers: [registry],
});

export {
  registry,
  httpRequestDuration,
  httpRequestsTotal,
  cargoBookingsTotal,
  handlingEventsTotal,
  cargoInspectionsTotal,
};
