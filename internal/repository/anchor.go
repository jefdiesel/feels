package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/anchor"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnchorRepository struct {
	db *pgxpool.Pool
}

func NewAnchorRepository(db *pgxpool.Pool) *AnchorRepository {
	return &AnchorRepository{db: db}
}

// Upsert writes (or replaces) the anchor for (user, kind), snaps the point to
// an NTA via PostGIS containment (fallback nearest centroid), and returns the
// stored row enriched with NTA metadata.
func (r *AnchorRepository) Upsert(ctx context.Context, a *anchor.Anchor) (*anchor.Anchor, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var ntaID *string
	var s string
	err = tx.QueryRow(ctx, `
		SELECT id FROM nyc_ntas
		WHERE ST_Contains(geom::geometry, ST_SetSRID(ST_MakePoint($1,$2),4326))
		LIMIT 1
	`, a.Lng, a.Lat).Scan(&s)
	if err == nil {
		ntaID = &s
	} else if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `
			SELECT id FROM nyc_ntas
			ORDER BY centroid <-> ST_SetSRID(ST_MakePoint($1,$2),4326)::geography
			LIMIT 1
		`, a.Lng, a.Lat).Scan(&s)
		if err == nil {
			ntaID = &s
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	} else {
		return nil, err
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO user_anchors (id, user_id, kind, point, nta_id, updated_at)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4,$5),4326)::geography, $6, NOW())
		ON CONFLICT (user_id, kind) DO UPDATE SET
			point = EXCLUDED.point,
			nta_id = EXCLUDED.nta_id,
			updated_at = NOW()
		RETURNING id, updated_at
	`, a.ID, a.UserID, string(a.Kind), a.Lng, a.Lat, ntaID).Scan(&a.ID, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	a.NTAID = ntaID

	if ntaID != nil {
		var name, borough string
		if err := tx.QueryRow(ctx, `SELECT name, borough FROM nyc_ntas WHERE id = $1`, *ntaID).Scan(&name, &borough); err == nil {
			a.NTAName = &name
			a.Borough = &borough
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return a, nil
}

func (r *AnchorRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]anchor.Anchor, error) {
	rows, err := r.db.Query(ctx, `
		SELECT a.id, a.user_id, a.kind,
		       ST_Y(a.point::geometry) AS lat, ST_X(a.point::geometry) AS lng,
		       a.nta_id, n.name, n.borough,
		       COALESCE((SELECT COUNT(DISTINCT ca.user_id)
		                 FROM user_anchors ca
		                 WHERE ca.nta_id = a.nta_id AND ca.user_id != a.user_id), 0) AS locals,
		       a.updated_at
		FROM user_anchors a
		LEFT JOIN nyc_ntas n ON n.id = a.nta_id
		WHERE a.user_id = $1
		ORDER BY a.kind
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []anchor.Anchor
	for rows.Next() {
		var a anchor.Anchor
		var kind string
		if err := rows.Scan(&a.ID, &a.UserID, &kind, &a.Lat, &a.Lng, &a.NTAID, &a.NTAName, &a.Borough, &a.Locals, &a.UpdatedAt); err != nil {
			return nil, err
		}
		a.Kind = anchor.Kind(kind)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *AnchorRepository) Delete(ctx context.Context, userID uuid.UUID, kind anchor.Kind) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_anchors WHERE user_id = $1 AND kind = $2`, userID, string(kind))
	return err
}
