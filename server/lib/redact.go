package lib

import "regexp"

// sensitiveKeyPatterns holds compiled regexes for keys whose values should be redacted.
var sensitiveKeyPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)key`),
	regexp.MustCompile(`(?i)secret`),
	regexp.MustCompile(`(?i)token`),
	regexp.MustCompile(`(?i)password`),
	regexp.MustCompile(`(?i)credential`),
	regexp.MustCompile(`(?i)api_key`),
	regexp.MustCompile(`(?i)auth`),
	regexp.MustCompile(`(?i)private`),
}

// sensitiveValuePatterns holds compiled regexes for string values that look like secrets.
var sensitiveValuePatterns = []*regexp.Regexp{
	regexp.MustCompile(`^sk-[a-zA-Z0-9\-_]{20,}`),          // Anthropic / OpenAI keys
	regexp.MustCompile(`^sk-ant-[a-zA-Z0-9\-_]+`),          // Anthropic API keys
	regexp.MustCompile(`^ghp_[a-zA-Z0-9]{36}`),              // GitHub personal access tokens
	regexp.MustCompile(`^gho_[a-zA-Z0-9]{36}`),              // GitHub OAuth tokens
	regexp.MustCompile(`^github_pat_[a-zA-Z0-9_]+`),         // GitHub fine-grained PATs
	regexp.MustCompile(`(?i)^Bearer\s+\S+`),                 // Bearer tokens
	regexp.MustCompile(`^xox[bpsa]-[a-zA-Z0-9\-]+`),        // Slack tokens
	regexp.MustCompile(`^eyJ[a-zA-Z0-9_\-]+\.eyJ`),         // JWTs
	regexp.MustCompile(`^AKIA[A-Z0-9]{16}`),                 // AWS access keys
	regexp.MustCompile(`^npm_[a-zA-Z0-9]{36}`),              // npm tokens
}

const redacted = "[REDACTED]"

func isSensitiveKey(key string) bool {
	for _, p := range sensitiveKeyPatterns {
		if p.MatchString(key) {
			return true
		}
	}
	return false
}

func isSensitiveValue(value string) bool {
	for _, p := range sensitiveValuePatterns {
		if p.MatchString(value) {
			return true
		}
	}
	return false
}

// RedactSensitiveValues recursively traverses obj and replaces values that
// look like secrets (API keys, tokens, JWTs, bearer headers) with "[REDACTED]".
// Returns a new JsonObject — does not mutate the input.
func RedactSensitiveValues(obj JsonObject) JsonObject {
	result := make(JsonObject, len(obj))
	for key, value := range obj {
		// Special case: "env" key — redact all environment variable values wholesale.
		if key == "env" {
			if envMap, ok := value.(JsonObject); ok {
				redactedEnv := make(JsonObject, len(envMap))
				for envKey := range envMap {
					redactedEnv[envKey] = redacted
				}
				result[key] = redactedEnv
				continue
			}
		}

		// Sensitive key with a string value.
		if isSensitiveKey(key) {
			if strVal, ok := value.(string); ok {
				_ = strVal
				result[key] = redacted
				continue
			}
		}

		// Recurse into all values.
		result[key] = redactAny(value)
	}
	return result
}

// redactAny applies redaction logic to any value type.
func redactAny(value any) any {
	switch v := value.(type) {
	case string:
		if isSensitiveValue(v) {
			return redacted
		}
		return v
	case JsonObject:
		return RedactSensitiveValues(v)
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = redactAny(item)
		}
		return out
	default:
		return value
	}
}
