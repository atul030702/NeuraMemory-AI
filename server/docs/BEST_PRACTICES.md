# Best Practices

This document outlines the coding standards, conventions, and best practices for the NeuraMemory-AI server. Following these guidelines ensures consistency, maintainability, and quality across the codebase.

## Table of Contents

- [General Principles](#general-principles)
- [TypeScript Guidelines](#typescript-guidelines)
- [Environment & Configuration](#environment--configuration)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Security](#security)
- [Asynchronous Code](#asynchronous-code)
- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [Logging](#logging)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Performance](#performance)
- [Documentation](#documentation)

---

## General Principles

### 1. TypeScript First

✅ **DO**: Leverage TypeScript's type system to catch errors at compile time.

```typescript
// Good: Explicit types
export async function findUserByEmail(
  email: string,
): Promise<WithId<IUser> | null> {
  const db = await getDb();
  return db.collection<IUser>('users').findOne({ email });
}
```

❌ **DON'T**: Use `any` or skip type annotations.

```typescript
// Bad: Loses type safety
export async function findUserByEmail(email: any): Promise<any> {
  const db = await getDb();
  return db.collection('users').findOne({ email });
}
```

### 2. Single Responsibility Principle

Each function/class/module should have **one reason to change**.

✅ **DO**: Separate concerns into focused functions.

```typescript
// Good: Each function has one responsibility
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function registerService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash);
  const token = await generateToken({ userId: user._id.toString(), email });
  // ...
}
```

❌ **DON'T**: Create monolithic functions that do everything.

```typescript
// Bad: Function does too many things
async function registerService(email: string, password: string) {
  const hash = await bcrypt.hash(password, 12);
  const db = await getDb();
  const user = await db
    .collection('users')
    .insertOne({ email, passwordHash: hash });
  const token = jwt.sign({ userId: user.insertedId }, 'hardcoded-secret');
  return { token, user };
}
```

### 3. Fail Fast

Validate inputs and configuration early to surface errors immediately.

✅ **DO**: Validate environment variables at startup.

```typescript
// config/env.ts
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1); // Fail fast
}
export const env = _env.data;
```

### 4. Immutability

Prefer `const` over `let`. Avoid mutating objects.

✅ **DO**: Use immutable patterns.

```typescript
// Good: Create new objects
const updatedUser = { ...user, updatedAt: new Date() };
```

❌ **DON'T**: Mutate existing objects.

```typescript
// Bad: Mutates the input
user.updatedAt = new Date();
```

---

## TypeScript Guidelines

### Strict Mode Configuration

Always use strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Interface vs Type

✅ **DO**: Use `interface` for object shapes (can be extended).

```typescript
// Good: Interface for extensible types
export interface IUser {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends IUser {
  _id: ObjectId;
}
```

✅ **DO**: Use `type` for unions, intersections, and primitives.

```typescript
// Good: Type for unions
export type AuthStatus = 'pending' | 'authenticated' | 'expired';

// Good: Type for intersections
export type AuthenticatedRequest = Request & { user: AuthPayload };
```

### Avoid `any`

❌ **DON'T**: Use `any` type.

```typescript
// Bad
function processData(data: any) {
  return data.value;
}
```

✅ **DO**: Use `unknown` and type guards, or define proper types.

```typescript
// Good: Type guard with unknown
function processError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Unknown error';
}
```

### Optional Chaining & Nullish Coalescing

✅ **DO**: Use modern operators for safer code.

```typescript
// Good: Safe property access
const userName = user?.profile?.name ?? 'Anonymous';

// Good: Nullish coalescing (only null/undefined, not falsy)
const port = env.PORT ?? 3000;
```

---

## Environment & Configuration

### Environment Variable Validation

✅ **DO**: Use Zod to validate all environment variables at startup.

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
});

const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
```

### Never Hardcode Secrets

❌ **DON'T**: Hardcode sensitive values.

```typescript
// Bad: Hardcoded secret
const token = jwt.sign(payload, 'my-secret-key');
```

✅ **DO**: Use environment variables.

```typescript
// Good: From validated env
const token = jwt.sign(payload, env.JWT_SECRET);
```

### Configuration Files

Keep `.env.example` updated with all required variables:

```env
# .env.example
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/neuramemory
JWT_SECRET=generate-a-random-32-char-string
```

---

## Validation

### Request Validation with Zod

✅ **DO**: Validate all incoming request data with Zod schemas.

```typescript
// controllers/auth.controller.ts
const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, result.error.errors[0].message);
    }

    const { email, password } = result.data; // Fully typed!
    // ...
  } catch (err) {
    next(err);
  }
}
```

### User-Friendly Error Messages

✅ **DO**: Provide clear, actionable error messages.

```typescript
// Good: Specific, helpful messages
z.string().min(8, 'Password must be at least 8 characters.');
z.string().email('Please provide a valid email address.');
```

❌ **DON'T**: Use technical jargon or vague messages.

```typescript
// Bad: Unhelpful messages
z.string().min(8, 'Invalid input');
z.string().email('Error');
```

---

## Error Handling

### Use Custom Error Classes

✅ **DO**: Create custom error classes with status codes.

```typescript
// utils/AppError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Centralized Error Handling

