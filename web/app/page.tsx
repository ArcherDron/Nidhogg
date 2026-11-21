"use client";

import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Command,
  Crosshair,
  Cpu,
  Ellipsis,
  Eye,
  Fingerprint,
  Gauge,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Network,
  Plus,
  Radio,
  Search,
  Send,
  Server,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  UserCog,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Administrator, AgentStatus, ChatMessage, Client, CommandJob, DashboardData, Skill, View } from "@/lib/types";

const now = new Date().toISOString();

const previewClients: Client[] = [
  { id: "clt-aurora-01", hostname: "WS-FIN-042", ipAddress: "10.24.8.42", os: "Windows 11 Pro", status: "online", risk: "low", cpu: 18, memory: 46, lastSeen: now, agentBuild: "2.4.1" },
  { id: "clt-aurora-02", hostname: "SRV-DC-01", ipAddress: "10.24.0.10", os: "Windows Server 2022", status: "online", risk: "guarded", cpu: 31, memory: 64, lastSeen: now, agentBuild: "2.4.1" },
  { id: "clt-aurora-03", hostname: "WS-OPS-117", ipAddress: "10.24.12.117", os: "Windows 10 Enterprise", status: "attention", risk: "elevated", cpu: 76, memory: 82, lastSeen: now, agentBuild: "2.3.8" },
  { id: "clt-aurora-04", hostname: "WS-ENG-208", ipAddress: "10.24.16.208", os: "Windows 11 Pro", status: "online", risk: "low", cpu: 12, memory: 38, lastSeen: now, agentBuild: "2.4.1" },
  { id: "clt-aurora-05", hostname: "SRV-FILE-02", ipAddress: "10.24.0.24", os: "Windows Server 2019", status: "offline", risk: "unknown", cpu: 0, memory: 0, lastSeen: now, agentBuild: "2.3.8" },
];

const previewSkills: Skill[] = [
  { id: 1, name: "Attack surface mapping", description: "Correlate node signals and rank reachable paths by operational value.", category: "Recon", riskLevel: "Passive", enabled: true },
  { id: 2, name: "Node reconnaissance", description: "Inspect system identity, resources and command-channel telemetry.", category: "Operations", riskLevel: "Passive", enabled: true },
  { id: 3, name: "Command planner", description: "Stage scoped PowerShell actions with impact and authority checks.", category: "Execution", riskLevel: "Controlled", enabled: true },
  { id: 4, name: "Identity graphing", description: "Map operator identities, access roles and credential relationships.", category: "Identity", riskLevel: "Passive", enabled: false },
  { id: 5, name: "Access path chaining", description: "Model authorized movement paths across controlled Windows nodes.", category: "Execution", riskLevel: "Restricted", enabled: false },
];

const previewAdmins: Administrator[] = [
  { id: 1, name: "Alex Morgan", email: "alex@nidhogg.local", role: "Superuser", status: "active", lastActive: now },
  { id: 2, name: "Nora Chen", email: "nora@nidhogg.local", role: "Offensive operator", status: "active", lastActive: now },
  { id: 3, name: "Mika Reyes", email: "mika@nidhogg.local", role: "Network admin", status: "active", lastActive: now },
  { id: 4, name: "Jordan Bell", email: "jordan@nidhogg.local", role: "Auditor", status: "invited" },
];

const previewDashboard: DashboardData = {
  endpoints: { total: 5, online: 3, attention: 1 },
  openCommands: 0,
  threatLevel: "Active",
  telemetry: [
    { label: "00:00", healthy: 68, signals: 8 }, { label: "04:00", healthy: 72, signals: 11 },
    { label: "08:00", healthy: 64, signals: 19 }, { label: "12:00", healthy: 78, signals: 14 },
    { label: "16:00", healthy: 84, signals: 9 }, { label: "20:00", healthy: 80, signals: 12 },
  ],
  updatedAt: now,
};

const navItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Campaign overview", icon: LayoutDashboard },
  { id: "agent", label: "Nidhogg AI", icon: BrainCircuit },
  { id: "fleet", label: "Node network", icon: Network },
  { id: "operations", label: "Command execution", icon: Terminal },
  { id: "skills", label: "Capability arsenal", icon: SlidersHorizontal },
  { id: "administrators", label: "Operators", icon: Users },
];

