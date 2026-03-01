// Package main is the entry point for the field-station server.
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
	authEnabled := os.Getenv("FIELD_STATION_AUTH") != "false"
	isDev := os.Getenv("FIELD_STATION_DEV") == "1"

	handler := api.NewHandler(claudeHome, authEnabled)
	strictHandler := api.NewStrictHandler(handler, nil)

	mux := http.NewServeMux()
	api.HandlerFromMux(strictHandler, mux)

	if !isDev {
		sub, err := fs.Sub(staticFiles, "dist")
		if err != nil {
			log.Fatalf("failed to sub static FS: %v", err)
		}
		fileServer := http.FileServer(http.FS(sub))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			_, statErr := fs.Stat(sub, r.URL.Path[1:])
			if r.URL.Path != "/" && statErr != nil {
				indexData, readErr := fs.ReadFile(sub, "index.html")
				if readErr != nil {
					http.Error(w, "index.html not found", http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				_, _ = w.Write(indexData) //nolint:gosec // response write errors are non-fatal for static file serving
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
		Handler:           maxBytesMiddleware(middleware.RequireLocalOrigin(makeTopHandler(mux, claudeHome, authEnabled))),
		ReadHeaderTimeout: 30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	log.Printf("field-station listening on %s (auth=%v, dev=%v)", addr, authEnabled, isDev) //nolint:gosec // addr and flags are operator-set; log injection risk is acceptable for startup messages
	log.Fatal(srv.ListenAndServe())
}

func maxBytesMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/watch" {
			r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)
		}
		next.ServeHTTP(w, r)
	})
}

// makeTopHandler wraps mux with auth middleware, exempting auth endpoints.
func makeTopHandler(mux *http.ServeMux, claudeHome string, authEnabled bool) http.Handler {
	protected := middleware.RequireAuth(mux, claudeHome, authEnabled)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/auth/status":
			mux.ServeHTTP(w, r)
			return
		}
		protected.ServeHTTP(w, r)
	})
}
