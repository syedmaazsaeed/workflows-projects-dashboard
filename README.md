# Automation Hub

A production-ready full-stack web application for managing n8n workflows, projects, webhooks, and AI-powered documentation search.

![Automation Hub](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)

## Features

### 🔄 Workflow Management
- Upload, store, and version n8n workflow JSON files
- Extract and display workflow metadata (nodes, triggers, services)
- Visual workflow graph representation
- Compare versions with diff viewer
- Sync with n8n instances (pull/push)

### 📁 Project Organization
- Create projects with unique keys
- Manage team members with RBAC (Admin, Developer, Viewer)
- Global search across workflows, docs, and webhook events
- Markdown documentation with live preview

### 🔗 Webhook Management
- Create secure webhook endpoints
- Multiple routing options: Forward URL, Trigger n8n, Internal workflow
- Transform rules with JSONPath extraction
- Real-time event logging via WebSocket
- Event replay functionality

### 🤖 AI Chatbot (RAG)
- Ask questions about your workflows and documentation
- Powered by pgvector for semantic search
- Citations with source references
- Streaming responses
- Configurable LLM providers (OpenAI, Anthropic)

### 🔐 Security
- JWT authentication with RBAC
- Encrypted secrets storage
- Webhook secret hashing (bcrypt)
- Rate limiting on sensitive endpoints
- Comprehensive audit logging

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, BullMQ |
| Database | PostgreSQL 16+ with pgvector |
| Cache/Queue | Redis 7 |
| Storage | Local filesystem / S3-compatible |
| AI/RAG | OpenAI / Anthropic embeddings + LLM |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### 1. Clone and Configure

```bash
git clone <repository-url>
cd workflows-projects-dashboard

# Copy environment file
cp env.example .env

# Edit .env with your settings (especially API keys)
```

### 2. Start with Docker Compose

```bash
# Start all services
docker compose up -d

# Watch logs
docker compose logs -f

# The app will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:4000
# - API Docs: http://localhost:4000/api/docs
```

### 3. Seed Data (Optional)

```bash
# Run seed script to create demo data
docker compose exec api npm run seed
```

### 4. Login

Default admin credentials (from seed):
- Email: `admin@automation.hub`
- Password: `Admin123!`

## Development Setup

### Backend (NestJS)

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
  -d '{"email": "admin@automation.hub", "password": "Admin123!"}'

# Use the returned token
curl http://localhost:4000/api/projects \
  -H "Authorization: Bearer <token>"
```

### Webhook Endpoints

Public webhook receiver:
```bash
POST /api/webhooks/:projectKey/:hookKey
Header: x-webhook-secret: <secret>
```

## Project Structure

```
workflows-projects-dashboard/
├── docker-compose.yml
├── env.example
├── README.md
├── database/
│   └── init.sql              # Database schema
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/           # Configuration
│       ├── common/           # Shared utilities
│       ├── database/         # Database connection
│       └── modules/
│           ├── auth/         # Authentication
│           ├── projects/     # Projects CRUD
│           ├── workflows/    # Workflows & versions
│           ├── webhooks/     # Webhooks & events
│           ├── documents/    # Documentation
│           ├── secrets/      # Encrypted secrets
│           ├── chat/         # AI chatbot
│           ├── vector/       # RAG pipeline
│           └── audit/        # Audit logging
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    └── app/
        ├── layout.tsx
        ├── (auth)/           # Login/Register
        └── (protected)/
            ├── dashboard/
            └── projects/
                └── [projectKey]/
                    ├── workflows/
                    ├── webhooks/
                    ├── docs/
                    ├── secrets/
                    └── chat/
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

MIT License - see LICENSE file for details.

