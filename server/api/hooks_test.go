package api_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/api"
)

// Unregistered project ID must be rejected — resolveProjectPath validates registration.

func TestGetHooks_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	_, err := h.GetHooks(context.Background(), api.GetHooksRequestObject{
		Params: api.GetHooksParams{ProjectId: &fakeId},
	})
	require.Error(t, err, "GetHooks must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestCreateHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := api.CreateHookRequestScopeProject
	_, err := h.CreateHook(context.Background(), api.CreateHookRequestObject{
		Body: &api.CreateHookJSONRequestBody{
			Scope:     scope,
			ProjectId: &fakeId,
			Event:     "PreToolUse",
			Commands:  []string{"echo injected"},
		},
	})
	require.Error(t, err, "CreateHook must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestUpdateHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := api.UpdateHookRequestScopeProject
	_, err := h.UpdateHook(context.Background(), api.UpdateHookRequestObject{
		Id: "PreToolUse:0",
		Body: &api.UpdateHookJSONRequestBody{
			Scope:     scope,
			ProjectId: &fakeId,
			Event:     "PreToolUse",
			Commands:  []string{"echo injected"},
		},
	})
	require.Error(t, err, "UpdateHook must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestDeleteHook_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := "project"
	_, err := h.DeleteHook(context.Background(), api.DeleteHookRequestObject{
		Id: "PreToolUse:0",
		Params: api.DeleteHookParams{
			Scope:     &scope,
			ProjectId: &fakeId,
		},
	})
	require.Error(t, err, "DeleteHook must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}
