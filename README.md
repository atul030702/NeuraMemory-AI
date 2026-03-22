# NeuraMemory-AI

## Intro

NeuraMemory-AI is a full-stack platform for memory ingestion and retrieval.

It accepts text, links, and documents through an LLM pipeline, generates embeddings, stores vectors in Qdrant, and secures access with JWT via `httpOnly` cookies or `Authorization: Bearer` tokens.

## Features

- Authenticate with JWT via `httpOnly` cookies or `Authorization: Bearer` tokens.
- Enforce user-scoped authorization on all memory operations.
- Ingest memories from text, URLs, and uploaded documents.
- Parse PDF, DOCX, TXT, and Markdown documents.
- Extract `semantic` and `bubble` memory entries using LLMs.
- Generate embeddings and store vectors in Qdrant.
- Retrieve memories with `kind`, `source`, `limit`, and `offset` filters.
- Delete memories by ID or reset all user memories.
- Access OpenAPI docs via Swagger UI in non-production mode.
- Support MCP transport at `/api/v1/mcp`.

## How to Run

### Local setup

```bash
git clone https://github.com/Gautam7352/NeuraMemory-AI.git
cd NeuraMemory-AI

cd server
npm install

cd ../client
npm install

cd ..
docker compose up -d mongodb qdrant
```

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Endpoints:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- API docs (non-production): `http://localhost:3000/api-docs`

### Docker setup

```bash
docker compose up -d
```

### Environment variables

```bash
cp server/.env.example server/.env
```

```env
MONGODB_URI=mongodb://localhost:27017/neuramemory
QDRANT_URL=http://localhost:6333
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_secret_with_minimum_32_characters
```

## Project Structure

```text
.
├── client/              # React frontend
├── server/              # Express API + services
├── docker-compose.yml
├── docker-compose.dev.yml
├── DOCKER.md
└── README.md
```

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express, TypeScript, Zod, JWT, Multer
- Database: MongoDB (user/account data), Qdrant (vector storage)
- AI: OpenRouter (memory extraction and embeddings)
- Processing: Firecrawl, pdfjs-dist, Mammoth, local OCR fallback
- Tooling: ESLint, Prettier, Vitest, Docker Compose
