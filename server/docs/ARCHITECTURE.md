# Server Architecture

This document describes the architectural patterns, folder structure, and design decisions used in the NeuraMemory-AI server.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Architectural Patterns](#architectural-patterns)
- [Data Flow](#data-flow)
- [Layer Responsibilities](#layer-responsibilities)
- [Database Design](#database-design)
- [Error Handling](#error-handling)
- [Security Architecture](#security-architecture)
- [Extensibility](#extensibility)

---

## Overview

The NeuraMemory-AI server follows a **layered architecture** pattern with clear separation of concerns. The application is built using TypeScript with strict type checking and uses modern ESM imports.

### Core Principles

1. **Separation of Concerns** - Each layer has a single, well-defined responsibility
2. **Dependency Injection** - Higher layers depend on lower layers, never the reverse
3. **Type Safety** - Full TypeScript coverage with strict mode
4. **Fail Fast** - Validate environment and inputs at startup/entry points
5. **Single Responsibility** - Each module does one thing well

---

## Folder Structure

The server's source code is organized into the following directories under `src/`:

```
src/
├── config/
│   └── env.ts                    # Environment variable validation (Zod)
├── controllers/
│   └── auth.controller.ts        # HTTP request handlers for auth
├── services/
│   └── auth.service.ts           # Business logic for authentication
├── repositories/
│   └── user.repository.ts        # Data access for user documents
├── middleware/
│   └── errorHandler.ts           # Centralized error handling
├── routes/
│   └── auth.route.ts             # Express router configuration
├── types/
│   └── auth.types.ts             # TypeScript interfaces
├── utils/
│   └── AppError.ts               # Custom error class
├── lib/
│   ├── mongodb.ts                # MongoDB singleton client
│   ├── qdrant.ts                 # Qdrant singleton client
│   └── openrouter.ts             # OpenRouter (OpenAI) singleton client
└── index.ts                      # Application entry point
```

### Directory Responsibilities

| Directory       | Purpose                                    | Examples                                          |
| --------------- | ------------------------------------------ | ------------------------------------------------- |
| `config/`       | Configuration and environment setup        | `env.ts` - Zod validation of env vars             |
| `controllers/`  | HTTP layer - parse requests, call services | `auth.controller.ts` - login/register handlers    |
| `services/`     | Business logic - independent of transport  | `auth.service.ts` - password hashing, JWT signing |
| `repositories/` | Data access - CRUD operations              | `user.repository.ts` - MongoDB queries            |
| `middleware/`   | Cross-cutting concerns                     | `errorHandler.ts` - error formatting              |
| `routes/`       | Route definitions                          | `auth.route.ts` - Express Router setup            |
| `types/`        | TypeScript interfaces                      | `auth.types.ts` - IUser, AuthResponse             |
| `utils/`        | Generic helpers                            | `AppError.ts` - custom error class                |
| `lib/`          | External service clients                   | `mongodb.ts`, `qdrant.ts`, `openrouter.ts`        |

---

## Architectural Patterns

### 1. Layered Architecture

The application follows a strict **three-layer architecture**:

```
┌─────────────────────────────────────┐
│         HTTP Layer (Express)        │
│  ┌────────────────────────────────┐ │
│  │  Routes → Controllers          │ │  ← Request validation (Zod)
│  └────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Business Logic Layer        │
│  ┌────────────────────────────────┐ │
│  │  Services                      │ │  ← Password hashing, JWT, etc.
│  └────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Data Access Layer           │
│  ┌────────────────────────────────┐ │
│  │  Repositories                  │ │  ← MongoDB, Qdrant queries
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Singleton Pattern

Database clients use the **singleton pattern** to ensure single connections are reused:

```typescript
// lib/mongodb.ts
let client: MongoClient;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}
```

### 3. Error-First Approach

All async operations use try-catch with centralized error handling:

```typescript
// Controller catches errors and delegates to Express error handler
try {
  const result = await loginService(email, password);
  res.status(200).json(result);
} catch (err) {
  next(err); // Passed to errorHandler middleware
}
```

---

## Data Flow

### Complete Request/Response Lifecycle

#### Example: User Registration

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. HTTP POST /api/v1/register                                    │
│    Body: { "email": "user@example.com", "password": "Pass123" }  │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Express Middleware                                            │
│    - express.json() parses body                                  │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Router (routes/auth.route.ts)                                 │
│    - Matches POST /register → registerController                 │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Controller (controllers/auth.controller.ts)                   │
│    - Validates with Zod schema                                   │
│    - Throws AppError(400) if invalid                             │
│    - Calls registerService(email, password)                      │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Service (services/auth.service.ts)                            │
│    - Calls findUserByEmail(email)                                │
│    - Throws AppError(409) if duplicate                           │
│    - Hashes password with bcrypt                                 │
│    - Calls createUser(email, hash)                               │
│    - Signs JWT with user payload                                 │
│    - Returns AuthResponse                                        │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Repository (repositories/user.repository.ts)                  │
│    - getDb() → MongoDB connection                                │
│    - db.collection('users').findOne({ email })                   │
│    - db.collection('users').insertOne({ email, passwordHash })   │
│    - Returns WithId<IUser>                                       │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Controller Response                                           │
│    - res.status(201).json(response)                              │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. HTTP Response 201 Created                                     │
│    {                                                             │
│      "success": true,                                            │
│      "message": "Account created successfully.",                 │
│      "token": "eyJhbGci...",                                     │
│      "user": { "id": "...", "email": "user@example.com" }        │
│    }                                                             │
└──────────────────────────────────────────────────────────────────┘
```

#### Error Flow Example

```
┌──────────────────────────────────────────────────────────────────┐
│ POST /api/v1/register with duplicate email                      │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ Service: findUserByEmail() returns existing user                 │
│ → throw new AppError(409, "Email already exists")               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ Controller: catch (err) → next(err)                              │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ Middleware: errorHandler(err, req, res, next)                    │
│ - Checks if err instanceof AppError                              │
│ - res.status(409).json({ success: false, message: "..." })      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Controllers Layer

**Purpose**: Handle HTTP-specific concerns

**Responsibilities**:

- Parse and validate request body/params/query (Zod)
- Call appropriate service methods
- Map service responses to HTTP status codes
- Delegate errors to error handler via `next(err)`

**Example**:

```typescript
// controllers/auth.controller.ts
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate input
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, result.error.errors[0].message);
    }

    // 2. Call service
    const { email, password } = result.data;
    const response = await registerService(email, password);

    // 3. Return HTTP response
    res.status(201).json(response);
  } catch (err) {
    next(err); // Delegate to error handler
  }
}
```

**Key Points**:

- Controllers never contain business logic
- They are thin wrappers around services
- Always async and use try-catch with `next(err)`

---

### Services Layer

**Purpose**: Implement business logic

**Responsibilities**:

- Orchestrate multiple repository calls
- Apply business rules (password validation, duplicate checks)
- Hash passwords, sign JWTs, etc.
- Throw `AppError` for business rule violations
- Return structured data (not HTTP responses)

**Example**:

```typescript
// services/auth.service.ts
export async function registerService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  // Business Rule 1: No duplicate emails
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'Email already exists');
  }

  // Business Rule 2: Hash password before storage
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Business Rule 3: Create user
  const user = await createUser(email, passwordHash);

  // Business Rule 4: Generate JWT
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  return {
    success: true,
    message: 'Account created successfully.',
    token,
    user: { id: user._id.toString(), email: user.email },
  };
}
```

**Key Points**:

- Services are transport-agnostic (could be used by GraphQL, gRPC, CLI)
- They coordinate between repositories
- All business logic lives here

---

### Repositories Layer

**Purpose**: Abstract database operations

**Responsibilities**:

- Execute database queries (MongoDB, Qdrant)
- Create/update indexes
- Return typed results (`WithId<IUser>`, etc.)
- Handle database-specific errors
- No business logic

**Example**:

```typescript
// repositories/user.repository.ts
export async function findUserByEmail(
  email: string,
): Promise<WithId<IUser> | null> {
  const db = await getDb();
  return db.collection<IUser>('users').findOne({ email });
}

