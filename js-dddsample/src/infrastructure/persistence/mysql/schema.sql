-- ─────────────────────────────────────────────────────────────────────────────
-- DDD Sample — MySQL schema
-- Run once against your database:
--   mysql -u <user> -p <dbname> < schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS locations (
  unlocode  CHAR(5)      NOT NULL PRIMARY KEY,  -- e.g. CNHKG
  name      VARCHAR(100) NOT NULL
);

-- ─── Voyages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voyages (
  voyage_number VARCHAR(20) NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS carrier_movements (
  id               BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  voyage_number    VARCHAR(20) NOT NULL,
  seq              INT         NOT NULL,           -- ordering within the voyage
  from_unlocode    CHAR(5)     NOT NULL,
  to_unlocode      CHAR(5)     NOT NULL,
  departure_time   DATETIME    NOT NULL,
  arrival_time     DATETIME    NOT NULL,
  FOREIGN KEY (voyage_number) REFERENCES voyages(voyage_number),
  FOREIGN KEY (from_unlocode) REFERENCES locations(unlocode),
  FOREIGN KEY (to_unlocode)   REFERENCES locations(unlocode)
);

-- ─── Cargo ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cargos (
  tracking_id      VARCHAR(40)  NOT NULL PRIMARY KEY,
  origin_unlocode  CHAR(5)      NOT NULL,
  dest_unlocode    CHAR(5)      NOT NULL,
  arrival_deadline DATETIME     NOT NULL,
  FOREIGN KEY (origin_unlocode) REFERENCES locations(unlocode),
  FOREIGN KEY (dest_unlocode)   REFERENCES locations(unlocode)
);

-- Itinerary legs (0..n per cargo; NULL when not yet routed)
CREATE TABLE IF NOT EXISTS itinerary_legs (
  id             BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tracking_id    VARCHAR(40) NOT NULL,
  seq            INT         NOT NULL,        -- ordering within the itinerary
  voyage_number  VARCHAR(20) NOT NULL,
  load_unlocode  CHAR(5)     NOT NULL,
  unload_unlocode CHAR(5)    NOT NULL,
  load_time      DATETIME    NOT NULL,
  unload_time    DATETIME    NOT NULL,
  FOREIGN KEY (tracking_id)     REFERENCES cargos(tracking_id),
  FOREIGN KEY (voyage_number)   REFERENCES voyages(voyage_number),
  FOREIGN KEY (load_unlocode)   REFERENCES locations(unlocode),
  FOREIGN KEY (unload_unlocode) REFERENCES locations(unlocode)
);

-- ─── Handling Events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handling_events (
  id                BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cargo_tracking_id VARCHAR(40) NOT NULL,
  type              VARCHAR(20) NOT NULL,  -- RECEIVE|LOAD|UNLOAD|CLAIM|CUSTOMS
  location_unlocode CHAR(5)     NOT NULL,
  voyage_number     VARCHAR(20) DEFAULT NULL,   -- NULL for RECEIVE/CLAIM/CUSTOMS
  completion_time   DATETIME    NOT NULL,
  registration_time DATETIME    NOT NULL,
  FOREIGN KEY (cargo_tracking_id) REFERENCES cargos(tracking_id),
  FOREIGN KEY (location_unlocode) REFERENCES locations(unlocode),
  FOREIGN KEY (voyage_number)     REFERENCES voyages(voyage_number)
);
