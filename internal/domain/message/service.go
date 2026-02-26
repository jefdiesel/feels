package message

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotInMatch           = errors.New("not in match")
	ErrEmptyMessage         = errors.New("message content or image required")
	ErrImageNotEnabled      = errors.New("image sharing not enabled by both users")
	ErrNotEnoughMessages    = errors.New("need at least 5 messages before enabling photos")
)

// MinMessagesForPhotos is the minimum number of messages required before photos can be enabled
const MinMessagesForPhotos = 5

type Repository interface {
	Create(ctx context.Context, msg *Message) error
	GetByID(ctx context.Context, msgID uuid.UUID) (*Message, error)
	GetByMatch(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]Message, error)
	GetLastMessage(ctx context.Context, matchID uuid.UUID) (*Message, error)
	CountMessages(ctx context.Context, matchID uuid.UUID) (int, error)
	GetImagePermission(ctx context.Context, matchID, userID uuid.UUID) (*ImagePermission, error)
	GetBothImagePermissions(ctx context.Context, matchID, userID, otherUserID uuid.UUID) (youEnabled, theyEnabled bool, err error)
	SetImagePermission(ctx context.Context, matchID, userID uuid.UUID, enabled bool) error
	MarkMessagesRead(ctx context.Context, matchID, readerID uuid.UUID) (int, error)
	CountUnreadMessages(ctx context.Context, matchID, userID uuid.UUID) (int, error)
	GetUnreadCountsForUser(ctx context.Context, userID uuid.UUID) (map[uuid.UUID]int, error)
}

type MatchRepository interface {
	IsUserInMatch(ctx context.Context, matchID, userID uuid.UUID) (bool, error)
	GetOtherUserID(ctx context.Context, matchID, userID uuid.UUID) (uuid.UUID, error)
}

// Hub interface for real-time messaging
type Hub interface {
	SendToUser(userID uuid.UUID, msg interface{})
}

// NotificationService interface for push notifications
type NotificationService interface {
	SendNewMessageNotification(ctx context.Context, userID uuid.UUID, senderName, messagePreview string, matchID uuid.UUID) error
}

// ProfileRepository interface for getting sender info
type ProfileRepository interface {
	GetNameByUserID(ctx context.Context, userID uuid.UUID) (string, error)
}

// ModerationService interface for content moderation
type ModerationService interface {
	CheckContent(ctx context.Context, userID uuid.UUID, messageID *uuid.UUID, content string) error
}

type Service struct {
	repo                Repository
	matchRepo           MatchRepository
	hub                 Hub
	notificationService NotificationService
	profileRepo         ProfileRepository
	moderationService   ModerationService
}

func NewService(repo Repository, matchRepo MatchRepository, hub Hub) *Service {
	return &Service{
		repo:      repo,
		matchRepo: matchRepo,
		hub:       hub,
	}
}

// SetNotificationService sets the push notification service
func (s *Service) SetNotificationService(ns NotificationService) {
	s.notificationService = ns
}

// SetProfileRepository sets the profile repository for sender info
func (s *Service) SetProfileRepository(pr ProfileRepository) {
	s.profileRepo = pr
}

// SetModerationService sets the content moderation service
func (s *Service) SetModerationService(ms ModerationService) {
	s.moderationService = ms
}

// GetMessages gets messages for a match and marks them as read
func (s *Service) GetMessages(ctx context.Context, userID, matchID uuid.UUID, limit, offset int) (*MessagesResponse, error) {
	// Verify user is in match
	inMatch, err := s.matchRepo.IsUserInMatch(ctx, matchID, userID)
	if err != nil {
		return nil, err
	}
	if !inMatch {
		return nil, ErrNotInMatch
	}

	// Get messages
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	messages, err := s.repo.GetByMatch(ctx, matchID, limit+1, offset)
	if err != nil {
		return nil, err
	}

	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}

	// Get image permissions
	otherUserID, err := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
	if err != nil {
		return nil, err
	}

	youEnabled, theyEnabled, err := s.repo.GetBothImagePermissions(ctx, matchID, userID, otherUserID)
	if err != nil {
		return nil, err
	}

	resp := &MessagesResponse{
		Messages: messages,
		HasMore:  hasMore,
	}
	resp.ImageStatus.YouEnabled = youEnabled
	resp.ImageStatus.TheyEnabled = theyEnabled
	resp.ImageStatus.BothEnabled = youEnabled && theyEnabled

	if resp.Messages == nil {
		resp.Messages = []Message{}
	}

	// Mark messages as read (messages from the other user)
	markedCount, err := s.repo.MarkMessagesRead(ctx, matchID, userID)
	if err != nil {
		// Log but don't fail the request
		// log.Printf("failed to mark messages read: %v", err)
	}

	// Notify sender that their messages were read
	if markedCount > 0 && s.hub != nil {
		s.hub.SendToUser(otherUserID, WSMessage{
			Type: EventMessageRead,
			Payload: MessageReadPayload{
				MatchID:  matchID,
				ReaderID: userID,
			},
		})
	}

	return resp, nil
}

