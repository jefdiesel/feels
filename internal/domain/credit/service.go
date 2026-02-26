package credit

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInsufficientCredits = errors.New("insufficient credits")
	ErrDailyLimitReached   = errors.New("daily like limit reached")
	ErrNoActiveSubscription = errors.New("no active subscription")
)

type Repository interface {
	GetCredit(ctx context.Context, userID uuid.UUID) (*Credit, error)
	CreateCredit(ctx context.Context, userID uuid.UUID) error
	AddCredits(ctx context.Context, userID uuid.UUID, amount int) error
	DeductCredits(ctx context.Context, userID uuid.UUID, amount int) error
	AddBonusLikes(ctx context.Context, userID uuid.UUID, amount int) error
	UseBonusLike(ctx context.Context, userID uuid.UUID) error
	ResetMonthlyCredits(ctx context.Context, userID uuid.UUID, newBalance int) error
	GetSubscription(ctx context.Context, userID uuid.UUID) (*Subscription, error)
	CreateSubscription(ctx context.Context, sub *Subscription) error
	UpdateSubscriptionAutoRenew(ctx context.Context, subID uuid.UUID, autoRenew bool) error
	GetDailyLikes(ctx context.Context, userID uuid.UUID) (*DailyLike, error)
	IncrementDailyLikes(ctx context.Context, userID uuid.UUID) error
	CanUseDailyLike(ctx context.Context, userID uuid.UUID, limit int) (bool, int, error)
	HasSubscription(ctx context.Context, userID uuid.UUID) (bool, error)
	// Atomic operations to prevent race conditions
	UseBonusLikeAtomic(ctx context.Context, userID uuid.UUID) error
	UseDailyLikeAtomic(ctx context.Context, userID uuid.UUID, limit int) error
	DeductCreditsAtomic(ctx context.Context, userID uuid.UUID, amount int) error
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetBalance returns the user's credit balance and daily like status
func (s *Service) GetBalance(ctx context.Context, userID uuid.UUID) (*BalanceResponse, error) {
	credit, err := s.repo.GetCredit(ctx, userID)
	if err != nil {
		return nil, err
	}

	hasSub, err := s.repo.HasSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}

	dailyLikes, err := s.repo.GetDailyLikes(ctx, userID)
	if err != nil {
		return nil, err
	}

	resp := &BalanceResponse{
		Balance:         credit.Balance,
		BonusLikes:      credit.BonusLikes,
		DailyLikesUsed:  dailyLikes.Count,
		DailyLikesLimit: FreeDailyLikeLimit,
		HasSubscription: hasSub,
	}

	// Subscribers have unlimited daily likes
	if hasSub {
		resp.DailyLikesLimit = -1 // -1 means unlimited
	}

	return resp, nil
}

// GetSubscription returns the user's subscription status
func (s *Service) GetSubscription(ctx context.Context, userID uuid.UUID) (*SubscriptionResponse, error) {
	sub, err := s.repo.GetSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}

	if sub == nil {
		return &SubscriptionResponse{
			Active:    false,
			AutoRenew: false,
		}, nil
	}

	return &SubscriptionResponse{
		Active:         sub.IsActive(),
		Plan:           sub.Plan,
		Period:         sub.Period,
		CreditsMonthly: sub.CreditsMonthly,
		ExpiresAt:      &sub.ExpiresAt,
		AutoRenew:      sub.AutoRenew,
	}, nil
}

// CanLike checks if a user can perform a like (free or paid)
func (s *Service) CanLike(ctx context.Context, userID uuid.UUID) (bool, error) {
	// Check if subscriber
	hasSub, err := s.repo.HasSubscription(ctx, userID)
	if err != nil {
		return false, err
	}
	if hasSub {
		return true, nil // Subscribers can always like
	}

	// Check bonus likes first
	credit, err := s.repo.GetCredit(ctx, userID)
	if err != nil {
		return false, err
	}
	if credit.BonusLikes > 0 {
		return true, nil
	}

	// Check daily limit for free users
	canUse, _, err := s.repo.CanUseDailyLike(ctx, userID, FreeDailyLikeLimit)
	if err != nil {
		return false, err
	}
	return canUse, nil
}

