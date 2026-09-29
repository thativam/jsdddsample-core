import { Counter } from 'prom-client';

// Business counters on the global prom-client registry (no `registers` key).
// prom-bundle (distributed) and metricsRoutes.js (monolith) both serve the
// global registry, so these counters appear in /metrics on every server.

const cargoBookingsTotal = new Counter({
  name: 'cargo_bookings_total',
  help: 'Total number of cargo bookings created',
});

const handlingEventsTotal = new Counter({
  name:       'handling_events_total',
  help:       'Total number of handling events registered',
  labelNames: ['type'],
});

const cargoInspectionsTotal = new Counter({
  name: 'cargo_inspections_total',
  help: 'Total number of cargo inspections triggered',
});

export { cargoBookingsTotal, handlingEventsTotal, cargoInspectionsTotal };
