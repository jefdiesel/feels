package feed

import (
	"sort"
	"strings"
	"time"

	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
)

// Mirror matching ranks candidates by how much they resemble the viewer across
// every dimension the viewer expresses in their profile. The pull of each
// dimension is scaled by how strongly the VIEWER embodies it: a kinky viewer's
// kink signal is loud, a vanilla viewer's is silent; a relationship-minded
// viewer weights intent heavily, a casual one barely. Nothing is excluded —
// this only reorders. "The feed is a mirror." Nabe overlap and presence ride
// along as additional always-on signals (nabe quiets down in ScopeEverywhere).
//
// All similarities are 0..1, all weights are 0..1, and the score is their
// weighted sum (higher = better). The strongest one or two dimensions also
// yield a short "why" label for the card.

// --- ordinal level maps ---------------------------------------------------

func kinkRank(k *string) (int, bool) {
	if k == nil {
		return 0, false
	}
	switch *k {
	case "vanilla":
		return 0, true
	case "curious":
		return 1, true
	case "sensual":
		return 2, true
	case "experienced":
		return 3, true
	case "kinky":
		return 4, true
	}
	return 0, false
}

func substanceRank(s *string) (int, bool) {
	if s == nil {
		return 0, false
	}
	switch *s {
	case "never":
		return 0, true
	case "socially":
		return 1, true
	case "often", "420_friendly":
		return 2, true
	}
	return 0, false
}

var intentOrder = map[string]int{
	"serious":          0,
	"relationship":     1,
	"dating":           2,
	"meeting_people":   3,
	"friends_and_more": 4,
}

func intentRank(lf []string) (int, bool) {
	if len(lf) == 0 {
		return 0, false
	}
	if v, ok := intentOrder[lf[0]]; ok {
		return v, true
	}
	return 0, false
}

func absInt(a int) int {
	if a < 0 {
		return -a
	}
	return a
}

// nearness is 1.0 when two ordinal levels match and falls linearly to 0 across
// the full span.
func nearness(a, b, span int) float64 {
	if span <= 0 {
		return 0
	}
	n := 1.0 - float64(absInt(a-b))/float64(span)
	if n < 0 {
		return 0
	}
	return n
}

// --- scoring --------------------------------------------------------------

// dim is one scored dimension: its contribution to the total and the reason
// label to show on the card when it fires strongly.
type dim struct {
	value  float64
	reason string
}