// UseLike records a like usage
func (s *Service) UseLike(ctx context.Context, userID uuid.UUID) error {
	// Check if subscriber
	hasSub, err := s.repo.HasSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if hasSub {
		return nil // Subscribers don't use credits for likes
	}

	// Try bonus likes first
	credit, err := s.repo.GetCredit(ctx, userID)
	if err != nil {
		return err
	}
	if credit.BonusLikes > 0 {
		return s.repo.UseBonusLike(ctx, userID)
	}

	// Use daily like
	canUse, _, err := s.repo.CanUseDailyLike(ctx, userID, FreeDailyLikeLimit)
	if err != nil {
		return err
	}
	if !canUse {
		return ErrDailyLimitReached
	}

	return s.repo.IncrementDailyLikes(ctx, userID)
}

// CanSuperlike checks if a user can perform a superlike
func (s *Service) CanSuperlike(ctx context.Context, userID uuid.UUID) (bool, error) {
	credit, err := s.repo.GetCredit(ctx, userID)
	if err != nil {
		return false, err
	}
	return credit.Balance >= CostSuperlike, nil
}

// UseSuperlike deducts credits for a superlike
func (s *Service) UseSuperlike(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeductCredits(ctx, userID, CostSuperlike)
}

// AddBonusLikes adds bonus likes when queue is cleared
func (s *Service) AddBonusLikes(ctx context.Context, userID uuid.UUID, amount int) error {
	return s.repo.AddBonusLikes(ctx, userID, amount)
}

// CreateSubscription creates a new subscription for a user
func (s *Service) CreateSubscription(ctx context.Context, userID uuid.UUID, plan PlanType, period PeriodType) (*Subscription, error) {
	credits, ok := PlanCredits[plan][period]
	if !ok {
		return nil, errors.New("invalid plan or period")
	}

	now := time.Now()
	var expiresAt time.Time
	switch period {
	case PeriodMonthly:
		expiresAt = now.AddDate(0, 1, 0)
	case PeriodQuarterly:
		expiresAt = now.AddDate(0, 3, 0)
	}

	sub := &Subscription{
		ID:             uuid.New(),
		UserID:         userID,
		Plan:           plan,
		Period:         period,
		CreditsMonthly: credits,
		StartedAt:      now,
		ExpiresAt:      expiresAt,
		AutoRenew:      true,
	}

	if err := s.repo.CreateSubscription(ctx, sub); err != nil {
		return nil, err
	}

	// Add initial credits
	if err := s.repo.AddCredits(ctx, userID, credits); err != nil {
		return nil, err
	}

	return sub, nil
}

// ToggleAutoRenew toggles the auto-renew setting for a subscription
func (s *Service) ToggleAutoRenew(ctx context.Context, userID uuid.UUID) error {
	sub, err := s.repo.GetSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if sub == nil {
		return ErrNoActiveSubscription
	}

	return s.repo.UpdateSubscriptionAutoRenew(ctx, sub.ID, !sub.AutoRenew)
}

// InitializeUser sets up credits for a new user
func (s *Service) InitializeUser(ctx context.Context, userID uuid.UUID) error {
	return s.repo.CreateCredit(ctx, userID)
}

// UseLikeAtomic atomically checks and uses a like credit to prevent race conditions
func (s *Service) UseLikeAtomic(ctx context.Context, userID uuid.UUID) error {
	// Check if subscriber first (subscribers bypass limits)
	hasSub, err := s.repo.HasSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if hasSub {
		return nil // Subscribers don't use credits for likes
	}

	// Try to use bonus like atomically (returns error if none available)
	err = s.repo.UseBonusLikeAtomic(ctx, userID)
	if err == nil {
		return nil // Successfully used bonus like
	}

	// Fall back to daily like - this is atomic (check + increment in one query)
	return s.repo.UseDailyLikeAtomic(ctx, userID, FreeDailyLikeLimit)
}

// UseSuperlikeAtomic atomically checks and deducts credits for a superlike
func (s *Service) UseSuperlikeAtomic(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeductCreditsAtomic(ctx, userID, CostSuperlike)
}
