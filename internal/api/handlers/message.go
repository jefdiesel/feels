package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/message"
	"github.com/feels/feels/internal/websocket"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MessageHandler struct {
	messageService *message.Service
	hub            *websocket.Hub
}

func NewMessageHandler(messageService *message.Service, hub *websocket.Hub) *MessageHandler {
	return &MessageHandler{
		messageService: messageService,
		hub:            hub,
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
		if errors.Is(err, message.ErrNotInMatch) {
			jsonError(w, "not in match", http.StatusForbidden)
			return
		}
		jsonError(w, "failed to enable images", http.StatusInternalServerError)
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

func (h *MessageHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	h.hub.HandleWebSocket(w, r, userID)
}
