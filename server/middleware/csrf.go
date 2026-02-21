package middleware

import (
	"net/http"
	"net/url"
	"strings"
)

// RequireLocalOrigin guards against CSRF attacks by applying two controls:
//
//  1. Content-Type enforcement for body-bearing methods (POST/PUT/PATCH):
//     requests must declare "application/json". This upgrades the request from
//     a "simple" CORS request to a preflighted one. Because the server never
//     responds with Access-Control-Allow-Origin, the browser blocks the preflight
//     and the mutation never reaches the handler. Without this check, an attacker
//     page can POST with Content-Type: text/plain (a "simple" content type), skip
//     the preflight entirely, and mutate data without reading the response.
//
//  2. Origin enforcement: if the browser includes an Origin header (which it
//     always does for cross-origin requests), the origin's hostname must be
//     localhost. This acts as defense-in-depth regardless of Content-Type.
func RequireLocalOrigin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch:
			ct := r.Header.Get("Content-Type")
			if !strings.HasPrefix(ct, "application/json") {
				http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
				return
			}
		}

		if origin := r.Header.Get("Origin"); origin != "" {
			u, err := url.Parse(origin)
			if err != nil || u.Hostname() != "localhost" {
				http.Error(w, "cross-origin request rejected", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
