//go:build dev

package main

import "embed"

// staticFiles is unused in dev mode — Vite serves the frontend.
var staticFiles embed.FS
