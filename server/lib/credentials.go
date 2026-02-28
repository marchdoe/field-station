package lib

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"

	"golang.org/x/crypto/bcrypt"
)

const credentialsFileName = "field-station-credentials"
const bcryptCost = 12

// Credentials holds the bcrypt password hash and HMAC signing key for sessions.
type Credentials struct {
	PasswordHash string `json:"passwordHash"`
	SigningKey   string `json:"signingKey"`
}

// CredentialsPath returns the path to the credentials file.
func CredentialsPath(claudeHome string) string {
	return filepath.Join(claudeHome, credentialsFileName)
}

// CredentialsExist reports whether a credentials file exists.
func CredentialsExist(claudeHome string) (bool, error) {
	_, err := os.Stat(CredentialsPath(claudeHome))
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	return err == nil, err
}

// LoadCredentials reads credentials from disk. Returns nil, nil if the file doesn't exist.
func LoadCredentials(claudeHome string) (*Credentials, error) {
	data, err := os.ReadFile(CredentialsPath(claudeHome))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var creds Credentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, err
	}
	return &creds, nil
}

// SaveCredentials writes credentials to disk with mode 0600.
func SaveCredentials(claudeHome string, creds *Credentials) error {
	data, err := json.Marshal(creds)
	if err != nil {
		return err
	}
	return os.WriteFile(CredentialsPath(claudeHome), data, 0o600)
}

// HashPassword bcrypt-hashes a password.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// VerifyPassword checks a plaintext password against a bcrypt hash.
func VerifyPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateSigningKey returns a random 32-byte hex key for HMAC session signing.
func GenerateSigningKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
