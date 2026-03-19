# Docker Quick Start Guide

Get NeuraMemory-AI running in under 5 minutes.

## 🚀 Quick Setup

### Production (Default)

```bash
# 1. Clone and enter directory
git clone https://github.com/Gautam7352/NeuraMemory-AI.git
cd NeuraMemory-AI

# 2. Configure environment
cp server/.env.example server/.env
nano server/.env  # Add your JWT_SECRET and OPENROUTER_API_KEY

# 3. Start everything
docker compose up -d

# 4. Verify it's running
docker compose ps
```

**Access**: http://localhost:5173 (Frontend) | http://localhost:3000 (API)

### Development (Hot Reload)

```bash
# Start with live reloading
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use the Makefile shortcut
make dev
```

---

## 📦 Using the Makefile

The project includes a Makefile with shortcuts for common tasks:

```bash
# See all available commands
make help

# Production
make up          # Start production
make down        # Stop production
make logs        # View logs
make rebuild     # Rebuild and restart

# Development
make dev         # Start dev mode (with logs)
make dev-up      # Start dev mode (detached)
make dev-down    # Stop dev mode
make dev-logs    # View dev logs

# Database only
make db-start    # Start MongoDB + Qdrant
make db-stop     # Stop databases

# Testing
make test        # Run API tests
make lint-server # Run linter

# Utilities
make shell-server  # Open server shell
make mongo-shell   # Open MongoDB shell
make backup-mongo  # Backup database
make info          # Show service info
make endpoints     # List all URLs
```

---

## 🔧 Common Commands

### Starting & Stopping

```bash
# Production
docker compose up -d                    # Start (detached)
docker compose down                     # Stop

# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Viewing Logs

```bash
docker compose logs -f              # All services
docker compose logs -f server       # Server only
docker compose logs --tail=50       # Last 50 lines
```

### Rebuilding

```bash
docker compose up -d --build        # Rebuild and start
docker compose build --no-cache     # Force rebuild
```

---

## 🌐 Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| API | http://localhost:3000 | Backend REST API |
| MongoDB | mongodb://localhost:27017 | Database |
| Qdrant | http://localhost:6333 | Vector database |
| Qdrant UI | http://localhost:6333/dashboard | Admin interface |

---

## 🧪 Testing the Setup

```bash
# Test API registration
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Run full test suite
cd server && ./test.sh

# Or using Make
make test
```

---

## ⚙️ Environment Variables

**Required** in `server/.env`:

```env
JWT_SECRET=your-secret-at-least-32-characters-long
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
MONGODB_URI=mongodb://mongodb:27017/neuramemory
QDRANT_URL=http://qdrant:6333
```

**Generate strong JWT secret**:
```bash
openssl rand -base64 48
```

**Verify configuration**:
```bash
make check-env
```

---

## 🐛 Quick Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Container Won't Start

```bash
# Check logs
docker compose logs server

# Common issues:
# - Missing JWT_SECRET → Add to .env
# - MongoDB not ready → Wait 10s and retry
# - Port conflict → See "Port Already in Use"
```

### Database Connection Failed

```bash
# Check MongoDB is running
docker compose ps mongodb

# Test connection
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Restart if needed
docker compose restart mongodb
```

### Hot Reload Not Working

```bash
# Ensure using dev compose file
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or
make dev
```

### Reset Everything

```bash
# ⚠️ Deletes all data
docker compose down -v
docker compose up -d --build
```

---

## 📂 Project Structure

```
NeuraMemory-AI/
├── docker-compose.yml          # Base production config
├── docker-compose.dev.yml      # Development overrides
├── Makefile                    # Command shortcuts
├── server/
│   ├── Dockerfile
│   ├── .env                    # Your config (not in git)
│   ├── .env.example            # Template
│   └── test.sh                 # API test suite
└── client/
    └── Dockerfile
```

---

## 🔄 Development vs Production

| Aspect | Production | Development |
|--------|-----------|-------------|
| **Start Command** | `make up` or `docker compose up -d` | `make dev` or use `-f` flags |
| **Auto-Reload** | ❌ No | ✅ Yes (tsx watch + Vite HMR) |
| **Source Maps** | ❌ No | ✅ Yes |
| **Debug Port** | ❌ No | ✅ Port 9229 |
| **Build** | Optimized multi-stage | Builder stage only |
| **Volumes** | None (code in image) | Mounted source files |

---

## 📚 More Resources

- **Full Docker Guide**: [DOCKER.md](DOCKER.md)
- **API Documentation**: [server/docs/API.md](server/docs/API.md)
- **Architecture**: [server/docs/ARCHITECTURE.md](server/docs/ARCHITECTURE.md)
- **Main README**: [README.md](README.md)

---

## 🆘 Still Having Issues?

1. Check [DOCKER.md](DOCKER.md) troubleshooting section
2. View logs: `make logs` or `docker compose logs -f`
3. Open an issue: https://github.com/Gautam7352/NeuraMemory-AI/issues

---

## 🎯 Quick Reference Card

```bash
# Start
make up              # Production
make dev             # Development

# Stop
make down            # Stop all

# Monitor
make logs            # View logs
make ps              # Check status
make info            # Full info

# Test
make test            # Run tests
make endpoints       # Show URLs

# Clean
make clean           # Remove containers
make clean-volumes   # ⚠️  + delete data
```

**That's it! You're ready to go.** 🚀