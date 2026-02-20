package lib_test

import (
	"testing"

	"fieldstation/lib"
)

func TestIsSafeRedirectPath_RelativePaths(t *testing.T) {
	cases := []string{
		"/settings",
		"/agents/foo",
		"/",
		"/?q=1",
		"/#hash",
		"/path/to/page",
	}
	for _, c := range cases {
		if !lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = true, got false", c)
		}
	}
}

func TestIsSafeRedirectPath_AbsoluteURL(t *testing.T) {
	cases := []string{
		"http://evil.com/path",
		"https://evil.com/path",
		"http://evil.com",
	}
	for _, c := range cases {
		if lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = false, got true", c)
		}
	}
}

func TestIsSafeRedirectPath_ProtocolRelative(t *testing.T) {
	cases := []string{
		"//evil.com/path",
		"//evil.com",
	}
	for _, c := range cases {
		if lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = false, got true", c)
		}
	}
}

func TestIsSafeRedirectPath_Empty(t *testing.T) {
	// Empty string: URL("", "http://x") keeps origin "http://x" in JS → safe
	if !lib.IsSafeRedirectPath("") {
		t.Errorf("expected IsSafeRedirectPath(%q) = true, got false", "")
	}
}

func TestIsSafeRedirectPath_JavascriptProtocol(t *testing.T) {
	cases := []string{
		"javascript:alert(1)",
		"javascript:void(0)",
	}
	for _, c := range cases {
		if lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = false, got true", c)
		}
	}
}

func TestIsSafeRedirectPath_BackslashPrefix(t *testing.T) {
	cases := []string{
		`\foo`,
		`\evil.com`,
	}
	for _, c := range cases {
		if lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = false, got true", c)
		}
	}
}

func TestIsSafeRedirectPath_OtherSafePaths(t *testing.T) {
	cases := []string{
		"relative",
		"../up",
		"#hash",
	}
	for _, c := range cases {
		if !lib.IsSafeRedirectPath(c) {
			t.Errorf("expected IsSafeRedirectPath(%q) = true, got false", c)
		}
	}
}
