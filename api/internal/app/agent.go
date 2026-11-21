package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (s *Server) listMessages(c *gin.Context) {
	var messages []ChatMessage
	if err := s.db.Order("created_at asc").Limit(100).Find(&messages).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, messages)
}

func (s *Server) agentStatus(c *gin.Context) {
	connected := s.config.AIBaseURL != "" && s.config.AIAPIKey != ""
	c.JSON(http.StatusOK, gin.H{
		"connected": connected,
		"mode":      map[bool]string{true: "provider", false: "local fallback"}[connected],
		"model":     s.config.AIModel,
	})
}

func (s *Server) chat(c *gin.Context) {
	var payload struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil || strings.TrimSpace(payload.Message) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}
	if len(payload.Message) > 6000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is too long"})
		return
	}

	userMessage := ChatMessage{Role: "user", Content: strings.TrimSpace(payload.Message), CreatedAt: time.Now().UTC()}
	if err := s.db.Create(&userMessage).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}

	reply, source, err := s.agentReply(userMessage.Content)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI provider unavailable", "detail": err.Error()})
		return
	}
	assistantMessage := ChatMessage{Role: "assistant", Content: reply, CreatedAt: time.Now().UTC()}
	if err := s.db.Create(&assistantMessage).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": assistantMessage, "source": source})
}

func (s *Server) agentReply(prompt string) (string, string, error) {
	if s.config.AIBaseURL == "" || s.config.AIAPIKey == "" {
		return fallbackReply(prompt), "local fallback", nil
	}

	var recent []ChatMessage
	if err := s.db.Order("created_at desc").Limit(12).Find(&recent).Error; err != nil {
		return "", "provider", err
	}
	messages := []map[string]string{{
		"role":    "system",
		"content": "You are Nidhogg AI, an offensive security operations assistant for authorized, controlled environments. Help operators map campaign context, reason about controlled nodes, and stage scoped actions. Be concise, state evidence and uncertainty, and require explicit operator authority before disruptive execution.",
	}}
	for index := len(recent) - 1; index >= 0; index-- {
		messages = append(messages, map[string]string{"role": recent[index].Role, "content": recent[index].Content})
	}

	body, err := json.Marshal(map[string]any{"model": s.config.AIModel, "messages": messages, "temperature": 0.2})
	if err != nil {
		return "", "provider", err
	}
	endpoint := strings.TrimRight(s.config.AIBaseURL, "/") + "/chat/completions"
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", "provider", err
	}
	req.Header.Set("Authorization", "Bearer "+s.config.AIAPIKey)
	req.Header.Set("Content-Type", "application/json")

	response, err := s.httpClient.Do(req)
	if err != nil {
		return "", "provider", err
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return "", "provider", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", "provider", fmt.Errorf("provider returned HTTP %d", response.StatusCode)
	}

	var completion struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(responseBody, &completion); err != nil {
		return "", "provider", err
	}
	if len(completion.Choices) == 0 || strings.TrimSpace(completion.Choices[0].Message.Content) == "" {
		return "", "provider", fmt.Errorf("provider returned an empty completion")
	}
	return completion.Choices[0].Message.Content, "provider", nil
}

func fallbackReply(prompt string) string {
	lower := strings.ToLower(prompt)
	switch {
	case strings.Contains(lower, "priority") || strings.Contains(lower, "value") || strings.Contains(lower, "path"):
		return "WS-OPS-117 is the strongest validation node because it combines elevated resource activity with an older agent build. Inspect its current process context before staging any action."
	case strings.Contains(lower, "offline") || strings.Contains(lower, "reach") || strings.Contains(lower, "node"):
		return "Four of five controlled nodes are reachable through the command mesh. SRV-FILE-02 has been dormant for 47 minutes; verify its channel state before including it in the campaign scope."
	case strings.Contains(lower, "command") || strings.Contains(lower, "powershell"):
		return "Stage the action against one controlled node first, capture the result, and widen the execution scope only after impact is understood. Multi-node execution remains authority-gated."
	default:
		return "I am running in local campaign mode, so this answer uses command-mesh context rather than an external model. Connect an OpenAI-compatible provider to enable deeper path analysis and planning."
	}
}
