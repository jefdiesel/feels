package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/feed"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type FeedHandler struct {
	feedService *feed.Service
}

func NewFeedHandler(feedService *feed.Service) *FeedHandler {
	return &FeedHandler{feedService: feedService}
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

	// TODO: Check and deduct credits for superlike

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
