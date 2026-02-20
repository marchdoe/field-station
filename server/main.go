package main

import (
	"io/fs"
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
	isDev := os.Getenv("FIELD_STATION_DEV") == "1"

	handler := api.NewHandler(claudeHome, authToken)
	strictHandler := api.NewStrictHandler(handler, nil)

	mux := http.NewServeMux()
	api.HandlerFromMux(strictHandler, mux)

	if !isDev {
		// Serve embedded Vite dist with SPA fallback for client-side routing.
		sub, err := fs.Sub(staticFiles, "dist")
		if err != nil {
			log.Fatalf("failed to sub static FS: %v", err)
		}
		fileServer := http.FileServer(http.FS(sub))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// Try the file first. If it doesn't exist, serve index.html so
			// React Router can handle the path client-side.
			_, statErr := fs.Stat(sub, r.URL.Path[1:]) // strip leading "/"
			if r.URL.Path != "/" && statErr != nil {
				indexData, readErr := fs.ReadFile(sub, "index.html")
				if readErr != nil {
					http.Error(w, "index.html not found", http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.Write(indexData) //nolint:errcheck
				return
			}
			fileServer.ServeHTTP(w, r)
		})
	}

	addr := ":3457"
	log.Printf("field-station listening on %s (dev=%v)", addr, isDev)
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
