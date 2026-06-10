// nta-load seeds nyc_ntas from a NYC Open Data NTA GeoJSON.
//
// Usage:
//   nta-load --ntas=./data/nyc-ntas.geojson --db=$DATABASE_URL
//
// Density tiers are seeded from a hand-coded borough/neighborhood heuristic
// (CORE/FRINGE/DRAGONS). Re-run later from real signup density once you have
// a user base.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ntasPath := flag.String("ntas", "", "path to NYC NTA GeoJSON")
	dbURL := flag.String("db", "", "Postgres connection string")
	flag.Parse()

	if *ntasPath == "" || *dbURL == "" {
		log.Fatal("--ntas and --db are required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, *dbURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := loadNTAs(ctx, pool, *ntasPath); err != nil {
		log.Fatalf("load NTAs: %v", err)
	}
	log.Printf("done")
}

type featureCollection struct {
	Features []struct {
		Properties map[string]any  `json:"properties"`
		Geometry   json.RawMessage `json:"geometry"`
	} `json:"features"`
}

func loadNTAs(ctx context.Context, pool *pgxpool.Pool, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	var fc featureCollection
	if err := json.NewDecoder(f).Decode(&fc); err != nil {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, feat := range fc.Features {
		id := str(feat.Properties, "NTA2020", "nta2020", "ntacode", "nta_code")
		name := str(feat.Properties, "NTAName", "ntaname", "nta_name")
		borough := str(feat.Properties, "BoroName", "boroname", "borough")
		if id == "" || name == "" || borough == "" {
			continue
		}
		tier := densityTier(borough, name)
		geomJSON := string(feat.Geometry)

		if _, err := tx.Exec(ctx, `
			INSERT INTO nyc_ntas (id, name, borough, density_tier, geom, centroid)
			VALUES (
				$1, $2, $3, $4,
				ST_Multi(ST_GeomFromGeoJSON($5))::geography,
				ST_Centroid(ST_GeomFromGeoJSON($5))::geography
			)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name, borough = EXCLUDED.borough,
				density_tier = EXCLUDED.density_tier,
				geom = EXCLUDED.geom, centroid = EXCLUDED.centroid
		`, id, name, borough, tier, geomJSON); err != nil {
			return fmt.Errorf("upsert NTA %s: %w", id, err)
		}
	}
	return tx.Commit(ctx)
}

func str(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}

// densityTier is a starter heuristic. Replace with signup-density-driven tiers
// once there is a real user base.
func densityTier(borough, name string) string {
	b := strings.ToUpper(borough)
	n := strings.ToLower(name)
	switch b {
	case "STATEN ISLAND", "SI":
		return "DRAGONS"
	case "BRONX", "BX":
		if strings.Contains(n, "mott haven") || strings.Contains(n, "melrose") || strings.Contains(n, "concourse") {
			return "FRINGE"
		}
		return "DRAGONS"
	case "QUEENS", "QN":
		for _, c := range []string{"astoria", "long island city", "sunnyside", "woodside", "jackson heights", "ridgewood"} {
			if strings.Contains(n, c) {
				return "CORE"
			}
		}
		for _, f := range []string{"flushing", "forest hills", "rego park", "elmhurst", "corona"} {
			if strings.Contains(n, f) {
				return "FRINGE"
			}
		}
		return "DRAGONS"
	case "BROOKLYN", "BK":
		for _, d := range []string{"canarsie", "mill basin", "marine park", "bergen beach", "gerritsen", "sheepshead", "manhattan beach", "bensonhurst", "bath beach", "gravesend", "coney island", "brighton", "sea gate", "east new york", "starrett", "spring creek"} {
			if strings.Contains(n, d) {
				return "DRAGONS"
			}
		}
		for _, f := range []string{"flatbush", "midwood", "kensington", "borough park", "sunset park", "bay ridge", "dyker", "flatlands"} {
			if strings.Contains(n, f) {
				return "FRINGE"
			}
		}
		return "CORE"
	case "MANHATTAN", "MN":
		if strings.Contains(n, "inwood") || strings.Contains(n, "marble hill") {
			return "FRINGE"
		}
		return "CORE"
	}
	return "FRINGE"
}
