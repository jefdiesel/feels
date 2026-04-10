# feels — Security Fixes Required

Audit date: 2026-03-27

## CRITICAL

### 1. Remove unprotected admin endpoint
**File:** `internal/api/router.go` lines 264-265
```go
// DELETE THESE TWO LINES:
r.mux.Post("/admin/clear-devices", authHandler.ClearAllDevices)
```
Anyone on the internet can wipe all device IDs with no auth.

### 2. Verify Apple Sign-In token server-side
**File:** `internal/domain/user/service.go` lines 807-809
Currently trusts client-provided identity_token without verification. An attacker can forge any Apple user ID.
```go
// ADD: Fetch Apple's public keys from https://appleid.apple.com/auth/keys
// Validate JWT signature, issuer (https://appleid.apple.com), audience (app client ID), expiry
```

---

## HIGH

### 3. Fix reflected XSS in magic link redirect
**File:** `internal/api/handlers/auth.go` in `MagicLinkRedirect`
Token is injected into HTML via `fmt.Sprintf` without escaping. Attack: `/auth/magic?token=";alert(1)//`
```go
// BEFORE:
appLink := fmt.Sprintf("feelsfun://magic?token=%s", token)
html := fmt.Sprintf(`...%s...`, appLink)

// AFTER:
import "html"
import "net/url"
safeToken := url.QueryEscape(token)
appLink := fmt.Sprintf("feelsfun://magic?token=%s", safeToken)
htmlContent := fmt.Sprintf(`...%s...`, html.EscapeString(appLink))
```

### 4. Validate JWT secret on startup
**File:** `internal/config/config.go` after `Load()` returns
```go
// ADD after config is loaded:
if cfg.Env == "production" {
    if cfg.JWT.Secret == "dev-secret-change-me" || len(cfg.JWT.Secret) < 32 {
        panic("FATAL: JWT_SECRET must be set to a strong value (32+ chars) in production")
    }
}
```

### 5. Hash OTP codes before storage
**File:** `internal/otp/otp.go` lines 86-92
Codes stored plaintext. Phone verification in `user/service.go` hashes correctly — OTP service should match.
```go
// Hash with SHA-256 before INSERT, compare hashes on verify
```

### 6. Fix weak verification code RNG
**File:** `internal/domain/user/service.go` `generateVerificationCode()` (~line 630)
Uses UUID hex bytes — biased output, low entropy.
```go
// REPLACE WITH:
import crand "crypto/rand"
import "math/big"

func generateVerificationCode() string {
    max := big.NewInt(1000000)
    n, err := crand.Int(crand.Reader, max)
    if err != nil {
        return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
    }
    return fmt.Sprintf("%06d", n.Int64())
}
```

---

## MEDIUM

### 7. Rate limit magic link verify
**File:** `internal/api/router.go` line 283
```go
// BEFORE:
auth.Post("/magic/verify", authHandler.VerifyMagicLink)

// AFTER:
auth.With(authRateLimiter.Limit).Post("/magic/verify", authHandler.VerifyMagicLink)
```

### 8. Validate file content-type from magic bytes
**Files:** `internal/api/handlers/profile.go:174`, `internal/api/handlers/message.go:255`
Content-Type trusted from client header. Could upload HTML-as-JPEG for stored XSS.
```go
// ADD after reading file:
buf := make([]byte, 512)
n, _ := file.Read(buf)
file.Seek(0, 0) // reset reader
detectedType := http.DetectContentType(buf[:n])
if !storage.IsAllowedContentType(detectedType) {
    jsonError(w, "invalid file type", http.StatusBadRequest)
    return
}
```

### 9. Restrict WebSocket CheckOrigin
**File:** `internal/websocket/hub.go` lines 17-23
```go
// BEFORE:
CheckOrigin: func(r *http.Request) bool { return true }

// AFTER:
CheckOrigin: func(r *http.Request) bool {
    origin := r.Header.Get("Origin")
    return origin == "" || // allow non-browser clients
        strings.HasSuffix(origin, ".feelsfun.app") ||
        strings.HasSuffix(origin, ".feels.fun") ||
        origin == "https://feels.fun"
}
```

### 10. Require webhook secrets in production
**Files:** `internal/api/handlers/revenuecat.go:82`, `internal/config/config.go`
RevenueCat and Stripe webhooks are unauthenticated when secrets are empty.
```go
// ADD to startup:
if cfg.Env == "production" && cfg.Stripe.WebhookSecret == "" {
    log.Println("WARNING: STRIPE_WEBHOOK_SECRET not set — webhook verification disabled")
}
```

---

## LOW

### 11. Move /feed/debug behind admin middleware
**File:** `internal/api/router.go` line 338
```go
// Move from feed routes to admin routes, or gate with adminMw
```

---

# Flutter Client Security Fixes

## HIGH

### 12. Add certificate pinning
**File:** `feels-flutter/lib/core/api/api_client.dart`
No cert pinning — MITM can intercept all traffic on shared wifi.
```dart
// Add dio_certificate_pinning package or custom SecurityContext
```

### 13. Consolidate token storage ✅ FIXED
Removed public `session` getter from `AuthRepository`.

## MEDIUM

### 14. Gate debug token input ✅ FIXED
Wrapped in `bool.fromEnvironment('dart.vm.product') == false`.

### 15. Disable router debug logging ✅ FIXED
Set `debugLogDiagnostics: false`.

---

# Flutter Wiring Fixes Needed

### 16. Settings screen: use go_router
**File:** `feels-flutter/lib/shared/widgets/settings_screen.dart`
- Add `import 'package:go_router/go_router.dart';`
- Replace `Navigator.of(context).pushNamed('/premium')` → `context.push('/premium')` (2 places)
- Remove unused `_superLikes` field
- Replace `activeColor:` → `activeTrackColor:` on Switch.adaptive

### 17. Profile screen: wire navigation
**File:** `feels-flutter/lib/features/profile/presentation/screens/profile_screen.dart`
- Add `import 'package:go_router/go_router.dart';`
- Settings button: `context.push('/settings')`
- Search Filters card: `context.push('/preferences')`

### 18. Feed screen: wire premium gate
**File:** `feels-flutter/lib/features/feed/presentation/screens/feed_screen.dart`
- Add `import 'package:go_router/go_router.dart';`
- "See plans" button: `context.push('/premium')`

### 19. Add http_parser dependency
**File:** `feels-flutter/pubspec.yaml`
```yaml
http_parser: ^4.0.2
```

### 20. Start WebSocket on login
**File:** `feels-flutter/lib/features/auth/presentation/screens/splash_screen.dart`
After successful auth, call `ref.read(wsManagerProvider).connect()`
