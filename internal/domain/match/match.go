package match

import (
	"time"

	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
)

// Match represents a mutual like between two users
type Match struct {
	ID        uuid.UUID `json:"id"`
	User1ID   uuid.UUID `json:"user1_id"`
	User2ID   uuid.UUID `json:"user2_id"`
	CreatedAt time.Time `json:"created_at"`
}

// MatchWithProfile includes the other user's profile
type MatchWithProfile struct {
	ID           uuid.UUID       `json:"id"`
	OtherUser    profile.Profile `json:"other_user"`
	CreatedAt    time.Time       `json:"created_at"`
	LastMessage  *MessagePreview `json:"last_message,omitempty"`
	UnreadCount  int             `json:"unread_count"`
	ImageEnabled bool            `json:"image_enabled"` // whether you've enabled images
}

// MessagePreview is a preview of a message
type MessagePreview struct {
	Content   string    `json:"content"`
	SenderID  uuid.UUID `json:"sender_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Block represents a blocked user
type Block struct {
	BlockerID uuid.UUID `json:"blocker_id"`
	BlockedID uuid.UUID `json:"blocked_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Report represents a user report
type Report struct {
	ID         uuid.UUID `json:"id"`
	ReporterID uuid.UUID `json:"reporter_id"`
	ReportedID uuid.UUID `json:"reported_id"`
	Reason     string    `json:"reason"`
	Details    *string   `json:"details,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ReportRequest is the request body for reporting a user
type ReportRequest struct {
	Reason  string  `json:"reason"`
	Details *string `json:"details,omitempty"`
}

// Valid report reasons
var ValidReportReasons = []string{
	"inappropriate_photos",
	"harassment",
	"spam",
	"fake_profile",
	"underage",
	"other",
}

func IsValidReportReason(reason string) bool {
	for _, r := range ValidReportReasons {
		if r == reason {
			return true
		}
	}
	return false
}

// OrderedUserIDs returns user IDs in consistent order (smaller first)
// This ensures (userA, userB) and (userB, userA) create the same match
func OrderedUserIDs(a, b uuid.UUID) (uuid.UUID, uuid.UUID) {
	if a.String() < b.String() {
		return a, b
	}
	return b, a
}
