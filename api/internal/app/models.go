package app

import "time"

type Client struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	Hostname   string    `json:"hostname" gorm:"uniqueIndex"`
	IPAddress  string    `json:"ipAddress"`
	OS         string    `json:"os"`
	Status     string    `json:"status"`
	Risk       string    `json:"risk"`
	CPU        int       `json:"cpu"`
	Memory     int       `json:"memory"`
	LastSeen   time.Time `json:"lastSeen"`
	AgentBuild string    `json:"agentBuild"`
}

type Skill struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"uniqueIndex"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	RiskLevel   string    `json:"riskLevel"`
	Enabled     bool      `json:"enabled"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Administrator struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	Name       string     `json:"name"`
	Email      string     `json:"email" gorm:"uniqueIndex"`
	Role       string     `json:"role"`
	Status     string     `json:"status"`
	LastActive *time.Time `json:"lastActive"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type CommandJob struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Command     string    `json:"command"`
	Scope       string    `json:"scope"`
	TargetID    string    `json:"targetId,omitempty"`
	TargetCount int       `json:"targetCount"`
	Status      string    `json:"status"`
	RequestedBy string    `json:"requestedBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ChatMessage struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuditEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Actor     string    `json:"actor"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	CreatedAt time.Time `json:"createdAt"`
}