export async function createUser(
  email: string,
  passwordHash: string,
): Promise<WithId<IUser>> {
  const db = await getDb();
  const now = new Date();

  const user: IUser = {
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<IUser>('users').insertOne(user);
  return { _id: result.insertedId, ...user };
}
```

**Key Points**:

- Repositories are the **only** layer that knows about database structure
- They return domain objects, not database cursors
- Reusable across services

---

## Database Design

### MongoDB Collections

#### `users` Collection

```typescript
interface IUser {
  email: string; // Unique, indexed
  passwordHash: string; // bcrypt hash (12 rounds)
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
db.collection('users').createIndex({ email: 1 }, { unique: true });
```

**Why MongoDB?**

- Flexible schema for evolving user profiles
- Native JSON support
- Excellent Node.js driver
- Horizontal scalability

### Qdrant Collections (Planned)

```typescript
// Vector embeddings for memories
interface MemoryVector {
  id: string; // UUID
  vector: number[]; // 1536-dim embedding (OpenAI)
  payload: {
    userId: string;
    content: string;
    timestamp: Date;
    tags: string[];
  };
}
```

**Why Qdrant?**

- Purpose-built for vector similarity search
- High performance with large datasets
- Rich filtering capabilities
- REST API with TypeScript client

---

## Error Handling

### Error Hierarchy

```
Error (native)
  └─ AppError (custom)
       ├─ 400 - Validation errors
       ├─ 401 - Authentication failures
       ├─ 409 - Duplicate resources
       └─ 500 - Unexpected errors
```

### AppError Class

```typescript
// utils/AppError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Centralized Error Handler

```typescript
// middleware/errorHandler.ts
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    // Known operational error
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Unknown/programming error
  console.error('[ErrorHandler] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
```

**Registration in Express**:

```typescript
// index.ts
app.use('/api/v1', authRouter);
app.use(errorHandler); // Must be AFTER all routes
```

---

## Security Architecture

### 1. Password Security

- **Algorithm**: bcrypt
- **Salt Rounds**: 12 (2^12 iterations)
- **Storage**: Only hashes stored, never plaintext

```typescript
const passwordHash = await bcrypt.hash(password, 12);
const isMatch = await bcrypt.compare(password, user.passwordHash);
```

### 2. Authentication (JWT)

**Token Structure**:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "iat": 1673290381,
  "exp": 1673895181
}
```

**Signing**:

```typescript
const token = jwt.sign(
  { userId: user._id.toString(), email: user.email },
  env.JWT_SECRET,
  { expiresIn: '7d' },
);
```

### 3. User Enumeration Protection

Login and registration use **generic error messages** to prevent email enumeration:

```typescript
// ❌ BAD: Leaks information
if (!user) throw new AppError(401, 'User not found');
if (!isMatch) throw new AppError(401, 'Wrong password');

// ✅ GOOD: Generic message
if (!user || !isMatch) {
  throw new AppError(401, 'Invalid email or password');
}
```

### 4. Input Validation

**Defense in Depth**:

1. TypeScript compile-time type checking
2. Zod runtime schema validation
3. MongoDB schema constraints (unique indexes)

```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
});
```

---

## Extensibility

### Adding a New Endpoint

**1. Define Types** (`types/memory.types.ts`):

```typescript
export interface Memory {
  id: string;
  userId: string;
  content: string;
  embedding: number[];
}
```

**2. Create Repository** (`repositories/memory.repository.ts`):

```typescript
export async function createMemory(data: Memory): Promise<Memory> {
  // MongoDB + Qdrant insertion
}
```

**3. Create Service** (`services/memory.service.ts`):

```typescript
export async function uploadMemoryService(
  userId: string,
  content: string,
): Promise<Memory> {
  // Generate embedding via OpenRouter
  // Store in MongoDB + Qdrant
}
```

**4. Create Controller** (`controllers/memory.controller.ts`):

```typescript
export async function uploadMemoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { content } = req.body;
    const result = await uploadMemoryService(req.user.id, content);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