const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Active campaign", title: "Campaign overview", description: "Operational reach, command channels and priority nodes." },
  agent: { eyebrow: "Operator intelligence", title: "Nidhogg AI", description: "Map, reason and stage actions across authorized target space." },
  fleet: { eyebrow: "Execution infrastructure", title: "Node network", description: "Controlled Windows nodes, channel state and operational value." },
  operations: { eyebrow: "Remote execution", title: "Command execution", description: "Stage scoped, auditable actions across active nodes." },
  skills: { eyebrow: "Operator loadout", title: "Capability arsenal", description: "Control the reasoning and planning capabilities available to Nidhogg." },
  administrators: { eyebrow: "Command authority", title: "Operators", description: "Manage privileged operators and campaign roles." },
};

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState(previewDashboard);
  const [clients, setClients] = useState(previewClients);
  const [skills, setSkills] = useState(previewSkills);
  const [administrators, setAdministrators] = useState(previewAdmins);
  const [commands, setCommands] = useState<CommandJob[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", content: "Nidhogg AI online. I can map connected nodes, analyze access paths, or stage a scoped operation.", createdAt: now },
  ]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ connected: false, mode: "local fallback", model: "nidhogg-operator" });
  const [operationTarget, setOperationTarget] = useState(previewClients[0].id);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.dashboard(), api.clients(), api.skills(), api.administrators(), api.commands(), api.messages(), api.agentStatus()])
      .then(([dashboardData, clientData, skillData, adminData, commandData, messageData, statusData]) => {
        if (!active) return;
        setDashboard(dashboardData);
        setClients(clientData);
        setSkills(skillData);
        setAdministrators(adminData);
        setCommands(commandData);
        setMessages(messageData);
        setAgentStatus(statusData);
        setApiOnline(true);
      })
      .catch(() => active && setApiOnline(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(view: View) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  function openOperations(clientId: string) {
    setOperationTarget(clientId);
    navigate("operations");
  }

  const meta = viewMeta[activeView];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Image src="/nidhogg-logo.png" alt="Nidhogg dragon" width={43} height={48} priority /></div>
          <div><strong>NIDHOGG</strong><small>COMMAND / 01</small></div>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon"><Crosshair size={17} /></div>
          <div><small>CAMPAIGN</small><strong>Blacksite / Alpha</strong></div>
          <ChevronDown size={15} />
        </div>

        <nav className="main-nav" aria-label="Primary navigation">
          <span className="nav-label">OPERATIONS</span>
          {navItems.slice(0, 4).map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={() => navigate(item.id)} />)}
          <span className="nav-label nav-label-spaced">CONTROL</span>
          {navItems.slice(4).map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={() => navigate(item.id)} />)}
        </nav>

        <div className="sidebar-foot">
          <div className="network-state">
            <div className="pulse-dot"><span /></div>
             <div><strong>{apiOnline === false ? "Preview mode" : "Command mesh active"}</strong><small>{apiOnline === false ? "Start API to sync" : "5 nodes · encrypted"}</small></div>
            <Radio size={15} />
          </div>
          <button className="profile-button">
            <Avatar name="Alex Morgan" />
            <span><strong>Alex Morgan</strong><small>Superuser</small></span>
            <Ellipsis size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="page-heading"><span>{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.description}</p></div>
          <div className="top-actions">
            <div className={`connection-pill ${apiOnline === false ? "is-offline" : ""}`}>
              <span /> {apiOnline === null ? "Connecting" : apiOnline ? "Live system" : "Preview data"}
            </div>
            <button className="icon-button notification-button" aria-label="Alerts"><CircleAlert size={18} /><i>1</i></button>
            <button className="quick-action" onClick={() => navigate("agent")}><Sparkles size={16} /> Ask Nidhogg</button>
          </div>
        </header>

        <div className="content-canvas">
          {activeView === "overview" && <Overview dashboard={dashboard} clients={clients} onNavigate={navigate} onOperate={openOperations} />}
          {activeView === "agent" && <AgentPanel messages={messages} setMessages={setMessages} status={agentStatus} skills={skills} apiOnline={apiOnline} onToast={setToast} />}
          {activeView === "fleet" && <FleetPanel clients={clients} onOperate={openOperations} />}
          {activeView === "operations" && <OperationsPanel clients={clients} commands={commands} setCommands={setCommands} initialTarget={operationTarget} apiOnline={apiOnline} onToast={setToast} />}
          {activeView === "skills" && <SkillsPanel skills={skills} setSkills={setSkills} status={agentStatus} apiOnline={apiOnline} onToast={setToast} />}
          {activeView === "administrators" && <AdministratorsPanel administrators={administrators} setAdministrators={setAdministrators} apiOnline={apiOnline} onToast={setToast} />}
        </div>
      </main>

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><Icon size={18} /><span>{item.label}</span>{item.id === "agent" && <i>AI</i>}</button>;
}

