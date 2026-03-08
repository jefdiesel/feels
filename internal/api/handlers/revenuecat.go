package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/feels/feels/internal/repository"
)

// RevenueCat webhook event types
const (
	EventInitialPurchase       = "INITIAL_PURCHASE"
	EventRenewal               = "RENEWAL"
	EventCancellation          = "CANCELLATION"
	EventUncancellation        = "UNCANCELLATION"
	EventExpiration            = "EXPIRATION"
	EventBillingIssue          = "BILLING_ISSUE"
	EventProductChange         = "PRODUCT_CHANGE"
	EventSubscriptionPaused    = "SUBSCRIPTION_PAUSED"
	EventSubscriptionResumed   = "SUBSCRIPTION_EXTENDED"
	EventTransfer              = "TRANSFER"
)

// RevenueCatWebhookEvent represents the webhook payload from RevenueCat
type RevenueCatWebhookEvent struct {
	APIVersion string `json:"api_version"`
	Event      struct {
		Type                      string   `json:"type"`
		ID                        string   `json:"id"`
		AppUserID                 string   `json:"app_user_id"`
		OriginalAppUserID         string   `json:"original_app_user_id"`
		ProductID                 string   `json:"product_id"`
		EntitlementIDs            []string `json:"entitlement_ids"`
		PeriodType                string   `json:"period_type"`
		PurchasedAtMs             int64    `json:"purchased_at_ms"`
		ExpirationAtMs            int64    `json:"expiration_at_ms"`
		Environment               string   `json:"environment"`
		Store                     string   `json:"store"`
		IsTrialConversion         bool     `json:"is_trial_conversion"`
		CancellationReason        string   `json:"cancellation_reason,omitempty"`
		GracePeriodExpirationAtMs int64    `json:"grace_period_expiration_at_ms,omitempty"`
		AutoResumeAtMs            int64    `json:"auto_resume_at_ms,omitempty"`
		Price                     float64  `json:"price"`
		Currency                  string   `json:"currency"`
		TakehomePercentage        float64  `json:"takehome_percentage"`
	} `json:"event"`
}

type RevenueCatHandler struct {
	subscriptionRepo *repository.SubscriptionRepository
	webhookSecret    string
}

func NewRevenueCatHandler(subscriptionRepo *repository.SubscriptionRepository) *RevenueCatHandler {
	return &RevenueCatHandler{
		subscriptionRepo: subscriptionRepo,
		webhookSecret:    os.Getenv("REVENUECAT_WEBHOOK_AUTH"), // Authorization header value
	}
}

// HandleWebhook processes RevenueCat webhook events
func (h *RevenueCatHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[ERROR] RevenueCat webhook: failed to read body: %v", err)
		jsonError(w, "failed to read body", http.StatusBadRequest)
		return
	}

	// Verify auth header if configured (optional)
	if h.webhookSecret != "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != h.webhookSecret {
			log.Printf("[WARN] RevenueCat webhook: invalid auth header")
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}
	// No auth configured - webhook is open (RevenueCat IP filtering recommended for production)

	// Parse event
	var event RevenueCatWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("[ERROR] RevenueCat webhook: failed to parse event: %v", err)
		jsonError(w, "invalid event format", http.StatusBadRequest)
		return
	}

	log.Printf("[INFO] RevenueCat webhook: received event type=%s user=%s product=%s env=%s",
		event.Event.Type, event.Event.AppUserID, event.Event.ProductID, event.Event.Environment)

	// Process event
	switch event.Event.Type {
	case EventInitialPurchase, EventRenewal, EventUncancellation, EventSubscriptionResumed:
		err = h.handleSubscriptionActive(ctx, event)
	case EventCancellation:
		err = h.handleCancellation(ctx, event)
	case EventExpiration:
		err = h.handleExpiration(ctx, event)
	case EventBillingIssue:
		err = h.handleBillingIssue(ctx, event)
	case EventProductChange:
		err = h.handleProductChange(ctx, event)
	default:
		log.Printf("[INFO] RevenueCat webhook: unhandled event type: %s", event.Event.Type)
	}

	if err != nil {
		log.Printf("[ERROR] RevenueCat webhook: failed to process event: %v", err)
		// Return 200 anyway to prevent retries for processing errors
		// RevenueCat will retry on 5xx errors
	}

	jsonResponse(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *RevenueCatHandler) verifySignature(body []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write(body)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}

