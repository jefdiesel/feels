package feed

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const (
	FreeDailyPicks    = 10
	PremiumDailyPicks = 10
)

// DailyPick represents a daily pick entry
type DailyPick struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	PickUserID uuid.UUID `json:"pick_user_id"`
	PickDate   time.Time `json:"pick_date"`
	CreatedAt  time.Time `json:"created_at"`
}

// DailyPicksResponse contains daily picks for a user
type DailyPicksResponse struct {
	Picks       []FeedProfile `json:"picks"`
	PicksToday  int           `json:"picks_today"`
	MaxPicks    int           `json:"max_picks"`
	RefreshesAt time.Time     `json:"refreshes_at"`
}

// DailyPicksRepository interface for daily picks operations
type DailyPicksRepository interface {
	GetDailyPicks(ctx context.Context, userID uuid.UUID, date time.Time) ([]uuid.UUID, error)
	SaveDailyPicks(ctx context.Context, userID uuid.UUID, pickUserIDs []uuid.UUID, date time.Time) error
	CountPicksToday(ctx context.Context, userID uuid.UUID) (int, error)
}

// GetDailyPicks returns curated daily picks for a user
// Order: pending likes first, then curated daily picks
func (s *Service) GetDailyPicks(ctx context.Context, userID uuid.UUID, isPremium bool) (*DailyPicksResponse, error) {
	// All users get 10 daily picks
	maxPicks := FreeDailyPicks

	// Get user's preferences
	prefs, err := s.profileRepo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, ErrProfileRequired
	}

	// Get today's date
	today := time.Now().UTC().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	// Get feed profiles using compatibility algorithm
	// We request more profiles than needed to ensure we have good picks
	profiles, err := s.feedRepo.GetFeedProfiles(ctx, userID, prefs, maxPicks*3)
	if err != nil {
		return nil, err
	}

	// Separate profiles into likes (go first) and browse profiles (daily picks)
	var pendingLikes []FeedProfile
	var dailyPicks []FeedProfile

	for _, p := range profiles {
		// People who liked us go first
		if p.Priority == PriorityQualifiedSuperlike || p.Priority == PriorityQualifiedLike {
			pendingLikes = append(pendingLikes, p)
		} else {
			dailyPicks = append(dailyPicks, p)
		}
	}

	// Build final list: likes first, then daily picks, up to maxPicks total
	var picks []FeedProfile

	// Add all pending likes first (these always show)
	picks = append(picks, pendingLikes...)

	// Fill remaining slots with daily picks
	remaining := maxPicks - len(picks)
	if remaining > 0 && len(dailyPicks) > 0 {
		if len(dailyPicks) > remaining {
			dailyPicks = dailyPicks[:remaining]
		}
		picks = append(picks, dailyPicks...)
	}

	return &DailyPicksResponse{
		Picks:       picks,
		PicksToday:  len(picks),
		MaxPicks:    maxPicks,
		RefreshesAt: tomorrow,
	}, nil
}
