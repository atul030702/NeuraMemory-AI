# API Documentation

NeuraMemory-AI server API reference.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://api.neuramemory.ai`

All API routes are under `/api/v1`.

## Authentication

The API uses JWT bearer tokens.

1. Call `POST /api/v1/register` or `POST /api/v1/login`.
2. Send the returned token in `Authorization: Bearer <token>` for protected routes.

Token expiration is controlled by `JWT_EXPIRES_IN` (default: `7d`).

## Response Format

Success:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Status Codes

- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `409` Conflict
- `415` Unsupported Media Type
- `422` Unprocessable Entity
- `429` Too Many Requests
- `500` Internal Server Error

## Endpoints

### Auth (Public)

#### POST `/api/v1/register`

Create a user account.

Request body:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Success (`201`):

```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "email": "user@example.com"
  }
}
```

#### POST `/api/v1/login`

Authenticate an existing user.

Request body:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Success (`200`):

```json
{
  "success": true,
  "message": "Login successful.",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "email": "user@example.com"
  }
}
```

### Memories (Protected)

All memory routes require `Authorization: Bearer <token>`.

#### POST `/api/v1/memories/text`

Extract and store memories from plain text.

Request body:

```json
{
  "text": "My name is Gautam. I love automation."
}
```

Success (`201`) returns:

- `success`
- `message`
- `data.memoriesStored`
- `data.semantic[]`
- `data.bubbles[]`

#### POST `/api/v1/memories/link`

Extract content from a URL, then extract/store memories.

Request body:

```json
{
  "url": "https://example.com/article"
}
```

Success (`201`) returns the same shape as text ingestion.

#### POST `/api/v1/memories/document`

Upload and process a document.

- Content type: `multipart/form-data`
- Field: `file`
- Allowed MIME: PDF, DOCX, TXT, MD
- Max size: 10 MB

Success (`201`) returns the same shape as text ingestion.

#### GET `/api/v1/memories`

List stored memories for the authenticated user.

Query params:

- `kind` (optional)
- `source` (optional, one of `text|document|link`)
- `limit` (optional, `1..500`, default `100`)

Success (`200`):

```json
{
  "success": true,
  "message": "Found 3 memories.",
  "data": [
    {
      "userId": "...",
      "text": "...",
      "kind": "semantic",
      "importance": 1,
      "source": "text",
      "createdAt": "..."
    }
  ]
}
```

#### DELETE `/api/v1/memories`

Delete all memories for the authenticated user.

Success (`200`):

```json
{
  "success": true,
  "message": "All memories deleted."
}
```

## Rate Limiting

Rate-limit middleware exists in the codebase but is not yet wired into live routes. Current production behavior does not enforce `429` limits by default.

## API Docs Endpoint

- Swagger UI: `GET /api-docs`
- Raw spec: `GET /api-docs/spec.json`

## Testing

```bash
# from repo root
make dev

# from server/
./test-routes.sh

# optional verbose mode
VERBOSE=true ./test-routes.sh
```

## Changelog

### v1 (current)

- Auth register/login endpoints
- JWT-protected memory ingestion (text/link/document)
- Memory list and delete-all endpoints
- Unified bash integration test suite (`test-routes.sh`)

### Planned

- Single-memory delete endpoint
- Public semantic-search endpoint
- Route-level rate limiting enablement
