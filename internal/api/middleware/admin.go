package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type AdminChecker interface {
	IsAdmin(ctx context.Context, userID uuid.UUID) (bool, error)
}

type AdminMiddleware struct {
	adminChecker AdminChecker
}

func NewAdminMiddleware(adminChecker AdminChecker) *AdminMiddleware {
	return &AdminMiddleware{adminChecker: adminChecker}
}

func (m *AdminMiddleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := GetUserID(r.Context())
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		isAdmin, err := m.adminChecker.IsAdmin(r.Context(), userID)
		if err != nil || !isAdmin {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
