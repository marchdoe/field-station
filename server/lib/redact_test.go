package lib_test

import (
	"testing"

	"fieldstation/lib"
	"github.com/stretchr/testify/assert"
)

func TestRedactSensitiveValues_ApiKey(t *testing.T) {
	input := lib.JsonObject{ //nolint:gosec // test data; not real credentials
		"apiKey": "sk-ant-api03-supersecretvalue",
		"name":   "test",
	}
	result := lib.RedactSensitiveValues(input)

	if result["apiKey"] != "[REDACTED]" {
		t.Errorf("expected apiKey to be redacted, got %q", result["apiKey"])
	}
	if result["name"] != "test" {
		t.Errorf("expected name to be unchanged, got %q", result["name"])
	}
}

func TestRedactSensitiveValues_Token(t *testing.T) {
	input := lib.JsonObject{
		"authToken": "some-token-value",
		"theme":     "dark",
	}
	result := lib.RedactSensitiveValues(input)

	if result["authToken"] != "[REDACTED]" {
		t.Errorf("expected authToken to be redacted, got %q", result["authToken"])
	}
	if result["theme"] != "dark" {
		t.Errorf("expected theme to be unchanged, got %q", result["theme"])
	}
}

func TestRedactSensitiveValues_NonSecretKey(t *testing.T) {
	input := lib.JsonObject{
		"theme":    "dark",
		"fontSize": "14",
		"verbose":  true,
	}
	result := lib.RedactSensitiveValues(input)

	if result["theme"] != "dark" {
		t.Errorf("expected theme to be unchanged, got %q", result["theme"])
	}
	if result["fontSize"] != "14" {
		t.Errorf("expected fontSize to be unchanged, got %q", result["fontSize"])
	}
	if result["verbose"] != true {
		t.Errorf("expected verbose to be unchanged, got %v", result["verbose"])
	}
}

func TestRedactSensitiveValues_NestedObject(t *testing.T) {
	input := lib.JsonObject{
		"settings": lib.JsonObject{ //nolint:gosec // test data; not real credentials
			"apiKey": "sk-ant-secret",
			"model":  "claude-3",
		},
		"name": "test",
	}
	result := lib.RedactSensitiveValues(input)

	nested, ok := result["settings"].(lib.JsonObject)
	if !ok {
		t.Fatalf("expected settings to be a JsonObject, got %T", result["settings"])
	}
	if nested["apiKey"] != "[REDACTED]" {
		t.Errorf("expected nested apiKey to be redacted, got %q", nested["apiKey"])
	}
	if nested["model"] != "claude-3" {
		t.Errorf("expected nested model to be unchanged, got %q", nested["model"])
	}
	if result["name"] != "test" {
		t.Errorf("expected name to be unchanged, got %q", result["name"])
	}
}

func TestRedactSensitiveValues_JWT(t *testing.T) {
	// A JWT-shaped value: starts with eyJ...eyJ
	jwt := "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
	input := lib.JsonObject{
		"authorization": jwt,
		"name":          "test",
	}
	result := lib.RedactSensitiveValues(input)

	// "authorization" matches sensitive key pattern
	if result["authorization"] != "[REDACTED]" {
		t.Errorf("expected authorization to be redacted, got %q", result["authorization"])
	}
}

func TestRedactSensitiveValues_JWTValuePattern(t *testing.T) {
	// JWT-shaped value in a non-sensitive key should still be redacted by value pattern
	jwt := "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
	input := lib.JsonObject{
		"someRandomKey": jwt,
	}
	result := lib.RedactSensitiveValues(input)

	if result["someRandomKey"] != "[REDACTED]" {
		t.Errorf("expected JWT value to be redacted by value pattern, got %q", result["someRandomKey"])
	}
}

func TestRedactSensitiveValues_NoMutation(t *testing.T) {
	input := lib.JsonObject{
		"apiKey": "original-secret",
		"name":   "unchanged",
	}
	original := input["apiKey"]

	lib.RedactSensitiveValues(input)

	if input["apiKey"] != original {
		t.Errorf("original object was mutated: expected %q, got %q", original, input["apiKey"])
	}
}

