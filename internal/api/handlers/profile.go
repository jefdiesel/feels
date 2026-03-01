package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/feels/feels/internal/repository"
	"github.com/feels/feels/internal/storage"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ProfileHandler struct {
	profileService *profile.Service
}

func NewProfileHandler(profileService *profile.Service) *ProfileHandler {
	return &ProfileHandler{profileService: profileService}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	resp, err := h.profileService.GetProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			jsonError(w, "profile not found", http.StatusNotFound)
			return
		}
		log.Printf("[ERROR] GetProfile failed for user %s: %v", userID, err)
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *ProfileHandler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req profile.CreateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	p, err := h.profileService.CreateProfile(r.Context(), userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrProfileExists):
			jsonError(w, "profile already exists", http.StatusConflict)
		case errors.Is(err, profile.ErrInvalidGender):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, profile.ErrInvalidDOB):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, profile.ErrTooYoung):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, profile.ErrInvalidKinkLevel):
			jsonError(w, err.Error(), http.StatusBadRequest)
		default:
			jsonError(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, p, http.StatusCreated)
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req profile.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	p, err := h.profileService.UpdateProfile(r.Context(), userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			jsonError(w, "profile not found", http.StatusNotFound)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, p, http.StatusOK)
}

func (h *ProfileHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	resp, err := h.profileService.GetProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			jsonError(w, "profile not found", http.StatusNotFound)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp.Preferences, http.StatusOK)
}

func (h *ProfileHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req profile.UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	prefs, err := h.profileService.UpdatePreferences(r.Context(), userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrPreferencesNotFound) {
			jsonError(w, "preferences not found", http.StatusNotFound)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, prefs, http.StatusOK)
}

func (h *ProfileHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(storage.MaxPhotoSize); err != nil {
		jsonError(w, "file too large", http.StatusRequestEntityTooLarge)
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		jsonError(w, "photo file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !storage.IsAllowedContentType(contentType) {
		jsonError(w, "invalid file type, must be jpeg, png, gif, or webp", http.StatusBadRequest)
		return
	}

	photo, err := h.profileService.AddPhoto(r.Context(), userID, file, header.Size, contentType)
	if err != nil {
		if errors.Is(err, repository.ErrMaxPhotos) {
			jsonError(w, "maximum 5 photos allowed", http.StatusBadRequest)
			return
		}
		jsonError(w, "failed to upload photo", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, photo, http.StatusCreated)
}

func (h *ProfileHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	photoIDStr := chi.URLParam(r, "id")
	photoID, err := uuid.Parse(photoIDStr)
	if err != nil {
		jsonError(w, "invalid photo id", http.StatusBadRequest)
		return
	}

	if err := h.profileService.DeletePhoto(r.Context(), userID, photoID); err != nil {
		if errors.Is(err, repository.ErrPhotoNotFound) {
			jsonError(w, "photo not found", http.StatusNotFound)
			return
		}
		jsonError(w, "failed to delete photo", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ProfileHandler) ReorderPhotos(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		PhotoIDs []uuid.UUID `json:"photo_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.PhotoIDs) == 0 {
		jsonError(w, "photo_ids required", http.StatusBadRequest)
		return
	}

	if err := h.profileService.ReorderPhotos(r.Context(), userID, req.PhotoIDs); err != nil {
		jsonError(w, "failed to reorder photos", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// VerifyProfile sets the verification badge on a user's profile
// Requires a quarterly or annual subscription
func (h *ProfileHandler) VerifyProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.profileService.VerifyProfile(r.Context(), userID); err != nil {
		switch {
		case errors.Is(err, profile.ErrVerificationUnavailable):
			jsonError(w, "verification requires a quarterly or annual subscription", http.StatusPaymentRequired)
		case errors.Is(err, profile.ErrAlreadyVerified):
			jsonError(w, "profile is already verified", http.StatusConflict)
		case errors.Is(err, repository.ErrProfileNotFound):
			jsonError(w, "profile not found", http.StatusNotFound)
		default:
			jsonError(w, "failed to verify profile", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, map[string]bool{"verified": true}, http.StatusOK)
}

// SubmitVerification uploads a verification selfie for manual review
func (h *ProfileHandler) SubmitVerification(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(storage.MaxPhotoSize); err != nil {
		jsonError(w, "file too large", http.StatusRequestEntityTooLarge)
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		jsonError(w, "photo file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !storage.IsAllowedContentType(contentType) {
		jsonError(w, "invalid file type, must be jpeg, png, gif, or webp", http.StatusBadRequest)
		return
	}

	if err := h.profileService.SubmitVerification(r.Context(), userID, file, header.Size, contentType); err != nil {
		switch {
		case errors.Is(err, profile.ErrAlreadyVerified):
			jsonError(w, "profile is already verified", http.StatusConflict)
		case errors.Is(err, profile.ErrVerificationAlreadyPending):
			jsonError(w, "verification already submitted and pending review", http.StatusConflict)
		default:
			jsonError(w, "failed to submit verification", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, map[string]string{"status": "pending"}, http.StatusOK)
}

// GetShareLink returns the user's shareable profile link
func (h *ProfileHandler) GetShareLink(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Use the host from the request or a configured base URL
	baseURL := "https://feelsfun.app"
	if host := r.Header.Get("X-Forwarded-Host"); host != "" {
		baseURL = "https://" + host
	}

	link, err := h.profileService.GetShareLink(r.Context(), userID, baseURL)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			jsonError(w, "profile not found", http.StatusNotFound)
			return
		}
		jsonError(w, "failed to get share link", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{
		"url":   link,
		"title": "Check out my profile on feels",
		"text":  "Connect with me on feels - a dating app that puts real connections first.",
	}, http.StatusOK)
}

// GetPublicProfile returns a limited public view of a profile (no auth required)
func (h *ProfileHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		jsonError(w, "share code required", http.StatusBadRequest)
		return
	}

	publicProfile, err := h.profileService.GetPublicProfile(r.Context(), code)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			jsonError(w, "profile not found", http.StatusNotFound)
			return
		}
		jsonError(w, "failed to get profile", http.StatusInternalServerError)
		return
	}

	// Add app store links for download
	jsonResponse(w, map[string]interface{}{
		"profile": publicProfile,
		"app_links": map[string]string{
			"ios":     "https://apps.apple.com/app/feels",
			"android": "https://play.google.com/store/apps/details?id=app.feels",
		},
	}, http.StatusOK)
}