✅ **DO**: Use a single error handler middleware.

```typescript
// middleware/errorHandler.ts
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  console.error('[ErrorHandler] Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
```

### Always Use Try-Catch in Controllers

✅ **DO**: Wrap controller logic in try-catch.

```typescript
// Good: Error is caught and delegated
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await loginService(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err); // Pass to error handler
  }
}
```

❌ **DON'T**: Let errors crash the server.

```typescript
// Bad: Unhandled promise rejection
export async function loginController(req: Request, res: Response) {
  const result = await loginService(email, password); // May throw!
  res.status(200).json(result);
}
```

### Log Errors with Context

✅ **DO**: Log errors with sufficient context for debugging.

```typescript
// Good: Includes context
console.error('[AuthService] Registration failed:', {
  email,
  error: err instanceof Error ? err.message : String(err),
  stack: err instanceof Error ? err.stack : undefined,
});
```

---

## Security

### Password Security

✅ **DO**: Use bcrypt with sufficient salt rounds (≥12).

```typescript
// Good: Strong hashing
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

❌ **DON'T**: Use weak hashing algorithms or store plaintext.

```typescript
// Bad: Weak/no hashing
const passwordHash = crypto.createHash('md5').update(password).digest('hex');
const plainPassword = password; // Never!
```

### Prevent User Enumeration

✅ **DO**: Use generic error messages.

```typescript
// Good: Generic message
if (!user || !isMatch) {
  throw new AppError(401, 'Invalid email or password.');
}
```

❌ **DON'T**: Reveal whether email exists.

```typescript
// Bad: Leaks information
if (!user) {
  throw new AppError(404, 'Email not found');
}
if (!isMatch) {
  throw new AppError(401, 'Wrong password');
}
```

### JWT Best Practices

✅ **DO**: Sign with strong secret, set expiration.

```typescript
// Good: Secure JWT
const token = jwt.sign(
  { userId: user._id.toString(), email: user.email },
  env.JWT_SECRET, // Min 32 chars
  { expiresIn: '7d' },
);
```

❌ **DON'T**: Use weak secrets or infinite expiration.

```typescript
// Bad: Weak security
const token = jwt.sign(payload, 'secret'); // No expiration!
```

### Input Sanitization

✅ **DO**: Validate and sanitize all inputs.

```typescript
// Good: Strict validation
const emailSchema = z.string().email().toLowerCase(); // Normalize
const passwordSchema = z.string().min(8).max(128); // Limit length
```

### Rate Limiting (Planned)

```typescript
// TODO: Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later.',
});

