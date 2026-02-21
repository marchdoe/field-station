package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"

	"fieldstation/lib"
)

// watchHub manages fsnotify subscriptions and fan-out to SSE listeners.
type watchHub struct {
	mu        sync.Mutex
	listeners map[chan struct{}]struct{}
	watcher   *fsnotify.Watcher
	debounce  *time.Timer
}

func (h *watchHub) subscribe(watchDirs ...string) chan struct{} {
	ch := make(chan struct{}, 1)
	h.mu.Lock()
	defer h.mu.Unlock()
	h.listeners[ch] = struct{}{}
	if len(h.listeners) == 1 {
		h.startWatching(watchDirs...)
	}
	return ch
}

func (h *watchHub) unsubscribe(ch chan struct{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.listeners, ch)
	if len(h.listeners) == 0 {
		if h.debounce != nil {
			h.debounce.Stop()
			h.debounce = nil
		}
		if h.watcher != nil {
			h.watcher.Close()
			h.watcher = nil
		}
	}
}

func (h *watchHub) notifyAll() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.listeners {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func (h *watchHub) startWatching(watchDirs ...string) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("fsnotify: %v", err)
		return
	}
	h.watcher = watcher

	for _, dir := range watchDirs {
		if err := watcher.Add(dir); err != nil {
			log.Printf("watcher.Add %s: %v", dir, err)
		}
	}

	go func() {
		for {
			select {
			case _, ok := <-watcher.Events:
				if !ok {
					return
				}
				h.mu.Lock()
				if h.debounce != nil {
					h.debounce.Stop()
				}
				h.debounce = time.AfterFunc(300*time.Millisecond, h.notifyAll)
				h.mu.Unlock()
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Printf("watcher error: %v", err)
			}
		}
	}()
}

// watchSSEResponse implements WatchResponseObject, streaming SSE events via VisitWatchResponse.
type watchSSEResponse struct {
	ctx        context.Context
	claudeHome string
	projectDir string // optional: project .claude/ dir to also watch
	hub        *watchHub
}

func (r watchSSEResponse) VisitWatchResponse(w http.ResponseWriter) error {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return nil
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	// Version check on connect: emit change event if version changed since last seen.
	if binaryPath, err := lib.LocateClaudeBinary(); err == nil {
		if currentVersion, err := lib.GetClaudeVersion(binaryPath); err == nil && currentVersion != "" {
			persisted := lib.ReadPersistedVersion(r.claudeHome)
			if currentVersion != persisted {
				_ = lib.WritePersistedVersion(r.claudeHome, currentVersion)
				if _, err := fmt.Fprintf(w, "event: change\ndata: {}\n\n"); err == nil {
					flusher.Flush()
				}
			}
		}
	}

	watchDirs := []string{r.claudeHome}
	if r.projectDir != "" {
		watchDirs = append(watchDirs, r.projectDir)
	}

	ch := r.hub.subscribe(watchDirs...)
	defer r.hub.unsubscribe(ch)

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.ctx.Done():
			return nil
		case <-ch:
			if _, err := fmt.Fprintf(w, "event: change\ndata: {}\n\n"); err != nil {
				return nil
			}
			flusher.Flush()
		case <-heartbeat.C:
			if _, err := fmt.Fprintf(w, "event: heartbeat\ndata: {}\n\n"); err != nil {
				return nil
			}
			flusher.Flush()
		}
	}
}

// Watch handles GET /api/watch — SSE stream for file changes.
func (h *FieldStationHandler) Watch(ctx context.Context, request WatchRequestObject) (WatchResponseObject, error) {
	projectDir := ""
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		if pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId); err == nil {
			projectDir = filepath.Join(pp, ".claude")
		}
	}
	return watchSSEResponse{ctx: ctx, claudeHome: h.claudeHome, projectDir: projectDir, hub: h.hub}, nil
}
