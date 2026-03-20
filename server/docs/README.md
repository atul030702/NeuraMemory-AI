# NeuraMemory-AI Server

Backend API for NeuraMemory-AI, focused on authentication plus memory ingestion/retrieval with LLM extraction and vector storage.

## Tech Stack

- Runtime: Node.js >= 24 (ESM)
- Language: TypeScript (strict mode)
- Framework: Express 5
- Datastores: MongoDB + Qdrant
- AI Services: OpenRouter (chat + embeddings), Firecrawl (URL extraction), optional Unstructured/local OCR for PDFs
- Validation/Security: Zod, bcryptjs, JWT

## Project Structure

```text
server/
  src/
    config/          # env + swagger config
    controllers/     # HTTP handlers
    services/        # business logic
    repositories/    # MongoDB/Qdrant access
    middleware/      # auth, upload, error handling, planned rate-limiters
    utils/           # extraction + embeddings helpers
    lib/             # singleton clients
    index.ts         # app entrypoint
  docs/
  test-routes.sh     # integration test suite
  Dockerfile
  package.json
```

## Current Endpoints

- Public auth
- `POST /api/v1/register`
- `POST /api/v1/login`
- Protected memories (JWT required)
- `POST /api/v1/memories/text`
- `POST /api/v1/memories/link`
- `POST /api/v1/memories/document`
- `GET /api/v1/memories`
- `DELETE /api/v1/memories`
- API docs
- `GET /api-docs`
- `GET /api-docs/spec.json`

## Environment Variables

Required for core boot:

```env
MONGODB_URI=mongodb://localhost:27017/neuramemory
QDRANT_URL=http://localhost:6333
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=<at-least-32-characters>
```

Optional but commonly used:

```env
PORT=3000
NODE_ENV=development
QDRANT_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REFERER=
OPENROUTER_TITLE=
JWT_EXPIRES_IN=7d

# URL ingestion
FIRECRAWL_API_KEY=

# OCR pipeline
UNSTRUCTURED_API_URL=https://platform.unstructuredapp.io/api/v1
UNSTRUCTURED_API_KEY=
UNSTRUCTURED_TIMEOUT_MS=120000
OCR_ENABLE_LOCAL_FALLBACK=true
OCR_TESSERACT_LANG=eng
OCR_FORCE=false
```

## Development

Run locally without Docker:

```bash
cd server
npm install
npm run dev
```

Run full stack with Docker Compose (recommended for integration testing):

```bash
# from repo root
make dev
```

## Testing

Integration tests are in `server/test-routes.sh`.

```bash
# from repo root
make dev

# in another terminal
cd server
./test-routes.sh

# optional verbose run
VERBOSE=true ./test-routes.sh

# shutdown stack when done
cd ..
make dev-down
```

## Quality Gates

```bash
cd server
npm run build -- --noEmit
npm run lint
npm run format
```

## Implementation Status

Completed:

- JWT auth (register/login)
- Protected memory ingestion routes (text/link/document)
- Memory list/delete-all routes
- Layered architecture (controller -> service -> repository)
- Centralized error handling (`AppError` + error middleware)
- Swagger docs endpoint
- Dockerized development and production flow

Planned / vNext:

- Enable route-level rate limiting in production routes
- Public semantic-search endpoint using existing repository/service primitives
- Single-memory deletion endpoint
- Expanded profile/user-management APIs

## Related Docs

- [Architecture](ARCHITECTURE.md)
- [Best Practices](BEST_PRACTICES.md)
- [API Reference](API.md)
