package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Redis      RedisConfig
	JWT        JWTConfig
	S3         S3Config
	Stripe     StripeConfig
	Email      EmailConfig
	SMS        SMSConfig
	Sentry     SentryConfig
	OpenAI     OpenAIConfig
	Moderation ModerationConfig
}

type SMSConfig struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

type SentryConfig struct {
	DSN         string
	Environment string
}

type OpenAIConfig struct {
	APIKey string
}

type ModerationConfig struct {
	Enabled             bool
	BlockThreshold      float64
	ReviewThreshold     float64
}

type EmailConfig struct {
	APIKey    string
	FromEmail string
	FromName  string
}

type StripeConfig struct {
	SecretKey        string
	WebhookSecret    string
	MonthlyPriceID   string
	QuarterlyPriceID string
	AnnualPriceID    string
}

type ServerConfig struct {
	Port string
	Env  string
}

type DatabaseConfig struct {
	URL string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	Secret        string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type S3Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
	PublicURL string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Env:  getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://feels:feels@localhost:5432/feels?sslmode=disable"),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		JWT: JWTConfig{
			Secret:        getEnv("JWT_SECRET", "dev-secret-change-me"),
			AccessExpiry:  parseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m")),
			RefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h")), // 7 days
		},
		S3: S3Config{
			Endpoint:  getEnv("S3_ENDPOINT", "localhost:9000"),
			AccessKey: getEnv("S3_ACCESS_KEY", "minioadmin"),
			SecretKey: getEnv("S3_SECRET_KEY", "minioadmin"),
			Bucket:    getEnv("S3_BUCKET", "feels-photos"),
			UseSSL:    getEnvBool("S3_USE_SSL", false),
			PublicURL: getEnv("S3_PUBLIC_URL", ""),
		},
		Stripe: StripeConfig{
			SecretKey:        getEnv("STRIPE_SECRET_KEY", ""),
			WebhookSecret:    getEnv("STRIPE_WEBHOOK_SECRET", ""),
			MonthlyPriceID:   getEnv("STRIPE_MONTHLY_PRICE_ID", ""),
			QuarterlyPriceID: getEnv("STRIPE_QUARTERLY_PRICE_ID", ""),
			AnnualPriceID:    getEnv("STRIPE_ANNUAL_PRICE_ID", ""),
		},
		Email: EmailConfig{
			APIKey:    getEnv("RESEND_API_KEY", ""),
			FromEmail: getEnv("EMAIL_FROM", ""),
			FromName:  getEnv("EMAIL_FROM_NAME", "Feels"),
		},
		SMS: SMSConfig{
			AccountSID: getEnv("TWILIO_ACCOUNT_SID", ""),
			AuthToken:  getEnv("TWILIO_AUTH_TOKEN", ""),
			FromNumber: getEnv("TWILIO_FROM_NUMBER", ""),
		},
		Sentry: SentryConfig{
			DSN:         getEnv("SENTRY_DSN", ""),
			Environment: getEnv("SENTRY_ENVIRONMENT", "development"),
		},
		OpenAI: OpenAIConfig{
			APIKey: getEnv("OPENAI_API_KEY", ""),
		},
		Moderation: ModerationConfig{
			Enabled:         getEnvBool("MODERATION_ENABLED", false),
			BlockThreshold:  getEnvFloat("MODERATION_BLOCK_THRESHOLD", 0.9),
			ReviewThreshold: getEnvFloat("MODERATION_REVIEW_THRESHOLD", 0.7),
		},
	}
}

func (c *Config) IsDevelopment() bool {
	return c.Server.Env == "development"
}

func (c *Config) IsProduction() bool {
	return c.Server.Env == "production"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return defaultValue
		}
		return parsed
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return defaultValue
		}
		return parsed
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 15 * time.Minute
	}
	return d
}