function Overview({ dashboard, clients, onNavigate, onOperate }: { dashboard: DashboardData; clients: Client[]; onNavigate: (view: View) => void; onOperate: (id: string) => void }) {
  const attentionClient = clients.find((client) => client.status === "attention");
  return (
    <div className="view-stack fade-in">
      <section className="metric-grid">
        <MetricCard icon={<Network size={19} />} label="Controlled nodes" value={String(dashboard.endpoints.total).padStart(2, "0")} detail={`${dashboard.endpoints.online} active command channels`} tone="green" trend="+2 this month" />
        <MetricCard icon={<Crosshair size={19} />} label="Campaign stance" value={dashboard.threatLevel} detail="Infrastructure nominal" tone="amber" trend="Stable 6h" />
        <MetricCard icon={<Activity size={19} />} label="Priority nodes" value={String(dashboard.endpoints.attention).padStart(2, "0")} detail="High-value telemetry deviation" tone="red" trend="Inspect now" />
        <MetricCard icon={<Command size={19} />} label="Staged actions" value={String(dashboard.openCommands).padStart(2, "0")} detail="Queued or awaiting authority" tone="blue" trend="Tracked" />
      </section>

      <section className="overview-grid">
        <div className="panel telemetry-panel">
          <PanelHeader eyebrow="24 HOUR WINDOW" title="Operational telemetry" action={<button className="text-button">Last 24 hours <ChevronDown size={14} /></button>} />
          <div className="chart-summary"><div><strong>97.8%</strong><span>Operational reach</span></div><div className="chart-legend"><span><i className="legend-green" />Active channels</span><span><i className="legend-amber" />Recon signals</span></div></div>
          <TelemetryChart data={dashboard.telemetry} />
        </div>

        <div className="panel posture-panel">
          <PanelHeader eyebrow="ATTACK PATH ENGINE" title="Access pulse" action={<span className="live-label"><i /> LIVE</span>} />
          <div className="radar-wrap">
            <div className="radar"><span className="radar-sweep" /><span className="radar-ring r1" /><span className="radar-ring r2" /><span className="radar-ring r3" /><i className="blip b1" /><i className="blip b2" /><div><strong>ACTIVE</strong><small>CAMPAIGN</small></div></div>
            <div className="pulse-stats"><span><small>Paths analyzed</small><strong>1,284</strong></span><span><small>Priority routes</small><strong className="amber-text">01</strong></span><span><small>Actions staged</small><strong>07</strong></span></div>
          </div>
          <button className="agent-insight" onClick={() => onNavigate("agent")}><Sparkles size={16} /><span><strong>Nidhogg insight</strong><small>One node offers a stronger validation path.</small></span><span className="arrow">↗</span></button>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel fleet-preview">
          <PanelHeader eyebrow="COMMAND MESH" title="Node network" action={<button className="text-button accent" onClick={() => onNavigate("fleet")}>View all nodes ↗</button>} />
          <div className="endpoint-list">
            {clients.slice(0, 4).map((client) => <EndpointRow key={client.id} client={client} onOperate={onOperate} />)}
          </div>
        </div>
        <div className="panel priority-panel">
          <PanelHeader eyebrow="NEXT MOVE" title="Recommended operation" action={<span className="severity-tag">TIER 2 · CONTROLLED</span>} />
          {attentionClient ? <>
            <div className="priority-visual"><div className="risk-orbit"><Fingerprint size={35} /><span /></div><div><span className="mono-label">{attentionClient.hostname}</span><h3>Inspect high-value node</h3><p>Resource pressure and an older agent build make this the strongest validation target.</p></div></div>
            <div className="evidence-row"><span><Cpu size={14} /> CPU {attentionClient.cpu}%</span><span><HardDrive size={14} /> MEM {attentionClient.memory}%</span><span><Crosshair size={14} /> v{attentionClient.agentBuild}</span></div>
            <button className="primary-button full-button" onClick={() => onOperate(attentionClient.id)}>Stage node operation <span>→</span></button>
          </> : <div className="empty-state"><Check size={24} /><p>No priority actions right now.</p></div>}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone, trend }: { icon: ReactNode; label: string; value: string; detail: string; tone: string; trend: string }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-trend">{trend}</span></div><div className="metric-value">{value}</div><h3>{label}</h3><p>{detail}</p><span className="metric-line" /></article>;
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="panel-header"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</div>;
}

