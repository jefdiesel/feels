package payment

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	"github.com/stripe/stripe-go/v76/subscription"
)

var (
	ErrInvalidPlan      = errors.New("invalid plan type")
	ErrNoSubscription   = errors.New("no active subscription")
	ErrAlreadySubscribed = errors.New("already has an active subscription")
)

// Plans defines available subscription plans
// These would be configured with actual Stripe price IDs
var Plans = map[PlanType]Plan{
	PlanTypeMonthly: {
		Type:          PlanTypeMonthly,
		Name:          "Premium Monthly",
		PriceID:       "", // Set from config
		Amount:        1499, // $14.99
		Currency:      "usd",
		Interval:      "month",
		IntervalCount: 1,
		Description:   "Unlimited likes, see who likes you, rewind",
	},
	PlanTypeQuarterly: {
		Type:          PlanTypeQuarterly,
		Name:          "Premium Quarterly",
		PriceID:       "", // Set from config
		Amount:        2999, // $29.99 (~$10/month)
		Currency:      "usd",
		Interval:      "month",
		IntervalCount: 3,
		Description:   "3 months of premium + profile verification",
	},
	PlanTypeAnnual: {
		Type:          PlanTypeAnnual,
		Name:          "Premium Annual",
		PriceID:       "", // Set from config
		Amount:        7999, // $79.99 (~$6.67/month)
		Currency:      "usd",
		Interval:      "year",
		IntervalCount: 1,
		Description:   "Best value + priority support + profile verification",
	},
}

type Repository interface {
	SaveSubscription(ctx context.Context, sub *Subscription) error
	GetSubscriptionByUserID(ctx context.Context, userID uuid.UUID) (*Subscription, error)
	GetSubscriptionByStripeID(ctx context.Context, stripeID string) (*Subscription, error)
	UpdateSubscription(ctx context.Context, sub *Subscription) error
	GetStripeCustomerID(ctx context.Context, userID uuid.UUID) (string, error)
	SaveStripeCustomerID(ctx context.Context, userID uuid.UUID, customerID string) error
}

type UserRepository interface {
	GetEmail(ctx context.Context, userID uuid.UUID) (string, error)
}

type Config struct {
	SecretKey         string
	WebhookSecret     string
	MonthlyPriceID    string
	QuarterlyPriceID  string
	AnnualPriceID     string
}

type Service struct {
	repo     Repository
	userRepo UserRepository
	config   Config
}

func NewService(repo Repository, userRepo UserRepository, config Config) *Service {
	stripe.Key = config.SecretKey

	// Set price IDs from config
	if monthly, ok := Plans[PlanTypeMonthly]; ok {
		monthly.PriceID = config.MonthlyPriceID
		Plans[PlanTypeMonthly] = monthly
	}
	if quarterly, ok := Plans[PlanTypeQuarterly]; ok {
		quarterly.PriceID = config.QuarterlyPriceID
		Plans[PlanTypeQuarterly] = quarterly
	}
	if annual, ok := Plans[PlanTypeAnnual]; ok {
		annual.PriceID = config.AnnualPriceID
		Plans[PlanTypeAnnual] = annual
	}

	return &Service{
		repo:     repo,
		userRepo: userRepo,
		config:   config,
	}
}

// GetPlans returns available subscription plans
func (s *Service) GetPlans() map[PlanType]Plan {
	return Plans
}

// HasQualifyingSubscription checks if user has a quarterly or annual subscription
// This is used for profile verification eligibility
func (s *Service) HasQualifyingSubscription(ctx context.Context, userID uuid.UUID) (bool, error) {
	sub, err := s.repo.GetSubscriptionByUserID(ctx, userID)
	if err != nil {
		if err == ErrNoSubscription {
			return false, nil
		}
		return false, err
	}

	// Check if subscription is active and is quarterly or annual
	if sub.Status != "active" {
		return false, nil
	}

	// Quarterly and annual plans qualify for verification
	return sub.PlanType == PlanTypeQuarterly || sub.PlanType == PlanTypeAnnual, nil
}

// HasActiveSubscription checks if user has any active subscription
func (s *Service) HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error) {
	sub, err := s.repo.GetSubscriptionByUserID(ctx, userID)
	if err != nil {
		if err == ErrNoSubscription {
			return false, nil
		}
		return false, err
	}
	return sub.Status == "active", nil
}