// mirrorScore returns a similarity score (higher = better) and up to two
// "why" reasons, strongest first.
func mirrorScore(v *profile.Profile, c *FeedProfile, aff AnchorAffinity, hasAff bool, scope FeedScope, now time.Time) (float64, []string) {
	dims := make([]dim, 0, 8)

	// Intent — what you're here for. Matters to everyone, and more so the more
	// serious the viewer's own intent is.
	if vi, ok := intentRank(v.LookingFor); ok {
		if ci, ok2 := intentRank(c.LookingFor); ok2 {
			commitment := 1.0 - float64(vi)/4.0 // serious=1.0 … friends_and_more=0.0
			weight := 0.6 + 0.4*commitment
			sim := nearness(vi, ci, 4)
			reason := ""
			switch {
			case sim >= 0.999:
				reason = "Both want " + humanIntent(c.LookingFor[0])
			case sim >= 0.75:
				reason = "Similar intentions"
			}
			dims = append(dims, dim{weight * sim, reason})
		}
	}

	// Kink — loud only for kinky viewers.
	if vk, ok := kinkRank(v.KinkLevel); ok {
		if ck, ok2 := kinkRank(c.KinkLevel); ok2 {
			weight := float64(vk) / 4.0
			sim := nearness(vk, ck, 4)
			reason := ""
			if weight >= 0.5 && sim >= 0.75 {
				reason = "Same energy"
			}
			dims = append(dims, dim{0.9 * weight * sim, reason})
		}
	}

	// Social / vices — sociable viewers pull sociable people.
	va, vaOk := substanceRank(v.Alcohol)
	vw, vwOk := substanceRank(v.Weed)
	if vaOk || vwOk {
		social := va
		if vw > social {
			social = vw
		}
		weight := float64(social) / 2.0
		sim, n := 0.0, 0
		if vaOk {
			if ca, ok := substanceRank(c.Alcohol); ok {
				sim += nearness(va, ca, 2)
				n++
			}
		}
		if vwOk {
			if cw, ok := substanceRank(c.Weed); ok {
				sim += nearness(vw, cw, 2)
				n++
			}
		}
		if n > 0 {
			sim /= float64(n)
			reason := ""
			if weight >= 0.5 && sim >= 0.75 {
				reason = "Both social"
			}
			dims = append(dims, dim{0.7 * weight * sim, reason})
		}
	}

	// Values — religion counts when the viewer states one; zodiac is light fun.
	if v.Religion != nil && *v.Religion != "" && c.Religion != nil &&
		strings.EqualFold(*v.Religion, *c.Religion) {
		dims = append(dims, dim{0.6, "Same values"})
	}
	if v.Zodiac != nil && *v.Zodiac != "" && c.Zodiac != nil &&
		strings.EqualFold(*v.Zodiac, *c.Zodiac) {
		dims = append(dims, dim{0.3, "★ " + humanZodiac(*c.Zodiac)})
	}

	// Nabe — one signal among many: loud in my_nabes, a whisper everywhere.
	// The shared-place badge already names it on the card, so no extra reason.
	if hasAff {
		nabeWeight := 1.0
		if scope == ScopeEverywhere {
			nabeWeight = 0.25
		}
		nabeSim := 0.0
		switch {
		case aff.SharedPlay:
			nabeSim = 1.0
		case aff.SharedWork:
			nabeSim = 0.7
		case aff.SharedLive:
			nabeSim = 0.5
		case aff.OverlapCount > 0:
			nabeSim = 0.3
		}
		dims = append(dims, dim{nabeWeight * nabeSim, ""})
	}

	// Presence — always-on light nudge; never a reason on its own.
	dims = append(dims, dim{float64(activityBonus(c.LastActive, now)) / 25.0 * 0.4, ""})

	// Sum, and surface the two strongest labelled dimensions.
	total := 0.0
	reasons := make([]dim, 0, len(dims))
	for _, d := range dims {
		total += d.value
		if d.reason != "" {
			reasons = append(reasons, d)
		}
	}
	sort.SliceStable(reasons, func(i, j int) bool { return reasons[i].value > reasons[j].value })
	out := make([]string, 0, 2)
	for i := range reasons {
		if i >= 2 {
			break
		}
		out = append(out, reasons[i].reason)
	}
	return total, out
}

// rankByMirror orders profiles by the mirror score within each priority bucket
// (qualified likes still come first) and annotates each with its match reasons.
func rankByMirror(profiles []FeedProfile, v *profile.Profile, aff map[uuid.UUID]AnchorAffinity, scope FeedScope, now time.Time) {
	bucket := func(p string) int {
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
	scores := make(map[uuid.UUID]float64, len(profiles))
	for i := range profiles {
		a, ok := aff[profiles[i].UserID]
		s, reasons := mirrorScore(v, &profiles[i], a, ok, scope, now)
		scores[profiles[i].UserID] = s
		profiles[i].MatchReasons = reasons
	}
	sort.SliceStable(profiles, func(i, j int) bool {
		bi, bj := bucket(profiles[i].Priority), bucket(profiles[j].Priority)
		if bi != bj {
			return bi < bj
		}
		return scores[profiles[i].UserID] > scores[profiles[j].UserID]
	})
}

func humanIntent(s string) string {
	switch s {
	case "serious":
		return "something serious"
	case "relationship":
		return "a relationship"
	case "dating":
		return "to date"
	case "meeting_people":
		return "to meet people"
	case "friends_and_more":
		return "friends & more"
	}
	return s
}

func humanZodiac(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + strings.ToLower(s[1:])
}
