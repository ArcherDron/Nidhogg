package app

import (
	"time"

	"gorm.io/gorm"
)

func seedDatabase(db *gorm.DB) error {
	now := time.Now().UTC()

	clients := []Client{
		{ID: "clt-aurora-01", Hostname: "WS-FIN-042", IPAddress: "10.24.8.42", OS: "Windows 11 Pro", Status: "online", Risk: "low", CPU: 18, Memory: 46, LastSeen: now.Add(-18 * time.Second), AgentBuild: "2.4.1"},
		{ID: "clt-aurora-02", Hostname: "SRV-DC-01", IPAddress: "10.24.0.10", OS: "Windows Server 2022", Status: "online", Risk: "guarded", CPU: 31, Memory: 64, LastSeen: now.Add(-31 * time.Second), AgentBuild: "2.4.1"},
		{ID: "clt-aurora-03", Hostname: "WS-OPS-117", IPAddress: "10.24.12.117", OS: "Windows 10 Enterprise", Status: "attention", Risk: "elevated", CPU: 76, Memory: 82, LastSeen: now.Add(-2 * time.Minute), AgentBuild: "2.3.8"},
		{ID: "clt-aurora-04", Hostname: "WS-ENG-208", IPAddress: "10.24.16.208", OS: "Windows 11 Pro", Status: "online", Risk: "low", CPU: 12, Memory: 38, LastSeen: now.Add(-42 * time.Second), AgentBuild: "2.4.1"},
		{ID: "clt-aurora-05", Hostname: "SRV-FILE-02", IPAddress: "10.24.0.24", OS: "Windows Server 2019", Status: "offline", Risk: "unknown", CPU: 0, Memory: 0, LastSeen: now.Add(-47 * time.Minute), AgentBuild: "2.3.8"},
	}
	for _, client := range clients {
		if err := db.Where("id = ?", client.ID).FirstOrCreate(&client).Error; err != nil {
			return err
		}
	}

	skills := []Skill{
		{Name: "Attack surface mapping", Description: "Correlate node signals and rank reachable paths by operational value.", Category: "Recon", RiskLevel: "Passive", Enabled: true},
		{Name: "Node reconnaissance", Description: "Inspect system identity, resources and command-channel telemetry.", Category: "Operations", RiskLevel: "Passive", Enabled: true},
		{Name: "Command planner", Description: "Stage scoped PowerShell actions with impact and authority checks.", Category: "Execution", RiskLevel: "Controlled", Enabled: true},
		{Name: "Identity graphing", Description: "Map operator identities, access roles and credential relationships.", Category: "Identity", RiskLevel: "Passive", Enabled: false},
		{Name: "Access path chaining", Description: "Model authorized movement paths across controlled Windows nodes.", Category: "Execution", RiskLevel: "Restricted", Enabled: false},
	}
	legacySkillNames := []string{"Threat triage", "Fleet diagnostics", "Command planner", "Identity audit", "Auto containment"}
	for index, skill := range skills {
		if err := db.Model(&Skill{}).Where("name = ?", legacySkillNames[index]).Updates(map[string]any{
			"name": skill.Name, "description": skill.Description, "category": skill.Category, "risk_level": skill.RiskLevel,
		}).Error; err != nil {
			return err
		}
	}
	for _, skill := range skills {
		if err := db.Where("name = ?", skill.Name).FirstOrCreate(&skill).Error; err != nil {
			return err
		}
	}

	lastActive := now.Add(-4 * time.Minute)
	admins := []Administrator{
		{Name: "Alex Morgan", Email: "alex@nidhogg.local", Role: "Superuser", Status: "active", LastActive: &lastActive},
		{Name: "Nora Chen", Email: "nora@nidhogg.local", Role: "Offensive operator", Status: "active", LastActive: timePtr(now.Add(-23 * time.Minute))},
		{Name: "Mika Reyes", Email: "mika@nidhogg.local", Role: "Network admin", Status: "active", LastActive: timePtr(now.Add(-3 * time.Hour))},
		{Name: "Jordan Bell", Email: "jordan@nidhogg.local", Role: "Auditor", Status: "invited"},
	}
	if err := db.Model(&Administrator{}).Where("role = ?", "SOC analyst").Update("role", "Offensive operator").Error; err != nil {
		return err
	}
	for _, admin := range admins {
		if err := db.Where("email = ?", admin.Email).FirstOrCreate(&admin).Error; err != nil {
			return err
		}
	}

	var messageCount int64
	if err := db.Model(&ChatMessage{}).Count(&messageCount).Error; err != nil {
		return err
	}
	if messageCount == 0 {
		welcome := ChatMessage{Role: "assistant", Content: "Nidhogg AI online. I can map connected nodes, analyze access paths, or stage a scoped operation.", CreatedAt: now}
		if err := db.Create(&welcome).Error; err != nil {
			return err
		}
	}
	if err := db.Model(&ChatMessage{}).Where("role = ? AND content LIKE ?", "assistant", "Sentinel is ready.%").Update("content", "Nidhogg AI online. I can map connected nodes, analyze access paths, or stage a scoped operation.").Error; err != nil {
		return err
	}

	return nil
}

func timePtr(value time.Time) *time.Time {
	return &value
}
