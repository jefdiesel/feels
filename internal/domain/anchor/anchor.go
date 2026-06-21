// Package anchor models a user's hyper-local NYC location anchors:
// LIVE, WORK, HANGOUT. Used by the NYC subway-reachability matching strategy.
package anchor

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

type Kind string

const (
	KindLive Kind = "LIVE"
	KindWork Kind = "WORK"
	KindPlay Kind = "PLAY"
)

func (k Kind) Valid() bool {
	switch k {
	case KindLive, KindWork, KindPlay:
		return true
	}
	return false
}

type Anchor struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Kind      Kind      `json:"kind"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	NTAID     *string   `json:"nta_id,omitempty"`
	NTAName   *string   `json:"nta_name,omitempty"`
	Borough   *string   `json:"borough,omitempty"`
	Locals    int       `json:"locals"` // other users who share this anchor's neighborhood
	UpdatedAt time.Time `json:"updated_at"`
}

var (
	ErrInvalidKind   = errors.New("invalid anchor kind")
	ErrOutOfNYC      = errors.New("point is far outside NYC")
	ErrAnchorMissing = errors.New("anchor not found")
)

// Rough NYC bounding box. We snap to nearest NTA centroid for points outside
// any polygon, but reject points obviously not in the metro area.
const (
	nycMinLat = 40.45
	nycMaxLat = 41.00
	nycMinLng = -74.30
	nycMaxLng = -73.65
)

func inNYC(lat, lng float64) bool {
	return lat >= nycMinLat && lat <= nycMaxLat && lng >= nycMinLng && lng <= nycMaxLng
}

// NTAStat is a neighborhood with how many users are anchored there, for the
// Explore surface.
type NTAStat struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Borough     string `json:"borough"`
	DensityTier string `json:"density_tier"`
	Users       int    `json:"users"`
}

type Repository interface {
	Upsert(ctx context.Context, a *Anchor) (*Anchor, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Anchor, error)
	Delete(ctx context.Context, userID uuid.UUID, kind Kind) error
	PopularNTAs(ctx context.Context) ([]NTAStat, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Set(ctx context.Context, userID uuid.UUID, kind Kind, lat, lng float64) (*Anchor, error) {
	if !kind.Valid() {
		return nil, ErrInvalidKind
	}
	if !inNYC(lat, lng) {
		return nil, ErrOutOfNYC
	}
	a := &Anchor{
		ID:     uuid.New(),
		UserID: userID,
		Kind:   kind,
		Lat:    lat,
		Lng:    lng,
	}
	return s.repo.Upsert(ctx, a)
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Anchor, error) {
	return s.repo.ListByUser(ctx, userID)
}

// Neighborhoods returns NYC neighborhoods that have at least one anchored user,
// most-populated first, for the Explore surface.
func (s *Service) Neighborhoods(ctx context.Context) ([]NTAStat, error) {
	return s.repo.PopularNTAs(ctx)
}

func (s *Service) Delete(ctx context.Context, userID uuid.UUID, kind Kind) error {
	if !kind.Valid() {
		return ErrInvalidKind
	}
	return s.repo.Delete(ctx, userID, kind)
}
