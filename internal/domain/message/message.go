package message

import (
	"time"

	"github.com/google/uuid"
)

// Message represents a chat message
type Message struct {
	ID               uuid.UUID  `json:"id"`
	MatchID          uuid.UUID  `json:"match_id"`
	SenderID         uuid.UUID  `json:"sender_id"`
	Content          *string    `json:"content,omitempty"`
	EncryptedContent *string    `json:"encrypted_content,omitempty"`
	ImageURL         *string    `json:"image_url,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	ReadAt           *time.Time `json:"read_at,omitempty"`
}

// ImagePermission tracks whether a user has enabled image sharing in a match
type ImagePermission struct {
	MatchID   uuid.UUID  `json:"match_id"`
	UserID    uuid.UUID  `json:"user_id"`
	Enabled   bool       `json:"enabled"`
	EnabledAt *time.Time `json:"enabled_at,omitempty"`
}

// SendMessageRequest is the request to send a message
type SendMessageRequest struct {
	Content          *string `json:"content,omitempty"`
	EncryptedContent *string `json:"encrypted_content,omitempty"` // E2E encrypted content
	ImageURL         *string `json:"image_url,omitempty"`         // For image messages
}

// MessagesResponse is the response for getting messages
type MessagesResponse struct {
	Messages    []Message `json:"messages"`
	HasMore     bool      `json:"has_more"`
	ImageStatus struct {
		YouEnabled   bool `json:"you_enabled"`
		TheyEnabled  bool `json:"they_enabled"`
		BothEnabled  bool `json:"both_enabled"`
	} `json:"image_status"`
}

// Conversation represents a match with message context
type Conversation struct {
	MatchID      uuid.UUID  `json:"match_id"`
	OtherUserID  uuid.UUID  `json:"other_user_id"`
	LastMessage  *Message   `json:"last_message,omitempty"`
	UnreadCount  int        `json:"unread_count"`
	ImageEnabled bool       `json:"image_enabled"`
}

// WebSocket event types
const (
	EventNewMessage     = "new_message"
	EventMessageRead    = "message_read"
	EventTypingStart    = "typing_start"
	EventTypingStop     = "typing_stop"
	EventImageEnabled   = "image_enabled"
	EventImageDisabled  = "image_disabled"
	EventMatchCreated   = "match_created"
	EventMatchDeleted   = "match_deleted"
)

// WSMessage is a WebSocket message envelope
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// NewMessagePayload is the payload for new message events
type NewMessagePayload struct {
	Message Message `json:"message"`
}

// TypingPayload is the payload for typing events
type TypingPayload struct {
	MatchID uuid.UUID `json:"match_id"`
	UserID  uuid.UUID `json:"user_id"`
}

// ImagePermissionPayload is the payload for image permission events
type ImagePermissionPayload struct {
	MatchID uuid.UUID `json:"match_id"`
	UserID  uuid.UUID `json:"user_id"`
	Enabled bool      `json:"enabled"`
}
