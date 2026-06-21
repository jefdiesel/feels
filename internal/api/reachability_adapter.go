package api

import (
	"context"

	"github.com/feels/feels/internal/domain/feed"
	"github.com/feels/feels/internal/repository"
	"github.com/google/uuid"
)

// overlapAdapter bridges the repository's AnchorAffinity to the feed package's
// interface-local type so the domain layer doesn't import repository.
type overlapAdapter struct {
	r *repository.Reachability
}

func (a *overlapAdapter) OverlappingCandidates(ctx context.Context, viewerID uuid.UUID) (map[uuid.UUID]feed.AnchorAffinity, error) {
	in, err := a.r.OverlappingCandidates(ctx, viewerID)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]feed.AnchorAffinity, len(in))
	for k, v := range in {
		out[k] = feed.AnchorAffinity{
			UserID:         v.UserID,
			OverlapCount:   v.OverlapCount,
			SharedPlay:     v.SharedPlay,
			SharedWork:     v.SharedWork,
			SharedLive:     v.SharedLive,
			DensityPenalty: v.DensityPenalty,
			SharedNTAName:  v.SharedNTAName,
		}
	}
	return out, nil
}

func (a *overlapAdapter) UsersInNTA(ctx context.Context, ntaID string) (string, map[uuid.UUID]bool, error) {
	return a.r.UsersInNTA(ctx, ntaID)
}
