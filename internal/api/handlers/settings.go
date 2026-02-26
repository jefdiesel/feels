package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/settings"
)

type SettingsHandler struct {
	settingsService *settings.Service
}

func NewSettingsHandler(settingsService *settings.Service) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

func (h *SettingsHandler) GetNotificationSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	settings, err := h.settingsService.GetNotificationSettings(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, settings, http.StatusOK)
}

func (h *SettingsHandler) UpdateNotificationSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req settings.NotificationSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.settingsService.UpdateNotificationSettings(r.Context(), userID, &req); err != nil {
		jsonError(w, "failed to update settings", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SettingsHandler) GetPrivacySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	settings, err := h.settingsService.GetPrivacySettings(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to get settings", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, settings, http.StatusOK)
}

func (h *SettingsHandler) UpdatePrivacySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req settings.PrivacySettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.settingsService.UpdatePrivacySettings(r.Context(), userID, &req); err != nil {
		jsonError(w, "failed to update settings", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
