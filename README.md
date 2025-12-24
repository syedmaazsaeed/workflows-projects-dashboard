# Automation Portal

Automation Portal is a full-stack web application built as an internal tool for managing n8n workflows, related projects, webhooks, and documentation from a single interface.
As automation systems grow, workflows tend to become scattered across environments, versions are hard to track, webhook behavior becomes unclear, and documentation quickly falls out of sync with reality. This project was created to solve those problems by adding a structured control layer on top of n8n.Automation Portal focuses on visibility, organization, and operational clarity for teams that rely heavily on automation.


## What Automation Portal Does

- Stores and versions n8n workflow JSON files
- Extracts workflow metadata (nodes, triggers, services)
- Organizes workflows by project
- Provides secure webhook endpoints
- Centralizes internal documentation
- Offers optional AI-assisted search across workflows and docs


## Features

### 🔄 Workflow Management
- Upload, store, and version n8n workflow JSON files
- Inspect workflow structure, nodes, and triggers
- Visual workflow graph representation
- Compare workflow versions using a diff viewer
- Optional synchronization with external n8n instances

### 📁 Project Organization
- Group workflows under projects with unique keys
- Manage team members using role-based access control (Admin, Developer, Viewer)
- Global search across workflows, documentation, and webhook events
- Markdown-based documentation with live preview

### 🔗 Webhook Management
- Create secure, project-scoped webhook endpoints
- Multiple routing options:
  - Forward requests to external URLs
  - Trigger n8n workflows
  - Handle requests internally
- Request transformation using JSONPath rules
- Real-time event logging
- Webhook event replay for debugging and testing

###  AI Assisted Search
- Ask questions about workflows and documentation
- Semantic search powered by pgvector
- Source-aware responses based on indexed data
- Supports configurable LLM providers (OpenAI, Anthropic)

### 🔐 Security
- JWT-based authentication
- Role-based access control
- Encrypted storage for sensitive secrets
- Webhook secret hashing
- Rate limiting on sensitive endpoints
- Audit logging for important actions


## Tech Stack

| Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
| Backend | NestJS, TypeScript, BullMQ |
| Database | PostgreSQL 16+ with pgvector |
| Cache/Queue | Redis 7 |
| AI/RAG | OpenAI

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js
- Git

### 1. Clone and Configure

git clone (https://github.com/syedmaazsaeed/workflows-projects-dashboard.git)

cd workflows-projects-dashboard


## Development Setup

### Backend

```bash
cd backend
npm install
npm run migration:run
npm run start:dev
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

## API Documentation

The API documentation is available at `/api/docs` when the backend is running.

### Authentication

All protected endpoints require a Bearer token:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@gmail.com", "password": "key"}'

# Use the returned token
curl http://localhost:4000/api/projects \
  -H "Authorization: Bearer <token>"
```


## Environment Variables

See `env.example` for complete documentation. Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | For AI features |
| `N8N_BASE_URL` | n8n instance URL | For sync features |
| `ENCRYPTION_KEY` | 32-char key for secrets | Yes |

## Architecture

### RAG Pipeline

1. **Indexing**: Workflows, documents, and webhook events are chunked and embedded
2. **Storage**: Embeddings stored in pgvector with metadata
3. **Retrieval**: Semantic search using cosine similarity
4. **Generation**: LLM generates responses with citations

### Real-time Updates

- WebSocket gateway for live webhook events
- Server-Sent Events (SSE) for chat streaming
- BullMQ for background job processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License

