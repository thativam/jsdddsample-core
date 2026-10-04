/**
 * load-test.js  —  k6 end-to-end load test
 *
 * Exercises the full cargo lifecycle through the monolith/alpha (port 8080).
 * When a distributed plan is active, alpha delegates extracted functions to the
 * respective microservices internally — their metrics appear in Prometheus as a
 * side-effect of this test.
 *
 * Base URL defaults to http://localhost:8080.
 * Override per-run:  k6 run -e BASE_URL=http://localhost:8080 scripts/load-test.js
 *
 * Push metrics to Prometheus (observability stack must be running):
 *   npm run load:test                       (uses cross-env on Windows too)
 *   npm run load:test -- -e PLAN=monolith   (tags all metrics with plan name)
 *
 * Workflow exercised:
 *   1. list_locations    GET  /admin/registration
 *   2. register_cargo    POST /admin/register
 *   3. select_itinerary  GET  /admin/selectItinerary?trackingId=…
 *   4. assign_itinerary  POST /admin/assignItinerary
 *   5. track_cargo       GET  /track?trackingId=…
 *   6. pick_destination  GET  /admin/pickNewDestination?trackingId=…
 *   7. change_dest       POST /admin/changeDestination
 */

import http         from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const PLAN     = __ENV.PLAN || 'unknown';   // label for Grafana (e.g. "monolith", "plan2")

export const options = {
  scenarios: {
    cargo_lifecycle: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '2m',  target: 25 },
        { duration: '30s', target: 0  },
      ],
    },
  },
  thresholds: {
    'http_req_duration':                   ['p(95)<3000'],
    'http_req_failed':                     ['rate<0.05'],
    'op_duration{op:register_cargo}':      ['p(95)<3000'],
    'op_duration{op:track_cargo}':         ['p(95)<1000'],
    'op_duration{op:assign_itinerary}':    ['p(95)<3000'],
    'op_duration{op:change_destination}':  ['p(95)<3000'],
  },
  tags: { plan: PLAN },
};

// ── Custom per-operation metrics ──────────────────────────────────────────────

const opDuration = new Trend('op_duration', true);   // tagged by op=
const opErrors   = new Rate('op_errors');             // tagged by op=

// ── JSON helpers ──────────────────────────────────────────────────────────────

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function post(path, body, tags) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: JSON_HEADERS,
    tags,
  });
}

function get(path, tags) {
  return http.get(`${BASE_URL}${path}`, { tags });
}

function record(res, opName, expectStatus) {
  const ok = check(res, { [`${opName} ${expectStatus}`]: r => r.status === expectStatus });
  opDuration.add(res.timings.duration, { op: opName });
  opErrors.add(!ok, { op: opName });
  return ok;
}

// ── Setup: fetch real data and pre-create cargos ──────────────────────────────
//
// k6 runs setup() once before any VUs start. The returned object is passed as
// the `data` argument to every VU's default function and teardown().

export function setup() {
  // 1. Fetch available shipping locations
  const locRes = get('/admin/registration', { op: 'setup_locations' });
  if (locRes.status !== 200) {
    throw new Error(`Cannot reach monolith at ${BASE_URL} — got HTTP ${locRes.status}`);
  }

  const { locations } = JSON.parse(locRes.body);
  if (!locations || locations.length < 2) {
    throw new Error('Not enough shipping locations in the database (need ≥ 2).');
  }

  // 2. Pre-create 30 cargos so VUs have valid tracking IDs from the first request
  const trackingIds = [];
  const futureDate  = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);
  const deadline = futureDate.toISOString();

  for (let i = 0; i < 30; i++) {
    const origin = locations[i % locations.length];
    const dest   = locations[(i + 3) % locations.length];   // offset to ensure different
    if (origin.unLocode === dest.unLocode) continue;

    const res = post('/admin/register', {
      originUnlocode:      origin.unLocode,
      destinationUnlocode: dest.unLocode,
      arrivalDeadline:     deadline,
    }, { op: 'setup_register' });

    if (res.status === 201) {
      trackingIds.push(JSON.parse(res.body).trackingId);
    }
  }

  if (trackingIds.length === 0) {
    throw new Error('Could not pre-create any cargos during setup — check the monolith.');
  }

  console.log(`[setup] ${locations.length} locations, ${trackingIds.length} cargos pre-created`);
  return { locations, trackingIds };
}

