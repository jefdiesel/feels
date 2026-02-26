package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/payment"
	"github.com/stripe/stripe-go/v76/webhook"
)

type PaymentHandler struct {
	paymentService *payment.Service
	webhookSecret  string
}

func NewPaymentHandler(paymentService *payment.Service, webhookSecret string) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
		webhookSecret:  webhookSecret,
	}
}

// GetPlans returns available subscription plans
func (h *PaymentHandler) GetPlans(w http.ResponseWriter, r *http.Request) {
	plans := h.paymentService.GetPlans()
	jsonResponse(w, plans, http.StatusOK)
}

// CreateCheckout creates a Stripe checkout session
func (h *PaymentHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req payment.CreateCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.paymentService.CreateCheckoutSession(r.Context(), userID, &req)
	if err != nil {
		if err == payment.ErrInvalidPlan {
			jsonError(w, "invalid plan", http.StatusBadRequest)
			return
		}
		if err == payment.ErrAlreadySubscribed {
			jsonError(w, "already subscribed", http.StatusConflict)
			return
		}
		jsonError(w, "failed to create checkout", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// CreatePortal creates a Stripe billing portal session
func (h *PaymentHandler) CreatePortal(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ReturnURL string `json:"return_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	url, err := h.paymentService.CreatePortalSession(r.Context(), userID, req.ReturnURL)
	if err != nil {
		jsonError(w, "failed to create portal session", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"url": url}, http.StatusOK)
}

// GetSubscription returns the user's current subscription
func (h *PaymentHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sub, err := h.paymentService.GetSubscription(r.Context(), userID)
	if err != nil {
		if err == payment.ErrNoSubscription {
			jsonResponse(w, map[string]interface{}{"subscription": nil}, http.StatusOK)
			return
		}
		jsonError(w, "failed to get subscription", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{"subscription": sub}, http.StatusOK)
}

// CancelSubscription cancels the user's subscription
func (h *PaymentHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.paymentService.CancelSubscription(r.Context(), userID); err != nil {
		if err == payment.ErrNoSubscription {
			jsonError(w, "no active subscription", http.StatusNotFound)
			return
		}
		jsonError(w, "failed to cancel subscription", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Webhook handles Stripe webhook events
func (h *PaymentHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "failed to read body", http.StatusBadRequest)
		return
	}

	// Verify webhook signature
	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sigHeader, h.webhookSecret)
	if err != nil {
		jsonError(w, "invalid signature", http.StatusBadRequest)
		return
	}

	// Process webhook
	if err := h.paymentService.HandleWebhook(r.Context(), &event); err != nil {
		jsonError(w, "failed to process webhook", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
