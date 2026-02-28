package middleware

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"fieldstation/lib"
)

const sessionIDBytes = 16
const sessionCookieName = "field-station-session"

func sign(id, token string) string {
	mac := hmac.New(sha256.New, []byte(token))
	mac.Write([]byte(id))
	return hex.EncodeToString(mac.Sum(nil))
}

// CreateSession creates a signed session cookie value: "{randomId}.{hmac}".
func CreateSession(token string) string {
	b := make([]byte, sessionIDBytes)
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Sprintf("session rand failed: %v", err))
	}
	id := hex.EncodeToString(b)
	return id + "." + sign(id, token)
}

// VerifySession verifies a session cookie value against the signing key. Constant-time comparison.
func VerifySession(cookieValue, signingKey string) bool {
	dot := strings.Index(cookieValue, ".")
	if dot == -1 {
		return false
	}
	id := cookieValue[:dot]
	given := cookieValue[dot+1:]
	expected := sign(id, signingKey)
	return hmac.Equal([]byte(given), []byte(expected))
}

// SessionCookieName is the HTTP cookie name used for the session.
func SessionCookieName() string {
	return sessionCookieName
}

// RequireAuth wraps an http.Handler, requiring a valid session cookie.
// If authEnabled is false, all requests pass through.
// If no credentials file exists (setup required), requests pass through.
func RequireAuth(next http.Handler, claudeHome string, authEnabled bool) http.Handler {
	if !authEnabled {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		creds, err := lib.LoadCredentials(claudeHome)
		if err != nil || creds == nil {
			// Setup not yet complete — pass through so frontend can redirect to /auth/setup
			next.ServeHTTP(w, r)
			return
		}
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil || !VerifySession(cookie.Value, creds.SigningKey) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
