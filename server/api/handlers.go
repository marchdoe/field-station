package api

import (
	"context"
	"net/http"
)

// FieldStationHandler implements StrictServerInterface.
type FieldStationHandler struct {
	claudeHome string
	authToken  string
	hub        *watchHub
}

// NewHandler creates a new FieldStationHandler.
func NewHandler(claudeHome, authToken string) *FieldStationHandler {
	return &FieldStationHandler{
		claudeHome: claudeHome,
		authToken:  authToken,
		hub: &watchHub{
			listeners: make(map[chan struct{}]struct{}),
		},
	}
}

// write501 writes a 501 Not Implemented response.
func write501(w http.ResponseWriter) error {
	http.Error(w, "Not Implemented", http.StatusNotImplemented)
	return nil
}

// GetHealth returns server health status.
func (h *FieldStationHandler) GetHealth(ctx context.Context, request GetHealthRequestObject) (GetHealthResponseObject, error) {
	return GetHealth200JSONResponse{Status: "ok"}, nil
}
