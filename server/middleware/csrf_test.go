package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fieldstation/middleware"

	"github.com/stretchr/testify/assert"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestRequireLocalOrigin_GET_NoOrigin_Allowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireLocalOrigin_DELETE_NoBody_Allowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/agents/foo", nil)
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireLocalOrigin_POST_JSONContentType_Allowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireLocalOrigin_POST_JSONWithCharset_Allowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

// The CSRF bypass: POST with text/plain skips CORS preflight in browsers.
func TestRequireLocalOrigin_POST_TextPlain_Rejected(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/config/settings", strings.NewReader(`{"path":"hooks","value":"malicious"}`))
	req.Header.Set("Content-Type", "text/plain")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
}

func TestRequireLocalOrigin_POST_NoContentType_Rejected(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
}

func TestRequireLocalOrigin_PUT_FormEncoded_Rejected(t *testing.T) {
	req := httptest.NewRequest(http.MethodPut, "/api/agents/foo", strings.NewReader(`field=value`))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
}

func TestRequireLocalOrigin_CrossOrigin_Rejected(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://attacker.example.com")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestRequireLocalOrigin_LocalhostOrigin_Allowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://localhost:3457")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireLocalOrigin_LocalhostDevOrigin_Allowed(t *testing.T) {
	// Vite dev server runs on :3456 — localhost origins on any port are allowed.
	req := httptest.NewRequest(http.MethodPost, "/api/agents", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://localhost:3456")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireLocalOrigin_GET_CrossOrigin_Rejected(t *testing.T) {
	// GET requests with a cross-origin Origin header are also blocked.
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.Header.Set("Origin", "https://attacker.example.com")
	rr := httptest.NewRecorder()
	middleware.RequireLocalOrigin(okHandler()).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusForbidden, rr.Code)
}
