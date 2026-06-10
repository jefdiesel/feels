-- NYC hyper-local matching: NTAs + per-user LIVE/WORK/HANGOUT anchors.
-- Matching is based on NTA overlap between users' anchors, not transit math.

CREATE EXTENSION IF NOT EXISTS postgis;

-- NYC Neighborhood Tabulation Areas. Seeded from NYC Open Data GeoJSON
-- by cmd/nta-load. Density tier is a soft ranking weight only.
CREATE TABLE nyc_ntas (
    id            TEXT PRIMARY KEY,            -- e.g. "BK0101"
    name          TEXT NOT NULL,
    borough       TEXT NOT NULL,
    density_tier  TEXT NOT NULL CHECK (density_tier IN ('CORE','FRINGE','DRAGONS')),
    geom          GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,
    centroid      GEOGRAPHY(POINT, 4326) NOT NULL
);
CREATE INDEX idx_nyc_ntas_geom ON nyc_ntas USING GIST (geom);
CREATE INDEX idx_nyc_ntas_centroid ON nyc_ntas USING GIST (centroid);

-- Per-user anchors. One row per (user, kind). Kind = LIVE | WORK | HANGOUT.
CREATE TABLE user_anchors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('LIVE','WORK','PLAY')),
    point       GEOGRAPHY(POINT, 4326) NOT NULL,
    nta_id      TEXT REFERENCES nyc_ntas(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, kind)
);
CREATE INDEX idx_user_anchors_user ON user_anchors(user_id);
CREATE INDEX idx_user_anchors_nta ON user_anchors(nta_id);
