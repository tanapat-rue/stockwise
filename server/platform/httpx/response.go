package httpx

import (
	"encoding/json"
	"net/http"
)

// Error is a minimal JSON error payload.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

func WriteError(w http.ResponseWriter, status int, code, message string) error {
	return WriteJSON(w, status, Error{Code: code, Message: message})
}
