# Nidhogg Command

Nidhogg Command is an AI-assisted operations dashboard for defensive Windows fleet administration. This first slice provides the management plane: a responsive command-center UI, a Gin/GORM API, SQLite persistence, an OpenAI-compatible model bridge, and approval-aware operation queues.

## Included

- Live command-center view with endpoint health, risk, telemetry, and recommendations
- Sentinel chat with persisted history and an OpenAI-compatible provider bridge
- Local contextual fallback when no AI provider is configured
- Agent skill policy controls with an audit record
- Windows endpoint inventory and per-client operation targeting
- Fleet-wide command requests that require approval
- Superuser view for administrator roles and invitations
- Responsive desktop and mobile layouts
- Seeded development data for immediate evaluation

## Architecture

```text
web/                 Next.js 16 dashboard
api/cmd/server/      Go service entry point
api/internal/app/    Gin routes, GORM models, model bridge, and tests
docker-compose.yml   Local container deployment
```

The API stores command jobs but does not yet dispatch them to Windows clients. Agent enrollment, authenticated transport, result streaming, and device identity belong in the next implementation phase. This separation prevents the dashboard prototype from becoming an unauthenticated remote execution service.

## Local Development

Requirements: Go 1.24 or newer, Node.js 22 or newer, and npm.

Install and start the API:

```bash
go -C api mod download
make api
```

In another terminal, install and start the dashboard:

```bash
npm --prefix web install
make web
```

Open `http://localhost:3000`. The API listens on `http://localhost:8080` and creates `api/nidhogg.db` on first start.

## AI Provider

The model bridge accepts an OpenAI-compatible `/chat/completions` API. Configure it before starting the API:

```bash
export AI_BASE_URL="https://api.openai.com/v1"
export AI_API_KEY="your-provider-key"
export AI_MODEL="your-model-id"
make api
```

Without those values, Sentinel uses a labeled local fallback based on current fleet context. Keys remain server-side and are never exposed to Next.js.

## Containers

```bash
docker compose up --build
```

For a remote deployment, set `PUBLIC_WEB_URL` and `PUBLIC_API_URL` before building. `PUBLIC_API_URL` must be reachable by the operator's browser, not only from inside the Compose network.

## Verification

```bash
make test
make lint
make build
```

## Security Boundary

This is a management-plane foundation, not a production-ready remote administration service. Before connecting real clients, add SSO or passkeys, strict RBAC enforcement in the API, mTLS device identity, signed task envelopes, allowlisted command policies, two-person approval for disruptive actions, rate limiting, immutable external audit storage, and encrypted result retention.
