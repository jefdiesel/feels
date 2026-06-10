package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Reachability scores candidate users by NTA overlap with the viewer's anchors.
// No transit math: if two users have anchors in the same NTA, they "go to the
// same places." Kind pairing (PLAY-PLAY > WORK-WORK > LIVE-LIVE > mixed)
// drives the rank. The matched NTA name is surfaced for the profile card.
type Reachability struct {
	db *pgxpool.Pool
}

func NewReachability(db *pgxpool.Pool) *Reachability {
	return &Reachability{db: db}
}

type AnchorAffinity struct {
	UserID         uuid.UUID
	OverlapCount   int
	SharedPlay     bool
	SharedWork     bool
	SharedLive     bool
	DensityPenalty int
	SharedNTAName  string // best NTA name to show on the card (densest match)
}

func (r *Reachability) OverlappingCandidates(ctx context.Context, viewerID uuid.UUID) (map[uuid.UUID]AnchorAffinity, error) {
	// "best" NTA = the densest (lowest tier number) NTA where both users have
	// any anchor. Ties broken arbitrarily — name is for display only.
	rows, err := r.db.Query(ctx, `
		WITH viewer_anchors AS (
			SELECT kind, nta_id FROM user_anchors
			WHERE user_id = $1 AND nta_id IS NOT NULL
		),
		matches AS (
			SELECT
				c.user_id,
				v.kind AS v_kind,
				c.kind AS c_kind,
				c.nta_id,
				n.name AS nta_name,
				CASE n.density_tier WHEN 'CORE' THEN 0 WHEN 'FRINGE' THEN 1 ELSE 2 END AS tier_rank
			FROM viewer_anchors v
			JOIN user_anchors c ON c.nta_id = v.nta_id AND c.user_id != $1
			JOIN nyc_ntas n ON n.id = v.nta_id
		),
		best_nta AS (
			SELECT DISTINCT ON (user_id) user_id, nta_name
			FROM matches
			ORDER BY user_id, tier_rank ASC, nta_name ASC
		)
		SELECT
			m.user_id,
			COUNT(DISTINCT m.nta_id) AS overlap_count,
			BOOL_OR(m.v_kind = 'PLAY' AND m.c_kind = 'PLAY') AS shared_play,
			BOOL_OR(m.v_kind = 'WORK' AND m.c_kind = 'WORK') AS shared_work,
			BOOL_OR(m.v_kind = 'LIVE' AND m.c_kind = 'LIVE') AS shared_live,
			MIN(m.tier_rank) AS best_tier,
			MAX(b.nta_name) AS shared_nta_name
		FROM matches m
		JOIN best_nta b ON b.user_id = m.user_id
		GROUP BY m.user_id
	`, viewerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[uuid.UUID]AnchorAffinity{}
	for rows.Next() {
		var aff AnchorAffinity
		if err := rows.Scan(&aff.UserID, &aff.OverlapCount, &aff.SharedPlay, &aff.SharedWork, &aff.SharedLive, &aff.DensityPenalty, &aff.SharedNTAName); err != nil {
			return nil, err
		}
		out[aff.UserID] = aff
	}
	return out, rows.Err()
}
