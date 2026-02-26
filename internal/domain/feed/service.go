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
	ErrNoRewindAvailable = errors.New("no recent action to rewind")
	ErrRewindExpired     = errors.New("rewind window expired (30 seconds)")
	ErrAlreadyMatched    = errors.New("cannot rewind after matching")
)

type FeedRepository interface {
	GetFeedProfiles(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences, limit int) ([]FeedProfile, error)
	CountQueuedLikes(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences) (int, error)
	CreateLike(ctx context.Context, like *Like) error
	CreateLikeWithMessage(ctx context.Context, like *Like, message string) error
	GetLike(ctx context.Context, likerID, likedID uuid.UUID) (*Like, error)
	HasMutualLike(ctx context.Context, userID, otherUserID uuid.UUID) (bool, error)
	CreatePass(ctx context.Context, pass *Pass) error
	GetLastPass(ctx context.Context, userID uuid.UUID) (*Pass, error)
	DeletePass(ctx context.Context, userID, targetID uuid.UUID) error
	GetDailyLikeCount(ctx context.Context, userID uuid.UUID) (int, error)
	IncrementDailyLikeCount(ctx context.Context, userID uuid.UUID) error
	DeleteLikesForMatch(ctx context.Context, user1ID, user2ID uuid.UUID) error
	EnsurePassesTable(ctx context.Context) error
	RecordRewind(ctx context.Context, userID, targetID uuid.UUID, originalAction string) error
}

type AnalyticsRepository interface {
	RecordView(ctx context.Context, viewerID, viewedID uuid.UUID) error
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

// Hub interface for real-time notifications
type Hub interface {
	SendToUser(userID uuid.UUID, msg interface{})
}

// NotificationService interface for push notifications
type NotificationService interface {
	SendLikeReceivedNotification(ctx context.Context, userID uuid.UUID) error
	SendSuperLikeNotification(ctx context.Context, userID uuid.UUID, likerName string) error
	SendNewMatchNotification(ctx context.Context, userID uuid.UUID, matchName string, matchID uuid.UUID) error
}

type Service struct {
	feedRepo            FeedRepository
	profileRepo         ProfileRepository
	matchRepo           MatchRepository
	analyticsRepo       AnalyticsRepository
	creditService       CreditService
	notificationService NotificationService
	hub                 Hub
	dailyLimit          int
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

// SetHub sets the WebSocket hub for real-time notifications
func (s *Service) SetHub(hub Hub) {
	s.hub = hub
}

// SetNotificationService sets the push notification service
func (s *Service) SetNotificationService(ns NotificationService) {
	s.notificationService = ns
}

// SetAnalyticsRepository sets the analytics repository for profile view tracking
func (s *Service) SetAnalyticsRepository(ar AnalyticsRepository) {
	s.analyticsRepo = ar
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

	// Record profile views asynchronously
	if s.analyticsRepo != nil {
		go func() {
			for _, p := range profiles {
				s.analyticsRepo.RecordView(ctx, userID, p.UserID)
			}
		}()
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

	// Send push notification for like received
	if s.notificationService != nil {
		if isSuperlike {
			// Get liker's profile for name
			likerProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
			likerName := "Someone"
			if likerProfile != nil && likerProfile.Name != "" {
				likerName = likerProfile.Name
			}
			go s.notificationService.SendSuperLikeNotification(ctx, targetID, likerName)
		} else {
			go s.notificationService.SendLikeReceivedNotification(ctx, targetID)
		}
	}

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

		// Notify both users about the match via WebSocket
		if s.hub != nil {
			// Notify the current user (who just liked)
			s.hub.SendToUser(userID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     m.ID,
					OtherUserID: targetID,
				},
			})
			// Notify the other user (who liked earlier)
			s.hub.SendToUser(targetID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     m.ID,
					OtherUserID: userID,
				},
			})
		}

		// Send push notifications for new match
		if s.notificationService != nil {
			// Get both profiles for names
			userProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
			targetProfile, _ := s.profileRepo.GetByUserID(ctx, targetID)

			userName := "Someone"
			targetName := "Someone"
			if userProfile != nil && userProfile.Name != "" {
				userName = userProfile.Name
			}
			if targetProfile != nil && targetProfile.Name != "" {
				targetName = targetProfile.Name
			}

			go s.notificationService.SendNewMatchNotification(ctx, userID, targetName, m.ID)
			go s.notificationService.SendNewMatchNotification(ctx, targetID, userName, m.ID)
		}

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

