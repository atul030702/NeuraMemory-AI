# NeuraMemory-AI

NeuraMemory-AI is a full-stack memory ingestion and retrieval platform.
It ingests text, links, and documents through an LLM extraction pipeline, generates embeddings, stores vectors in Qdrant, and enforces user-scoped access across all memory APIs.

## Key Features

- JWT cookie-based authentication using `httpOnly` session cookies.
- User-scoped authorization for all memory operations.
- Ingestion from plain text, URLs, and uploaded documents.
- Document parsing for PDF, DOCX, TXT, and Markdown files.
- LLM extraction into `semantic` and `bubble` memory entries.
- Embedding generation and vector storage in Qdrant.
- Memory retrieval with `kind`, `source`, `limit`, and `offset` query filters.
- Deletion by memory ID or full user memory reset.
- OpenAPI documentation through Swagger UI in non-production mode.
- MCP transport endpoints under `/api/v1/mcp`.

## How It Works

1. The user authenticates; the server sets a JWT `httpOnly` cookie.
2. The user submits input as text, URL, or document.
3. The backend extracts normalized text from the selected source.
4. The extraction pipeline returns structured memory entries (`semantic`, `bubble`).
5. The backend generates embeddings for each extracted entry.
6. Vectors and payload metadata are stored in Qdrant, and user/account data is stored in MongoDB.
7. The frontend retrieves user-scoped memories and supports filtering and deletion.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express, TypeScript, Zod, JWT, Multer
- Database: MongoDB (user/account data), Qdrant (memory vectors)
- AI: OpenRouter (memory extraction and embeddings)
- Processing: Firecrawl, pdfjs-dist, Mammoth, local OCR fallback
- Tools: ESLint, Prettier, Vitest, Docker Compose

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

## Installation

Prerequisites:

- Node.js (server requires `>= 24`)
- npm
- Docker + Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/Gautam7352/NeuraMemory-AI.git
cd NeuraMemory-AI
```

2. Install backend dependencies:

```bash
cd server
npm install
```

3. Install frontend dependencies:

```bash
cd ../client
npm install
cd ..
```

4. Create environment file:

```bash
cp server/.env.example server/.env
```

5. Start required data services:

```bash
docker compose up -d mongodb qdrant
```

## Environment Variables

Required in `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/neuramemory
QDRANT_URL=http://localhost:6333
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_secret_with_minimum_32_characters
```

## Usage

Run backend:

```bash
cd server
npm run dev
```

Run frontend (new terminal):

```bash
cd client
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- API docs (non-production only): `http://localhost:3000/api-docs`

Run full stack with Docker:

```bash
docker compose up -d
```

## API Endpoints

Base path: `/api/v1`

Auth:

- `POST /register`
- `POST /login`
- `POST /logout`
- `GET /me`
- `POST /api-key`

Memories:

- `POST /memories/text`
- `POST /memories/link`
- `POST /memories/document`
- `GET /memories`
- `DELETE /memories/:id`
- `DELETE /memories`

MCP:

- `POST /mcp`
- `GET /mcp`
- `DELETE /mcp`
- `GET /mcp/health`

## Roadmap

- Add a semantic search API endpoint for direct query-based retrieval.
- Improve ownership checks for single-memory deletion.
- Expand automated tests for memory and auth flows.
- Add frontend controls for pagination and filtering state.

## Contributing

1. Fork the repo.
2. Create a feature branch.
3. Make changes with tests/lint passing.
4. Commit with a clear message.
5. Open a pull request.

## License

Licensed under Apache License 2.0. See `LICENSE`.