func (h *RevenueCatHandler) handleSubscriptionActive(ctx context.Context, event RevenueCatWebhookEvent) error {
	userID := event.Event.AppUserID

	// Determine plan type from product ID
	planType := h.productToPlanType(event.Event.ProductID)

	expiresAt := time.UnixMilli(event.Event.ExpirationAtMs)
	purchasedAt := time.UnixMilli(event.Event.PurchasedAtMs)

	log.Printf("[INFO] RevenueCat: activating subscription for user=%s plan=%s expires=%s",
		userID, planType, expiresAt.Format(time.RFC3339))

	// Upsert subscription in database
	return h.subscriptionRepo.UpsertRevenueCatSubscription(
		ctx,
		userID,
		planType,
		"active",
		event.Event.ProductID,
		event.Event.Store,
		purchasedAt,
		expiresAt,
	)
}

func (h *RevenueCatHandler) handleCancellation(ctx context.Context, event RevenueCatWebhookEvent) error {
	userID := event.Event.AppUserID

	log.Printf("[INFO] RevenueCat: subscription cancelled for user=%s reason=%s",
		userID, event.Event.CancellationReason)

	// Subscription is cancelled but still active until expiration
	// Update status to 'canceled' - user keeps access until period end
	return h.subscriptionRepo.UpdateRevenueCatSubscriptionStatus(
		ctx,
		userID,
		"canceled",
	)
}

func (h *RevenueCatHandler) handleExpiration(ctx context.Context, event RevenueCatWebhookEvent) error {
	userID := event.Event.AppUserID

	log.Printf("[INFO] RevenueCat: subscription expired for user=%s", userID)

	return h.subscriptionRepo.UpdateRevenueCatSubscriptionStatus(
		ctx,
		userID,
		"expired",
	)
}

func (h *RevenueCatHandler) handleBillingIssue(ctx context.Context, event RevenueCatWebhookEvent) error {
	userID := event.Event.AppUserID
	gracePeriodEnd := time.UnixMilli(event.Event.GracePeriodExpirationAtMs)

	log.Printf("[INFO] RevenueCat: billing issue for user=%s grace_period_ends=%s",
		userID, gracePeriodEnd.Format(time.RFC3339))

	// User is in grace period - they still have access
	return h.subscriptionRepo.UpdateRevenueCatSubscriptionStatus(
		ctx,
		userID,
		"billing_issue",
	)
}

func (h *RevenueCatHandler) handleProductChange(ctx context.Context, event RevenueCatWebhookEvent) error {
	userID := event.Event.AppUserID
	newPlanType := h.productToPlanType(event.Event.ProductID)

	log.Printf("[INFO] RevenueCat: product change for user=%s new_plan=%s",
		userID, newPlanType)

	return h.subscriptionRepo.UpdateRevenueCatSubscriptionPlan(
		ctx,
		userID,
		newPlanType,
		event.Event.ProductID,
	)
}

// productToPlanType maps RevenueCat product IDs to your internal plan types
func (h *RevenueCatHandler) productToPlanType(productID string) string {
	// TODO: Update these mappings when you create products in App Store Connect
	// Example product IDs: "feels_premium_monthly", "feels_premium_quarterly", "feels_premium_annual"
	switch productID {
	case "feels_premium_monthly", "feels_monthly":
		return "monthly"
	case "feels_premium_quarterly", "feels_quarterly":
		return "quarterly"
	case "feels_premium_annual", "feels_annual":
		return "annual"
	default:
		// Default to monthly if unknown
		log.Printf("[WARN] RevenueCat: unknown product ID: %s, defaulting to monthly", productID)
		return "monthly"
	}
}
