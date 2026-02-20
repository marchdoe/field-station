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

type getBackups501Response struct{}

func (getBackups501Response) VisitGetBackupsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type restoreBackup501Response struct{}

func (restoreBackup501Response) VisitRestoreBackupResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getFeatures501Response struct{}

func (getFeatures501Response) VisitGetFeaturesResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateFeature501Response struct{}

func (updateFeature501Response) VisitUpdateFeatureResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getHooks501Response struct{}

func (getHooks501Response) VisitGetHooksResponse(w http.ResponseWriter) error {
	return write501(w)
}

type createHook501Response struct{}

func (createHook501Response) VisitCreateHookResponse(w http.ResponseWriter) error {
	return write501(w)
}

type deleteHook501Response struct{}

func (deleteHook501Response) VisitDeleteHookResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateHook501Response struct{}

func (updateHook501Response) VisitUpdateHookResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getPlugins501Response struct{}

func (getPlugins501Response) VisitGetPluginsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getProjects501Response struct{}

func (getProjects501Response) VisitGetProjectsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type search501Response struct{}

func (search501Response) VisitSearchResponse(w http.ResponseWriter) error {
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

// GetBackups is not yet implemented.
func (h *FieldStationHandler) GetBackups(ctx context.Context, request GetBackupsRequestObject) (GetBackupsResponseObject, error) {
	return getBackups501Response{}, nil
}

// RestoreBackup is not yet implemented.
func (h *FieldStationHandler) RestoreBackup(ctx context.Context, request RestoreBackupRequestObject) (RestoreBackupResponseObject, error) {
	return restoreBackup501Response{}, nil
}

// GetFeatures is not yet implemented.
func (h *FieldStationHandler) GetFeatures(ctx context.Context, request GetFeaturesRequestObject) (GetFeaturesResponseObject, error) {
	return getFeatures501Response{}, nil
}

// UpdateFeature is not yet implemented.
func (h *FieldStationHandler) UpdateFeature(ctx context.Context, request UpdateFeatureRequestObject) (UpdateFeatureResponseObject, error) {
	return updateFeature501Response{}, nil
}

// GetHooks is not yet implemented.
func (h *FieldStationHandler) GetHooks(ctx context.Context, request GetHooksRequestObject) (GetHooksResponseObject, error) {
	return getHooks501Response{}, nil
}

// CreateHook is not yet implemented.
func (h *FieldStationHandler) CreateHook(ctx context.Context, request CreateHookRequestObject) (CreateHookResponseObject, error) {
	return createHook501Response{}, nil
}

// DeleteHook is not yet implemented.
func (h *FieldStationHandler) DeleteHook(ctx context.Context, request DeleteHookRequestObject) (DeleteHookResponseObject, error) {
	return deleteHook501Response{}, nil
}

// UpdateHook is not yet implemented.
func (h *FieldStationHandler) UpdateHook(ctx context.Context, request UpdateHookRequestObject) (UpdateHookResponseObject, error) {
	return updateHook501Response{}, nil
}

// GetPlugins is not yet implemented.
func (h *FieldStationHandler) GetPlugins(ctx context.Context, request GetPluginsRequestObject) (GetPluginsResponseObject, error) {
	return getPlugins501Response{}, nil
}

// GetProjects is not yet implemented.
func (h *FieldStationHandler) GetProjects(ctx context.Context, request GetProjectsRequestObject) (GetProjectsResponseObject, error) {
	return getProjects501Response{}, nil
}

// Search is not yet implemented.
func (h *FieldStationHandler) Search(ctx context.Context, request SearchRequestObject) (SearchResponseObject, error) {
	return search501Response{}, nil
}

// Watch is not yet implemented.
func (h *FieldStationHandler) Watch(ctx context.Context, request WatchRequestObject) (WatchResponseObject, error) {
	return watch501Response{}, nil
}