function TelemetryChart({ data }: { data: DashboardData["telemetry"] }) {
  const points = data.map((item, index) => `${index * 20},${100 - item.healthy}`).join(" ");
  const areaPoints = `0,100 ${points} 100,100`;
  return <div className="telemetry-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Command-channel reach over 24 hours"><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff5361" stopOpacity=".35" /><stop offset="100%" stopColor="#ff5361" stopOpacity="0" /></linearGradient></defs><g className="grid-lines"><line x1="0" x2="100" y1="20" y2="20" /><line x1="0" x2="100" y1="45" y2="45" /><line x1="0" x2="100" y1="70" y2="70" /><line x1="0" x2="100" y1="95" y2="95" /></g><polygon points={areaPoints} fill="url(#area-fill)" /><polyline points={points} fill="none" stroke="#ff5361" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{data.map((item, index) => <circle key={item.label} cx={index * 20} cy={100 - item.healthy} r="1.2" fill="#0d0809" stroke="#ff8a92" strokeWidth=".8" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-labels">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div></div>;
}

function EndpointRow({ client, onOperate }: { client: Client; onOperate: (id: string) => void }) {
  return <div className="endpoint-row"><div className={`endpoint-symbol ${client.status}`}><Server size={17} /><i /></div><div className="endpoint-name"><strong>{client.hostname}</strong><span>{client.ipAddress}</span></div><div className="endpoint-os"><small>OPERATING SYSTEM</small><span>{client.os}</span></div><div className="resource"><small>CPU</small><span>{client.cpu}%</span><i><b style={{ width: `${client.cpu}%` }} /></i></div><div className="resource"><small>MEMORY</small><span>{client.memory}%</span><i><b style={{ width: `${client.memory}%` }} /></i></div><RiskBadge risk={client.risk} /><button className="row-action" onClick={() => onOperate(client.id)} aria-label={`Operate on ${client.hostname}`}><Terminal size={15} /></button></div>;
}

function RiskBadge({ risk }: { risk: Client["risk"] }) {
  const labels: Record<Client["risk"], string> = { low: "stable", guarded: "monitored", elevated: "priority", unknown: "dormant" };
  return <span className={`risk-badge risk-${risk}`}><i />{labels[risk]}</span>;
}

