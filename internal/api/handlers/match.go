package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/match"
	"github.com/feels/feels/internal/repository"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MatchHandler struct {
	matchService *match.Service
}

func NewMatchHandler(matchService *match.Service) *MatchHandler {
	return &MatchHandler{matchService: matchService}
}

func (h *MatchHandler) GetMatches(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	matches, err := h.matchService.GetMatches(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to get matches", http.StatusInternalServerError)
		return
	}

	if matches == nil {
		matches = []match.MatchWithProfile{}
	}

	jsonResponse(w, matches, http.StatusOK)
}

func (h *MatchHandler) GetMatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		jsonError(w, "invalid match id", http.StatusBadRequest)
		return
	}

	m, err := h.matchService.GetMatch(r.Context(), matchID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMatchNotFound) {
			jsonError(w, "match not found", http.StatusNotFound)
			return
		}
		jsonError(w, "failed to get match", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, m, http.StatusOK)
}

func (h *MatchHandler) Unmatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		jsonError(w, "invalid match id", http.StatusBadRequest)
		return
	}

	if err := h.matchService.Unmatch(r.Context(), matchID, userID); err != nil {
		if errors.Is(err, repository.ErrNotInMatch) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to unmatch", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MatchHandler) Block(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	blockedIDStr := chi.URLParam(r, "id")
	blockedID, err := uuid.Parse(blockedIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	if err := h.matchService.Block(r.Context(), userID, blockedID); err != nil {
		if errors.Is(err, match.ErrCannotBlock) {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		jsonError(w, "failed to block", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MatchHandler) Unblock(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	blockedIDStr := chi.URLParam(r, "id")
	blockedID, err := uuid.Parse(blockedIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	if err := h.matchService.Unblock(r.Context(), userID, blockedID); err != nil {
		jsonError(w, "failed to unblock", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MatchHandler) Report(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	reportedIDStr := chi.URLParam(r, "id")
	reportedID, err := uuid.Parse(reportedIDStr)
	if err != nil {
		jsonError(w, "invalid user id", http.StatusBadRequest)
		return
	}

	var req match.ReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.matchService.Report(r.Context(), userID, reportedID, req.Reason, req.Details); err != nil {
		if errors.Is(err, match.ErrInvalidReason) {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		jsonError(w, "failed to report", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
