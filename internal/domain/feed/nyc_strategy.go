package feed

import (
	"sort"

	"github.com/google/uuid"
)

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
	sort.SliceStable(profiles, func(i, j int) bool {
		ri, rj := rank(profiles[i].Priority), rank(profiles[j].Priority)
		if ri != rj {
			return ri < rj
		}
		return overlapScore(aff[profiles[i].UserID]) < overlapScore(aff[profiles[j].UserID])
	})
}
