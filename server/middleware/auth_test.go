package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"fieldstation/middleware"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateAndVerifySession(t *testing.T) {
	token := "test-secret-token"
	cookie := middleware.CreateSession(token)
	assert.True(t, middleware.VerifySession(cookie, token))
}

func TestVerifySession_WrongToken(t *testing.T) {
	cookie := middleware.CreateSession("correct-token")
	assert.False(t, middleware.VerifySession(cookie, "wrong-token"))
}

func TestVerifySession_Tampered(t *testing.T) {
	assert.False(t, middleware.VerifySession("tampered.value", "any-token"))
}

func TestVerifySession_MissingDot(t *testing.T) {
	assert.False(t, middleware.VerifySession("nodothere", "token"))
}

func TestRequireAuth_Disabled_WhenTokenEmpty(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, "")

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAuth_Blocks_WithNoCooke(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, "my-token")

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestRequireAuth_Allows_WithValidSession(t *testing.T) {
	token := "my-token"
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, token)

	sessionVal := middleware.CreateSession(token)
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.AddCookie(&http.Cookie{Name: middleware.SessionCookieName(), Value: sessionVal})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
}

// Issue K: Cookie name must stay compatible with existing browser sessions from the
// TypeScript server, which used "field-station-session".
func TestSessionCookieName_MatchesTypeScriptServer(t *testing.T) {
	assert.Equal(t, "field-station-session", middleware.SessionCookieName(),
		"cookie name must match the TypeScript server's 'field-station-session' to avoid logging out existing users on upgrade")
}

func TestRequireAuth_Blocks_WithWrongToken(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.RequireAuth(inner, "correct-token")

	sessionVal := middleware.CreateSession("wrong-token")
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.AddCookie(&http.Cookie{Name: middleware.SessionCookieName(), Value: sessionVal})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
