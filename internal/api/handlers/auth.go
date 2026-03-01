package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/user"
	"github.com/feels/feels/internal/email"
	"github.com/feels/feels/internal/repository"
	"github.com/google/uuid"
)

type AuthHandler struct {
	userService  *user.Service
	emailService *email.Service
	isDev        bool
}

func NewAuthHandler(userService *user.Service, emailService *email.Service, isDev bool) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		emailService: emailService,
		isDev:        isDev,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req user.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.Register(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrEmailExists):
			jsonError(w, "email already registered", http.StatusConflict)
		case errors.Is(err, user.ErrWeakPassword):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, user.ErrInvalidEmail):
			jsonError(w, err.Error(), http.StatusBadRequest)
		default:
			jsonError(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusCreated)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req user.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.Login(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrInvalidCredentials):
			jsonError(w, "invalid email or password", http.StatusUnauthorized)
		case errors.Is(err, user.ErrDeviceRequired):
			jsonError(w, "device_id is required", http.StatusBadRequest)
		case errors.Is(err, user.ErrTOTPRequired):
			jsonError(w, "2FA code required", http.StatusUnauthorized)
		case errors.Is(err, user.ErrInvalidTOTP):
			jsonError(w, "invalid 2FA code", http.StatusUnauthorized)
		default:
			jsonError(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req user.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, user.ErrInvalidToken) {
			jsonError(w, "invalid or expired refresh token", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req user.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.userService.Logout(r.Context(), req.RefreshToken); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) SendPhoneCode(w http.ResponseWriter, r *http.Request) {
	var req user.SendPhoneCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	uid, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.userService.SendPhoneCode(r.Context(), &uid, req.Phone); err != nil {
		switch {
		case errors.Is(err, user.ErrInvalidPhone):
			jsonError(w, "invalid US phone number", http.StatusBadRequest)
		case errors.Is(err, user.ErrPhoneBlocked):
			jsonError(w, "phone number is blocked", http.StatusForbidden)
		case errors.Is(err, user.ErrPhoneExists):
			jsonError(w, "phone number already registered", http.StatusConflict)
		default:
			jsonError(w, "failed to send code", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, map[string]string{"message": "verification code sent"}, http.StatusOK)
}

func (h *AuthHandler) VerifyPhone(w http.ResponseWriter, r *http.Request) {
	var req user.VerifyPhoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	uid, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.userService.VerifyPhone(r.Context(), uid, req.Phone, req.Code); err != nil {
		switch {
		case errors.Is(err, user.ErrInvalidCode):
			jsonError(w, "invalid verification code", http.StatusBadRequest)
		case errors.Is(err, user.ErrCodeExpired):
			jsonError(w, "verification code expired", http.StatusBadRequest)
		case errors.Is(err, user.ErrTooManyAttempts):
			jsonError(w, "too many attempts, request a new code", http.StatusTooManyRequests)
		default:
			jsonError(w, "verification failed", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, map[string]string{"message": "phone verified"}, http.StatusOK)
}

func (h *AuthHandler) Setup2FA(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	resp, err := h.userService.Setup2FA(r.Context(), uid)
	if err != nil {
		jsonError(w, "failed to setup 2FA", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// SendMagicLink sends a magic link to the user's email
func (h *AuthHandler) SendMagicLink(w http.ResponseWriter, r *http.Request) {
	var req user.SendMagicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	token, err := h.userService.SendMagicLink(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, user.ErrInvalidEmail) {
			jsonError(w, "invalid email format", http.StatusBadRequest)
			return
		}
		jsonError(w, "failed to send magic link", http.StatusInternalServerError)
		return
	}

	// Send the magic link email
	if h.emailService != nil {
		if err := h.emailService.SendMagicLink(r.Context(), req.Email, token, "Feels"); err != nil {
			// Log error but don't fail - user can retry
			// In dev mode, email service logs to console anyway
		}
	}

	// In development, return the token for testing
	if h.isDev {
		jsonResponse(w, map[string]string{
			"message": "magic link sent",
			"token":   token, // Only in dev mode
		}, http.StatusOK)
		return
	}

	jsonResponse(w, map[string]string{
		"message": "magic link sent",
	}, http.StatusOK)
}

// VerifyMagicLink verifies a magic link and returns auth tokens
func (h *AuthHandler) VerifyMagicLink(w http.ResponseWriter, r *http.Request) {
	var req user.VerifyMagicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.VerifyMagicLink(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrMagicLinkExpired):
			jsonError(w, "magic link expired", http.StatusBadRequest)
		case errors.Is(err, user.ErrMagicLinkUsed):
			jsonError(w, "magic link already used", http.StatusBadRequest)
		case errors.Is(err, user.ErrMagicLinkInvalid):
			jsonError(w, "invalid magic link", http.StatusBadRequest)
		case errors.Is(err, user.ErrDeviceRequired):
			jsonError(w, "device_id is required", http.StatusBadRequest)
		default:
			jsonError(w, "verification failed", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// SetPublicKey stores the user's public key for E2E encryption
func (h *AuthHandler) SetPublicKey(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req user.SetPublicKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.PublicKey == "" {
		jsonError(w, "public_key is required", http.StatusBadRequest)
		return
	}

	if err := h.userService.SetPublicKey(r.Context(), uid, &req); err != nil {
		jsonError(w, "failed to store public key", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"message": "public key stored"}, http.StatusOK)
}

// GetPublicKey retrieves a user's public key
func (h *AuthHandler) GetPublicKey(w http.ResponseWriter, r *http.Request) {
	targetUserID := r.URL.Query().Get("user_id")
	if targetUserID == "" {
		jsonError(w, "user_id query parameter required", http.StatusBadRequest)
		return
	}

	uid, err := uuid.Parse(targetUserID)
	if err != nil {
		jsonError(w, "invalid user_id", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.GetPublicKey(r.Context(), uid)
	if err != nil {
		jsonError(w, "public key not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

type errorResponse struct {
	Error string `json:"error"`
}

func jsonError(w http.ResponseWriter, message string, code int) {
	if code >= 500 {
		log.Printf("[ERROR] %d: %s", code, message)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(errorResponse{Error: message})
}

func jsonResponse(w http.ResponseWriter, data interface{}, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
