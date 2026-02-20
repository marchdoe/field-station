package api

import (
	"context"
	"fmt"
	"path/filepath"

	"fieldstation/lib"
)

// getFeatureCurrentValue reads the current value of a feature from settings.
// For env-type features, the value lives under settings["env"][key].
// For setting-type features, the value lives at the dot-path key in settings.
func getFeatureCurrentValue(key string, featureType lib.FeatureType, settings lib.JsonObject) interface{} {
	if featureType == lib.FeatureTypeEnv {
		envRaw, ok := settings["env"]
		if !ok {
			return nil
		}
		envMap, ok := envRaw.(lib.JsonObject)
		if !ok {
			return nil
		}
		val, exists := envMap[key]
		if !exists {
			return nil
		}
		return val
	}
	// Setting type: walk dot-path
	val, ok := lib.GetAtPath(settings, key)
	if !ok {
		return nil
	}
	return val
}

// GetFeatures scans the Claude binary and assembles the full feature list with current values.
func (h *FieldStationHandler) GetFeatures(ctx context.Context, request GetFeaturesRequestObject) (GetFeaturesResponseObject, error) {
	scan := lib.ScanClaudeBinary()
	allFeatures := lib.AllFeatures()
	settingsPath := filepath.Join(h.claudeHome, "settings.json")
	settings := lib.ReadJsonFileSafe(settingsPath)

	features := make([]Feature, 0, len(allFeatures)+len(scan.EnvVars))
	seen := make(map[string]struct{}, len(allFeatures)+len(scan.EnvVars))

	// Add all registry features first (documented).
	for _, f := range allFeatures {
		seen[f.ID] = struct{}{}
		currentVal := getFeatureCurrentValue(f.ID, f.Type, settings)
		var values *[]string
		if len(f.Options) > 0 {
			opts := make([]string, len(f.Options))
			copy(opts, f.Options)
			values = &opts
		}
		features = append(features, Feature{
			Definition: FeatureDefinition{
				Key:         f.ID,
				Name:        f.Label,
				Description: f.Description,
				Type:        FeatureDefinitionType(string(f.Type)),
				Category:    string(f.Category),
				Values:      values,
			},
			CurrentValue: currentVal,
			IsDocumented: true,
		})
	}

	// Add discovered env vars not in the registry.
	for _, envVar := range scan.EnvVars {
		if _, exists := seen[envVar]; exists {
			continue
		}
		seen[envVar] = struct{}{}
		currentVal := getFeatureCurrentValue(envVar, lib.FeatureTypeEnv, settings)
		features = append(features, Feature{
			Definition: FeatureDefinition{
				Key:         envVar,
				Name:        envVar,
				Description: "",
				Type:        FeatureDefinitionTypeEnv,
				Category:    "undocumented",
			},
			CurrentValue: currentVal,
			IsDocumented: false,
		})
	}

	totalDiscovered := len(scan.EnvVars)
	totalDocumented := len(allFeatures)

	resp := FeaturesData{
		Features:        features,
		TotalDiscovered: totalDiscovered,
		TotalDocumented: totalDocumented,
		Version:         scan.Version,
	}
	return GetFeatures200JSONResponse(resp), nil
}

// UpdateFeature writes a feature value to the global settings file.
// For env-type features, the value is stored under settings["env"][key].
// For setting-type features, the value is stored at the dot-path key.
func (h *FieldStationHandler) UpdateFeature(ctx context.Context, request UpdateFeatureRequestObject) (UpdateFeatureResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body
	key := request.Key
	settingsPath := filepath.Join(h.claudeHome, "settings.json")

	var keyPath string
	if body.Type == UpdateFeatureRequestTypeEnv {
		// env features live under settings.env.<KEY>
		keyPath = "env." + key
	} else {
		// setting features live at the dot-path key
		keyPath = key
	}

	if err := lib.ApplyUpdateSetting(settingsPath, keyPath, body.Value, h.claudeHome); err != nil {
		return nil, fmt.Errorf("failed to update feature %q: %w", key, err)
	}
	return UpdateFeature200JSONResponse(SuccessResponse{Success: true}), nil
}