// ── Default function ──────────────────────────────────────────────────────────

export default function (data) {
  const { locations, trackingIds } = data;

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);
  const deadline = futureDate.toISOString();

  // Pick random locations (guaranteed different)
  const idxA = Math.floor(Math.random() * locations.length);
  let   idxB = (idxA + 1 + Math.floor(Math.random() * (locations.length - 1))) % locations.length;
  const origin = locations[idxA];
  const dest   = locations[idxB];

  // Pick a random pre-created trackingId for read operations
  const existingId = trackingIds[Math.floor(Math.random() * trackingIds.length)];

  // ── 1. List locations ──────────────────────────────────────────────────────
  group('list_locations', () => {
    const res = get('/admin/registration', { op: 'list_locations' });
    record(res, 'list_locations', 200);
  });

  sleep(0.2);

  // ── 2. Register a new cargo ────────────────────────────────────────────────
  let newTrackingId = null;
  group('register_cargo', () => {
    const res = post('/admin/register', {
      originUnlocode:      origin.unLocode,
      destinationUnlocode: dest.unLocode,
      arrivalDeadline:     deadline,
    }, { op: 'register_cargo' });

    if (record(res, 'register_cargo', 201)) {
      newTrackingId = JSON.parse(res.body).trackingId;
    }
  });

  sleep(0.3);

  // ── 3. Select itinerary (route suggestions) ────────────────────────────────
  let routeCandidate = null;
  const routingId = newTrackingId ?? existingId;
  group('select_itinerary', () => {
    const res = get(`/admin/selectItinerary?trackingId=${routingId}`, { op: 'select_itinerary' });
    if (record(res, 'select_itinerary', 200)) {
      const body = JSON.parse(res.body);
      if (body.routeCandidates && body.routeCandidates.length > 0) {
        routeCandidate = body.routeCandidates[0];
      }
    }
  });

  // ── 4. Assign itinerary (only when routes are available) ───────────────────
  if (routeCandidate) {
    group('assign_itinerary', () => {
      const res = post('/admin/assignItinerary', {
        trackingId: routingId,
        legs:       routeCandidate.legs,
      }, { op: 'assign_itinerary' });
      record(res, 'assign_itinerary', 200);
    });
  }

  sleep(0.3);

  // ── 5. Track cargo ─────────────────────────────────────────────────────────
  group('track_cargo', () => {
    const res = get(`/track?trackingId=${existingId}`, { op: 'track_cargo' });
    // 200 = found, 404 = not found (valid if existingId was stale), both acceptable
    const ok = check(res, { 'track_cargo 2xx/4xx': r => r.status < 500 });
    opDuration.add(res.timings.duration, { op: 'track_cargo' });
    opErrors.add(!ok, { op: 'track_cargo' });
  });

  sleep(0.2);

  // ── 6 + 7. Pick new destination and change it ──────────────────────────────
  group('pick_destination', () => {
    const res = get(`/admin/pickNewDestination?trackingId=${existingId}`, { op: 'pick_destination' });
    record(res, 'pick_destination', 200);
  });

  // Pick a destination different from existing origin
  const newDest = locations[(idxA + 2) % locations.length];
  group('change_destination', () => {
    const res = post('/admin/changeDestination', {
      trackingId: existingId,
      unlocode:   newDest.unLocode,
    }, { op: 'change_destination' });
    // 200 = success, 400 = business rule violation (e.g. cargo already claimed) — both ok
    const ok = check(res, { 'change_destination 2xx/4xx': r => r.status < 500 });
    opDuration.add(res.timings.duration, { op: 'change_destination' });
    opErrors.add(!ok, { op: 'change_destination' });
  });

  sleep(0.5 + Math.random() * 0.5);
}
