package lib

import (
	"net/url"
	"strings"
)

// IsSafeRedirectPath returns true if the given path is safe to redirect to.
// A safe path must be a relative path (no protocol or host component).
// Use this before redirecting to a user-supplied destination to prevent open redirects.
//
// Mirrors the TypeScript isSafePath() which resolves the value against a dummy
// base URL "http://x" and accepts the result only when the origin is unchanged.
func IsSafeRedirectPath(path string) bool {
	// Backslash prefix is not a safe path (Windows-style UNC or path confusion).
	if strings.HasPrefix(path, "\\") {
		return false
	}

	// Resolve the path against a dummy base URL.
	// If the resulting origin differs from the base, the input supplied its own
	// host/scheme (absolute URL or protocol-relative URL) and is not safe.
	base, err := url.Parse("http://x")
	if err != nil {
		return false
	}
	resolved, err := base.Parse(path)
	if err != nil {
		return false
	}

	// Accept only when host and scheme are unchanged from the dummy base.
	return resolved.Host == "x" && resolved.Scheme == "http"
}
