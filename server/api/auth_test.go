package api_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"fieldstation/api"
	"fieldstation/lib"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- GetAuthStatus ---

func TestGetAuthStatus_AuthDisabled(t *testing.T) {
	claudeHome := t.TempDir()
	h := api.NewHandler(claudeHome, false)

	resp, err := h.GetAuthStatus(context.Background(), api.GetAuthStatusRequestObject{})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitGetAuthStatusResponse(w))
	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), `"authEnabled":false`)
	assert.Contains(t, w.Body.String(), `"setupRequired":false`)
	assert.Contains(t, w.Body.String(), `"authenticated":false`)
}

func TestGetAuthStatus_SetupRequired(t *testing.T) {
	claudeHome := t.TempDir()
	h := api.NewHandler(claudeHome, true)

	resp, err := h.GetAuthStatus(context.Background(), api.GetAuthStatusRequestObject{})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitGetAuthStatusResponse(w))
	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), `"authEnabled":true`)
	assert.Contains(t, w.Body.String(), `"setupRequired":true`)
}

// --- SetupAuth ---

func TestSetupAuth_SetsPasswordWhenNoCredentials(t *testing.T) {
	claudeHome := t.TempDir()
	h := api.NewHandler(claudeHome, true)

	password := "my-password"
	resp, err := h.SetupAuth(context.Background(), api.SetupAuthRequestObject{
		Body: &api.SetupAuthJSONRequestBody{Password: password},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitSetupAuthResponse(w))
	assert.Equal(t, 200, w.Code)

	// Credentials file must now exist with a valid bcrypt hash
	creds, err := lib.LoadCredentials(claudeHome)
	require.NoError(t, err)
	require.NotNil(t, creds)
	assert.True(t, lib.VerifyPassword(password, creds.PasswordHash))
	assert.NotEmpty(t, creds.SigningKey)
}

func TestSetupAuth_Returns403WhenCredentialsExist(t *testing.T) {
	claudeHome := t.TempDir()
	// Pre-create credentials
	creds := &lib.Credentials{PasswordHash: "$2a$12$fake", SigningKey: "key"} //nolint:gosec // test data; not real credentials
	require.NoError(t, lib.SaveCredentials(claudeHome, creds))

	h := api.NewHandler(claudeHome, true)
	resp, err := h.SetupAuth(context.Background(), api.SetupAuthRequestObject{
		Body: &api.SetupAuthJSONRequestBody{Password: "new-password"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitSetupAuthResponse(w))
	assert.Equal(t, 403, w.Code)
}

// --- Login ---

func TestLogin_WithCorrectPassword_Succeeds(t *testing.T) {
	claudeHome := t.TempDir()
	hash, err := lib.HashPassword("mysecret")
	require.NoError(t, err)
	creds := &lib.Credentials{PasswordHash: hash, SigningKey: "signing-key"}
	require.NoError(t, lib.SaveCredentials(claudeHome, creds))

	h := api.NewHandler(claudeHome, true)
	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "mysecret"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 200, w.Code)
	// Session cookie must be set
	cookies := w.Result().Cookies()
	require.Len(t, cookies, 1)
	assert.Equal(t, "field-station-session", cookies[0].Name)
}

func TestLogin_WithWrongPassword_ReturnsUnauthorized(t *testing.T) {
	claudeHome := t.TempDir()
	hash, err := lib.HashPassword("mysecret")
	require.NoError(t, err)
	require.NoError(t, lib.SaveCredentials(claudeHome, &lib.Credentials{PasswordHash: hash, SigningKey: "key"}))

	h := api.NewHandler(claudeHome, true)
	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "wrongpassword"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 401, w.Code)
}

func TestLogin_WhenAuthDisabled_AlwaysSucceeds(t *testing.T) {
	claudeHome := t.TempDir()
	h := api.NewHandler(claudeHome, false)

	resp, err := h.Login(context.Background(), api.LoginRequestObject{
		Body: &api.LoginJSONRequestBody{Password: "anything"},
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLoginResponse(w))
	assert.Equal(t, 200, w.Code)
}

// --- Logout ---

func TestLogout_AlwaysSucceeds(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.Logout(context.Background(), api.LogoutRequestObject{})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	require.NoError(t, resp.VisitLogoutResponse(w))
	assert.Equal(t, 200, w.Code)
}
