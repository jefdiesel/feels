package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/message"
	"github.com/feels/feels/internal/repository"
	"github.com/feels/feels/internal/storage"
	"github.com/feels/feels/internal/websocket"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MessageHandler struct {
	messageService *message.Service
	hub            *websocket.Hub
	storage        *storage.S3Client
}

func NewMessageHandler(messageService *message.Service, hub *websocket.Hub, storage *storage.S3Client) *MessageHandler {
	return &MessageHandler{
		messageService: messageService,
		hub:            hub,
		storage:        storage,
	}
}

func (h *MessageHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
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

	// Parse pagination
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	resp, err := h.messageService.GetMessages(r.Context(), userID, matchID, limit, offset)
	if err != nil {
		if errors.Is(err, message.ErrNotInMatch) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to get messages", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, resp, http.StatusOK)
}

func (h *MessageHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
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

	var req message.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	msg, err := h.messageService.SendMessage(r.Context(), userID, matchID, &req)
	if err != nil {
		switch {
		case errors.Is(err, message.ErrNotInMatch):
			jsonError(w, "not in match", http.StatusForbidden)
		case errors.Is(err, message.ErrEmptyMessage):
			jsonError(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, message.ErrImageNotEnabled):
			jsonError(w, err.Error(), http.StatusForbidden)
		default:
			jsonError(w, "failed to send message", http.StatusInternalServerError)
		}
		return
	}

	jsonResponse(w, msg, http.StatusCreated)
}

func (h *MessageHandler) EnableImages(w http.ResponseWriter, r *http.Request) {
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

	if err := h.messageService.EnableImages(r.Context(), userID, matchID); err != nil {
		switch {
		case errors.Is(err, message.ErrNotInMatch):
			jsonError(w, "not in match", http.StatusForbidden)
		case errors.Is(err, message.ErrNotEnoughMessages):
			jsonError(w, err.Error(), http.StatusPreconditionFailed)
		default:
			jsonError(w, "failed to enable images", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MessageHandler) DisableImages(w http.ResponseWriter, r *http.Request) {
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

	if err := h.messageService.DisableImages(r.Context(), userID, matchID); err != nil {
		if errors.Is(err, message.ErrNotInMatch) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to disable images", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MessageHandler) Typing(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		IsTyping bool `json:"is_typing"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.messageService.SendTypingIndicator(r.Context(), userID, matchID, req.IsTyping); err != nil {
		if errors.Is(err, message.ErrNotInMatch) || errors.Is(err, repository.ErrMatchNotFound) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to send typing indicator", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MessageHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	h.hub.HandleWebSocket(w, r, userID)
}

// UploadImage uploads an image for use in chat messages
// Requires both users to have images enabled
func (h *MessageHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
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

	// Check if images are enabled for this match
	canSendImages, err := h.messageService.CanSendImages(r.Context(), userID, matchID)
	if err != nil {
		if errors.Is(err, message.ErrNotInMatch) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to check image permissions", http.StatusInternalServerError)
		return
	}
	if !canSendImages {
		jsonError(w, "images not enabled for this conversation", http.StatusForbidden)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(storage.MaxPhotoSize); err != nil {
		jsonError(w, "file too large (max 10MB)", http.StatusRequestEntityTooLarge)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "image file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !storage.IsAllowedContentType(contentType) {
		jsonError(w, "invalid file type, must be jpeg, png, gif, or webp", http.StatusBadRequest)
		return
	}

	// Upload to S3
	if h.storage == nil {
		jsonError(w, "image upload not available", http.StatusServiceUnavailable)
		return
	}

	url, err := h.storage.UploadPhoto(r.Context(), userID, io.Reader(file), header.Size, contentType)
	if err != nil {
		jsonError(w, "failed to upload image", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"url": url}, http.StatusOK)
}
