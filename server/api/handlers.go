package api

import (
	"context"
	"net/http"
)

// FieldStationHandler implements StrictServerInterface.
type FieldStationHandler struct {
	claudeHome string
}

// NewHandler creates a new FieldStationHandler.
func NewHandler(claudeHome string) *FieldStationHandler {
	return &FieldStationHandler{claudeHome: claudeHome}
}

// write501 writes a 501 Not Implemented response.
func write501(w http.ResponseWriter) error {
	http.Error(w, "Not Implemented", http.StatusNotImplemented)
	return nil
}

// --- 501 stub response types (one per operation) ---

type login501Response struct{}

func (login501Response) VisitLoginResponse(w http.ResponseWriter) error {
	return write501(w)
}

type logout501Response struct{}

func (logout501Response) VisitLogoutResponse(w http.ResponseWriter) error {
	return write501(w)
}

type watch501Response struct{}

func (watch501Response) VisitWatchResponse(w http.ResponseWriter) error {
	return write501(w)
}

// --- Handler method implementations ---

// GetHealth returns server health status.
func (h *FieldStationHandler) GetHealth(ctx context.Context, request GetHealthRequestObject) (GetHealthResponseObject, error) {
	return GetHealth200JSONResponse{Status: "ok"}, nil
}

// Login is not yet implemented.
func (h *FieldStationHandler) Login(ctx context.Context, request LoginRequestObject) (LoginResponseObject, error) {
	return login501Response{}, nil
}

// Logout is not yet implemented.
func (h *FieldStationHandler) Logout(ctx context.Context, request LogoutRequestObject) (LogoutResponseObject, error) {
	return logout501Response{}, nil
}

// Watch is not yet implemented.
func (h *FieldStationHandler) Watch(ctx context.Context, request WatchRequestObject) (WatchResponseObject, error) {
	return watch501Response{}, nil
}
