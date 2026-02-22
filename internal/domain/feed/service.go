package feed

import (
	"context"
	"errors"
	"time"

	"github.com/feels/feels/internal/domain/match"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
)

var (
	ErrProfileRequired   = errors.New("profile required to use feed")
	ErrCannotLikeSelf    = errors.New("cannot like yourself")
	ErrAlreadyLiked      = errors.New("already liked this profile")
	ErrInsufficientLikes = errors.New("no likes remaining today")
	ErrUserNotFound      = errors.New("user not found")
)

type FeedRepository interface {
	GetFeedProfiles(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences, limit int) ([]FeedProfile, error)
	CountQueuedLikes(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences) (int, error)
	CreateLike(ctx context.Context, like *Like) error
	GetLike(ctx context.Context, likerID, likedID uuid.UUID) (*Like, error)
	HasMutualLike(ctx context.Context, userID, otherUserID uuid.UUID) (bool, error)
	CreatePass(ctx context.Context, pass *Pass) error
	GetDailyLikeCount(ctx context.Context, userID uuid.UUID) (int, error)
	IncrementDailyLikeCount(ctx context.Context, userID uuid.UUID) error
	DeleteLikesForMatch(ctx context.Context, user1ID, user2ID uuid.UUID) error
	EnsurePassesTable(ctx context.Context) error
}

type ProfileRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*profile.Profile, error)
	GetPreferences(ctx context.Context, userID uuid.UUID) (*profile.Preferences, error)
}

type MatchRepository interface {
	Create(ctx context.Context, m *match.Match) error
}

type CreditService interface {
	CanLike(ctx context.Context, userID uuid.UUID) (bool, error)
	UseLike(ctx context.Context, userID uuid.UUID) error
	CanSuperlike(ctx context.Context, userID uuid.UUID) (bool, error)
	UseSuperlike(ctx context.Context, userID uuid.UUID) error
	AddBonusLikes(ctx context.Context, userID uuid.UUID, amount int) error
}

type Service struct {
	feedRepo      FeedRepository
	profileRepo   ProfileRepository
	matchRepo     MatchRepository
	creditService CreditService
	dailyLimit    int
}

func NewService(feedRepo FeedRepository, profileRepo ProfileRepository, matchRepo MatchRepository, dailyLimit int) *Service {
	return &Service{
		feedRepo:    feedRepo,
		profileRepo: profileRepo,
		matchRepo:   matchRepo,
		dailyLimit:  dailyLimit,
	}
}

// SetCreditService sets the credit service (optional dependency)
func (s *Service) SetCreditService(cs CreditService) {
	s.creditService = cs
}

// GetFeed returns the next batch of profiles for the user
func (s *Service) GetFeed(ctx context.Context, userID uuid.UUID, limit int) (*FeedResponse, error) {
	// Validate limit
	if limit <= 0 {
		limit = DefaultFeedLimit
	}
	if limit > MaxFeedLimit {
		limit = MaxFeedLimit
	}

	// Get user's preferences
	prefs, err := s.profileRepo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, ErrProfileRequired
	}

	// Count queued likes
	queuedLikes, err := s.feedRepo.CountQueuedLikes(ctx, userID, prefs)
	if err != nil {
		return nil, err
	}

	// Get feed profiles
	profiles, err := s.feedRepo.GetFeedProfiles(ctx, userID, prefs, limit)
	if err != nil {
		return nil, err
	}

	return &FeedResponse{
		Profiles:       profiles,
		HasMore:        len(profiles) == limit,
		QueuedLikes:    queuedLikes,
		MustProcessAll: queuedLikes >= MaxQualifiedLikesShown,
	}, nil
}

// Like likes a profile
func (s *Service) Like(ctx context.Context, userID, targetID uuid.UUID, isSuperlike bool) (*LikeResponse, error) {
	if userID == targetID {
		return nil, ErrCannotLikeSelf
	}

	// Check credits/daily limit if credit service is available
	if s.creditService != nil {
		if isSuperlike {
			canSuperlike, err := s.creditService.CanSuperlike(ctx, userID)
			if err != nil {
				return nil, err
			}
			if !canSuperlike {
				return nil, ErrInsufficientLikes
			}
		} else {
			canLike, err := s.creditService.CanLike(ctx, userID)
			if err != nil {
				return nil, err
			}
			if !canLike {
				return nil, ErrInsufficientLikes
			}
		}
	}

	// Check if already liked
	existing, err := s.feedRepo.GetLike(ctx, userID, targetID)
	if err == nil && existing != nil {
		return nil, ErrAlreadyLiked
	}

	// Use credits/daily like
	if s.creditService != nil {
		if isSuperlike {
			if err := s.creditService.UseSuperlike(ctx, userID); err != nil {
				return nil, err
			}
		} else {
			if err := s.creditService.UseLike(ctx, userID); err != nil {
				return nil, err
			}
		}
	}

	// Create like
	like := &Like{
		ID:          uuid.New(),
		LikerID:     userID,
		LikedID:     targetID,
		IsSuperlike: isSuperlike,
		CreatedAt:   time.Now(),
	}

	if err := s.feedRepo.CreateLike(ctx, like); err != nil {
		return nil, err
	}

	// Legacy daily count (kept for backwards compatibility)
	s.feedRepo.IncrementDailyLikeCount(ctx, userID)

	// Check for mutual like
	hasMutual, err := s.feedRepo.HasMutualLike(ctx, userID, targetID)
	if err != nil {
		return nil, err
	}

	if hasMutual {
		// Create match
		user1, user2 := match.OrderedUserIDs(userID, targetID)
		m := &match.Match{
			ID:        uuid.New(),
			User1ID:   user1,
			User2ID:   user2,
			CreatedAt: time.Now(),
		}

		if err := s.matchRepo.Create(ctx, m); err != nil {
			return nil, err
		}

		// Clean up likes
		s.feedRepo.DeleteLikesForMatch(ctx, userID, targetID)

		return &LikeResponse{
			Matched: true,
			MatchID: &m.ID,
		}, nil
	}

	return &LikeResponse{
		Matched: false,
	}, nil
}

// Pass passes on a profile
func (s *Service) Pass(ctx context.Context, userID, targetID uuid.UUID) error {
	if userID == targetID {
		return ErrCannotLikeSelf
	}

	pass := &Pass{
		PasserID:  userID,
		PassedID:  targetID,
		CreatedAt: time.Now(),
	}

	return s.feedRepo.CreatePass(ctx, pass)
}

// EnsurePassesTable ensures the passes table exists
func (s *Service) EnsurePassesTable(ctx context.Context) error {
	return s.feedRepo.EnsurePassesTable(ctx)
}
