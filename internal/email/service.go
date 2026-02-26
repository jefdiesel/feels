package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Service handles email sending via Resend
type Service struct {
	apiKey  string
	fromEmail string
	fromName  string
	baseURL string
	enabled bool
}

type Config struct {
	APIKey    string
	FromEmail string
	FromName  string
}

// Email represents an email to send
type Email struct {
	To      []string
	Subject string
	HTML    string
	Text    string
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html,omitempty"`
	Text    string   `json:"text,omitempty"`
}

type resendResponse struct {
	ID string `json:"id"`
}

type resendError struct {
	Message string `json:"message"`
}

func NewService(config Config) *Service {
	enabled := config.APIKey != "" && config.FromEmail != ""

	fromName := config.FromName
	if fromName == "" {
		fromName = "Feels"
	}

	return &Service{
		apiKey:    config.APIKey,
		fromEmail: config.FromEmail,
		fromName:  fromName,
		baseURL:   "https://api.resend.com",
		enabled:   enabled,
	}
}

// IsEnabled returns true if email sending is configured
func (s *Service) IsEnabled() bool {
	return s.enabled
}

// Send sends an email
func (s *Service) Send(ctx context.Context, email *Email) error {
	if !s.enabled {
		// Log email to console in dev mode
		fmt.Printf("[EMAIL] To: %v\nSubject: %s\n%s\n", email.To, email.Subject, email.Text)
		return nil
	}

	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)

	req := resendRequest{
		From:    from,
		To:      email.To,
		Subject: email.Subject,
		HTML:    email.HTML,
		Text:    email.Text,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		var errResp resendError
		if json.Unmarshal(respBody, &errResp) == nil {
			return fmt.Errorf("email API error: %s", errResp.Message)
		}
		return fmt.Errorf("email API error: status %d", resp.StatusCode)
	}

	return nil
}

// SendMagicLink sends a magic link email
func (s *Service) SendMagicLink(ctx context.Context, toEmail, token, appName string) error {
	// In production, this would be your actual domain
	magicLink := fmt.Sprintf("feels://magic?token=%s", token)

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px;">
  <div style="max-width: 400px; margin: 0 auto; text-align: center;">
    <h1 style="color: #e85d75; margin-bottom: 30px;">%s</h1>
    <p style="font-size: 18px; margin-bottom: 30px;">Tap the button below to sign in to your account.</p>
    <a href="%s" style="display: inline-block; background-color: #e85d75; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign In</a>
    <p style="margin-top: 30px; color: #888; font-size: 14px;">This link expires in 15 minutes.</p>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request this email, you can safely ignore it.</p>
  </div>
</body>
</html>
`, appName, magicLink)

	text := fmt.Sprintf(`Sign in to %s

Click this link to sign in:
%s

This link expires in 15 minutes.

If you didn't request this email, you can safely ignore it.
`, appName, magicLink)

	return s.Send(ctx, &Email{
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Sign in to %s", appName),
		HTML:    html,
		Text:    text,
	})
}

// SendWelcome sends a welcome email
func (s *Service) SendWelcome(ctx context.Context, toEmail, name, appName string) error {
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px;">
  <div style="max-width: 400px; margin: 0 auto; text-align: center;">
    <h1 style="color: #e85d75; margin-bottom: 30px;">Welcome to %s!</h1>
    <p style="font-size: 18px; margin-bottom: 20px;">Hey %s,</p>
    <p style="font-size: 16px; color: #ccc; margin-bottom: 30px;">Thanks for joining. We're excited to have you here.</p>
    <p style="color: #888; font-size: 14px;">Start swiping and find your match!</p>
  </div>
</body>
</html>
`, appName, name)

	text := fmt.Sprintf(`Welcome to %s!

Hey %s,

Thanks for joining. We're excited to have you here.

Start swiping and find your match!
`, appName, name)

	return s.Send(ctx, &Email{
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Welcome to %s!", appName),
		HTML:    html,
		Text:    text,
	})
}

// SendMatchNotification sends a match notification email
func (s *Service) SendMatchNotification(ctx context.Context, toEmail, matchName, appName string) error {
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px;">
  <div style="max-width: 400px; margin: 0 auto; text-align: center;">
    <h1 style="color: #e85d75; margin-bottom: 30px;">It's a Match! 💕</h1>
    <p style="font-size: 18px; margin-bottom: 30px;">You and %s liked each other!</p>
    <a href="feels://matches" style="display: inline-block; background-color: #e85d75; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Send a Message</a>
  </div>
</body>
</html>
`, matchName)

	text := fmt.Sprintf(`It's a Match!

You and %s liked each other!

Open %s to send a message.
`, matchName, appName)

	return s.Send(ctx, &Email{
		To:      []string{toEmail},
		Subject: "It's a Match! 💕",
		HTML:    html,
		Text:    text,
	})
}
