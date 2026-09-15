import { httpRequestDuration, httpRequestsTotal } from '../../infrastructure/metrics/MetricsCollector.js';

/**
 * Records HTTP request duration and count for every response.
 * Uses the matched Express route path (e.g. /track/:id) rather than the raw
 * URL so high-cardinality IDs don't create unbounded label sets.
 */
export default function httpMetrics(req, res, next) {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;
    // Prefer the matched route pattern; fall back to the raw path with UUIDs
    // and numeric IDs normalised to avoid cardinality explosions.
    const route = req.route?.path
      ?? req.path.replace(/\/[0-9a-f]{8,}(\/|$)/gi, '/:id$1')
                 .replace(/\/\d+(\/|$)/g, '/:id$1');

    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
}
