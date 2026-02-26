package referral

import (
	"time"

	"github.com/google/uuid"
)

// ReferralCode is a user's unique referral code
type ReferralCode struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
}

// Referral represents a successful referral
type Referral struct {
	ID                 uuid.UUID `json:"id"`
	ReferrerID         uuid.UUID `json:"referrer_id"`
	ReferredID         uuid.UUID `json:"referred_id"`
	Code               string    `json:"code"`
	ReferrerRewardDays int       `json:"referrer_reward_days"`
	ReferredRewardDays int       `json:"referred_reward_days"`
	ReferrerRewarded   bool      `json:"referrer_rewarded"`
	ReferredRewarded   bool      `json:"referred_rewarded"`
	CreatedAt          time.Time `json:"created_at"`
}

// ReferralStats contains referral statistics for a user
type ReferralStats struct {
	Code           string `json:"code"`
	TotalReferrals int    `json:"total_referrals"`
	PremiumDaysEarned int `json:"premium_days_earned"`
}

// Reward constants
const (
	ReferrerRewardDays = 7 // Referrer gets 7 days premium
	ReferredRewardDays = 3 // New user gets 3 days premium
)
