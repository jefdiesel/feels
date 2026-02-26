package notification

import (
	"time"

	"github.com/google/uuid"
)

// PushToken represents a user's push notification token
type PushToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Token     string    `json:"token"`
	Platform  string    `json:"platform"` // "ios", "android", "web"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NotificationType defines the type of notification
type NotificationType string

const (
	NotificationTypeNewMatch    NotificationType = "new_match"
	NotificationTypeNewMessage  NotificationType = "new_message"
	NotificationTypeLikeReceived NotificationType = "like_received"
	NotificationTypeSuperLike   NotificationType = "super_like"
)

// PushPayload is the data sent to Expo push service
type PushPayload struct {
	To       string                 `json:"to"`
	Title    string                 `json:"title,omitempty"`
	Body     string                 `json:"body"`
	Sound    string                 `json:"sound,omitempty"`
	Badge    int                    `json:"badge,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Priority string                 `json:"priority,omitempty"`
}

// PushMessage is a request to send a push notification
type PushMessage struct {
	UserID   uuid.UUID
	Type     NotificationType
	Title    string
	Body     string
	Data     map[string]interface{}
}