app.post('/api/v1/login', loginLimiter, loginController);
```

---

## Asynchronous Code

### Always Use async/await

✅ **DO**: Use async/await for cleaner code.

```typescript
// Good: Clear async flow
async function registerService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError(409, 'Email exists');

  const hash = await bcrypt.hash(password, 12);
  const user = await createUser(email, hash);
  return formatAuthResponse(user);
}
```

❌ **DON'T**: Use callback hell or raw promises.

```typescript
// Bad: Callback hell
function registerService(email, password, callback) {
  findUserByEmail(email, (err, existing) => {
    if (err) return callback(err);
    if (existing) return callback(new Error('Email exists'));
    bcrypt.hash(password, 12, (err, hash) => {
      if (err) return callback(err);
      createUser(email, hash, callback);
    });
  });
}
```

### Handle Promise Rejections

✅ **DO**: Always catch or propagate errors.

```typescript
// Good: Error is handled
async function main() {
  try {
    await startServer();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}
```

### Avoid Blocking Operations

❌ **DON'T**: Use synchronous I/O in request handlers.

```typescript
// Bad: Blocks event loop
const data = fs.readFileSync('/path/to/file');
```

✅ **DO**: Use async alternatives.

```typescript
// Good: Non-blocking
const data = await fs.promises.readFile('/path/to/file');
```

---

## Code Organization

### Layered Architecture

Organize code into clear layers:

```
Controller → Service → Repository
```

✅ **DO**: Keep layers separate and focused.

```typescript
// Controller: HTTP concerns only
async function registerController(req, res, next) {
  const { email, password } = validateInput(req.body);
  const result = await registerService(email, password);
  res.status(201).json(result);
}

// Service: Business logic
async function registerService(email, password) {
  await checkDuplicateEmail(email);
  const hash = await hashPassword(password);
  return await createUser(email, hash);
}

// Repository: Data access
async function createUser(email, hash) {
  const db = await getDb();
  return db.collection('users').insertOne({ email, passwordHash: hash });
}
```

### File Naming

- **Controllers**: `<entity>.controller.ts` (e.g., `auth.controller.ts`)
- **Services**: `<entity>.service.ts` (e.g., `auth.service.ts`)
- **Repositories**: `<entity>.repository.ts` (e.g., `user.repository.ts`)
- **Types**: `<entity>.types.ts` (e.g., `auth.types.ts`)
- **Routes**: `<entity>.route.ts` (e.g., `auth.route.ts`)

### Module Exports

✅ **DO**: Use named exports for discoverability.

```typescript
// Good: Named exports
export function loginController() {}
export function registerController() {}
```

❌ **DON'T**: Overuse default exports.

```typescript
// Bad: Hard to refactor/discover
export default function () {}
```

---

## Naming Conventions

### Variables & Functions

- **Variables**: `camelCase`
- **Functions**: `camelCase` with verb prefix
- **Constants**: `UPPER_SNAKE_CASE` or `camelCase` for config

```typescript
// Good naming
const userName = 'John';
const MAX_RETRIES = 3;
const saltRounds = 12;

async function findUserByEmail(email: string) {}
async function createUser(data: IUser) {}
function validatePassword(password: string): boolean {}
```

### Types & Interfaces

- **Interfaces**: `IPrefix` or `PascalCase`
- **Types**: `PascalCase`
- **Enums**: `PascalCase`

```typescript
// Good naming
interface IUser {
  email: string;
}

type AuthResponse = {
  token: string;
  user: IUser;
};

enum UserRole {
  Admin = 'admin',
  User = 'user',
}
```

### Booleans

Prefix with `is`, `has`, `should`, `can`.

```typescript
// Good: Clear intent
const isAuthenticated = true;
const hasPermission = false;
const shouldRetry = checkCondition();
```

---

## Logging

### Structured Logging

✅ **DO**: Use structured logs with context.

```typescript
// Good: Structured with context
console.log('[MongoDB] Connection established', {
  database: 'neuramemory',
  collections: ['users', 'memories'],
});

console.error('[AuthService] Login failed', {
  email,
  reason: 'Invalid credentials',
  timestamp: new Date().toISOString(),
});
```

❌ **DON'T**: Use unstructured string concatenation.

```typescript
// Bad: Hard to parse
console.log(
  'MongoDB connected to neuramemory with collections: users, memories',
);
```

### Log Levels

Use appropriate log levels:

- **info**: Normal operations
- **warn**: Recoverable issues
- **error**: Errors requiring attention

```typescript
console.log('[Server] Starting on port 3000'); // Info
console.warn('[MongoDB] Connection slow (>5s)'); // Warning
console.error('[DB] Failed to connect:', err); // Error
```

### Never Log Sensitive Data

❌ **DON'T**: Log passwords, tokens, API keys.

```typescript
// Bad: Logs sensitive data
console.log('User login:', { email, password });
console.log('Token:', token);
```

✅ **DO**: Sanitize logs.

```typescript
// Good: Redacted
console.log('User login:', { email });
console.log('Token generated for user:', userId);
```

---

## Testing

### Test Coverage

Aim for comprehensive integration tests:

- ✅ Happy path scenarios
- ✅ Error cases (validation, auth, duplicates)
- ✅ Edge cases (malformed input, empty strings)
- ✅ Security scenarios (user enumeration, brute force)

### Test Naming

Use descriptive test names:

```bash
# Good: Clear what's being tested
TEST: Valid registration with strong password
TEST: Duplicate email registration should fail
TEST: Password without uppercase letter should fail
```

### Test Independence

Each test should be independent:

```bash
# Good: Each test creates its own user
TEST_EMAIL="test_${TIMESTAMP}@example.com"
```

---

## Git Workflow

### Commit Messages

Follow conventional commits:

```
feat: add user registration endpoint
fix: prevent duplicate email registration
docs: update API documentation
refactor: extract password hashing to service
test: add integration tests for login
chore: update dependencies
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

```
feature/memory-upload
fix/jwt-expiration
docs/api-endpoints
refactor/error-handling
```

---

## Performance

### Database Indexes

✅ **DO**: Create indexes on frequently queried fields.

```typescript
// Good: Index on unique email
await db.collection('users').createIndex({ email: 1 }, { unique: true });
```

### Use Singleton Clients

✅ **DO**: Reuse database connections.

```typescript
// Good: Singleton pattern
let client: MongoClient;

export async function getMongoClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}
```

❌ **DON'T**: Create new connections per request.

```typescript
// Bad: Connection per request
export async function getUser(id: string) {
  const client = new MongoClient(uri); // New connection!
  await client.connect();
  // ...
}
```

### Avoid N+1 Queries

Use aggregation or joins instead of loops:

```typescript
// Good: Single query
const usersWithMemories = await db.collection('users').aggregate([
  {
    $lookup: { from: 'memories', localField: '_id', foreignField: 'userId' },
  },
]);

// Bad: N+1 queries
const users = await db.collection('users').find().toArray();
for (const user of users) {
  user.memories = await db.collection('memories').find({ userId: user._id });
}
```

---

## Documentation

### Code Comments

✅ **DO**: Document **why**, not **what**.

```typescript
// Good: Explains reasoning
// Use generic error message to prevent email enumeration attacks
if (!user || !isMatch) {
  throw new AppError(401, 'Invalid email or password');
}
```

❌ **DON'T**: State the obvious.

```typescript
// Bad: Obvious from code
// Throw error if user not found
if (!user) throw new Error();
```

### JSDoc for Public APIs

```typescript
/**
 * Registers a new user account.
 *
 * @param email - User's email address (must be unique)
 * @param password - Plain text password (will be hashed with bcrypt)
 * @returns AuthResponse with JWT token and user data
 * @throws {AppError} 409 if email already exists
 * @throws {AppError} 400 if validation fails
 */
export async function registerService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  // ...
}
```

### Keep README Updated

Update documentation when:

- Adding new endpoints
- Changing environment variables
- Modifying deployment steps
- Updating dependencies

---

## Summary Checklist

Before committing code, verify:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Environment variables are validated with Zod
- [ ] All async operations use try-catch
- [ ] Errors use custom `AppError` class
- [ ] Passwords are hashed with bcrypt
- [ ] JWTs have expiration times
- [ ] Input validation uses Zod schemas
- [ ] Database operations use repositories
- [ ] No sensitive data in logs
- [ ] Tests pass (`./test.sh`)
- [ ] Documentation is updated

---

By following these best practices, we maintain a high-quality, secure, and maintainable codebase that scales with the project's growth.
