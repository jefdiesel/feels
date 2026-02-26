package feed

import (
	"time"

	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
)

// FeedProfile is a profile as shown in the feed
type FeedProfile struct {
	profile.Profile
	Age      int    `json:"age"`
	Distance *int   `json:"distance,omitempty"` // miles, nil if location not available
	Priority string `json:"priority,omitempty"` // for debugging: qualified_superlike, qualified_like, gap_superlike, browse
}

// Like represents a like action
type Like struct {
	ID          uuid.UUID `json:"id"`
	LikerID     uuid.UUID `json:"liker_id"`
	LikedID     uuid.UUID `json:"liked_id"`
	IsSuperlike bool      `json:"is_superlike"`
	CreatedAt   time.Time `json:"created_at"`
}

// Pass represents a pass action (skip)
type Pass struct {
	PasserID  uuid.UUID `json:"passer_id"`
	PassedID  uuid.UUID `json:"passed_id"`
	CreatedAt time.Time `json:"created_at"`
}

// FeedResponse is the response for the feed endpoint
type FeedResponse struct {
	Profiles       []FeedProfile `json:"profiles"`
	HasMore        bool          `json:"has_more"`
	QueuedLikes    int           `json:"queued_likes"`    // likes waiting to be shown
	MustProcessAll bool          `json:"must_process_all"` // true if 10+ qualified likes
}

// LikeResponse is the response for like/superlike actions
type LikeResponse struct {
	Matched bool       `json:"matched"`
	MatchID *uuid.UUID `json:"match_id,omitempty"`
}

// Priority buckets for feed algorithm
const (
	PriorityQualifiedSuperlike = "qualified_superlike" // in your search range + superliked you
	PriorityQualifiedLike      = "qualified_like"      // in your search range + liked you
	PriorityGapSuperlike       = "gap_superlike"       // outside range but not blocked + superliked
	PriorityBrowse             = "browse"              // regular profiles in search range
)

// Feed algorithm constants
const (
	MaxQualifiedLikesShown = 10  // max qualified likes shown before must process
	DefaultFeedLimit       = 10  // default number of profiles per request
	MaxFeedLimit           = 50  // max profiles per request
)

// WebSocket event types
const (
	EventMatchCreated = "match_created"
)

// WSMessage is a WebSocket message envelope
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// MatchCreatedPayload is sent when a new match is created
type MatchCreatedPayload struct {
	MatchID     uuid.UUID `json:"match_id"`
	OtherUserID uuid.UUID `json:"other_user_id"`
}
