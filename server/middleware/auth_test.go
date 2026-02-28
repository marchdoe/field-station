package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"fieldstation/lib"
	"fieldstation/middleware"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateAndVerifySession(t *testing.T) {
	key := "test-signing-key"
	cookie := middleware.CreateSession(key)
	assert.True(t, middleware.VerifySession(cookie, key))
}

func TestVerifySession_WrongKey(t *testing.T) {
	cookie := middleware.CreateSession("correct-key")
	assert.False(t, middleware.VerifySession(cookie, "wrong-key"))
}

func TestVerifySession_Tampered(t *testing.T) {
	assert.False(t, middleware.VerifySession("tampered.value", "any-key"))
}

func TestVerifySession_MissingDot(t *testing.T) {
	assert.False(t, middleware.VerifySession("nodothere", "key"))
}

func TestRequireAuth_Disabled_WhenAuthEnabledFalse(t *testing.T) {
	claudeHome := t.TempDir()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, claudeHome, false)

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAuth_Passthrough_WhenNoCredentials(t *testing.T) {
	// Setup required (no credentials file) → passthrough (frontend handles redirect)
	claudeHome := t.TempDir()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, claudeHome, true)

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAuth_Blocks_WithNoCookie(t *testing.T) {
	claudeHome := t.TempDir()
	credentialsWithKey(t, claudeHome, "signing-key")

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, claudeHome, true)

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestRequireAuth_Allows_WithValidSession(t *testing.T) {
	claudeHome := t.TempDir()
	creds := credentialsWithKey(t, claudeHome, "my-signing-key")

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, claudeHome, true)

	sessionVal := middleware.CreateSession(creds.SigningKey)
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.AddCookie(&http.Cookie{Name: middleware.SessionCookieName(), Value: sessionVal})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAuth_Blocks_WithWrongKey(t *testing.T) {
	claudeHome := t.TempDir()
	credentialsWithKey(t, claudeHome, "correct-key")

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, claudeHome, true)

	sessionVal := middleware.CreateSession("wrong-key")
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.AddCookie(&http.Cookie{Name: middleware.SessionCookieName(), Value: sessionVal})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// Issue K: Cookie name must stay compatible with existing browser sessions.
func TestSessionCookieName_MatchesTypeScriptServer(t *testing.T) {
	assert.Equal(t, "field-station-session", middleware.SessionCookieName(),
		"cookie name must match the TypeScript server's 'field-station-session'")
}

// credentialsWithKey saves fake credentials with the given signing key to claudeHome.
func credentialsWithKey(t *testing.T, claudeHome, signingKey string) *lib.Credentials {
	t.Helper()
	creds := &lib.Credentials{PasswordHash: "$2a$12$fake", SigningKey: signingKey}
	require.NoError(t, lib.SaveCredentials(claudeHome, creds))
	return creds
}
