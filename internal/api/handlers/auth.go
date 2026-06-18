package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/feels/feels/internal/domain/user"
	"github.com/feels/feels/internal/email"
	"github.com/feels/feels/internal/repository"
	"github.com/google/uuid"
)

type AuthHandler struct {
	userService          *user.Service
	profileService       *profile.Service
	emailService         *email.Service
	isDev                bool
	imessageServiceToken string
}

func NewAuthHandler(userService *user.Service, profileService *profile.Service, emailService *email.Service, isDev bool) *AuthHandler {
	return &AuthHandler{
		userService:    userService,
		profileService: profileService,
		emailService:   emailService,
		isDev:          isDev,
	}
}

// SetIMessageServiceToken enables the iMessage handle-auth endpoint. When empty
// the endpoint rejects all callers.
func (h *AuthHandler) SetIMessageServiceToken(token string) {
	h.imessageServiceToken = token
}

// IMessageAuthRequest is sent by the trusted iMessage bot to mint a session for
// a handle it has observed messaging the bot.
type IMessageAuthRequest struct {
	Handle string `json:"handle"`
}

// IMessageAuth authenticates by iMessage handle. It is NOT user-facing: it must
// be called only by the feels iMessage bot, authorized via the
// X-Feels-Service-Token header matching IMESSAGE_SERVICE_TOKEN. The bot vouches
// that it saw the inbound message arrive from this handle, which is what stands
// in for OTP verification.
func (h *AuthHandler) IMessageAuth(w http.ResponseWriter, r *http.Request) {
	if h.imessageServiceToken == "" {
		jsonError(w, "imessage auth not enabled", http.StatusServiceUnavailable)
		return
	}
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Feels-Service-Token")), []byte(h.imessageServiceToken)) != 1 {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req IMessageAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Handle) == "" {
		jsonError(w, "handle required", http.StatusBadRequest)
		return
	}

	u, isNew, err := h.userService.GetOrCreateByIMessageHandle(r.Context(), req.Handle, "imessage")
	if err != nil {
		log.Printf("[AUTH] imessage auth failed for handle %s: %v", req.Handle, err)
		jsonError(w, "failed to authenticate", http.StatusInternalServerError)
		return
	}

	authResp, err := h.userService.GenerateTokens(r.Context(), u.ID, "imessage:"+req.Handle, "imessage")
	if err != nil {
		jsonError(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, user.MagicLinkAuthResponse{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		ExpiresIn:    authResp.ExpiresIn,
		IsNewUser:    isNew,
	}, http.StatusOK)
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
	var req struct {
		Email    string `json:"email"`
		Platform string `json:"platform"` // "web" for web dashboard, empty for mobile app
	}
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
		if req.Platform == "web" {
			// Send web-specific magic link that redirects to web dashboard
			if err := h.emailService.SendWebMagicLink(r.Context(), req.Email, token, "Feels", "https://feelsfun.app"); err != nil {
				log.Printf("[Auth] Failed to send web magic link: %v", err)
			}
		} else {
			// Send mobile app magic link
			if err := h.emailService.SendMagicLink(r.Context(), req.Email, token, "Feels"); err != nil {
				log.Printf("[Auth] Failed to send magic link: %v", err)
			}
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
		case errors.Is(err, user.ErrDeviceRegistered):
			jsonError(w, "this device already has an account - please log in instead", http.StatusConflict)
		default:
			jsonError(w, "verification failed", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// ClearAllDevices clears all device IDs (for testing)
func (h *AuthHandler) ClearAllDevices(w http.ResponseWriter, r *http.Request) {
	// This is a temporary endpoint for testing - remove in production
	if err := h.userService.ClearAllDeviceIDs(r.Context()); err != nil {
		jsonError(w, "failed to clear devices", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"status": "cleared"}, http.StatusOK)
}

// AppleAuth handles Sign in with Apple
func (h *AuthHandler) AppleAuth(w http.ResponseWriter, r *http.Request) {
	var req user.AppleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.userService.AuthenticateWithApple(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrDeviceRequired):
			jsonError(w, "device_id is required", http.StatusBadRequest)
		case errors.Is(err, user.ErrDeviceRegistered):
			jsonError(w, "this device already has an account - please log in instead", http.StatusConflict)
		default:
			log.Printf("[Auth] Apple auth error: %v", err)
			jsonError(w, "authentication failed", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

// DeleteAccount permanently deletes the authenticated user's account
func (h *AuthHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.userService.DeleteAccount(r.Context(), userID); err != nil {
		log.Printf("[Auth] DeleteAccount error for user %s: %v", userID, err)
		jsonError(w, "failed to delete account", http.StatusInternalServerError)
		return
	}

	log.Printf("[Auth] Account deleted: %s", userID)
	jsonResponse(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// MagicLinkRedirect handles the web redirect to the app deep link
// This is called when the user clicks the link in their email
func (h *AuthHandler) MagicLinkRedirect(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Missing token", http.StatusBadRequest)
		return
	}

	// Redirect to the app using the custom URL scheme
	safeToken := url.QueryEscape(token)
	appLink := fmt.Sprintf("feelsfun://magic?token=%s", safeToken)
	displayToken := html.EscapeString(token)
	safeAppLink := html.EscapeString(appLink)

	// Return an HTML page that attempts the redirect and shows a fallback
	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening Feels...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0a0a0a;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #e85d75; margin-bottom: 20px; }
    p { color: #888; margin-bottom: 30px; }
    a {
      display: inline-block;
      background-color: #e85d75;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
    }
    .code {
      background: #1a1a1a;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 24px;
      letter-spacing: 4px;
      margin: 20px 0;
      user-select: all;
    }
  </style>
  <script>
    // Try to open the app immediately
    window.location.href = "%s";

    // If still here after 2 seconds, show the manual option
    setTimeout(function() {
      document.getElementById('fallback').style.display = 'block';
    }, 2000);
  </script>
</head>
<body>
  <h1>feels</h1>
  <p>Opening the app...</p>

  <div id="fallback" style="display: none;">
    <p>If the app didn't open, copy this code and paste it in the app:</p>
    <div class="code">%s</div>
    <p style="margin-top: 30px;">
      <a href="%s">Try Again</a>
    </p>
  </div>
</body>
</html>`, safeAppLink, displayToken, safeAppLink)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(htmlContent))
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

// CurrentUserResponse combines user auth data with profile data
type CurrentUserResponse struct {
	ID            uuid.UUID         `json:"id"`
	Email         string            `json:"email"`
	Phone         *string           `json:"phone,omitempty"`
	PhoneVerified bool              `json:"phone_verified"`
	TOTPEnabled   bool              `json:"totp_enabled"`
	Name          string            `json:"name,omitempty"`
	Bio           string            `json:"bio,omitempty"`
	Age           int               `json:"age,omitempty"`
	Neighborhood  string            `json:"neighborhood,omitempty"`
	Photos        []string          `json:"photos"`
	Prompts       []profile.Prompt  `json:"prompts,omitempty"`
	IsVerified    bool              `json:"is_verified"`
	LookingFor    []string          `json:"looking_for,omitempty"`
}

// GetCurrentUser returns the authenticated user's information with profile data
func (h *AuthHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	u, err := h.userService.GetUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	// Build response with user data
	resp := CurrentUserResponse{
		ID:            u.ID,
		Email:         u.Email,
		Phone:         u.Phone,
		PhoneVerified: u.PhoneVerified,
		TOTPEnabled:   u.TOTPEnabled,
		Photos:        []string{},
		Prompts:       []profile.Prompt{},
	}

	// Try to get profile data (may not exist if onboarding incomplete)
	if h.profileService != nil {
		profileResp, err := h.profileService.GetProfile(r.Context(), userID)
		if err == nil && profileResp != nil {
			resp.Name = profileResp.Profile.Name
			resp.Bio = profileResp.Profile.Bio
			resp.Age = profileResp.Age
			if profileResp.Profile.Neighborhood != nil {
				resp.Neighborhood = *profileResp.Profile.Neighborhood
			}
			resp.IsVerified = profileResp.Profile.IsVerified
			resp.LookingFor = profileResp.Profile.LookingFor
			resp.Prompts = profileResp.Profile.Prompts

			// Extract photo URLs
			for _, photo := range profileResp.Profile.Photos {
				resp.Photos = append(resp.Photos, photo.URL)
			}
		}
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

