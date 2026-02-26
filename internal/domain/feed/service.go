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
	ErrUserShadowbanned  = errors.New("user is not available")
)

// LikeResult contains the result of an atomic like operation
type LikeResult struct {
	LikeCreated  bool
	MatchID      *uuid.UUID
	MatchCreated bool
}

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
	// Atomic operations to prevent race conditions
	CreateLikeAtomic(ctx context.Context, like *Like, matchUser1ID, matchUser2ID uuid.UUID) (*LikeResult, error)
	CreateLikeWithMessageAtomic(ctx context.Context, like *Like, message string, matchUser1ID, matchUser2ID uuid.UUID) (*LikeResult, error)
}

// UserRepository interface for checking user status
type UserRepository interface {
	IsShadowbanned(ctx context.Context, userID uuid.UUID) (bool, error)
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
	// Atomic versions that check and deduct in a single transaction
	UseLikeAtomic(ctx context.Context, userID uuid.UUID) error
	UseSuperlikeAtomic(ctx context.Context, userID uuid.UUID) error
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
	userRepo            UserRepository
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

// SetUserRepository sets the user repository for checking user status
func (s *Service) SetUserRepository(ur UserRepository) {
	s.userRepo = ur
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

	// Get viewer's profile for looking_for alignment
	viewerProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
	viewerLookingFor := ""
	if viewerProfile != nil && viewerProfile.LookingFor != nil {
		viewerLookingFor = *viewerProfile.LookingFor
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

	// Compute looking_for alignment for each profile
	for i := range profiles {
		profileLookingFor := ""
		if profiles[i].LookingFor != nil {
			profileLookingFor = *profiles[i].LookingFor
		}
		profiles[i].LookingForAlignment = ComputeLookingForAlignment(viewerLookingFor, profileLookingFor)
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

// Like likes a profile using atomic transaction to prevent race conditions
func (s *Service) Like(ctx context.Context, userID, targetID uuid.UUID, isSuperlike bool) (*LikeResponse, error) {
	if userID == targetID {
		return nil, ErrCannotLikeSelf
	}

	// Check if target user is shadowbanned (prevent matching with shadowbanned users)
	if s.userRepo != nil {
		isShadowbanned, err := s.userRepo.IsShadowbanned(ctx, targetID)
		if err != nil {
			return nil, err
		}
		if isShadowbanned {
			// Silently accept the like but don't actually process it
			// This prevents shadowbanned users from knowing they're shadowbanned
			return &LikeResponse{Matched: false}, nil
		}
	}

	// Check if already liked
	existing, err := s.feedRepo.GetLike(ctx, userID, targetID)
	if err == nil && existing != nil {
		return nil, ErrAlreadyLiked
	}

	// Atomically check and use credits to prevent race conditions
	if s.creditService != nil {
		if isSuperlike {
			if err := s.creditService.UseSuperlikeAtomic(ctx, userID); err != nil {
				return nil, err
			}
		} else {
			if err := s.creditService.UseLikeAtomic(ctx, userID); err != nil {
				return nil, err
			}
		}
	}

	// Create like and check for match atomically
	like := &Like{
		ID:          uuid.New(),
		LikerID:     userID,
		LikedID:     targetID,
		IsSuperlike: isSuperlike,
		CreatedAt:   time.Now(),
	}

	user1, user2 := match.OrderedUserIDs(userID, targetID)
	result, err := s.feedRepo.CreateLikeAtomic(ctx, like, user1, user2)
	if err != nil {
		return nil, err
	}

	// Legacy daily count (kept for backwards compatibility)
	s.feedRepo.IncrementDailyLikeCount(ctx, userID)

	// Send push notification for like received (only if like was created)
	if result.LikeCreated && s.notificationService != nil {
		if isSuperlike {
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

	// If match was created (not just returned existing), send notifications
	if result.MatchCreated && result.MatchID != nil {
		matchID := *result.MatchID

		// Notify both users about the match via WebSocket
		if s.hub != nil {
			s.hub.SendToUser(userID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     matchID,
					OtherUserID: targetID,
				},
			})
			s.hub.SendToUser(targetID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     matchID,
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

			go s.notificationService.SendNewMatchNotification(ctx, userID, targetName, matchID)
			go s.notificationService.SendNewMatchNotification(ctx, targetID, userName, matchID)
		}

		return &LikeResponse{
			Matched: true,
			MatchID: result.MatchID,
		}, nil
	}

	// Match already existed (race condition handled)
	if result.MatchID != nil {
		return &LikeResponse{
			Matched: true,
			MatchID: result.MatchID,
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
// Uses atomic transaction to prevent race conditions
func (s *Service) LikeWithMessage(ctx context.Context, userID, targetID uuid.UUID, message string) (*LikeResponse, error) {
	if userID == targetID {
		return nil, ErrCannotLikeSelf
	}

	// Check if target user is shadowbanned
	if s.userRepo != nil {
		isShadowbanned, err := s.userRepo.IsShadowbanned(ctx, targetID)
		if err != nil {
			return nil, err
		}
		if isShadowbanned {
			return &LikeResponse{Matched: false}, nil
		}
	}

	// Check if already liked
	existing, err := s.feedRepo.GetLike(ctx, userID, targetID)
	if err == nil && existing != nil {
		return nil, ErrAlreadyLiked
	}

	// Atomically check and use superlike credits
	if s.creditService != nil {
		if err := s.creditService.UseSuperlikeAtomic(ctx, userID); err != nil {
			return nil, ErrInsufficientLikes
		}
	}

	// Create like with message and check for match atomically
	like := &Like{
		ID:          uuid.New(),
		LikerID:     userID,
		LikedID:     targetID,
		IsSuperlike: true,
		CreatedAt:   time.Now(),
	}

	user1, user2 := match.OrderedUserIDs(userID, targetID)
	result, err := s.feedRepo.CreateLikeWithMessageAtomic(ctx, like, message, user1, user2)
	if err != nil {
		return nil, err
	}

	// Legacy daily count
	s.feedRepo.IncrementDailyLikeCount(ctx, userID)

	// Send push notification (only if like was created)
	if result.LikeCreated && s.notificationService != nil {
		likerProfile, _ := s.profileRepo.GetByUserID(ctx, userID)
		likerName := "Someone"
		if likerProfile != nil && likerProfile.Name != "" {
			likerName = likerProfile.Name
		}
		go s.notificationService.SendSuperLikeNotification(ctx, targetID, likerName)
	}

	// If match was created, send notifications
	if result.MatchCreated && result.MatchID != nil {
		matchID := *result.MatchID

		if s.hub != nil {
			s.hub.SendToUser(userID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     matchID,
					OtherUserID: targetID,
				},
			})
			s.hub.SendToUser(targetID, WSMessage{
				Type: EventMatchCreated,
				Payload: MatchCreatedPayload{
					MatchID:     matchID,
					OtherUserID: userID,
				},
			})
		}

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

			go s.notificationService.SendNewMatchNotification(ctx, userID, targetName, matchID)
			go s.notificationService.SendNewMatchNotification(ctx, targetID, userName, matchID)
		}

		return &LikeResponse{
			Matched: true,
			MatchID: result.MatchID,
		}, nil
	}

	if result.MatchID != nil {
		return &LikeResponse{
			Matched: true,
			MatchID: result.MatchID,
		}, nil
	}

	return &LikeResponse{
		Matched: false,
	}, nil
}
