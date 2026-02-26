package settings

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	GetNotificationSettings(ctx context.Context, userID uuid.UUID) (*NotificationSettings, error)
	UpsertNotificationSettings(ctx context.Context, settings *NotificationSettings) error
	GetPrivacySettings(ctx context.Context, userID uuid.UUID) (*PrivacySettings, error)
	UpsertPrivacySettings(ctx context.Context, settings *PrivacySettings) error
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetNotificationSettings gets notification settings, returning defaults if none exist
func (s *Service) GetNotificationSettings(ctx context.Context, userID uuid.UUID) (*NotificationSettings, error) {
	settings, err := s.repo.GetNotificationSettings(ctx, userID)
	if err != nil {
		// Return defaults if not found
		return DefaultNotificationSettings(userID), nil
	}
	return settings, nil
}

// UpdateNotificationSettings updates notification settings
func (s *Service) UpdateNotificationSettings(ctx context.Context, userID uuid.UUID, settings *NotificationSettings) error {
	settings.UserID = userID
	return s.repo.UpsertNotificationSettings(ctx, settings)
}

// GetPrivacySettings gets privacy settings, returning defaults if none exist
func (s *Service) GetPrivacySettings(ctx context.Context, userID uuid.UUID) (*PrivacySettings, error) {
	settings, err := s.repo.GetPrivacySettings(ctx, userID)
	if err != nil {
		// Return defaults if not found
		return DefaultPrivacySettings(userID), nil
	}
	return settings, nil
}

// UpdatePrivacySettings updates privacy settings
func (s *Service) UpdatePrivacySettings(ctx context.Context, userID uuid.UUID, settings *PrivacySettings) error {
	settings.UserID = userID
	return s.repo.UpsertPrivacySettings(ctx, settings)
}
