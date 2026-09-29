import { Histogram } from 'prom-client';

// HTTP duration histogram on the global registry — monolith only.
// Distributed servers use express-prom-bundle instead.
// Label name matches prom-bundle's default ('path') so the dashboard works
// for both the monolith and the distributed servers.

const httpRequestDuration = new Histogram({
  name:       'http_request_duration_seconds',
  help:       'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets:    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export default function httpMetrics(req, res, next) {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;
    const path = req.route?.path
      ?? req.path.replace(/\/[0-9a-f]{8,}(\/|$)/gi, '/:id$1')
                 .replace(/\/\d+(\/|$)/g, '/:id$1');

    httpRequestDuration.observe({ method: req.method, path, status_code: res.statusCode }, durationSec);
  });

  next();
}
