package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
)

// FieldStationHandler implements StrictServerInterface.
type FieldStationHandler struct {
	claudeHome  string
	authEnabled bool
	hub         *watchHub
}

// NewHandler creates a new FieldStationHandler.
func NewHandler(claudeHome string, authEnabled bool) *FieldStationHandler {
	return &FieldStationHandler{
		claudeHome:  claudeHome,
		authEnabled: authEnabled,
		hub: &watchHub{
			listeners: make(map[chan struct{}]struct{}),
		},
	}
}

// GetHealth returns server health status.
func (h *FieldStationHandler) GetHealth(_ context.Context, _ GetHealthRequestObject) (GetHealthResponseObject, error) {
	return GetHealth200JSONResponse{Status: "ok"}, nil
}
