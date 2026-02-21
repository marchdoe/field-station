package lib

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// ResolveAuthToken returns the auth token for the Field Station server.
//
// Resolution order:
//  1. FIELD_STATION_TOKEN env var — explicit override
//  2. ~/.claude/field-station-token file — stable across restarts
//  3. Neither set — generate 20 random bytes as hex, write to the file
//     (mode 0600), log the token prominently
func ResolveAuthToken(claudeHome string) string {
	if token := strings.TrimSpace(os.Getenv("FIELD_STATION_TOKEN")); token != "" {
		return token
	}

	tokenFile := filepath.Join(claudeHome, "field-station-token")

	if data, err := os.ReadFile(tokenFile); err == nil {
		if token := strings.TrimSpace(string(data)); token != "" {
			return token
		}
	}

	// Generate a new token.
	raw := make([]byte, 20)
	if _, err := rand.Read(raw); err != nil {
		log.Fatalf("field-station: failed to generate auth token: %v", err)
	}
	token := hex.EncodeToString(raw)

	if err := os.WriteFile(tokenFile, []byte(token+"\n"), 0o600); err != nil {
		log.Fatalf("field-station: failed to write auth token to %s: %v", tokenFile, err)
	}

	log.Printf("\n========================================\nfield-station: generated auth token: %s\nStored in: %s\n========================================\n", token, tokenFile)
	return token
}
