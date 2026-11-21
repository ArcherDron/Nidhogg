package main

import (
	"log"
	"os"

	"nidhogg/api/internal/app"
)

func main() {
	databasePath := envOr("DATABASE_PATH", "nidhogg.db")
	server, err := app.NewServer(app.Config{
		DatabasePath:  databasePath,
		AIBaseURL:     os.Getenv("AI_BASE_URL"),
		AIAPIKey:      os.Getenv("AI_API_KEY"),
		AIModel:       envOr("AI_MODEL", "nidhogg-operator"),
		AllowedOrigin: envOr("ALLOWED_ORIGIN", "http://localhost:3000"),
	})
	if err != nil {
		log.Fatalf("initialize server: %v", err)
	}

	port := envOr("PORT", "8080")
	log.Printf("Nidhogg API listening on http://localhost:%s", port)
	if err := server.Router().Run(":" + port); err != nil {
		log.Fatalf("run server: %v", err)
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
