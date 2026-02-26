package referral

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidCode     = errors.New("invalid referral code")
	ErrSelfReferral    = errors.New("cannot use your own referral code")
	ErrAlreadyReferred = errors.New("you have already used a referral code")
	ErrCodeNotFound    = errors.New("referral code not found")
)

type Repository interface {
	GetCodeByUserID(ctx context.Context, userID uuid.UUID) (*ReferralCode, error)
	GetCodeByCode(ctx context.Context, code string) (*ReferralCode, error)
	CreateCode(ctx context.Context, code *ReferralCode) error
	CreateReferral(ctx context.Context, referral *Referral) error
	GetReferralByReferredID(ctx context.Context, referredID uuid.UUID) (*Referral, error)
	GetReferralsByReferrerID(ctx context.Context, referrerID uuid.UUID) ([]Referral, error)
	GetReferralStats(ctx context.Context, userID uuid.UUID) (*ReferralStats, error)
	MarkReferrerRewarded(ctx context.Context, referralID uuid.UUID) error
	MarkReferredRewarded(ctx context.Context, referralID uuid.UUID) error
}

// SubscriptionService interface for granting premium days
type SubscriptionService interface {
	AddPremiumDays(ctx context.Context, userID uuid.UUID, days int, reason string) error
}

type Service struct {
	repo        Repository
	subService  SubscriptionService
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SetSubscriptionService(ss SubscriptionService) {
	s.subService = ss
}

// GetOrCreateCode gets existing code or creates a new one for user
func (s *Service) GetOrCreateCode(ctx context.Context, userID uuid.UUID) (*ReferralCode, error) {
	// Try to get existing code
	code, err := s.repo.GetCodeByUserID(ctx, userID)
	if err == nil {
		return code, nil
	}

	// Generate new code
	newCode := &ReferralCode{
		ID:        uuid.New(),
		UserID:    userID,
		Code:      generateCode(),
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateCode(ctx, newCode); err != nil {
		return nil, err
	}

	return newCode, nil
}

// RedeemCode redeems a referral code for a new user
func (s *Service) RedeemCode(ctx context.Context, newUserID uuid.UUID, code string) error {
	code = strings.ToUpper(strings.TrimSpace(code))
	if len(code) < 6 {
		return ErrInvalidCode
	}

	// Check if user already used a referral code
	existing, _ := s.repo.GetReferralByReferredID(ctx, newUserID)
	if existing != nil {
		return ErrAlreadyReferred
	}

	// Find the referral code
	referralCode, err := s.repo.GetCodeByCode(ctx, code)
	if err != nil {
		return ErrCodeNotFound
	}

	// Can't refer yourself
	if referralCode.UserID == newUserID {
		return ErrSelfReferral
	}

	// Create the referral record
	referral := &Referral{
		ID:                 uuid.New(),
		ReferrerID:         referralCode.UserID,
		ReferredID:         newUserID,
		Code:               code,
		ReferrerRewardDays: ReferrerRewardDays,
		ReferredRewardDays: ReferredRewardDays,
		ReferrerRewarded:   false,
		ReferredRewarded:   false,
		CreatedAt:          time.Now(),
	}

	if err := s.repo.CreateReferral(ctx, referral); err != nil {
		return err
	}

	// Grant rewards if subscription service is available
	if s.subService != nil {
		// Grant referred user their bonus
		if err := s.subService.AddPremiumDays(ctx, newUserID, ReferredRewardDays, "referral_bonus"); err == nil {
			s.repo.MarkReferredRewarded(ctx, referral.ID)
		}

		// Grant referrer their bonus
		if err := s.subService.AddPremiumDays(ctx, referralCode.UserID, ReferrerRewardDays, "referral_reward"); err == nil {
			s.repo.MarkReferrerRewarded(ctx, referral.ID)
		}
	}

	return nil
}

// GetStats returns referral statistics for a user
func (s *Service) GetStats(ctx context.Context, userID uuid.UUID) (*ReferralStats, error) {
	return s.repo.GetReferralStats(ctx, userID)
}

// generateCode creates a random 8-character referral code
func generateCode() string {
	b := make([]byte, 5)
	rand.Read(b)
	code := base32.StdEncoding.EncodeToString(b)
	return code[:8]
}
