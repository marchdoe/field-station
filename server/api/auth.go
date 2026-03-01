package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"fieldstation/lib"
	"fieldstation/middleware"
)

// GetAuthStatus returns the current authentication status and whether setup is required.
func (h *FieldStationHandler) GetAuthStatus(_ context.Context, _ GetAuthStatusRequestObject) (GetAuthStatusResponseObject, error) {
	status := GetAuthStatus200JSONResponse{
		AuthEnabled:   h.authEnabled,
		SetupRequired: false,
		Authenticated: false,
	}

	if !h.authEnabled {
		return status, nil
	}

	creds, err := lib.LoadCredentials(h.claudeHome)
	if err != nil || creds == nil {
		status.SetupRequired = true
		return status, nil
	}

	return status, nil
}

type setupSuccessResponse struct {
	cookieValue string
}

func (r setupSuccessResponse) VisitSetupAuthResponse(w http.ResponseWriter) error {
	secureCookies := os.Getenv("FIELD_STATION_SECURE_COOKIES") == "1"
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.SessionCookieName(),
		Value:    r.cookieValue,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   secureCookies,
	})
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// SetupAuth initialises credentials on first run (403 if already configured).
func (h *FieldStationHandler) SetupAuth(_ context.Context, request SetupAuthRequestObject) (SetupAuthResponseObject, error) {
	exists, err := lib.CredentialsExist(h.claudeHome)
	if err != nil {
		return nil, err
	}
	if exists {
		return SetupAuth403Response{}, nil
	}

	hash, err := lib.HashPassword(request.Body.Password)
	if err != nil {
		return nil, err
	}
	signingKey, err := lib.GenerateSigningKey()
	if err != nil {
		return nil, err
	}
	creds := &lib.Credentials{PasswordHash: hash, SigningKey: signingKey}
	if err := lib.SaveCredentials(h.claudeHome, creds); err != nil {
		return nil, err
	}
	cookieVal := middleware.CreateSession(signingKey)
	return setupSuccessResponse{cookieValue: cookieVal}, nil
}

type loginSuccessResponse struct {
	cookieValue string
}

func (r loginSuccessResponse) VisitLoginResponse(w http.ResponseWriter) error {
	if r.cookieValue != "" {
		secureCookies := os.Getenv("FIELD_STATION_SECURE_COOKIES") == "1"
		http.SetCookie(w, &http.Cookie{
			Name:     middleware.SessionCookieName(),
			Value:    r.cookieValue,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
			Secure:   secureCookies,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type loginUnauthorizedResponse struct{}

func (loginUnauthorizedResponse) VisitLoginResponse(w http.ResponseWriter) error {
	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	return nil
}

// Login validates credentials and issues a session cookie.
func (h *FieldStationHandler) Login(_ context.Context, request LoginRequestObject) (LoginResponseObject, error) {
	if !h.authEnabled {
		return loginSuccessResponse{}, nil
	}

	if request.Body == nil {
		return loginUnauthorizedResponse{}, nil
	}

	creds, err := lib.LoadCredentials(h.claudeHome)
	if err != nil || creds == nil {
		return loginUnauthorizedResponse{}, nil
	}

	if !lib.VerifyPassword(request.Body.Password, creds.PasswordHash) {
		return loginUnauthorizedResponse{}, nil
	}

	cookieVal := middleware.CreateSession(creds.SigningKey)
	return loginSuccessResponse{cookieValue: cookieVal}, nil
}

type logoutClearResponse struct{}

func (logoutClearResponse) VisitLogoutResponse(w http.ResponseWriter) error {
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.SessionCookieName(),
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Logout clears the session cookie.
func (h *FieldStationHandler) Logout(_ context.Context, _ LogoutRequestObject) (LogoutResponseObject, error) {
	return logoutClearResponse{}, nil
}
