package handlers

import (
	"context"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/repository"
	"github.com/google/uuid"
)

type AnalyticsHandler struct {
	analyticsRepo *repository.AnalyticsRepository
	paymentRepo   PaymentChecker
}

// PaymentChecker interface for checking subscription status
type PaymentChecker interface {
	HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error)
}

func NewAnalyticsHandler(analyticsRepo *repository.AnalyticsRepository, paymentChecker PaymentChecker) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsRepo: analyticsRepo,
		paymentRepo:   paymentChecker,
	}
}

// GetProfileAnalytics returns analytics for the authenticated user's profile
func (h *AnalyticsHandler) GetProfileAnalytics(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user has premium for detailed analytics
	isPremium := false
	if h.paymentRepo != nil {
		hasSubscription, err := h.paymentRepo.HasActiveSubscription(r.Context(), userID)
		if err == nil && hasSubscription {
			isPremium = true
		}
	}

	analytics, err := h.analyticsRepo.GetProfileAnalytics(r.Context(), userID, isPremium)
	if err != nil {
		jsonError(w, "failed to get analytics", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, analytics, http.StatusOK)
}
