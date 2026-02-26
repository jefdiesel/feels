package settings

import (
	"time"

	"github.com/google/uuid"
)

// NotificationSettings stores user notification preferences
type NotificationSettings struct {
	UserID        uuid.UUID `json:"user_id"`
	PushEnabled   bool      `json:"push_enabled"`
	NewMatches    bool      `json:"new_matches"`
	NewMessages   bool      `json:"new_messages"`
	LikesReceived bool      `json:"likes_received"`
	SuperLikes    bool      `json:"super_likes"`
	Promotions    bool      `json:"promotions"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PrivacySettings stores user privacy preferences
type PrivacySettings struct {
	UserID           uuid.UUID `json:"user_id"`
	ShowOnlineStatus bool      `json:"show_online_status"`
	ShowReadReceipts bool      `json:"show_read_receipts"`
	ShowDistance     bool      `json:"show_distance"`
	HideAge          bool      `json:"hide_age"`
	IncognitoMode    bool      `json:"incognito_mode"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// DefaultNotificationSettings returns default notification settings
func DefaultNotificationSettings(userID uuid.UUID) *NotificationSettings {
	return &NotificationSettings{
		UserID:        userID,
		PushEnabled:   true,
		NewMatches:    true,
		NewMessages:   true,
		LikesReceived: true,
		SuperLikes:    true,
		Promotions:    false,
		UpdatedAt:     time.Now(),
	}
}

// DefaultPrivacySettings returns default privacy settings
func DefaultPrivacySettings(userID uuid.UUID) *PrivacySettings {
	return &PrivacySettings{
		UserID:           userID,
		ShowOnlineStatus: true,
		ShowReadReceipts: true,
		ShowDistance:     true,
		HideAge:          false,
		IncognitoMode:    false,
		UpdatedAt:        time.Now(),
	}
}
