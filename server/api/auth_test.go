package api_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"fieldstation/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogin_WithCorrectToken_Succeeds(t *testing.T) {
	// Create handler with an auth token.
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	h := api.NewHandler(claudeHome, "mysecret")

	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "mysecret"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 200, w.Code)
}

func TestLogin_WithWrongToken_ReturnsUnauthorized(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	h := api.NewHandler(claudeHome, "mysecret")

	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "wrongpassword"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 401, w.Code)
}

func TestLogin_WithNoToken_AlwaysSucceeds(t *testing.T) {
	// When authToken is empty, auth is bypassed.
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	h := api.NewHandler(claudeHome, "") // no auth

	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "anything"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 200, w.Code)
}

func TestLogout_AlwaysSucceeds(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.Logout(context.Background(), api.LogoutRequestObject{})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLogoutResponse(w))
	assert.Equal(t, 200, w.Code)
}
