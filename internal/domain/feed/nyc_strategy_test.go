package feed

import (
	"testing"
	"time"

	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
)

func TestActivityBonusBuckets(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		ago  time.Duration
		want int
	}{
		{"online now", 1 * time.Minute, 25},
		{"within the hour", 30 * time.Minute, 15},
		{"earlier today", 6 * time.Hour, 8},
		{"this week", 3 * 24 * time.Hour, 3},
		{"stale", 30 * 24 * time.Hour, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := activityBonus(now.Add(-c.ago), now); got != c.want {
				t.Fatalf("activityBonus(%s) = %d, want %d", c.ago, got, c.want)
			}
		})
	}
}

// browseProfile builds a browse-tier candidate active `ago` before now.
func browseProfile(ago time.Duration) (FeedProfile, time.Time) {
	id := uuid.New()
	p := FeedProfile{Profile: profile.Profile{UserID: id, LastActive: time.Now().Add(-ago)}}
	p.Priority = PriorityBrowse
	return p, time.Now()
}

func order(profiles []FeedProfile) []uuid.UUID {
	ids := make([]uuid.UUID, len(profiles))
	for i, p := range profiles {
		ids[i] = p.UserID
	}
	return ids
}

// Within the same priority and identical overlap, the more recently active
// user should come first.
func TestSortByOverlap_ActivityBreaksTies(t *testing.T) {
	active, _ := browseProfile(2 * time.Minute)
	idle, _ := browseProfile(10 * 24 * time.Hour)

	sameOverlap := AnchorAffinity{OverlapCount: 1}
	aff := map[uuid.UUID]AnchorAffinity{
		active.UserID: sameOverlap,
		idle.UserID:   sameOverlap,
	}

	profiles := []FeedProfile{idle, active}
	sortByOverlap(profiles, aff)

	if got := order(profiles); got[0] != active.UserID {
		t.Fatalf("expected active user first, got order %v (active=%s)", got, active.UserID)
	}
}

// A genuinely stronger neighborhood overlap (shared PLAY anchor) must still
// outrank an active-but-weakly-overlapping user — activity nudges, it doesn't
// override matching quality.
func TestSortByOverlap_StrongOverlapBeatsActivity(t *testing.T) {
	strongIdle, _ := browseProfile(10 * 24 * time.Hour)
	weakActive, _ := browseProfile(1 * time.Minute)

	aff := map[uuid.UUID]AnchorAffinity{
		strongIdle.UserID: {OverlapCount: 1, SharedPlay: true},
		weakActive.UserID: {OverlapCount: 1},
	}

	profiles := []FeedProfile{weakActive, strongIdle}
	sortByOverlap(profiles, aff)

	if got := order(profiles); got[0] != strongIdle.UserID {
		t.Fatalf("expected strong-overlap user first, got order %v", got)
	}
}

// Priority bucket dominates both overlap and activity.
func TestSortByOverlap_PriorityDominates(t *testing.T) {
	qualified, _ := browseProfile(10 * 24 * time.Hour)
	qualified.Priority = PriorityQualifiedLike // rank 2

	browseStrongActive, _ := browseProfile(1 * time.Minute) // rank 4

	aff := map[uuid.UUID]AnchorAffinity{
		qualified.UserID:          {OverlapCount: 1},
		browseStrongActive.UserID: {OverlapCount: 5, SharedPlay: true},
	}

	profiles := []FeedProfile{browseStrongActive, qualified}
	sortByOverlap(profiles, aff)

	if got := order(profiles); got[0] != qualified.UserID {
		t.Fatalf("expected qualified-like user first, got order %v", got)
	}
}
