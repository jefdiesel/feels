package sms

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
)

type Config struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

type Service struct {
	config Config
	client *http.Client
}

func NewService(config Config) *Service {
	return &Service{
		config: config,
		client: &http.Client{},
	}
}

// IsConfigured returns true if SMS credentials are set
func (s *Service) IsConfigured() bool {
	return s.config.AccountSID != "" && s.config.AuthToken != "" && s.config.FromNumber != ""
}

// Send sends an SMS message via Twilio
func (s *Service) Send(ctx context.Context, to, message string) error {
	if !s.IsConfigured() {
		log.Printf("[SMS] Not configured, would send to %s: %s", to, message)
		return nil
	}

	apiURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.config.AccountSID)

	data := url.Values{}
	data.Set("To", to)
	data.Set("From", s.config.FromNumber)
	data.Set("Body", message)

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(s.config.AccountSID, s.config.AuthToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send SMS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp struct {
			Message string `json:"message"`
			Code    int    `json:"code"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&errResp); err == nil {
			return fmt.Errorf("twilio error %d: %s", errResp.Code, errResp.Message)
		}
		return fmt.Errorf("twilio error: status %d", resp.StatusCode)
	}

	return nil
}

// SendVerificationCode sends a formatted verification code
func (s *Service) SendVerificationCode(ctx context.Context, to, code string) error {
	message := fmt.Sprintf("Your Feels verification code is: %s. It expires in 10 minutes.", code)
	return s.Send(ctx, to, message)
}
