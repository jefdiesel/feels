package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/notification"
)

type NotificationHandler struct {
	notificationService *notification.Service
}

func NewNotificationHandler(notificationService *notification.Service) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

func (h *NotificationHandler) RegisterToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Token    string `json:"token"`
		Platform string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		jsonError(w, "token is required", http.StatusBadRequest)
		return
	}

	if req.Platform == "" {
		req.Platform = "unknown"
	}

	if err := h.notificationService.RegisterToken(r.Context(), userID, req.Token, req.Platform); err != nil {
		jsonError(w, "failed to register token", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *NotificationHandler) UnregisterToken(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		jsonError(w, "token is required", http.StatusBadRequest)
		return
	}

	if err := h.notificationService.UnregisterToken(r.Context(), req.Token); err != nil {
		jsonError(w, "failed to unregister token", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
