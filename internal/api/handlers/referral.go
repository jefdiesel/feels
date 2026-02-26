package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/referral"
	"github.com/google/uuid"
)

type ReferralService interface {
	GetOrCreateCode(ctx context.Context, userID uuid.UUID) (*referral.ReferralCode, error)
	RedeemCode(ctx context.Context, newUserID uuid.UUID, code string) error
	GetStats(ctx context.Context, userID uuid.UUID) (*referral.ReferralStats, error)
}

type ReferralHandler struct {
	service ReferralService
}

func NewReferralHandler(service ReferralService) *ReferralHandler {
	return &ReferralHandler{service: service}
}

// GetCode returns the user's referral code (creates one if doesn't exist)
func (h *ReferralHandler) GetCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	code, err := h.service.GetOrCreateCode(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to get referral code"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(code)
}

// RedeemCode redeems a referral code
func (h *ReferralHandler) RedeemCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, `{"error":"code is required"}`, http.StatusBadRequest)
		return
	}

	err := h.service.RedeemCode(r.Context(), userID, req.Code)
	if err != nil {
		switch err {
		case referral.ErrInvalidCode:
			http.Error(w, `{"error":"invalid referral code"}`, http.StatusBadRequest)
		case referral.ErrSelfReferral:
			http.Error(w, `{"error":"cannot use your own code"}`, http.StatusBadRequest)
		case referral.ErrAlreadyReferred:
			http.Error(w, `{"error":"already used a referral code"}`, http.StatusConflict)
		case referral.ErrCodeNotFound:
			http.Error(w, `{"error":"referral code not found"}`, http.StatusNotFound)
		default:
			http.Error(w, `{"error":"failed to redeem code"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Referral code applied! You've earned 3 days of premium.",
	})
}

// GetStats returns referral statistics
func (h *ReferralHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	stats, err := h.service.GetStats(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to get stats"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
