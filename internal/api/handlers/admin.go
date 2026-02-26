package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/repository"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// AdminRepository interface for admin operations
type AdminRepository interface {
	GetPendingReports(ctx context.Context, limit int) ([]repository.AdminReport, error)
	GetReportByID(ctx context.Context, id uuid.UUID) (*repository.AdminReport, error)
	UpdateReportStatus(ctx context.Context, id uuid.UUID, status, actionTaken string, reviewerID uuid.UUID) error
	GetUserDetailsForAdmin(ctx context.Context, userID uuid.UUID) (*repository.AdminUserDetails, error)
	GetVerificationQueue(ctx context.Context, limit int) ([]repository.AdminVerificationRequest, error)
	UpdateVerificationStatus(ctx context.Context, userID uuid.UUID, status string) error
	GetModerationQueue(ctx context.Context, limit int) ([]repository.AdminModerationEntry, error)
	UpdateModerationAction(ctx context.Context, id uuid.UUID, action string) error
}

// UserModerationRepository interface for user moderation
type UserModerationRepository interface {
	SetModerationStatus(ctx context.Context, userID uuid.UUID, status, reason string) error
	GetModerationStatus(ctx context.Context, userID uuid.UUID) (string, error)
}

type AdminHandler struct {
	adminRepo AdminRepository
	userRepo  UserModerationRepository
}

func NewAdminHandler(adminRepo AdminRepository, userRepo UserModerationRepository) *AdminHandler {
	return &AdminHandler{
		adminRepo: adminRepo,
		userRepo:  userRepo,
	}
}

// GetPendingReports returns reports pending review
func (h *AdminHandler) GetPendingReports(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	reports, err := h.adminRepo.GetPendingReports(r.Context(), limit)
	if err != nil {
		http.Error(w, `{"error":"failed to get reports"}`, http.StatusInternalServerError)
		return
	}

	if reports == nil {
		reports = []repository.AdminReport{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reports": reports,
	})
}

// ActionOnReport handles admin action on a report
func (h *AdminHandler) ActionOnReport(w http.ResponseWriter, r *http.Request) {
	reportIDStr := chi.URLParam(r, "id")
	reportID, err := uuid.Parse(reportIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid report id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Action       string `json:"action"` // dismiss, warn, suspend, ban
		ActionReason string `json:"action_reason,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	validActions := map[string]bool{"dismiss": true, "warn": true, "suspend": true, "ban": true}
	if !validActions[req.Action] {
		http.Error(w, `{"error":"invalid action"}`, http.StatusBadRequest)
		return
	}

	// Get admin user ID from context
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Get the report to find reported user
	report, err := h.adminRepo.GetReportByID(r.Context(), reportID)
	if err != nil {
		http.Error(w, `{"error":"report not found"}`, http.StatusNotFound)
		return
	}

	// Apply action to reported user if not dismissing
	if req.Action != "dismiss" {
		var status string
		switch req.Action {
		case "warn":
			status = "warned"
		case "suspend":
			status = "suspended"
		case "ban":
			status = "shadowbanned"
		}
		if err := h.userRepo.SetModerationStatus(r.Context(), report.ReportedID, status, req.ActionReason); err != nil {
			http.Error(w, `{"error":"failed to update user status"}`, http.StatusInternalServerError)
			return
		}
	}

	// Update report status
	if err := h.adminRepo.UpdateReportStatus(r.Context(), reportID, "reviewed", req.Action, adminID); err != nil {
		http.Error(w, `{"error":"failed to update report"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetUserDetails returns detailed user info for admin
func (h *AdminHandler) GetUserDetails(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	user, err := h.adminRepo.GetUserDetailsForAdmin(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// ModerateUser changes a user's moderation status
func (h *AdminHandler) ModerateUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"` // active, warned, suspended, shadowbanned
		Reason string `json:"reason,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	validStatuses := map[string]bool{"active": true, "warned": true, "suspended": true, "shadowbanned": true}
	if !validStatuses[req.Status] {
		http.Error(w, `{"error":"invalid status"}`, http.StatusBadRequest)
		return
	}

	if err := h.userRepo.SetModerationStatus(r.Context(), userID, req.Status, req.Reason); err != nil {
		http.Error(w, `{"error":"failed to update status"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetVerificationQueue returns pending verification requests
func (h *AdminHandler) GetVerificationQueue(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	requests, err := h.adminRepo.GetVerificationQueue(r.Context(), limit)
	if err != nil {
		http.Error(w, `{"error":"failed to get verification queue"}`, http.StatusInternalServerError)
		return
	}

	if requests == nil {
		requests = []repository.AdminVerificationRequest{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"requests": requests,
	})
}

// ActionOnVerification approves or rejects a verification request
func (h *AdminHandler) ActionOnVerification(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Action string `json:"action"` // approve, reject
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	var status string
	switch req.Action {
	case "approve":
		status = "verified"
	case "reject":
		status = "rejected"
	default:
		http.Error(w, `{"error":"invalid action"}`, http.StatusBadRequest)
		return
	}

	if err := h.adminRepo.UpdateVerificationStatus(r.Context(), userID, status); err != nil {
		http.Error(w, `{"error":"failed to update verification"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetModerationQueue returns content flagged for review
func (h *AdminHandler) GetModerationQueue(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	entries, err := h.adminRepo.GetModerationQueue(r.Context(), limit)
	if err != nil {
		http.Error(w, `{"error":"failed to get moderation queue"}`, http.StatusInternalServerError)
		return
	}

	if entries == nil {
		entries = []repository.AdminModerationEntry{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"entries": entries,
	})
}

// ActionOnModeration handles admin action on flagged content
func (h *AdminHandler) ActionOnModeration(w http.ResponseWriter, r *http.Request) {
	entryIDStr := chi.URLParam(r, "id")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid entry id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Action string `json:"action"` // approve, remove, warn_user
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	validActions := map[string]bool{"approve": true, "remove": true, "warn_user": true}
	if !validActions[req.Action] {
		http.Error(w, `{"error":"invalid action"}`, http.StatusBadRequest)
		return
	}

	if err := h.adminRepo.UpdateModerationAction(r.Context(), entryID, req.Action); err != nil {
		http.Error(w, `{"error":"failed to update moderation entry"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
