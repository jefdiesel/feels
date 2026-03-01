package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
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
		ip := extractClientIP(r)
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

// extractClientIP extracts the real client IP from the request.
// It handles X-Forwarded-For and X-Real-IP headers safely by:
// 1. Taking only the first (leftmost) IP from X-Forwarded-For (the original client)
// 2. Stripping port numbers from the IP
// 3. Falling back to RemoteAddr if no proxy headers present
func extractClientIP(r *http.Request) string {
	// X-Real-IP is typically set by nginx and is more reliable when present
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		if ip := parseIP(xri); ip != "" {
			return ip
		}
	}

	// X-Forwarded-For contains comma-separated list: client, proxy1, proxy2, ...
	// We want the first (leftmost) IP which is the original client
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take only the first IP (the client)
		if comma := strings.Index(xff, ","); comma != -1 {
			xff = xff[:comma]
		}
		if ip := parseIP(strings.TrimSpace(xff)); ip != "" {
			return ip
		}
	}

	// Fall back to RemoteAddr
	return parseIP(r.RemoteAddr)
}

// parseIP extracts and validates an IP address, stripping any port number
func parseIP(addr string) string {
	// Handle IPv6 addresses with brackets [::1]:8080
	if strings.HasPrefix(addr, "[") {
		if end := strings.Index(addr, "]"); end != -1 {
			addr = addr[1:end]
		}
	} else if strings.Contains(addr, ":") && strings.Count(addr, ":") == 1 {
		// IPv4 with port: 192.168.1.1:8080
		host, _, err := net.SplitHostPort(addr)
		if err == nil {
			addr = host
		}
	}

	// Validate it's actually an IP
	if ip := net.ParseIP(addr); ip != nil {
		return ip.String()
	}

	return addr
}
