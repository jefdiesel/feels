package feed

import (
	"sort"
	"time"

	"github.com/google/uuid"
)

// activityBonus floats recently-active users up within a priority+overlap
// bucket. It's subtracted from overlapScore (lower is better), so it nudges
// active users ahead without overriding a genuinely stronger neighborhood
// overlap (a shared PLAY anchor is -40, still ahead of "online now").
func activityBonus(lastActive, now time.Time) int {
	switch d := now.Sub(lastActive); {
	case d < 15*time.Minute:
		return 25
	case d < time.Hour:
		return 15
	case d < 24*time.Hour:
		return 8
	case d < 7*24*time.Hour:
		return 3
	default:
		return 0
	}
}

// overlapScore ranks candidates inside one priority bucket. Lower is better.
// Pure overlap signal: shared PLAY > shared WORK > shared LIVE > any overlap.
// Density penalty dampens DRAGONS NTAs slightly so dense matches surface first
// when everything else is tied.
func overlapScore(a AnchorAffinity) int {
	score := 100 - a.OverlapCount + a.DensityPenalty*3
	if a.SharedPlay {
		score -= 40
	}
	if a.SharedWork {
		score -= 15
	}
	if a.SharedLive {
		score -= 10
	}
	return score
}

func sortByOverlap(profiles []FeedProfile, aff map[uuid.UUID]AnchorAffinity) {
	now := time.Now()
	rank := func(p string) int {
		switch p {
		case PriorityQualifiedSuperlike:
			return 1
		case PriorityQualifiedLike:
			return 2
		case PriorityGapSuperlike:
			return 3
		default:
			return 4
		}
	}
	// Lower is better: stronger overlap first, with recently-active users nudged
	// up within the same overlap.
	score := func(p FeedProfile) int {
		return overlapScore(aff[p.UserID]) - activityBonus(p.LastActive, now)
	}
	sort.SliceStable(profiles, func(i, j int) bool {
		ri, rj := rank(profiles[i].Priority), rank(profiles[j].Priority)
		if ri != rj {
			return ri < rj
		}
		return score(profiles[i]) < score(profiles[j])
	})
}
