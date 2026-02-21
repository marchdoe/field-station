package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"fieldstation/api"
	"fieldstation/lib"
	"fieldstation/middleware"
)

func main() {
	claudeHome := lib.ResolveClaudeHome()
	authToken := lib.ResolveAuthToken(claudeHome)
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

	addr := os.Getenv("FIELD_STATION_ADDR")
	if addr == "" {
		addr = "127.0.0.1:3457"
	}
	srv := &http.Server{
		Addr:              addr,
		Handler:           maxBytesMiddleware(middleware.RequireLocalOrigin(makeTopHandler(mux, authToken))),
		ReadHeaderTimeout: 30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	log.Printf("field-station listening on %s (dev=%v)", addr, isDev)
	log.Fatal(srv.ListenAndServe())
}

// maxBytesMiddleware limits request body size to prevent memory exhaustion.
// The /api/watch endpoint is excluded because it is a GET with no body.
func maxBytesMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/watch" {
			r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024) // 10 MB
		}
		next.ServeHTTP(w, r)
	})
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
