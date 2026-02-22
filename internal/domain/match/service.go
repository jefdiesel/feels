package match

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidReason = errors.New("invalid report reason")
	ErrCannotBlock   = errors.New("cannot block yourself")
)

type MatchRepository interface {
	GetByID(ctx context.Context, matchID uuid.UUID) (*Match, error)
	GetUserMatches(ctx context.Context, userID uuid.UUID) ([]MatchWithProfile, error)
	Delete(ctx context.Context, matchID, userID uuid.UUID) error
	IsUserInMatch(ctx context.Context, matchID, userID uuid.UUID) (bool, error)
	GetOtherUserID(ctx context.Context, matchID, userID uuid.UUID) (uuid.UUID, error)
}

type BlockRepository interface {
	Block(ctx context.Context, blockerID, blockedID uuid.UUID) error
	Unblock(ctx context.Context, blockerID, blockedID uuid.UUID) error
	IsBlocked(ctx context.Context, user1ID, user2ID uuid.UUID) (bool, error)
	CreateReport(ctx context.Context, report *Report) error
	DeleteMatchBetweenUsers(ctx context.Context, user1ID, user2ID uuid.UUID) error
	DeleteLikesBetweenUsers(ctx context.Context, user1ID, user2ID uuid.UUID) error
}

type Service struct {
	matchRepo MatchRepository
	blockRepo BlockRepository
}

func NewService(matchRepo MatchRepository, blockRepo BlockRepository) *Service {
	return &Service{
		matchRepo: matchRepo,
		blockRepo: blockRepo,
	}
}

// GetMatches returns all matches for a user
func (s *Service) GetMatches(ctx context.Context, userID uuid.UUID) ([]MatchWithProfile, error) {
	return s.matchRepo.GetUserMatches(ctx, userID)
}

// GetMatch returns a specific match
func (s *Service) GetMatch(ctx context.Context, matchID, userID uuid.UUID) (*Match, error) {
	match, err := s.matchRepo.GetByID(ctx, matchID)
	if err != nil {
		return nil, err
	}

	// Verify user is in the match
	if match.User1ID != userID && match.User2ID != userID {
		return nil, errors.New("not authorized")
	}

	return match, nil
}

// Unmatch removes a match
func (s *Service) Unmatch(ctx context.Context, matchID, userID uuid.UUID) error {
	return s.matchRepo.Delete(ctx, matchID, userID)
}

// Block blocks a user
func (s *Service) Block(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return ErrCannotBlock
	}

	// Create block
	if err := s.blockRepo.Block(ctx, blockerID, blockedID); err != nil {
		return err
	}

	// Delete any match between them
	if err := s.blockRepo.DeleteMatchBetweenUsers(ctx, blockerID, blockedID); err != nil {
		return err
	}

	// Delete any likes between them
	if err := s.blockRepo.DeleteLikesBetweenUsers(ctx, blockerID, blockedID); err != nil {
		return err
	}

	return nil
}

// Unblock unblocks a user
func (s *Service) Unblock(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	return s.blockRepo.Unblock(ctx, blockerID, blockedID)
}

// Report reports a user
func (s *Service) Report(ctx context.Context, reporterID, reportedID uuid.UUID, reason string, details *string) error {
	if !IsValidReportReason(reason) {
		return ErrInvalidReason
	}

	report := &Report{
		ID:         uuid.New(),
		ReporterID: reporterID,
		ReportedID: reportedID,
		Reason:     reason,
		Details:    details,
		CreatedAt:  time.Now(),
	}

	if err := s.blockRepo.CreateReport(ctx, report); err != nil {
		return err
	}

	// Auto-block on report
	return s.Block(ctx, reporterID, reportedID)
}

// IsUserInMatch checks if user is part of a match
func (s *Service) IsUserInMatch(ctx context.Context, matchID, userID uuid.UUID) (bool, error) {
	return s.matchRepo.IsUserInMatch(ctx, matchID, userID)
}

// GetOtherUserID gets the other user in a match
func (s *Service) GetOtherUserID(ctx context.Context, matchID, userID uuid.UUID) (uuid.UUID, error) {
	return s.matchRepo.GetOtherUserID(ctx, matchID, userID)
}