function AgentPanel({ messages, setMessages, status, skills, apiOnline, onToast }: { messages: ChatMessage[]; setMessages: (messages: ChatMessage[]) => void; status: AgentStatus; skills: Skill[]; apiOnline: boolean | null; onToast: (message: string) => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;
    const optimistic: ChatMessage = { id: Date.now(), role: "user", content: clean, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, optimistic];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const response = await api.chat(clean);
      setMessages([...nextMessages, response.message]);
    } catch {
      const fallback: ChatMessage = { id: Date.now() + 1, role: "assistant", content: apiOnline === false ? "The API is offline. Start the Go service to use Nidhogg AI and persist this campaign session." : "Nidhogg AI could not reach its reasoning provider. Check the model connection and try again.", createdAt: new Date().toISOString() };
      setMessages([...nextMessages, fallback]);
      onToast("Agent provider could not be reached");
    } finally { setSending(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(input); }

  return <div className="agent-layout fade-in">
    <section className="panel chat-panel">
      <div className="chat-header"><div className="operator-avatar"><BrainCircuit size={23} /><span /></div><div><h2>Nidhogg AI</h2><p><i /> {status.connected ? `${status.model} connected` : "Local campaign context"}</p></div><button className="icon-button"><Ellipsis size={19} /></button></div>
      <div className="chat-context"><Crosshair size={13} /> Grounded in authorized campaign context <span>·</span> Operator authority enforced</div>
      <div className="messages">
        <div className="chat-date"><span>Current campaign session</span></div>
        {messages.map((message) => <ChatBubble key={`${message.id}-${message.createdAt}`} message={message} />)}
        {sending && <div className="message assistant"><div className="message-avatar"><Bot size={16} /></div><div className="message-body typing"><i /><i /><i /></div></div>}
        <div ref={chatEnd} />
      </div>
      <div className="suggestions"><button onClick={() => void sendMessage("Which node has the highest operational value?")}>Rank priority nodes</button><button onClick={() => void sendMessage("Map current node reachability")}>Map node reachability</button><button onClick={() => void sendMessage("Plan a scoped validation on WS-OPS-117")}>Stage scoped validation</button></div>
      <form className="chat-composer" onSubmit={submit}><div className="composer-field"><Sparkles size={17} /><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input); } }} placeholder="Ask Nidhogg about this campaign..." rows={1} /><button disabled={!input.trim() || sending} aria-label="Send message"><Send size={17} /></button></div><div className="composer-note"><span>Validate high-impact actions before execution.</span><span>↵ send · ⇧↵ new line</span></div></form>
    </section>

    <aside className="agent-rail">
      <div className="panel context-card"><PanelHeader eyebrow="TARGET CONTEXT" title="Campaign grounding" /><div className="context-score"><div className="score-ring"><strong>94</strong><small>%</small></div><div><strong>Context quality</strong><span>Fresh telemetry available</span></div></div><div className="context-list"><span><Network size={15} />5 controlled nodes<i className="ok-dot" /></span><span><Clock3 size={15} />Updated seconds ago<i className="ok-dot" /></span><span><Fingerprint size={15} />Identity graph active<i className="ok-dot" /></span></div></div>
      <div className="panel active-skills"><PanelHeader eyebrow="ARSENAL" title="Active capabilities" /><div>{skills.filter((skill) => skill.enabled).map((skill) => <span key={skill.id}><Check size={13} />{skill.name}</span>)}</div></div>
      <div className="panel guardrail-card"><div className="guardrail-icon"><Crosshair size={20} /></div><div><strong>Operator gate active</strong><p>Nidhogg can stage actions, but execution requires explicit command authority.</p></div></div>
    </aside>
  </div>;
}

