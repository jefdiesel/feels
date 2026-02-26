package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimitConfig defines rate limiting parameters
type RateLimitConfig struct {
	// Requests allowed per window
	Requests int
	// Time window duration
	Window time.Duration
	// Key prefix for Redis
	KeyPrefix string
}

// RateLimitMiddleware provides rate limiting using Redis
type RateLimitMiddleware struct {
	redis  *redis.Client
	config RateLimitConfig
}

// NewRateLimitMiddleware creates a new rate limiter
func NewRateLimitMiddleware(redis *redis.Client, config RateLimitConfig) *RateLimitMiddleware {
	return &RateLimitMiddleware{
		redis:  redis,
		config: config,
	}
}

// Limit returns middleware that rate limits by IP
func (m *RateLimitMiddleware) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		// Use X-Forwarded-For if behind proxy
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			ip = xff
		}
		if xri := r.Header.Get("X-Real-IP"); xri != "" {
			ip = xri
		}

		key := fmt.Sprintf("%s:%s", m.config.KeyPrefix, ip)

		allowed, remaining, err := m.checkLimit(r.Context(), key)
		if err != nil {
			// If Redis fails, allow request (fail open) but log
			next.ServeHTTP(w, r)
			return
		}

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", m.config.Requests))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if !allowed {
			w.Header().Set("Retry-After", fmt.Sprintf("%d", int(m.config.Window.Seconds())))
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// checkLimit checks if request is allowed using sliding window counter
func (m *RateLimitMiddleware) checkLimit(ctx context.Context, key string) (bool, int, error) {
	pipe := m.redis.Pipeline()

	// Increment counter
	incrCmd := pipe.Incr(ctx, key)
	// Set expiry on first request
	pipe.Expire(ctx, key, m.config.Window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return true, 0, err
	}

	count := int(incrCmd.Val())
	remaining := m.config.Requests - count
	if remaining < 0 {
		remaining = 0
	}

	return count <= m.config.Requests, remaining, nil
}

// Common rate limit presets

// AuthRateLimiter returns a rate limiter for auth endpoints (5 req/min)
func AuthRateLimiter(redis *redis.Client) *RateLimitMiddleware {
	return NewRateLimitMiddleware(redis, RateLimitConfig{
		Requests:  5,
		Window:    time.Minute,
		KeyPrefix: "rl:auth",
	})
}

// MagicLinkRateLimiter returns a rate limiter for magic link (3 req/min)
func MagicLinkRateLimiter(redis *redis.Client) *RateLimitMiddleware {
	return NewRateLimitMiddleware(redis, RateLimitConfig{
		Requests:  3,
		Window:    time.Minute,
		KeyPrefix: "rl:magic",
	})
}

// APIRateLimiter returns a general API rate limiter (100 req/min)
func APIRateLimiter(redis *redis.Client) *RateLimitMiddleware {
	return NewRateLimitMiddleware(redis, RateLimitConfig{
		Requests:  100,
		Window:    time.Minute,
		KeyPrefix: "rl:api",
	})
}

// StrictRateLimiter returns a strict rate limiter for sensitive ops (3 req/min)
func StrictRateLimiter(redis *redis.Client) *RateLimitMiddleware {
	return NewRateLimitMiddleware(redis, RateLimitConfig{
		Requests:  3,
		Window:    time.Minute,
		KeyPrefix: "rl:strict",
	})
}
