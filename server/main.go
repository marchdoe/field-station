package main

import (
	"log"
	"net/http"
	"os"

	"fieldstation/api"
	"fieldstation/lib"
	"fieldstation/middleware"
)

func main() {
	claudeHome := lib.ResolveClaudeHome()
	authToken := os.Getenv("FIELD_STATION_TOKEN")

	handler := api.NewHandler(claudeHome, authToken)
	strictHandler := api.NewStrictHandler(handler, nil)

	mux := http.NewServeMux()
	api.HandlerFromMux(strictHandler, mux)

	addr := ":3457"
	log.Printf("field-station listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, makeTopHandler(mux, authToken)))
}

// makeTopHandler wraps mux with auth middleware, exempting the login endpoint.
func makeTopHandler(mux *http.ServeMux, authToken string) http.Handler {
	if authToken == "" {
		return mux
	}
	protected := middleware.RequireAuth(mux, authToken)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/auth/login" {
			mux.ServeHTTP(w, r)
			return
		}
		protected.ServeHTTP(w, r)
	})
}
