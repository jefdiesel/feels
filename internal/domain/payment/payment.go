package payment

import (
	"time"

	"github.com/google/uuid"
)

// PlanType defines subscription plan types
type PlanType string

const (
	PlanTypeMonthly   PlanType = "monthly"
	PlanTypeQuarterly PlanType = "quarterly"
	PlanTypeAnnual    PlanType = "annual"
)

// Plan defines a subscription plan
type Plan struct {
	Type        PlanType `json:"type"`
	Name        string   `json:"name"`
	PriceID     string   `json:"price_id"` // Stripe price ID
	Amount      int64    `json:"amount"`   // Amount in cents
	Currency    string   `json:"currency"`
	Interval    string   `json:"interval"`       // month, year
	IntervalCount int    `json:"interval_count"` // 1 for monthly, 3 for quarterly, 12 for annual
	Description string   `json:"description"`
}

// CheckoutSession represents a Stripe checkout session
type CheckoutSession struct {
	ID         string    `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	StripeID   string    `json:"stripe_id"`
	URL        string    `json:"url"`
	PlanType   PlanType  `json:"plan_type"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// Subscription represents a user's active subscription
type Subscription struct {
	ID                 uuid.UUID `json:"id"`
	UserID             uuid.UUID `json:"user_id"`
	StripeSubscriptionID string  `json:"stripe_subscription_id"`
	StripeCustomerID   string    `json:"stripe_customer_id"`
	PlanType           PlanType  `json:"plan_type"`
	Status             string    `json:"status"` // active, canceled, past_due
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CanceledAt         *time.Time `json:"canceled_at,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// CreateCheckoutRequest is the request to create a checkout session
type CreateCheckoutRequest struct {
	PlanType   PlanType `json:"plan_type"`
	SuccessURL string   `json:"success_url"`
	CancelURL  string   `json:"cancel_url"`
}

// CreateCheckoutResponse is the response from creating a checkout session
type CreateCheckoutResponse struct {
	CheckoutURL string `json:"checkout_url"`
	SessionID   string `json:"session_id"`
}

// WebhookEvent represents a Stripe webhook event
type WebhookEvent struct {
	Type string
	Data interface{}
}
