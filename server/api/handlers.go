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

type getAgents501Response struct{}

func (getAgents501Response) VisitGetAgentsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type createAgent501Response struct{}

func (createAgent501Response) VisitCreateAgentResponse(w http.ResponseWriter) error {
	return write501(w)
}

type deleteAgent501Response struct{}

func (deleteAgent501Response) VisitDeleteAgentResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getAgent501Response struct{}

func (getAgent501Response) VisitGetAgentResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateAgent501Response struct{}

func (updateAgent501Response) VisitUpdateAgentResponse(w http.ResponseWriter) error {
	return write501(w)
}

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

type getCommands501Response struct{}

func (getCommands501Response) VisitGetCommandsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type createCommand501Response struct{}

func (createCommand501Response) VisitCreateCommandResponse(w http.ResponseWriter) error {
	return write501(w)
}

type deleteCommand501Response struct{}

func (deleteCommand501Response) VisitDeleteCommandResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getCommand501Response struct{}

func (getCommand501Response) VisitGetCommandResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateCommand501Response struct{}

func (updateCommand501Response) VisitUpdateCommandResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getConfig501Response struct{}

func (getConfig501Response) VisitGetConfigResponse(w http.ResponseWriter) error {
	return write501(w)
}

type deleteConfigSetting501Response struct{}

func (deleteConfigSetting501Response) VisitDeleteConfigSettingResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateConfigSetting501Response struct{}

func (updateConfigSetting501Response) VisitUpdateConfigSettingResponse(w http.ResponseWriter) error {
	return write501(w)
}

type moveConfigSetting501Response struct{}

func (moveConfigSetting501Response) VisitMoveConfigSettingResponse(w http.ResponseWriter) error {
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

type getSkills501Response struct{}

func (getSkills501Response) VisitGetSkillsResponse(w http.ResponseWriter) error {
	return write501(w)
}

type createSkill501Response struct{}

func (createSkill501Response) VisitCreateSkillResponse(w http.ResponseWriter) error {
	return write501(w)
}

type deleteSkill501Response struct{}

func (deleteSkill501Response) VisitDeleteSkillResponse(w http.ResponseWriter) error {
	return write501(w)
}

type getSkill501Response struct{}

func (getSkill501Response) VisitGetSkillResponse(w http.ResponseWriter) error {
	return write501(w)
}

type updateSkill501Response struct{}

func (updateSkill501Response) VisitUpdateSkillResponse(w http.ResponseWriter) error {
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

// GetAgents is not yet implemented.
func (h *FieldStationHandler) GetAgents(ctx context.Context, request GetAgentsRequestObject) (GetAgentsResponseObject, error) {
	return getAgents501Response{}, nil
}

// CreateAgent is not yet implemented.
func (h *FieldStationHandler) CreateAgent(ctx context.Context, request CreateAgentRequestObject) (CreateAgentResponseObject, error) {
	return createAgent501Response{}, nil
}

// DeleteAgent is not yet implemented.
func (h *FieldStationHandler) DeleteAgent(ctx context.Context, request DeleteAgentRequestObject) (DeleteAgentResponseObject, error) {
	return deleteAgent501Response{}, nil
}

// GetAgent is not yet implemented.
func (h *FieldStationHandler) GetAgent(ctx context.Context, request GetAgentRequestObject) (GetAgentResponseObject, error) {
	return getAgent501Response{}, nil
}

// UpdateAgent is not yet implemented.
func (h *FieldStationHandler) UpdateAgent(ctx context.Context, request UpdateAgentRequestObject) (UpdateAgentResponseObject, error) {
	return updateAgent501Response{}, nil
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

// GetCommands is not yet implemented.
func (h *FieldStationHandler) GetCommands(ctx context.Context, request GetCommandsRequestObject) (GetCommandsResponseObject, error) {
	return getCommands501Response{}, nil
}

// CreateCommand is not yet implemented.
func (h *FieldStationHandler) CreateCommand(ctx context.Context, request CreateCommandRequestObject) (CreateCommandResponseObject, error) {
	return createCommand501Response{}, nil
}

// DeleteCommand is not yet implemented.
func (h *FieldStationHandler) DeleteCommand(ctx context.Context, request DeleteCommandRequestObject) (DeleteCommandResponseObject, error) {
	return deleteCommand501Response{}, nil
}

// GetCommand is not yet implemented.
func (h *FieldStationHandler) GetCommand(ctx context.Context, request GetCommandRequestObject) (GetCommandResponseObject, error) {
	return getCommand501Response{}, nil
}

// UpdateCommand is not yet implemented.
func (h *FieldStationHandler) UpdateCommand(ctx context.Context, request UpdateCommandRequestObject) (UpdateCommandResponseObject, error) {
	return updateCommand501Response{}, nil
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

// GetSkills is not yet implemented.
func (h *FieldStationHandler) GetSkills(ctx context.Context, request GetSkillsRequestObject) (GetSkillsResponseObject, error) {
	return getSkills501Response{}, nil
}

// CreateSkill is not yet implemented.
func (h *FieldStationHandler) CreateSkill(ctx context.Context, request CreateSkillRequestObject) (CreateSkillResponseObject, error) {
	return createSkill501Response{}, nil
}

// DeleteSkill is not yet implemented.
func (h *FieldStationHandler) DeleteSkill(ctx context.Context, request DeleteSkillRequestObject) (DeleteSkillResponseObject, error) {
	return deleteSkill501Response{}, nil
}

// GetSkill is not yet implemented.
func (h *FieldStationHandler) GetSkill(ctx context.Context, request GetSkillRequestObject) (GetSkillResponseObject, error) {
	return getSkill501Response{}, nil
}

// UpdateSkill is not yet implemented.
func (h *FieldStationHandler) UpdateSkill(ctx context.Context, request UpdateSkillRequestObject) (UpdateSkillResponseObject, error) {
	return updateSkill501Response{}, nil
}

// Watch is not yet implemented.
func (h *FieldStationHandler) Watch(ctx context.Context, request WatchRequestObject) (WatchResponseObject, error) {
	return watch501Response{}, nil
}
