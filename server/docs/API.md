# API Documentation

This document provides comprehensive documentation for the NeuraMemory-AI API endpoints.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
- [Examples](#examples)
- [Status Codes](#status-codes)

---

## Overview

The NeuraMemory-AI API is a RESTful API that uses JSON for request and response payloads. All endpoints follow consistent patterns for success and error responses.

### API Version

Current version: **v1**

All endpoints are prefixed with `/api/v1`.

---

## Base URL

### Development

```
http://localhost:3000
```

### Production

```
https://api.neuramemory.ai
```

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. Tokens are returned upon successful registration or login and must be included in the `Authorization` header for protected endpoints.

### Authentication Flow

1. **Register** or **Login** to receive a JWT token
2. Include the token in subsequent requests:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Token Expiration

- Default expiration: **7 days**
- Configurable via `JWT_EXPIRES_IN` environment variable
- After expiration, users must login again to obtain a new token

---

## Response Format

All API responses follow a consistent JSON structure.

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Error Handling

The API uses standard HTTP status codes to indicate success or failure.

### Common Error Responses

#### 400 Bad Request

Returned when the request contains invalid or missing data.

```json
{
  "success": false,
  "message": "Please provide a valid email address."
}
```

#### 401 Unauthorized

Returned when authentication fails or credentials are invalid.

```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

#### 409 Conflict

Returned when attempting to create a resource that already exists.

```json
{
  "success": false,
  "message": "An account with this email already exists."
}
```

#### 500 Internal Server Error

Returned when an unexpected error occurs on the server.

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

**Status**: Planned (not yet implemented)

Rate limiting will be applied to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **General endpoints**: 100 requests per 15 minutes per user

When rate limited, the API will return:

```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

**HTTP Status**: `429 Too Many Requests`

---

## Endpoints

### Authentication Endpoints

#### POST `/api/v1/register`

Register a new user account.

**Request Body**

| Field      | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `email`    | string | Yes      | Valid email address                           |
| `password` | string | Yes      | Password (min 8 chars, 1 uppercase, 1 number) |

**Password Requirements**

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Success Response** (`201 Created`)

```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTg3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzAzMjkwMzgxLCJleHAiOjE3MDM4OTUxODF9.signature",
  "user": {
    "id": "6587f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses**

| Status | Message                                                | Condition                |
| ------ | ------------------------------------------------------ | ------------------------ |
| `400`  | "Please provide a valid email address."                | Invalid email format     |
| `400`  | "Password must be at least 8 characters."              | Password too short       |
| `400`  | "Password must contain at least one uppercase letter." | Missing uppercase        |
| `400`  | "Password must contain at least one number."           | Missing number           |
| `409`  | "An account with this email already exists."           | Email already registered |

---

#### POST `/api/v1/login`

Authenticate an existing user and receive a JWT token.

**Request Body**

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| `email`    | string | Yes      | Registered email address |
| `password` | string | Yes      | Account password         |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Success Response** (`200 OK`)

```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTg3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzAzMjkwMzgxLCJleHAiOjE3MDM4OTUxODF9.signature",
  "user": {
    "id": "6587f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses**

| Status | Message                                 | Condition                           |
| ------ | --------------------------------------- | ----------------------------------- |
| `400`  | "Please provide a valid email address." | Invalid email format                |
| `400`  | "Password is required."                 | Missing password                    |
| `401`  | "Invalid email or password."            | Wrong credentials or user not found |

**Security Note**: The error message is intentionally generic ("Invalid email or password") for both non-existent users and wrong passwords to prevent email enumeration attacks.

---

## Planned Endpoints

The following endpoints are planned for future releases:

### Memory Management

#### POST `/api/v1/memories`

Upload a new memory/note to the system.

#### GET `/api/v1/memories`

Retrieve all memories for the authenticated user.

#### GET `/api/v1/memories/:id`

Retrieve a specific memory by ID.

#### DELETE `/api/v1/memories/:id`

Delete a specific memory.

### Search

#### POST `/api/v1/search`

Perform semantic search across user's memories using natural language queries.

### User Management

#### GET `/api/v1/user/profile`

Get the authenticated user's profile.

#### PATCH `/api/v1/user/profile`

Update user profile information.

#### DELETE `/api/v1/user/account`

Delete user account and all associated data.

---

## Examples

### Complete Registration and Login Flow

#### Step 1: Register a New Account

```bash
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "MySecure123"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6587f1f77bcf86cd799439011",
    "email": "alice@example.com"
  }
}
```

#### Step 2: Login with Existing Account

```bash
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "MySecure123"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6587f1f77bcf86cd799439011",
    "email": "alice@example.com"
  }
}
```

#### Step 3: Use Token for Protected Endpoints (Future)

```bash
curl -X GET http://localhost:3000/api/v1/memories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Error Handling Examples

#### Invalid Email Format

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "SecurePass123"
  }'
```

**Response** (`400`):

```json
{
  "success": false,
  "message": "Please provide a valid email address."
}
```

#### Weak Password

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "weak"
  }'
```

**Response** (`400`):

```json
{
  "success": false,
  "message": "Password must be at least 8 characters."
}
```

#### Duplicate Email

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "SecurePass123"
  }'
```

**Response** (`409`):

```json
{
  "success": false,
  "message": "An account with this email already exists."
}
```

#### Invalid Credentials

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "WrongPassword123"
  }'
```

**Response** (`401`):

```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

---

## Status Codes

The API uses standard HTTP status codes:

| Code  | Meaning               | Usage                             |
| ----- | --------------------- | --------------------------------- |
| `200` | OK                    | Successful request (general)      |
| `201` | Created               | Resource created successfully     |
| `400` | Bad Request           | Invalid input or validation error |
| `401` | Unauthorized          | Authentication failed or missing  |
| `403` | Forbidden             | Authenticated but not authorized  |
| `404` | Not Found             | Resource does not exist           |
| `409` | Conflict              | Resource already exists           |
| `429` | Too Many Requests     | Rate limit exceeded               |
| `500` | Internal Server Error | Unexpected server error           |

---

## JWT Token Structure

The JWT token returned by `/register` and `/login` contains the following payload:

```json
{
  "userId": "6587f1f77bcf86cd799439011",
  "email": "user@example.com",
  "iat": 1703290381,
  "exp": 1703895181
}
```

| Field    | Description                  |
| -------- | ---------------------------- |
| `userId` | MongoDB ObjectId of the user |
| `email`  | User's email address         |
| `iat`    | Issued at timestamp (Unix)   |
| `exp`    | Expiration timestamp (Unix)  |

**Decode Token**: You can decode the token at [jwt.io](https://jwt.io) to inspect the payload.

---

## Security Considerations

### HTTPS

**Production**: Always use HTTPS to encrypt data in transit.

```
https://api.neuramemory.ai/api/v1/...
```

### Token Storage

**Client-side**: Store JWT tokens securely:

- ✅ **DO**: Use `httpOnly` cookies (recommended)
- ✅ **DO**: Use `localStorage` with XSS protection
- ❌ **DON'T**: Store in plain text or unencrypted storage

### Password Policy

- Minimum 8 characters
- Must contain uppercase letter
- Must contain number
- No maximum length enforced (within reason)
- No special character requirement (avoids user frustration)

### Email Enumeration Protection

The API uses generic error messages to prevent attackers from determining which emails are registered:

- Login failure: "Invalid email or password" (not "Email not found")
- Registration conflict: Generic message (doesn't reveal existing accounts)

---

## Testing

Use the provided test suite to validate API behavior:

```bash
# Run all tests
./test.sh

# Test specific endpoint
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

---

## Support

For issues or questions:

- **GitHub Issues**: [https://github.com/Gautam7352/NeuraMemory-AI/issues](https://github.com/Gautam7352/NeuraMemory-AI/issues)
- **Documentation**: See `/server/docs` directory

---

## Changelog

### v1.0.0 (Current)

- ✅ POST `/api/v1/register` - User registration
- ✅ POST `/api/v1/login` - User authentication
- ✅ JWT token generation
- ✅ Password hashing with bcrypt
- ✅ Input validation with Zod

### Future Releases

- 🚧 Memory upload and retrieval
- 🚧 Semantic search
- 🚧 Protected route middleware
- 🚧 Rate limiting
- 🚧 User profile management