```

**5. Add Route** (`routes/memory.route.ts`):

```typescript
const router = Router();
router.post('/upload', authMiddleware, uploadMemoryController);
export default router;
```

**6. Register in Index** (`index.ts`):

```typescript
import memoryRouter from './routes/memory.route.js';
app.use('/api/v1/memories', memoryRouter);
```

---

## Deployment Architecture

### Development

```
┌─────────────┐
│   tsx watch │  ← Hot reload
└──────┬──────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  MongoDB    │    │   Qdrant    │    │  OpenRouter │
│  (local)    │    │   (local)   │    │   (cloud)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Production (Docker)

```
┌───────────────────────────────────────────┐
│  Docker Container (Multi-stage build)    │
│  ┌─────────────────────────────────────┐ │
│  │ Stage 1: Builder                    │ │
│  │  - npm ci                           │ │
│  │  - tsc (compile TS → JS)            │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ Stage 2: Runner                     │ │
│  │  - node dist/index.js               │ │
│  │  - Production node_modules only     │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

---

## Performance Considerations

### Database Connection Pooling

```typescript
// MongoDB driver handles pooling automatically
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
});
```

### Singleton Clients

All external connections use singletons to avoid connection overhead:

- ✅ `getMongoClient()` - Single MongoDB connection
- ✅ `getQdrantClient()` - Single Qdrant client
- ✅ `getOpenRouterClient()` - Single OpenAI client

### Index Optimization

```typescript
// Created at startup in index.ts
await ensureUserIndexes();

// Implemented in repository
export async function ensureUserIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
}
```

---

## Testing Architecture

The project uses a **bash-based integration test suite** (`test-routes.sh`) that:

1. Validates environment variables
2. Checks tool dependencies (curl, jq)
3. Tests server reachability
4. Executes 47 test cases covering all endpoints
5. Reports pass/fail with color-coded output

**Test Philosophy**:

- Integration tests over unit tests (test real behavior)
- Test happy paths AND error cases
- Validate HTTP status codes AND response structure
- Use real database (no mocking)

---

## Future Enhancements

### Planned Architectural Changes

1. **Fine-Grained Authorization Middleware** - Role- or permission-aware checks on top of JWT auth
2. **Rate Limiting** - Prevent abuse (e.g., express-rate-limit)
3. **Logging Layer** - Structured logging with Winston or Pino
4. **Caching Layer** - Redis for session/token management
5. **GraphQL API** - Alternative to REST
6. **WebSocket Support** - Real-time updates
7. **Event Sourcing** - Audit trail for all mutations

### Scalability Considerations

- **Horizontal Scaling**: Stateless design allows multiple server instances
- **Database Sharding**: MongoDB supports sharding by userId
- **CDN**: Static assets served from edge locations
- **Load Balancer**: NGINX or AWS ALB in front of app servers

---

## Conclusion

The NeuraMemory-AI server architecture prioritizes:

- **Maintainability** through clear separation of concerns
- **Type Safety** via TypeScript strict mode
- **Security** with bcrypt, JWT, and input validation
- **Testability** with layered architecture
- **Extensibility** through consistent patterns

This foundation supports both rapid iteration during development and reliable operation in production.
