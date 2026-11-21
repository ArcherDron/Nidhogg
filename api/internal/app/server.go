package app

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Config struct {
	DatabasePath  string
	AIBaseURL     string
	AIAPIKey      string
	AIModel       string
	AllowedOrigin string
}

type Server struct {
	db         *gorm.DB
	router     *gin.Engine
	config     Config
	httpClient *http.Client
}

func NewServer(config Config) (*Server, error) {
	if config.DatabasePath == "" {
		config.DatabasePath = "nidhogg.db"
	}
	if config.AIModel == "" {
		config.AIModel = "nidhogg-operator"
	}
	if config.AllowedOrigin == "" {
		config.AllowedOrigin = "http://localhost:3000"
	}

	db, err := gorm.Open(sqlite.Open(config.DatabasePath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := db.AutoMigrate(&Client{}, &Skill{}, &Administrator{}, &CommandJob{}, &ChatMessage{}, &AuditEvent{}); err != nil {
		return nil, fmt.Errorf("migrate database: %w", err)
	}
	if err := seedDatabase(db); err != nil {
		return nil, fmt.Errorf("seed database: %w", err)
	}

	server := &Server{
		db:         db,
		config:     config,
		httpClient: &http.Client{Timeout: 35 * time.Second},
	}
	server.router = server.routes()
	return server, nil
}

func (s *Server) Router() *gin.Engine {
	return s.router
}

func (s *Server) routes() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), s.cors())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "nidhogg-api"})
	})

	api := router.Group("/api/v1")
	{
		api.GET("/dashboard", s.dashboard)
		api.GET("/clients", s.listClients)
		api.GET("/skills", s.listSkills)
		api.PATCH("/skills/:id", s.updateSkill)
		api.GET("/administrators", s.listAdministrators)
		api.POST("/administrators", s.createAdministrator)
		api.GET("/commands", s.listCommands)
		api.POST("/commands", s.createCommand)
		api.GET("/agent/messages", s.listMessages)
		api.GET("/agent/status", s.agentStatus)
		api.POST("/agent/chat", s.chat)
	}

	return router
}

func (s *Server) cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == s.config.AllowedOrigin || (origin == "" && strings.HasPrefix(c.Request.URL.Path, "/")) {
			c.Header("Access-Control-Allow-Origin", s.config.AllowedOrigin)
			c.Header("Vary", "Origin")
		}
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
