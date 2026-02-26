package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

const expoPushURL = "https://exp.host/--/api/v2/push/send"

type Repository interface {
	SaveToken(ctx context.Context, token *PushToken) error
	GetTokensByUserID(ctx context.Context, userID uuid.UUID) ([]PushToken, error)
	DeleteToken(ctx context.Context, token string) error
	DeleteUserTokens(ctx context.Context, userID uuid.UUID) error
}

type SettingsRepository interface {
	GetNotificationSettings(ctx context.Context, userID uuid.UUID) (enabled bool, err error)
}

type Service struct {
	repo         Repository
	settingsRepo SettingsRepository
	httpClient   *http.Client
}

func NewService(repo Repository, settingsRepo SettingsRepository) *Service {
	return &Service{
		repo:         repo,
		settingsRepo: settingsRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// RegisterToken registers a push token for a user
func (s *Service) RegisterToken(ctx context.Context, userID uuid.UUID, token, platform string) error {
	pushToken := &PushToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		Platform:  platform,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	return s.repo.SaveToken(ctx, pushToken)
}

// UnregisterToken removes a push token
func (s *Service) UnregisterToken(ctx context.Context, token string) error {
	return s.repo.DeleteToken(ctx, token)
}

// Send sends a push notification to a user
func (s *Service) Send(ctx context.Context, msg *PushMessage) error {
	// Check user notification settings
	if s.settingsRepo != nil {
		enabled, err := s.settingsRepo.GetNotificationSettings(ctx, msg.UserID)
		if err == nil && !enabled {
			return nil // User has notifications disabled
		}
	}

	// Get user's push tokens
	tokens, err := s.repo.GetTokensByUserID(ctx, msg.UserID)
	if err != nil {
		return fmt.Errorf("failed to get push tokens: %w", err)
	}

	if len(tokens) == 0 {
		return nil // No tokens registered
	}

	// Send to all user's devices
	for _, token := range tokens {
		payload := PushPayload{
			To:       token.Token,
			Title:    msg.Title,
			Body:     msg.Body,
			Sound:    "default",
			Priority: "high",
			Data:     msg.Data,
		}

		if err := s.sendToExpo(ctx, payload); err != nil {
			// Log error but don't fail - token might be invalid
			fmt.Printf("Failed to send push to token %s: %v\n", token.Token[:20], err)
			// TODO: Handle invalid tokens by deleting them
		}
	}

	return nil
}

// sendToExpo sends a push notification via Expo's push service
func (s *Service) sendToExpo(ctx context.Context, payload PushPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", expoPushURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo returned status %d", resp.StatusCode)
	}

	return nil
}

// SendNewMatchNotification sends a notification when a new match occurs
func (s *Service) SendNewMatchNotification(ctx context.Context, userID uuid.UUID, matchName string, matchID uuid.UUID) error {
	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeNewMatch,
		Title:  "It's a Match!",
		Body:   fmt.Sprintf("You and %s like each other - say hi!", matchName),
		Data: map[string]interface{}{
			"type":    string(NotificationTypeNewMatch),
			"matchId": matchID.String(),
		},
	})
}

// SendNewMessageNotification sends a notification for a new message
func (s *Service) SendNewMessageNotification(ctx context.Context, userID uuid.UUID, senderName, messagePreview string, matchID uuid.UUID) error {
	body := messagePreview
	if len(body) > 100 {
		body = body[:97] + "..."
	}

	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeNewMessage,
		Title:  senderName,
		Body:   body,
		Data: map[string]interface{}{
			"type":    string(NotificationTypeNewMessage),
			"matchId": matchID.String(),
		},
	})
}

// SendLikeReceivedNotification sends a notification when someone likes the user
func (s *Service) SendLikeReceivedNotification(ctx context.Context, userID uuid.UUID) error {
	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeLikeReceived,
		Title:  "Someone Likes You!",
		Body:   "Open Feels to see who",
		Data: map[string]interface{}{
			"type": string(NotificationTypeLikeReceived),
		},
	})
}

// SendSuperLikeNotification sends a notification when someone super likes the user
func (s *Service) SendSuperLikeNotification(ctx context.Context, userID uuid.UUID, likerName string) error {
	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeSuperLike,
		Title:  "Super Like!",
		Body:   fmt.Sprintf("%s super liked you", likerName),
		Data: map[string]interface{}{
			"type": string(NotificationTypeSuperLike),
		},
	})
}

// SendDailyDigestNotification sends a summary of daily activity
func (s *Service) SendDailyDigestNotification(ctx context.Context, userID uuid.UUID, newLikes, newMatches int) error {
	if newLikes == 0 && newMatches == 0 {
		return nil
	}

	var body string
	switch {
	case newMatches > 0 && newLikes > 0:
		body = fmt.Sprintf("You have %d new match%s and %d new like%s!",
			newMatches, pluralize(newMatches),
			newLikes, pluralize(newLikes))
	case newMatches > 0:
		body = fmt.Sprintf("You have %d new match%s waiting!", newMatches, pluralize(newMatches))
	default:
		body = fmt.Sprintf("%d new like%s - see who's interested!", newLikes, pluralize(newLikes))
	}

	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeDailyDigest,
		Title:  "Your Daily Update",
		Body:   body,
		Data: map[string]interface{}{
			"type": string(NotificationTypeDailyDigest),
		},
	})
}

// SendInactivityReminderNotification reminds inactive users to come back
func (s *Service) SendInactivityReminderNotification(ctx context.Context, userID uuid.UUID, daysSinceActive int) error {
	var body string
	switch {
	case daysSinceActive < 3:
		body = "New profiles are waiting for you!"
	case daysSinceActive < 7:
		body = "People have been checking out your profile"
	default:
		body = "Your matches miss you - come say hi!"
	}

	return s.Send(ctx, &PushMessage{
		UserID: userID,
		Type:   NotificationTypeInactivityReminder,
		Title:  "Come Back to Feels",
		Body:   body,
		Data: map[string]interface{}{
			"type": string(NotificationTypeInactivityReminder),
		},
	})
}

func pluralize(n int) string {
	if n == 1 {
		return ""
	}
	return "es"
}
