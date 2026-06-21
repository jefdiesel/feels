package feed

import (
	"testing"
	"time"

	"github.com/feels/feels/internal/domain/profile"
)

func sp(s string) *string { return &s }

func fp(p profile.Profile) *FeedProfile { return &FeedProfile{Profile: p} }

// A kinky viewer should rank a kinky candidate above a vanilla one — like
// attracts like, dialed by how much of that thing the VIEWER is.
func TestMirror_LikeAttractsLike_Kink(t *testing.T) {
	now := time.Now()
	viewer := &profile.Profile{KinkLevel: sp("kinky"), LookingFor: []string{"dating"}}
	kinky := fp(profile.Profile{KinkLevel: sp("kinky"), LookingFor: []string{"dating"}, LastActive: now})
	vanilla := fp(profile.Profile{KinkLevel: sp("vanilla"), LookingFor: []string{"dating"}, LastActive: now})

	sk, _ := mirrorScore(viewer, kinky, AnchorAffinity{}, false, ScopeEverywhere, now)
	sv, _ := mirrorScore(viewer, vanilla, AnchorAffinity{}, false, ScopeEverywhere, now)
	if sk <= sv {
		t.Fatalf("kinky viewer should rank kinky (%.3f) above vanilla (%.3f)", sk, sv)
	}
}

// A vanilla viewer doesn't express kink, so kink must not move their ranking:
// the dimension is silent. Proves the weight is the viewer's own expression.
func TestMirror_VanillaViewer_KinkIsSilent(t *testing.T) {
	now := time.Now()
	viewer := &profile.Profile{KinkLevel: sp("vanilla"), LookingFor: []string{"dating"}}
	kinky := fp(profile.Profile{KinkLevel: sp("kinky"), LookingFor: []string{"dating"}, LastActive: now})
	vanilla := fp(profile.Profile{KinkLevel: sp("vanilla"), LookingFor: []string{"dating"}, LastActive: now})

	sk, _ := mirrorScore(viewer, kinky, AnchorAffinity{}, false, ScopeEverywhere, now)
	sv, _ := mirrorScore(viewer, vanilla, AnchorAffinity{}, false, ScopeEverywhere, now)
	if sk != sv {
		t.Fatalf("vanilla viewer: kink should not move ranking (kinky=%.3f vanilla=%.3f)", sk, sv)
	}
}

// Not every match goes into a category: a candidate with no standout shared
// dimension carries no "why" label at all.
func TestMirror_ReasonsAreSparse(t *testing.T) {
	now := time.Now()
	viewer := &profile.Profile{LookingFor: []string{"friends_and_more"}}
	c := fp(profile.Profile{LookingFor: []string{"serious"}, LastActive: now.Add(-48 * time.Hour)})

	_, reasons := mirrorScore(viewer, c, AnchorAffinity{}, false, ScopeEverywhere, now)
	if len(reasons) != 0 {
		t.Fatalf("expected no forced category, got %v", reasons)
	}
}

// A genuinely strong dimension does surface a reason.
func TestMirror_StrongMatchGetsReason(t *testing.T) {
	now := time.Now()
	viewer := &profile.Profile{LookingFor: []string{"relationship"}}
	c := fp(profile.Profile{LookingFor: []string{"relationship"}, LastActive: now})

	_, reasons := mirrorScore(viewer, c, AnchorAffinity{}, false, ScopeEverywhere, now)
	if len(reasons) == 0 || reasons[0] != "Both want a relationship" {
		t.Fatalf("expected intent reason, got %v", reasons)
	}
}

// Nabe overlap is loud in my_nabes and a whisper in everywhere — same people,
// different weighting, never a hard filter.
func TestMirror_NabeQuietsInEverywhere(t *testing.T) {
	now := time.Now()
	viewer := &profile.Profile{LookingFor: []string{"dating"}}
	c := fp(profile.Profile{LookingFor: []string{"dating"}, LastActive: now})
	aff := AnchorAffinity{OverlapCount: 1, SharedPlay: true}

	mine, _ := mirrorScore(viewer, c, aff, true, ScopeMyNabes, now)
	everywhere, _ := mirrorScore(viewer, c, aff, true, ScopeEverywhere, now)
	if mine <= everywhere {
		t.Fatalf("nabe overlap should count more in my_nabes (%.3f) than everywhere (%.3f)", mine, everywhere)
	}
}
