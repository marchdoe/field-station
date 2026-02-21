package api_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/api"
)

// Circular projectPath validation fix — hooks mutations must reject unregistered paths.

func TestGetHooks_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	_, err := h.GetHooks(context.Background(), api.GetHooksRequestObject{
		Params: api.GetHooksParams{ProjectPath: &unregistered},
	})
	require.Error(t, err, "GetHooks must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestCreateHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	scope := api.CreateHookRequestScopeProject
	_, err := h.CreateHook(context.Background(), api.CreateHookRequestObject{
		Body: &api.CreateHookJSONRequestBody{
			Scope:       scope,
			ProjectPath: &unregistered,
			Event:       "PreToolUse",
			Commands:    []string{"echo injected"},
		},
	})
	require.Error(t, err, "CreateHook must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestUpdateHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	scope := api.UpdateHookRequestScopeProject
	_, err := h.UpdateHook(context.Background(), api.UpdateHookRequestObject{
		Id: "PreToolUse:0",
		Body: &api.UpdateHookJSONRequestBody{
			Scope:       scope,
			ProjectPath: &unregistered,
			Event:       "PreToolUse",
			Commands:    []string{"echo injected"},
		},
	})
	require.Error(t, err, "UpdateHook must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestDeleteHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	scope := "project"
	_, err := h.DeleteHook(context.Background(), api.DeleteHookRequestObject{
		Id: "PreToolUse:0",
		Params: api.DeleteHookParams{
			Scope:       &scope,
			ProjectPath: &unregistered,
		},
	})
	require.Error(t, err, "DeleteHook must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}
