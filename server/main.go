package main

import (
	"log"
	"net/http"

	"fieldstation/api"
	"fieldstation/lib"
)

func main() {
	claudeHome := lib.ResolveClaudeHome()

	handler := api.NewHandler(claudeHome)
	strictHandler := api.NewStrictHandler(handler, nil)

	mux := http.NewServeMux()
	api.HandlerFromMux(strictHandler, mux)

	addr := ":3457"
	log.Printf("field-station listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
