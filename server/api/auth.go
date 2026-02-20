package api

import (
	"context"
	"encoding/json"
	"net/http"

	"fieldstation/middleware"
)

// loginSuccessResponse sets the session cookie and returns JSON success.
type loginSuccessResponse struct {
	cookieValue string
}

func (r loginSuccessResponse) VisitLoginResponse(w http.ResponseWriter) error {
	if r.cookieValue != "" {
		http.SetCookie(w, &http.Cookie{
			Name:     middleware.SessionCookieName(),
			Value:    r.cookieValue,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// loginUnauthorizedResponse returns a 401.
type loginUnauthorizedResponse struct{}

func (loginUnauthorizedResponse) VisitLoginResponse(w http.ResponseWriter) error {
	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	return nil
}

// logoutClearResponse clears the session cookie and returns JSON success.
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

// Login handles POST /api/auth/login.
func (h *FieldStationHandler) Login(ctx context.Context, request LoginRequestObject) (LoginResponseObject, error) {
	if h.authToken == "" || (request.Body != nil && request.Body.Password == h.authToken) {
		cookieVal := ""
		if h.authToken != "" {
			cookieVal = middleware.CreateSession(h.authToken)
		}
		return loginSuccessResponse{cookieValue: cookieVal}, nil
	}
	return loginUnauthorizedResponse{}, nil
}

// Logout handles POST /api/auth/logout.
func (h *FieldStationHandler) Logout(ctx context.Context, request LogoutRequestObject) (LogoutResponseObject, error) {
	return logoutClearResponse{}, nil
}