// Rewind undoes the last pass action within 30 seconds
func (s *Service) Rewind(ctx context.Context, userID uuid.UUID) (*FeedProfile, error) {
	// Get the last pass
	lastPass, err := s.feedRepo.GetLastPass(ctx, userID)
	if err != nil {
		return nil, ErrNoRewindAvailable
	}

	// Check if within 30 second window
	if time.Since(lastPass.CreatedAt) > 30*time.Second {
		return nil, ErrRewindExpired
	}

	// Check if not already matched
	hasMutual, err := s.feedRepo.HasMutualLike(ctx, userID, lastPass.PassedID)
	if err == nil && hasMutual {
		return nil, ErrAlreadyMatched
	}

	// Delete the pass
	if err := s.feedRepo.DeletePass(ctx, userID, lastPass.PassedID); err != nil {
		return nil, err
	}

	// Record the rewind
	s.feedRepo.RecordRewind(ctx, userID, lastPass.PassedID, "pass")

	// Get the profile to return
	profile, err := s.profileRepo.GetByUserID(ctx, lastPass.PassedID)
	if err != nil {
		return nil, err
	}

	return &FeedProfile{
		Profile: *profile,
	}, nil
}

// LikeWithMessage creates a superlike with an attached message (premium feature)
func (s *Service) LikeWithMessage(ctx context.Context, userID, targetID uuid.UUID, message string) (*LikeResponse, error) {
	if userID == targetID {
		return nil, ErrCannotLikeSelf
	}

	// Check credits/daily limit if credit service is available
	if s.creditService != nil {
		canSuperlike, err := s.creditService.CanSuperlike(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !canSuperlike {
			return nil, ErrInsufficientLikes
		}
	}

	// Check if already liked
	existing, err := s.feedRepo.GetLike(ctx, userID, targetID)
	if err == nil && existing != nil {
		return nil, ErrAlreadyLiked
	}

	// Use credits/daily like
	if s.creditService != nil {
		if err := s.creditService.UseSuperlike(ctx, userID); err != nil {
			return nil, err
		}
	}

	// Create like with message
	like := &Like{
		ID:          uuid.New(),
		LikerID:     userID,
		LikedID:     targetID,
		IsSuperlike: true,
		CreatedAt:   time.Now(),
	}

	if err := s.feedRepo.CreateLikeWithMessage(ctx, like, message); err != nil {
		return nil, err
	}

	// Legacy daily count
	s.feedRepo.IncrementDailyLikeCount(ctx, userID)

	// Send push notification
	if s.notificationService != nil {
		likerProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
		likerName := "Someone"
		if likerProfile != nil && likerProfile.Name != "" {
			likerName = likerProfile.Name
		}
		go s.notificationService.SendSuperLikeNotification(ctx, targetID, likerName)
	}

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

		// Notify both users about the match via WebSocket
		if s.hub != nil {
			s.hub.SendToUser(userID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     m.ID,
					OtherUserID: targetID,
				},
			})
			s.hub.SendToUser(targetID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     m.ID,
					OtherUserID: userID,
				},
			})
		}

		// Send push notifications for new match
		if s.notificationService != nil {
			userProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
			targetProfile, _ := s.profileRepo.GetByUserID(ctx, targetID)

			userName := "Someone"
			targetName := "Someone"
			if userProfile != nil && userProfile.Name != "" {
				userName = userProfile.Name
			}
			if targetProfile != nil && targetProfile.Name != "" {
				targetName = targetProfile.Name
			}

			go s.notificationService.SendNewMatchNotification(ctx, userID, targetName, m.ID)
			go s.notificationService.SendNewMatchNotification(ctx, targetID, userName, m.ID)
		}

		return &LikeResponse{
			Matched: true,
			MatchID: &m.ID,
		}, nil
	}

	return &LikeResponse{
		Matched: false,
	}, nil
}
