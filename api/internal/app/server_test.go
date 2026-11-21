package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func testServer(t *testing.T) *Server {
	t.Helper()
	server, err := NewServer(Config{DatabasePath: "file:" + t.Name() + "?mode=memory&cache=shared"})
	if err != nil {
		t.Fatalf("NewServer() error = %v", err)
	}
	return server
}

func TestHealth(t *testing.T) {
	server := testServer(t)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	server.Router().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("GET /health status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

func TestCreateFleetCommandRequiresApproval(t *testing.T) {
	server := testServer(t)
	payload, _ := json.Marshal(map[string]string{"command": "Get-Service", "scope": "all"})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	server.Router().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusAccepted {
		t.Fatalf("POST /commands status = %d, want %d: %s", recorder.Code, http.StatusAccepted, recorder.Body.String())
	}
	var command CommandJob
	if err := json.Unmarshal(recorder.Body.Bytes(), &command); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if command.Status != "awaiting approval" {
		t.Fatalf("command status = %q, want awaiting approval", command.Status)
	}
}

func TestChatUsesLocalFallback(t *testing.T) {
	server := testServer(t)
	payload, _ := json.Marshal(map[string]string{"message": "Which endpoint has the highest risk?"})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/agent/chat", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	server.Router().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("POST /agent/chat status = %d, want %d: %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
}
