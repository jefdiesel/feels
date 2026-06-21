package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

var (
	ErrContentBlocked   = errors.New("message blocked: inappropriate content detected")
	ErrModerationFailed = errors.New("failed to moderate content")
)

// ModerationResult contains the result of content moderation
type ModerationResult struct {
	Flagged    bool               `json:"flagged"`
	Categories map[string]bool    `json:"categories"`
	Scores     map[string]float64 `json:"category_scores"`
}

// IsFlagged returns whether the content was flagged
func (r *ModerationResult) IsFlagged() bool {
	return r.Flagged
}

// ModerationLog represents a moderation event
type ModerationLog struct {
	ID             uuid.UUID  `json:"id"`
	MessageID      *uuid.UUID `json:"message_id,omitempty"`
	UserID         uuid.UUID  `json:"user_id"`
	FlaggedContent string     `json:"flagged_content"`
	FlagType       string     `json:"flag_type"`
	Confidence     float64    `json:"confidence"`
	ActionTaken    string     `json:"action_taken"`
	CreatedAt      time.Time  `json:"created_at"`
}

type Repository interface {
	LogModeration(ctx context.Context, log *ModerationLog) error
	GetModerationLogs(ctx context.Context, userID uuid.UUID, limit int) ([]ModerationLog, error)
	GetPendingReviews(ctx context.Context, limit int) ([]ModerationLog, error)
}

type Config struct {
	Enabled         bool
	APIKey          string
	BlockThreshold  float64
	ReviewThreshold float64
}

type Service struct {
	repo       Repository
	config     Config
	httpClient *http.Client
}

func NewService(repo Repository, config Config) *Service {
	return &Service{
		repo:   repo,
		config: config,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CheckContent checks text content for policy violations using OpenAI's
// moderation API.
func (s *Service) CheckContent(ctx context.Context, userID uuid.UUID, messageID *uuid.UUID, content string) (*ModerationResult, error) {
	if !s.config.Enabled || s.config.APIKey == "" {
		return &ModerationResult{Flagged: false}, nil
	}
	result, err := s.callOpenAIModeration(ctx, content)
	if err != nil {
		// Don't block on a moderation failure.
		fmt.Printf("Moderation API error: %v\n", err)
		return &ModerationResult{Flagged: false}, nil
	}
	return s.handleResult(ctx, userID, messageID, content, result)
}

// CheckImage scans an uploaded image URL for policy violations (NSFW, sexual
// content, graphic violence) using OpenAI's omni moderation model. Returns
// ErrContentBlocked when it exceeds the block threshold so the caller can
// reject the upload before the photo becomes visible.
//
// NOTE: this is NOT CSAM hash-matching (PhotoDNA/NCMEC), which is a separate
// legal requirement that needs NCMEC registration — tracked separately.
func (s *Service) CheckImage(ctx context.Context, userID uuid.UUID, imageURL string) (*ModerationResult, error) {
	if !s.config.Enabled || s.config.APIKey == "" {
		return &ModerationResult{Flagged: false}, nil
	}
	result, err := s.callOpenAIImageModeration(ctx, imageURL)
	if err != nil {
		fmt.Printf("Image moderation API error: %v\n", err)
		return &ModerationResult{Flagged: false}, nil
	}
	return s.handleResult(ctx, userID, nil, imageURL, result)
}

// handleResult logs a flagged result and blocks if it exceeds the threshold.
func (s *Service) handleResult(ctx context.Context, userID uuid.UUID, messageID *uuid.UUID, content string, result *ModerationResult) (*ModerationResult, error) {
	if !result.Flagged {
		return result, nil
	}

	var highestScore float64
	var highestCategory string
	for cat, score := range result.Scores {
		if score > highestScore {
			highestScore = score
			highestCategory = cat
		}
	}

	// Zero-tolerance: any sexual/minors signal blocks regardless of score.
	blocked := result.Categories["sexual/minors"] ||
		highestScore >= s.config.BlockThreshold

	actionTaken := "allowed"
	if blocked {
		actionTaken = "blocked"
	} else if highestScore >= s.config.ReviewThreshold {
		actionTaken = "flagged_for_review"
	}

	if s.repo != nil {
		go s.repo.LogModeration(ctx, &ModerationLog{
			ID:             uuid.New(),
			MessageID:      messageID,
			UserID:         userID,
			FlaggedContent: truncate(content, 500),
			FlagType:       highestCategory,
			Confidence:     highestScore,
			ActionTaken:    actionTaken,
			CreatedAt:      time.Now(),
		})
	}

	if blocked {
		return result, ErrContentBlocked
	}
	return result, nil
}

// callOpenAIModeration moderates text content.
func (s *Service) callOpenAIModeration(ctx context.Context, content string) (*ModerationResult, error) {
	return s.postModeration(ctx, map[string]any{"input": content})
}

// callOpenAIImageModeration moderates an image by URL using the omni model,
// which (unlike the default text model) accepts image inputs.
func (s *Service) callOpenAIImageModeration(ctx context.Context, imageURL string) (*ModerationResult, error) {
	return s.postModeration(ctx, map[string]any{
		"model": "omni-moderation-latest",
		"input": []map[string]any{
			{
				"type":      "image_url",
				"image_url": map[string]string{"url": imageURL},
			},
		},
	})
}

// postModeration POSTs a payload to the OpenAI moderation endpoint and parses
// the first result.
func (s *Service) postModeration(ctx context.Context, payload any) (*ModerationResult, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/moderations", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.config.APIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error: %s", string(respBody))
	}

	var apiResp struct {
		Results []struct {
			Flagged        bool               `json:"flagged"`
			Categories     map[string]bool    `json:"categories"`
			CategoryScores map[string]float64 `json:"category_scores"`
		} `json:"results"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	if len(apiResp.Results) == 0 {
		return &ModerationResult{Flagged: false}, nil
	}

	return &ModerationResult{
		Flagged:    apiResp.Results[0].Flagged,
		Categories: apiResp.Results[0].Categories,
		Scores:     apiResp.Results[0].CategoryScores,
	}, nil
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
