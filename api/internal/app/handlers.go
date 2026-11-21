package app

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (s *Server) dashboard(c *gin.Context) {
	var clients []Client
	var openCommands int64
	if err := s.db.Find(&clients).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	if err := s.db.Model(&CommandJob{}).Where("status IN ?", []string{"queued", "awaiting approval", "running"}).Count(&openCommands).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}

	online := 0
	attention := 0
	for _, client := range clients {
		if client.Status == "online" {
			online++
		}
		if client.Risk == "elevated" || client.Status == "attention" {
			attention++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"endpoints":    gin.H{"total": len(clients), "online": online, "attention": attention},
		"openCommands": openCommands,
		"threatLevel":  "Active",
		"telemetry": []gin.H{
			{"label": "00:00", "healthy": 68, "signals": 8},
			{"label": "04:00", "healthy": 72, "signals": 11},
			{"label": "08:00", "healthy": 64, "signals": 19},
			{"label": "12:00", "healthy": 78, "signals": 14},
			{"label": "16:00", "healthy": 84, "signals": 9},
			{"label": "20:00", "healthy": 80, "signals": 12},
		},
		"updatedAt": time.Now().UTC(),
	})
}

func (s *Server) listClients(c *gin.Context) {
	var clients []Client
	if err := s.db.Order("CASE status WHEN 'attention' THEN 0 WHEN 'online' THEN 1 ELSE 2 END, hostname").Find(&clients).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, clients)
}

func (s *Server) listSkills(c *gin.Context) {
	var skills []Skill
	if err := s.db.Order("id").Find(&skills).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, skills)
}

func (s *Server) updateSkill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid skill id"})
		return
	}
	var payload struct {
		Enabled *bool `json:"enabled" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enabled must be provided"})
		return
	}

	var skill Skill
	if err := s.db.First(&skill, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
		return
	}
	if err := s.db.Model(&skill).Update("enabled", *payload.Enabled).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	s.db.Create(&AuditEvent{Actor: "alex@nidhogg.local", Action: "skill.updated", Resource: skill.Name})
	c.JSON(http.StatusOK, skill)
}

func (s *Server) listAdministrators(c *gin.Context) {
	var administrators []Administrator
	if err := s.db.Order("CASE role WHEN 'Superuser' THEN 0 ELSE 1 END, name").Find(&administrators).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, administrators)
}

func (s *Server) createAdministrator(c *gin.Context) {
	var payload struct {
		Name  string `json:"name" binding:"required"`
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, valid email and role are required"})
		return
	}
	allowedRoles := map[string]bool{"Superuser": true, "Offensive operator": true, "Network admin": true, "Auditor": true}
	if !allowedRoles[payload.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported administrator role"})
		return
	}

	administrator := Administrator{
		Name: strings.TrimSpace(payload.Name), Email: strings.ToLower(strings.TrimSpace(payload.Email)),
		Role: payload.Role, Status: "invited",
	}
	if err := s.db.Create(&administrator).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "an administrator with this email already exists"})
		return
	}
	s.db.Create(&AuditEvent{Actor: "alex@nidhogg.local", Action: "administrator.invited", Resource: administrator.Email})
	c.JSON(http.StatusCreated, administrator)
}

func (s *Server) listCommands(c *gin.Context) {
	var commands []CommandJob
	if err := s.db.Order("created_at desc").Limit(20).Find(&commands).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, commands)
}

func (s *Server) createCommand(c *gin.Context) {
	var payload struct {
		Command  string `json:"command" binding:"required"`
		Scope    string `json:"scope" binding:"required,oneof=client all"`
		TargetID string `json:"targetId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "command and a valid scope are required"})
		return
	}
	payload.Command = strings.TrimSpace(payload.Command)
	if len(payload.Command) < 3 || len(payload.Command) > 4000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "command must be between 3 and 4000 characters"})
		return
	}

	targetCount := 0
	status := "queued"
	if payload.Scope == "client" {
		if payload.TargetID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "targetId is required for client scope"})
			return
		}
		var client Client
		if err := s.db.First(&client, "id = ?", payload.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "target client not found"})
			return
		}
		targetCount = 1
	} else {
		var count int64
		if err := s.db.Model(&Client{}).Where("status != ?", "offline").Count(&count).Error; err != nil {
			respondDatabaseError(c, err)
			return
		}
		targetCount = int(count)
		status = "awaiting approval"
	}

	job := CommandJob{
		ID: uuid.NewString(), Command: payload.Command, Scope: payload.Scope, TargetID: payload.TargetID,
		TargetCount: targetCount, Status: status, RequestedBy: "alex@nidhogg.local",
	}
	if err := s.db.Create(&job).Error; err != nil {
		respondDatabaseError(c, err)
		return
	}
	s.db.Create(&AuditEvent{Actor: job.RequestedBy, Action: "command.created", Resource: job.ID})
	c.JSON(http.StatusAccepted, job)
}

func respondDatabaseError(c *gin.Context, _ error) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": "database operation failed"})
}