// CreateCheckoutSession creates a Stripe checkout session
func (s *Service) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, req *CreateCheckoutRequest) (*CreateCheckoutResponse, error) {
	// Validate plan
	plan, ok := Plans[req.PlanType]
	if !ok || plan.PriceID == "" {
		return nil, ErrInvalidPlan
	}

	// Check if user already has an active subscription
	existingSub, err := s.repo.GetSubscriptionByUserID(ctx, userID)
	if err == nil && existingSub.Status == "active" {
		return nil, ErrAlreadySubscribed
	}

	// Get or create Stripe customer
	customerID, err := s.getOrCreateCustomer(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Create checkout session
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(plan.PriceID),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(req.SuccessURL),
		CancelURL:  stripe.String(req.CancelURL),
		Metadata: map[string]string{
			"user_id":   userID.String(),
			"plan_type": string(req.PlanType),
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, err
	}

	return &CreateCheckoutResponse{
		CheckoutURL: sess.URL,
		SessionID:   sess.ID,
	}, nil
}

// CreatePortalSession creates a Stripe billing portal session
func (s *Service) CreatePortalSession(ctx context.Context, userID uuid.UUID, returnURL string) (string, error) {
	customerID, err := s.repo.GetStripeCustomerID(ctx, userID)
	if err != nil {
		return "", err
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}

	sess, err := portalsession.New(params)
	if err != nil {
		return "", err
	}

	return sess.URL, nil
}

// GetSubscription gets a user's current subscription
func (s *Service) GetSubscription(ctx context.Context, userID uuid.UUID) (*Subscription, error) {
	return s.repo.GetSubscriptionByUserID(ctx, userID)
}

// CancelSubscription cancels a user's subscription at period end
func (s *Service) CancelSubscription(ctx context.Context, userID uuid.UUID) error {
	sub, err := s.repo.GetSubscriptionByUserID(ctx, userID)
	if err != nil {
		return ErrNoSubscription
	}

	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	}

	_, err = subscription.Update(sub.StripeSubscriptionID, params)
	if err != nil {
		return err
	}

	now := time.Now()
	sub.CanceledAt = &now
	sub.UpdatedAt = now
	return s.repo.UpdateSubscription(ctx, sub)
}

// HandleWebhook processes Stripe webhook events
func (s *Service) HandleWebhook(ctx context.Context, event *stripe.Event) error {
	switch event.Type {
	case "checkout.session.completed":
		return s.handleCheckoutCompleted(ctx, event)
	case "customer.subscription.updated":
		return s.handleSubscriptionUpdated(ctx, event)
	case "customer.subscription.deleted":
		return s.handleSubscriptionDeleted(ctx, event)
	case "invoice.payment_failed":
		return s.handlePaymentFailed(ctx, event)
	}
	return nil
}

func (s *Service) handleCheckoutCompleted(ctx context.Context, event *stripe.Event) error {
	sess := event.Data.Object
	userIDStr, _ := sess["metadata"].(map[string]interface{})["user_id"].(string)
	planType, _ := sess["metadata"].(map[string]interface{})["plan_type"].(string)
	subscriptionID, _ := sess["subscription"].(string)
	customerID, _ := sess["customer"].(string)

	if userIDStr == "" || subscriptionID == "" {
		return nil
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return err
	}

	// Get subscription details from Stripe
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return err
	}

	// Save subscription
	newSub := &Subscription{
		ID:                   uuid.New(),
		UserID:               userID,
		StripeSubscriptionID: subscriptionID,
		StripeCustomerID:     customerID,
		PlanType:             PlanType(planType),
		Status:               string(sub.Status),
		CurrentPeriodStart:   time.Unix(sub.CurrentPeriodStart, 0),
		CurrentPeriodEnd:     time.Unix(sub.CurrentPeriodEnd, 0),
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	return s.repo.SaveSubscription(ctx, newSub)
}

func (s *Service) handleSubscriptionUpdated(ctx context.Context, event *stripe.Event) error {
	subData := event.Data.Object
	subscriptionID, _ := subData["id"].(string)

	existing, err := s.repo.GetSubscriptionByStripeID(ctx, subscriptionID)
	if err != nil {
		return nil // Subscription not in our system
	}

	status, _ := subData["status"].(string)
	periodStart, _ := subData["current_period_start"].(float64)
	periodEnd, _ := subData["current_period_end"].(float64)

	existing.Status = status
	existing.CurrentPeriodStart = time.Unix(int64(periodStart), 0)
	existing.CurrentPeriodEnd = time.Unix(int64(periodEnd), 0)
	existing.UpdatedAt = time.Now()

	return s.repo.UpdateSubscription(ctx, existing)
}

func (s *Service) handleSubscriptionDeleted(ctx context.Context, event *stripe.Event) error {
	subData := event.Data.Object
	subscriptionID, _ := subData["id"].(string)

	existing, err := s.repo.GetSubscriptionByStripeID(ctx, subscriptionID)
	if err != nil {
		return nil
	}

	now := time.Now()
	existing.Status = "canceled"
	existing.CanceledAt = &now
	existing.UpdatedAt = now

	return s.repo.UpdateSubscription(ctx, existing)
}

func (s *Service) handlePaymentFailed(ctx context.Context, event *stripe.Event) error {
	invoice := event.Data.Object
	subscriptionID, _ := invoice["subscription"].(string)

	existing, err := s.repo.GetSubscriptionByStripeID(ctx, subscriptionID)
	if err != nil {
		return nil
	}

	existing.Status = "past_due"
	existing.UpdatedAt = time.Now()

	return s.repo.UpdateSubscription(ctx, existing)
}

func (s *Service) getOrCreateCustomer(ctx context.Context, userID uuid.UUID) (string, error) {
	// Check if we have a customer ID stored
	customerID, err := s.repo.GetStripeCustomerID(ctx, userID)
	if err == nil && customerID != "" {
		return customerID, nil
	}

	// Get user email
	email, err := s.userRepo.GetEmail(ctx, userID)
	if err != nil {
		return "", err
	}

	// Create Stripe customer
	params := &stripe.CustomerParams{
		Email: stripe.String(email),
		Metadata: map[string]string{
			"user_id": userID.String(),
		},
	}

	cust, err := customer.New(params)
	if err != nil {
		return "", err
	}

	// Save customer ID
	if err := s.repo.SaveStripeCustomerID(ctx, userID, cust.ID); err != nil {
		return "", err
	}

	return cust.ID, nil
}
