package credit

import (
	"time"

	"github.com/google/uuid"
)

// PlanType represents a subscription plan
type PlanType string

const (
	PlanStarter PlanType = "starter"
	PlanPlus    PlanType = "plus"
)

// PeriodType represents a billing period
type PeriodType string

const (
	PeriodMonthly   PeriodType = "monthly"
	PeriodQuarterly PeriodType = "quarterly"
)

// Plan pricing and credits
var PlanCredits = map[PlanType]map[PeriodType]int{
	PlanStarter: {
		PeriodMonthly:   100,
		PeriodQuarterly: 100,
	},
	PlanPlus: {
		PeriodMonthly:   300,
		PeriodQuarterly: 300,
	},
}

// Credit costs
const (
	CostSuperlike = 10
	CostLike      = 1
)

// Daily limits for free users
const (
	FreeDailyLikeLimit = 10
)

// Credit represents a user's credit balance
type Credit struct {
	UserID    uuid.UUID  `json:"user_id"`
	Balance   int        `json:"balance"`
	BonusLikes int       `json:"bonus_likes"`
	LastReset *time.Time `json:"last_reset,omitempty"`
}

// Subscription represents a user's active subscription
type Subscription struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	Plan           PlanType   `json:"plan"`
	Period         PeriodType `json:"period"`
	CreditsMonthly int        `json:"credits_monthly"`
	StartedAt      time.Time  `json:"started_at"`
	ExpiresAt      time.Time  `json:"expires_at"`
	AutoRenew      bool       `json:"auto_renew"`
}

// DailyLike tracks daily like usage for free users
type DailyLike struct {
	UserID uuid.UUID `json:"user_id"`
	Date   time.Time `json:"date"`
	Count  int       `json:"count"`
}

// BalanceResponse is the API response for credit balance
type BalanceResponse struct {
	Balance         int  `json:"balance"`
	BonusLikes      int  `json:"bonus_likes"`
	DailyLikesUsed  int  `json:"daily_likes_used"`
	DailyLikesLimit int  `json:"daily_likes_limit"`
	HasSubscription bool `json:"has_subscription"`
}

// SubscriptionResponse is the API response for subscription status
type SubscriptionResponse struct {
	Active         bool       `json:"active"`
	Plan           PlanType   `json:"plan,omitempty"`
	Period         PeriodType `json:"period,omitempty"`
	CreditsMonthly int        `json:"credits_monthly,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	AutoRenew      bool       `json:"auto_renew"`
}

// IsActive returns true if the subscription is currently active
func (s *Subscription) IsActive() bool {
	return time.Now().Before(s.ExpiresAt)
}

// DaysUntilExpiry returns the number of days until the subscription expires
func (s *Subscription) DaysUntilExpiry() int {
	return int(time.Until(s.ExpiresAt).Hours() / 24)
}
