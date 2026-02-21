package lib_test

import (
	"testing"

	"fieldstation/lib"
)

func TestAllFeatures_NotEmpty(t *testing.T) {
	features := lib.AllFeatures()
	if len(features) == 0 {
		t.Fatal("AllFeatures() returned empty slice")
	}
}

func TestAllFeatures_UniqueIDs(t *testing.T) {
	features := lib.AllFeatures()
	seen := make(map[string]bool)
	for _, f := range features {
		if seen[f.ID] {
			t.Errorf("duplicate feature ID: %q", f.ID)
		}
		seen[f.ID] = true
	}
}

func TestAllFeatures_AllHaveKeyPath(t *testing.T) {
	features := lib.AllFeatures()
	for _, f := range features {
		if f.KeyPath == "" {
			t.Errorf("feature %q has empty KeyPath", f.ID)
		}
	}
}

func TestGetFeature_Found(t *testing.T) {
	f, ok := lib.GetFeature("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS")
	if !ok {
		t.Fatal("GetFeature(\"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\") returned false")
	}
	if f.ID != "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" {
		t.Errorf("expected ID %q, got %q", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", f.ID)
	}
	if f.Label != "Agent Teams" {
		t.Errorf("expected Label %q, got %q", "Agent Teams", f.Label)
	}
}

func TestGetFeature_NotFound(t *testing.T) {
	_, ok := lib.GetFeature("nonexistent_feature_xyz")
	if ok {
		t.Fatal("GetFeature(\"nonexistent_feature_xyz\") should return false")
	}
}

func TestAllFeatures_Count(t *testing.T) {
	const expectedCount = 43
	features := lib.AllFeatures()
	if len(features) != expectedCount {
		t.Errorf("expected %d features, got %d", expectedCount, len(features))
	}
}
