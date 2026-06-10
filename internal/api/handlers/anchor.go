package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/anchor"
	"github.com/go-chi/chi/v5"
)

type AnchorHandler struct {
	svc *anchor.Service
}

func NewAnchorHandler(svc *anchor.Service) *AnchorHandler {
	return &AnchorHandler{svc: svc}
}

type setAnchorReq struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

func (h *AnchorHandler) Set(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	kind := anchor.Kind(chi.URLParam(r, "kind"))
	if !kind.Valid() {
		jsonError(w, "invalid anchor kind", http.StatusBadRequest)
		return
	}
	var body setAnchorReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "bad json", http.StatusBadRequest)
		return
	}
	a, err := h.svc.Set(r.Context(), userID, kind, body.Lat, body.Lng)
	if err != nil {
		switch {
		case errors.Is(err, anchor.ErrOutOfNYC):
			jsonError(w, "point is outside NYC", http.StatusBadRequest)
		case errors.Is(err, anchor.ErrInvalidKind):
			jsonError(w, "invalid kind", http.StatusBadRequest)
		default:
			log.Printf("[ERROR] anchor set: %v", err)
			jsonError(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	jsonResponse(w, a, http.StatusOK)
}

func (h *AnchorHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	out, err := h.svc.List(r.Context(), userID)
	if err != nil {
		log.Printf("[ERROR] anchor list: %v", err)
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]any{"anchors": out}, http.StatusOK)
}

func (h *AnchorHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	kind := anchor.Kind(chi.URLParam(r, "kind"))
	if err := h.svc.Delete(r.Context(), userID, kind); err != nil {
		log.Printf("[ERROR] anchor delete: %v", err)
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
