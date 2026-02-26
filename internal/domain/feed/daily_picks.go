package feed

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const (
	FreeDailyPicks    = 3
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
func (s *Service) GetDailyPicks(ctx context.Context, userID uuid.UUID, isPremium bool) (*DailyPicksResponse, error) {
	// Determine max picks based on subscription
	maxPicks := FreeDailyPicks
	if isPremium {
		maxPicks = PremiumDailyPicks
	}

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
	profiles, err := s.feedRepo.GetFeedProfiles(ctx, userID, prefs, maxPicks*2)
	if err != nil {
		return nil, err
	}

	// Select top picks based on priority (qualified likes first, then high compatibility)
	var picks []FeedProfile
	for _, p := range profiles {
		if len(picks) >= maxPicks {
			break
		}
		// Prioritize users who liked us first
		if p.Priority == PriorityQualifiedSuperlike || p.Priority == PriorityQualifiedLike {
			picks = append(picks, p)
		}
	}

	// Fill remaining slots with high-quality browse profiles
	for _, p := range profiles {
		if len(picks) >= maxPicks {
			break
		}
		// Check if not already added
		alreadyPicked := false
		for _, existing := range picks {
			if existing.UserID == p.UserID {
				alreadyPicked = true
				break
			}
		}
		if !alreadyPicked {
			picks = append(picks, p)
		}
	}

	return &DailyPicksResponse{
		Picks:       picks,
		PicksToday:  len(picks),
		MaxPicks:    maxPicks,
		RefreshesAt: tomorrow,
	}, nil
}
