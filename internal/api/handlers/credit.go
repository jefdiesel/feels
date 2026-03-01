package handlers

import (
	"log"
	"net/http"

	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/domain/credit"
)

type CreditHandler struct {
	creditService *credit.Service
}

func NewCreditHandler(creditService *credit.Service) *CreditHandler {
	return &CreditHandler{
		creditService: creditService,
	}
}

func (h *CreditHandler) GetCredits(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	balance, err := h.creditService.GetBalance(r.Context(), userID)
	if err != nil {
		log.Printf("[ERROR] GetCredits failed for user %s: %v", userID, err)
		jsonError(w, "failed to get credits", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, balance, http.StatusOK)
}

func (h *CreditHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sub, err := h.creditService.GetSubscription(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to get subscription", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, sub, http.StatusOK)
}