func TestRedactSensitiveValues_EnvKey(t *testing.T) {
	// The "env" key gets all values redacted regardless of key name
	input := lib.JsonObject{
		"env": lib.JsonObject{
			"HOME":         "/home/user",
			"ANTHROPIC_API_KEY": "sk-ant-secret",
			"PATH":         "/usr/bin",
		},
	}
	result := lib.RedactSensitiveValues(input)

	envMap, ok := result["env"].(lib.JsonObject)
	if !ok {
		t.Fatalf("expected env to be a JsonObject, got %T", result["env"])
	}
	for k, v := range envMap {
		if v != "[REDACTED]" {
			t.Errorf("expected env[%q] to be redacted, got %q", k, v)
		}
	}
}

func TestRedactSensitiveValues_ArrayOfObjects(t *testing.T) {
	input := lib.JsonObject{
		"items": []any{
			lib.JsonObject{"apiKey": "secret1", "name": "a"},
			lib.JsonObject{"apiKey": "secret2", "name": "b"},
		},
	}
	result := lib.RedactSensitiveValues(input)

	items, ok := result["items"].([]any)
	if !ok {
		t.Fatalf("expected items to be []any, got %T", result["items"])
	}
	for i, item := range items {
		obj, ok := item.(lib.JsonObject)
		if !ok {
			t.Fatalf("expected item[%d] to be JsonObject, got %T", i, item)
		}
		if obj["apiKey"] != "[REDACTED]" {
			t.Errorf("expected items[%d].apiKey to be redacted, got %q", i, obj["apiKey"])
		}
	}
}

func TestRedactSensitiveValues_SensitiveKeyPatterns(t *testing.T) {
	cases := []struct {
		key string
	}{
		{"apiKey"},
		{"api_key"},
		{"secretValue"},
		{"myToken"},
		{"password"},
		{"credential"},
		{"authHeader"},
		{"privateKey"},
	}
	for _, tc := range cases {
		input := lib.JsonObject{tc.key: "some-secret-value"}
		result := lib.RedactSensitiveValues(input)
		if result[tc.key] != "[REDACTED]" {
			t.Errorf("expected key %q to be redacted, got %q", tc.key, result[tc.key])
		}
	}
}

func TestRedactSensitiveValues_SensitiveValuePatterns(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"anthropic key", "sk-ant-api03-xxxxxxxxxxxxxxxxxxxx"},
		{"openai key", "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"github pat", "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"github oauth", "gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"github fine-grained pat", "github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"bearer token", "Bearer sometoken123"},
		{"slack token", "xoxb-1234-5678-abcdef"},
		{"aws access key", "AKIAIOSFODNN7EXAMPLE"},
		{"npm token", "npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
	}
	for _, tc := range cases {
		input := lib.JsonObject{"someKey": tc.value}
		result := lib.RedactSensitiveValues(input)
		if result["someKey"] != "[REDACTED]" {
			t.Errorf("expected %s value to be redacted, got %q", tc.name, result["someKey"])
		}
	}
}

func TestRedactSensitiveValues_PrimitivesPassThrough(t *testing.T) {
	// Numbers, booleans, and nil under non-secret keys must pass through unchanged.
	input := lib.JsonObject{
		"count":   42,
		"enabled": true,
		"missing": nil,
	}
	result := lib.RedactSensitiveValues(input)
	assert.Equal(t, 42, result["count"])
	assert.Equal(t, true, result["enabled"])
	assert.Nil(t, result["missing"])
}

func TestRedactSensitiveValues_NilMap(t *testing.T) {
	// A nil JsonObject is a valid Go value; ranging over it is a no-op.
	var nilMap lib.JsonObject
	result := lib.RedactSensitiveValues(nilMap)
	assert.NotNil(t, result)
	assert.Empty(t, result)
}

func TestRedactSensitiveValues_NilInput(t *testing.T) {
	// Should not panic on empty input
	result := lib.RedactSensitiveValues(lib.JsonObject{})
	if result == nil {
		t.Error("expected non-nil result for empty input")
	}
}
