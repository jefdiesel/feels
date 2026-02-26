package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/feed"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// SubscriptionChecker interface for checking premium status
type SubscriptionChecker interface {
	HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error)
}

type FeedHandler struct {
	feedService         *feed.Service
	subscriptionChecker SubscriptionChecker
}

func NewFeedHandler(feedService *feed.Service) *FeedHandler {
	return &FeedHandler{feedService: feedService}
}

// SetSubscriptionChecker sets the subscription checker for premium features
func (h *FeedHandler) SetSubscriptionChecker(sc SubscriptionChecker) {
	h.subscriptionChecker = sc
}

func (h *FeedHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse limit from query
	limit := feed.DefaultFeedLimit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	resp, err := h.feedService.GetFeed(r.Context(), userID, limit)
	if err != nil {
		if errors.Is(err, feed.ErrProfileRequired) {
			jsonError(w, "profile required to use feed", http.StatusPreconditionRequired)
			return
		}
		jsonError(w, "failed to get feed", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *FeedHandler) Like(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetIDStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	resp, err := h.feedService.Like(r.Context(), userID, targetID, false)
	if err != nil {
		switch {
		case errors.Is(err, feed.ErrCannotLikeSelf):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, feed.ErrAlreadyLiked):
			jsonError(w, err.Error(), http.StatusConflict)
		case errors.Is(err, feed.ErrInsufficientLikes):
			jsonError(w, err.Error(), http.StatusPaymentRequired)
		default:
			jsonError(w, "failed to like", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *FeedHandler) Superlike(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetIDStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	resp, err := h.feedService.Like(r.Context(), userID, targetID, true)
	if err != nil {
		switch {
		case errors.Is(err, feed.ErrCannotLikeSelf):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, feed.ErrAlreadyLiked):
			jsonError(w, err.Error(), http.StatusConflict)
		case errors.Is(err, feed.ErrInsufficientLikes):
			jsonError(w, err.Error(), http.StatusPaymentRequired)
		default:
			jsonError(w, "failed to superlike", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *FeedHandler) Pass(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetIDStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	if err := h.feedService.Pass(r.Context(), userID, targetID); err != nil {
		if errors.Is(err, feed.ErrCannotLikeSelf) {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		jsonError(w, "failed to pass", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetDailyPicks returns curated daily picks for the user
func (h *FeedHandler) GetDailyPicks(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user has premium subscription
	isPremium := false
	if h.subscriptionChecker != nil {
		hasSubscription, err := h.subscriptionChecker.HasActiveSubscription(r.Context(), userID)
		if err == nil && hasSubscription {
			isPremium = true
		}
	}

	resp, err := h.feedService.GetDailyPicks(r.Context(), userID, isPremium)
	if err != nil {
		if errors.Is(err, feed.ErrProfileRequired) {
			jsonError(w, "profile required to use feed", http.StatusPreconditionRequired)
			return
		}
		jsonError(w, "failed to get daily picks", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// Rewind undoes the last pass action
func (h *FeedHandler) Rewind(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user has premium subscription
	if h.subscriptionChecker != nil {
		hasSubscription, err := h.subscriptionChecker.HasActiveSubscription(r.Context(), userID)
		if err != nil || !hasSubscription {
			jsonError(w, "rewind requires premium subscription", http.StatusPaymentRequired)
			return
		}
	}

	profile, err := h.feedService.Rewind(r.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, feed.ErrNoRewindAvailable):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, feed.ErrRewindExpired):
			jsonError(w, err.Error(), http.StatusBadRequest)
		default:
			jsonError(w, "failed to rewind", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, profile, http.StatusOK)
}

// SuperlikeWithMessage handles superlike with an attached message
func (h *FeedHandler) SuperlikeWithMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetIDStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	// Check if user has premium subscription
	if h.subscriptionChecker != nil {
		hasSubscription, err := h.subscriptionChecker.HasActiveSubscription(r.Context(), userID)
		if err != nil || !hasSubscription {
			jsonError(w, "superlike with message requires premium subscription", http.StatusPaymentRequired)
			return
		}
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate message length
	if len(req.Message) > 140 {
		jsonError(w, "message must be 140 characters or less", http.StatusBadRequest)
		return
	}

	resp, err := h.feedService.LikeWithMessage(r.Context(), userID, targetID, req.Message)
	if err != nil {
		switch {
		case errors.Is(err, feed.ErrCannotLikeSelf):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, feed.ErrAlreadyLiked):
			jsonError(w, err.Error(), http.StatusConflict)
		case errors.Is(err, feed.ErrInsufficientLikes):
			jsonError(w, err.Error(), http.StatusPaymentRequired)
		default:
			jsonError(w, "failed to superlike", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}