function ChatBubble({ message }: { message: ChatMessage }) {
  return <div className={`message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? <Bot size={16} /> : <span>AM</span>}</div><div><div className="message-meta"><strong>{message.role === "assistant" ? "Nidhogg AI" : "You"}</strong><span>{formatTime(message.createdAt)}</span></div><div className="message-body">{message.content}</div>{message.role === "assistant" && <div className="message-actions"><button><Eye size={13} /> Inspect context</button><button>···</button></div>}</div></div>;
}

function FleetPanel({ clients, onOperate }: { clients: Client[]; onOperate: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = clients.filter((client) => (filter === "all" || client.status === filter) && `${client.hostname} ${client.ipAddress} ${client.os}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="view-stack fade-in">
    <section className="fleet-summary"><div><span className="summary-icon green"><Wifi size={18} /></span><p><strong>{clients.filter((client) => client.status === "online").length}</strong><small>Active channels</small></p></div><div><span className="summary-icon amber"><Activity size={18} /></span><p><strong>{clients.filter((client) => client.status === "attention").length}</strong><small>Priority nodes</small></p></div><div><span className="summary-icon muted"><WifiOff size={18} /></span><p><strong>{clients.filter((client) => client.status === "offline").length}</strong><small>Dormant</small></p></div><div className="enrollment-card"><Fingerprint size={18} /><span><strong>Node registration</strong><small>Bootstrap token expires in 18h</small></span><button>Copy token</button></div></section>
    <section className="panel fleet-table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes, IP or operating system" /></div><div className="filter-tabs">{["all", "online", "attention", "offline"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="secondary-button"><Settings2 size={15} /> Columns</button></div><div className="fleet-table"><div className="fleet-table-head"><span>Node</span><span>System</span><span>Resources</span><span>Last contact</span><span>Signal</span><span /></div>{filtered.map((client) => <div className="fleet-table-row" key={client.id}><div className="table-endpoint"><div className={`endpoint-symbol ${client.status}`}><Server size={17} /><i /></div><span><strong>{client.hostname}</strong><small>{client.ipAddress}</small></span></div><div className="system-cell"><strong>{client.os}</strong><small>Agent {client.agentBuild}</small></div><div className="dual-resource"><span>CPU <b>{client.cpu}%</b></span><i><b style={{ width: `${client.cpu}%` }} /></i><span>MEM <b>{client.memory}%</b></span><i><b style={{ width: `${client.memory}%` }} /></i></div><div className="last-seen"><span className={client.status}>●</span>{client.status === "offline" ? "47 min ago" : "Just now"}</div><RiskBadge risk={client.risk} /><button className="operate-button" onClick={() => onOperate(client.id)}><Terminal size={14} /> Execute</button></div>)}{filtered.length === 0 && <div className="empty-state"><Search size={25} /><p>No nodes match this view.</p></div>}</div></section>
  </div>;
}

function OperationsPanel({ clients, commands, setCommands, initialTarget, apiOnline, onToast }: { clients: Client[]; commands: CommandJob[]; setCommands: (commands: CommandJob[]) => void; initialTarget: string; apiOnline: boolean | null; onToast: (message: string) => void }) {
  const [scope, setScope] = useState<"client" | "all">("client");
  const [target, setTarget] = useState(initialTarget);
  const [command, setCommand] = useState("Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsUptime");
  const [submitting, setSubmitting] = useState(false);
  const onlineCount = clients.filter((client) => client.status !== "offline").length;

  async function queueCommand(event: FormEvent) {
    event.preventDefault();
    if (!command.trim()) return;
    setSubmitting(true);
    try {
      const job = apiOnline === false
        ? { id: `preview-${Date.now()}`, command, scope, targetId: scope === "client" ? target : undefined, targetCount: scope === "all" ? onlineCount : 1, status: scope === "all" ? "awaiting approval" : "queued", requestedBy: "alex@nidhogg.local", createdAt: new Date().toISOString() } as CommandJob
        : await api.createCommand({ command, scope, targetId: scope === "client" ? target : undefined });
      setCommands([job, ...commands]);
      onToast(scope === "all" ? "Campaign action submitted for authority" : "Node action staged securely");
    } catch (error) { onToast(error instanceof Error ? error.message : "Could not queue action"); }
    finally { setSubmitting(false); }
  }

  return <div className="operations-layout fade-in">
    <section className="panel command-builder"><PanelHeader eyebrow="POWERSHELL · OPERATOR CHANNEL" title="Stage an operation" action={<span className="policy-badge"><Crosshair size={13} /> Authority enforced</span>} />
      <form onSubmit={queueCommand}>
        <div className="form-group"><label>Execution scope</label><div className="scope-picker"><button type="button" className={scope === "client" ? "active" : ""} onClick={() => setScope("client")}><Server size={16} /><span><strong>Single node</strong><small>Target one controlled system</small></span></button><button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}><Network size={16} /><span><strong>All active nodes</strong><small>{onlineCount} targets · authority required</small></span></button></div></div>
        {scope === "client" && <div className="form-group"><label htmlFor="target">Execution node</label><div className="select-wrap"><Server size={16} /><select id="target" value={target} onChange={(event) => setTarget(event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id} disabled={client.status === "offline"}>{client.hostname} · {client.ipAddress}{client.status === "offline" ? " (dormant)" : ""}</option>)}</select><ChevronDown size={15} /></div></div>}
        <div className="form-group"><div className="label-row"><label htmlFor="command">PowerShell command</label><span>Constrained language mode</span></div><div className="code-editor"><div className="editor-bar"><span /><span /><span /><small>operation.ps1</small><b>PS</b></div><div className="editor-body"><span className="line-number">1</span><textarea id="command" value={command} onChange={(event) => setCommand(event.target.value)} spellCheck={false} rows={6} /></div></div></div>
        <div className={`impact-card ${scope === "all" ? "elevated" : ""}`}><div><CircleAlert size={18} /><span><strong>{scope === "all" ? "Wide execution scope" : "Focused execution"}</strong><small>{scope === "all" ? `This action targets ${onlineCount} nodes and requires a second operator.` : "This action targets one node and will be fully tracked."}</small></span></div><span className="impact-level">{scope === "all" ? "AUTHORITY" : "FOCUSED"}</span></div>
        <div className="command-footer"><p><LockKeyhole size={13} /> Output is encrypted and retained for 30 days</p><button className="primary-button" disabled={!command.trim() || submitting}><Zap size={16} /> {submitting ? "Staging..." : scope === "all" ? "Request authority" : "Stage operation"}</button></div>
      </form>
    </section>
    <aside className="panel jobs-panel"><PanelHeader eyebrow="OPERATION STREAM" title="Recent execution" action={<button className="icon-button"><Ellipsis size={17} /></button>} />{commands.length === 0 ? <div className="empty-state job-empty"><Terminal size={27} /><strong>No staged operations</strong><p>Commands and authority requests will appear here.</p></div> : <div className="job-list">{commands.map((job) => <div className="job-item" key={job.id}><div className={`job-status ${job.status.replace(" ", "-")}`}><Clock3 size={15} /></div><div><strong>{truncate(job.command, 44)}</strong><span>{job.scope === "all" ? `${job.targetCount} nodes` : clients.find((client) => client.id === job.targetId)?.hostname ?? "Node"} · {formatTime(job.createdAt)}</span><small>{job.status}</small></div></div>)}</div>}<div className="audit-note"><Fingerprint size={16} /><span><strong>Operation ledger</strong><small>Every action records operator, node, authority and result.</small></span></div></aside>
  </div>;
}

function SkillsPanel({ skills, setSkills, status, apiOnline, onToast }: { skills: Skill[]; setSkills: (skills: Skill[]) => void; status: AgentStatus; apiOnline: boolean | null; onToast: (message: string) => void }) {
  async function toggleSkill(skill: Skill) {
    const updated = skills.map((item) => item.id === skill.id ? { ...item, enabled: !item.enabled } : item);
    setSkills(updated);
    try {
      if (apiOnline !== false) await api.updateSkill(skill.id, !skill.enabled);
      onToast(`${skill.name} ${skill.enabled ? "disabled" : "enabled"}`);
    } catch { setSkills(skills); onToast("Could not update capability loadout"); }
  }
  return <div className="view-stack fade-in">
    <section className="model-banner"><div className="model-visual"><div><BrainCircuit size={28} /></div><span /><i /></div><div className="model-copy"><span>OFFENSIVE REASONING ENGINE</span><h2>{status.model}</h2><p>{status.connected ? "Connected to your OpenAI-compatible operator model." : "Local campaign context is active. Configure the API environment to connect a reasoning model."}</p></div><div className="model-status"><span className={status.connected ? "connected" : "fallback"}><i />{status.connected ? "Provider connected" : "Local engine"}</span><button className="secondary-button"><Settings2 size={15} /> Connection details</button></div></section>
    <section><div className="section-heading"><div><span>CAPABILITY LOADOUT</span><h2>Operator arsenal</h2><p>Enabled capabilities define the context and planning tools available to Nidhogg.</p></div><div className="enabled-count"><strong>{skills.filter((skill) => skill.enabled).length}</strong><span>of {skills.length}<small>armed</small></span></div></div><div className="skills-grid">{skills.map((skill) => <article className={`skill-card ${skill.enabled ? "enabled" : ""}`} key={skill.id}><div className="skill-card-top"><span className={`skill-icon category-${skill.category.toLowerCase()}`}>{skill.category === "Recon" ? <Gauge size={20} /> : skill.category === "Operations" ? <Network size={20} /> : skill.category === "Identity" ? <UserCog size={20} /> : <Zap size={20} />}</span><button role="switch" aria-checked={skill.enabled} className={`toggle ${skill.enabled ? "on" : ""}`} onClick={() => void toggleSkill(skill)}><span /></button></div><span className="skill-category">{skill.category}</span><h3>{skill.name}</h3><p>{skill.description}</p><div className="skill-footer"><span className={`risk-level ${skill.riskLevel.toLowerCase()}`}><i />{skill.riskLevel} profile</span><button>Configure <span>→</span></button></div></article>)}</div></section>
    <section className="panel policy-panel"><div className="policy-icon"><Crosshair size={22} /></div><div><strong>Global execution doctrine</strong><p>Wide-scope execution, access chaining and identity actions require explicit operator authority.</p></div><button className="secondary-button">Review doctrine</button></section>
  </div>;
}

function AdministratorsPanel({ administrators, setAdministrators, apiOnline, onToast }: { administrators: Administrator[]; setAdministrators: (admins: Administrator[]) => void; apiOnline: boolean | null; onToast: (message: string) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "Offensive operator" });
  const [saving, setSaving] = useState(false);

  async function invite(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const admin = apiOnline === false ? { id: Date.now(), ...form, status: "invited", createdAt: new Date().toISOString() } : await api.createAdministrator(form);
      setAdministrators([...administrators, admin]); setModalOpen(false); setForm({ name: "", email: "", role: "Offensive operator" }); onToast(`Operator invitation sent to ${admin.email}`);
    } catch (error) { onToast(error instanceof Error ? error.message : "Could not invite operator"); }
    finally { setSaving(false); }
  }

  return <div className="view-stack fade-in">
    <section className="admin-stat-row"><div className="admin-stat"><Users size={19} /><span><strong>{administrators.length}</strong><small>Total operators</small></span></div><div className="admin-stat"><Crosshair size={19} /><span><strong>{administrators.filter((admin) => admin.status === "active").length}</strong><small>Active operators</small></span></div><div className="admin-stat"><Clock3 size={19} /><span><strong>{administrators.filter((admin) => admin.status === "invited").length}</strong><small>Pending invitations</small></span></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={16} /> Add operator</button></section>
    <section className="panel administrators-panel"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search command operators" /></div><button className="secondary-button"><SlidersHorizontal size={15} /> Filter</button></div><div className="admin-table-head"><span>Operator</span><span>Command role</span><span>Status</span><span>Last active</span><span /></div>{administrators.map((admin) => <div className="admin-row" key={admin.id}><div className="admin-identity"><Avatar name={admin.name} /><span><strong>{admin.name}</strong><small>{admin.email}</small></span></div><span className={`role-badge role-${admin.role.toLowerCase().replace(" ", "-")}`}><Crosshair size={13} />{admin.role}</span><span className={`account-status ${admin.status}`}><i />{admin.status}</span><span className="last-active">{admin.status === "invited" ? "Invitation pending" : admin.name === "Alex Morgan" ? "Online now" : "23 min ago"}</span><button className="icon-button"><Ellipsis size={17} /></button></div>)}</section>
    <section className="access-note"><Fingerprint size={20} /><div><strong>Command authority is tracked</strong><p>Operator role changes and sensitive actions are written to the operation ledger.</p></div><button>Open authority log ↗</button></section>
    {modalOpen && <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span>COMMAND AUTHORITY</span><h2>Add campaign operator</h2><p>Assign the minimum authority required for their role.</p></div><button className="icon-button" onClick={() => setModalOpen(false)}><X size={18} /></button></div><form onSubmit={invite}><div className="form-group"><label htmlFor="admin-name">Operator name</label><input id="admin-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Sam Rivera" /></div><div className="form-group"><label htmlFor="admin-email">Operator email</label><input id="admin-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="sam@company.com" /></div><div className="form-group"><label htmlFor="admin-role">Command role</label><div className="select-wrap"><Crosshair size={16} /><select id="admin-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Offensive operator</option><option>Network admin</option><option>Auditor</option><option>Superuser</option></select><ChevronDown size={15} /></div></div><div className="modal-note"><CircleAlert size={16} />Superuser authority should require an independent approval in production.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Sending..." : "Send operator invitation"}</button></div></form></div></div>}
  </div>;
}

function Avatar({ name }: { name: string }) {
  return <span className="avatar">{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}
