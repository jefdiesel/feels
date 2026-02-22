package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/feels/feels/internal/domain/user"
	"github.com/feels/feels/internal/repository"
	"github.com/google/uuid"
)

type AuthHandler struct {
	userService *user.Service
}

func NewAuthHandler(userService *user.Service) *AuthHandler {
	return &AuthHandler{userService: userService}
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
		if errors.Is(err, user.ErrInvalidCredentials) {
			jsonError(w, "invalid email or password", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal server error", http.StatusInternalServerError)
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

	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		jsonError(w, "invalid user", http.StatusBadRequest)
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

	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		jsonError(w, "invalid user", http.StatusBadRequest)
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
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		jsonError(w, "invalid user", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.Setup2FA(r.Context(), uid)
	if err != nil {
		jsonError(w, "failed to setup 2FA", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

type errorResponse struct {
	Error string `json:"error"`
}

func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(errorResponse{Error: message})
}

func jsonResponse(w http.ResponseWriter, data interface{}, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