// SendMessage sends a message in a match
func (s *Service) SendMessage(ctx context.Context, userID, matchID uuid.UUID, req *SendMessageRequest) (*Message, error) {
	// Verify user is in match
	inMatch, err := s.matchRepo.IsUserInMatch(ctx, matchID, userID)
	if err != nil {
		return nil, err
	}
	if !inMatch {
		return nil, ErrNotInMatch
	}

	// Validate message
	if (req.Content == nil || *req.Content == "") && (req.ImageURL == nil || *req.ImageURL == "") {
		return nil, ErrEmptyMessage
	}

	// Check content with moderation service (only for text content)
	if s.moderationService != nil && req.Content != nil && *req.Content != "" {
		if err := s.moderationService.CheckContent(ctx, userID, nil, *req.Content); err != nil {
			return nil, err
		}
	}

	// If sending image, check permissions
	if req.ImageURL != nil && *req.ImageURL != "" {
		otherUserID, err := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
		if err != nil {
			return nil, err
		}

		youEnabled, theyEnabled, err := s.repo.GetBothImagePermissions(ctx, matchID, userID, otherUserID)
		if err != nil {
			return nil, err
		}

		if !youEnabled || !theyEnabled {
			return nil, ErrImageNotEnabled
		}
	}

	msg := &Message{
		ID:               uuid.New(),
		MatchID:          matchID,
		SenderID:         userID,
		Content:          req.Content,
		EncryptedContent: req.EncryptedContent,
		ImageURL:         req.ImageURL,
		CreatedAt:        time.Now(),
	}

	if err := s.repo.Create(ctx, msg); err != nil {
		return nil, err
	}

	// Notify other user via WebSocket
	otherUserID, _ := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
	if s.hub != nil {
		s.hub.SendToUser(otherUserID, WSMessage{
			Type: EventNewMessage,
			Payload: NewMessagePayload{
				Message: *msg,
			},
		})
	}

	// Send push notification for new message
	if s.notificationService != nil && otherUserID != uuid.Nil {
		senderName := "Someone"
		if s.profileRepo != nil {
			if name, err := s.profileRepo.GetNameByUserID(ctx, userID); err == nil && name != "" {
				senderName = name
			}
		}

		messagePreview := ""
		if msg.Content != nil {
			messagePreview = *msg.Content
		} else if msg.ImageURL != nil {
			messagePreview = "Sent an image"
		}

		go s.notificationService.SendNewMessageNotification(ctx, otherUserID, senderName, messagePreview, matchID)
	}

	return msg, nil
}

// EnableImages enables image sharing for a user in a match
// Requires at least MinMessagesForPhotos messages in the conversation
func (s *Service) EnableImages(ctx context.Context, userID, matchID uuid.UUID) error {
	inMatch, err := s.matchRepo.IsUserInMatch(ctx, matchID, userID)
	if err != nil {
		return err
	}
	if !inMatch {
		return ErrNotInMatch
	}

	// Check message count requirement
	msgCount, err := s.repo.CountMessages(ctx, matchID)
	if err != nil {
		return err
	}
	if msgCount < MinMessagesForPhotos {
		return ErrNotEnoughMessages
	}

	if err := s.repo.SetImagePermission(ctx, matchID, userID, true); err != nil {
		return err
	}

	// Notify other user
	if s.hub != nil {
		otherUserID, _ := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
		s.hub.SendToUser(otherUserID, WSMessage{
			Type: EventImageEnabled,
			Payload: ImagePermissionPayload{
				MatchID: matchID,
				UserID:  userID,
				Enabled: true,
			},
		})
	}

	return nil
}

// DisableImages disables image sharing for a user in a match
func (s *Service) DisableImages(ctx context.Context, userID, matchID uuid.UUID) error {
	inMatch, err := s.matchRepo.IsUserInMatch(ctx, matchID, userID)
	if err != nil {
		return err
	}
	if !inMatch {
		return ErrNotInMatch
	}

	if err := s.repo.SetImagePermission(ctx, matchID, userID, false); err != nil {
		return err
	}

	// Notify other user
	if s.hub != nil {
		otherUserID, _ := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
		s.hub.SendToUser(otherUserID, WSMessage{
			Type: EventImageDisabled,
			Payload: ImagePermissionPayload{
				MatchID: matchID,
				UserID:  userID,
				Enabled: false,
			},
		})
	}

	return nil
}

// CanSendImages checks if both users have images enabled
func (s *Service) CanSendImages(ctx context.Context, userID, matchID uuid.UUID) (bool, error) {
	inMatch, err := s.matchRepo.IsUserInMatch(ctx, matchID, userID)
	if err != nil {
		return false, err
	}
	if !inMatch {
		return false, ErrNotInMatch
	}

	otherUserID, err := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
	if err != nil {
		return false, err
	}

	youEnabled, theyEnabled, err := s.repo.GetBothImagePermissions(ctx, matchID, userID, otherUserID)
	if err != nil {
		return false, err
	}

	return youEnabled && theyEnabled, nil
}

// SendTypingIndicator sends a typing indicator to the other user
func (s *Service) SendTypingIndicator(ctx context.Context, userID, matchID uuid.UUID, isTyping bool) error {
	if s.hub == nil {
		return nil
	}

	otherUserID, err := s.matchRepo.GetOtherUserID(ctx, matchID, userID)
	if err != nil {
		return err
	}

	eventType := EventTypingStart
	if !isTyping {
		eventType = EventTypingStop
	}

	s.hub.SendToUser(otherUserID, WSMessage{
		Type: eventType,
		Payload: TypingPayload{
			MatchID: matchID,
			UserID:  userID,
		},
	})

	return nil
}
