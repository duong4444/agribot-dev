# 📝 AgriBot System - Critical Setup & Runtime Notes

> **Cập nhật**: 2025-01-07  
> **Mục đích**: Tài liệu quan trọng về setup, dependencies, và runtime requirements

---

## 🚨 CRITICAL REQUIREMENTS

### **Yêu cầu tối thiểu để chạy ứng dụng:**

#### ✅ **REQUIRED (Bắt buộc):**
1. Node.js >= 18.0.0
2. PostgreSQL 15+ **với pgvector extension**
3. pnpm >= 8.0.0
4. Gemini API Key (cho AI chatbot)

#### 🟡 **OPTIONAL (Tùy chọn):**
1. HuggingFace API Key (có fallback nếu không có)
2. Redis (cho caching)
3. Mosquitto MQTT Broker (cho IoT - chưa implement)

---

## 🔑 ENVIRONMENT VARIABLES

### **Priority 1: BẮT BUỘC phải có**

```env
# Database - CRITICAL
DATABASE_URL=postgresql://postgres:password@localhost:5432/agri_chatbot

# Authentication - CRITICAL
NEXTAUTH_SECRET=your-random-secret-min-32-chars
JWT_SECRET=your-jwt-secret-min-32-chars

# AI - CRITICAL cho chatbot
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

**⚠️ Không có những env này → App sẽ CRASH hoặc không hoạt động**

---

### **Priority 2: RECOMMENDED (Nên có)**

```env
# AI Embeddings - Có fallback nhưng performance kém
HUGGINGFACE_API_KEY=your-huggingface-key

# Frontend URL
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
```

**⚠️ Không có → Vẫn chạy nhưng một số tính năng bị giới hạn**

---

### **Priority 3: OPTIONAL (Tùy chọn)**

```env
# Redis Cache
REDIS_URL=redis://localhost:6379

# MQTT (IoT - chưa implement)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Google OAuth (nếu dùng)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email (nếu dùng)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Vector Database alternatives (nếu không dùng pgvector)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
WEAVIATE_URL=http://localhost:8080
```

**✅ Không có → Không ảnh hưởng core functionality**

---

## 🗄️ DATABASE SETUP ORDER

### **Bước 1: Install PostgreSQL Extensions**

```sql
-- CRITICAL: Phải chạy TRƯỚC khi run migrations
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
\dx
-- Phải thấy: vector, uuid-ossp
```

**⚠️ Nếu không có pgvector:**
```bash
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# macOS
brew install pgvector

# Verify
psql -d agri_chatbot -c "CREATE EXTENSION vector;"
```

---

### **Bước 2: Run Migrations**

```bash
# Từ thư mục apps/api
pnpm db:migrate

# hoặc
npx typeorm migration:run -d src/database/data-source.ts
```

**Expected Tables:**
- ✅ users
- ✅ farms
- ✅ crops
- ✅ activities
- ✅ expenses
- ✅ conversations
- ✅ messages
- ✅ documents (AI refactored)
- ✅ document_chunks (AI refactored)

**Verify:**
```sql
\dt
-- Phải thấy tất cả tables trên
```

---

## 🔄 SERVICE STARTUP ORDER

### **Backend Services (apps/api):**

#### **Phase 1: Core Services (Khởi động đầu tiên)**

```
1. ConfigModule → Load .env
   └─ CRITICAL: Tất cả services phụ thuộc vào config
   
2. DatabaseModule → Connect PostgreSQL
   └─ CRITICAL: Kiểm tra pgvector extension
   
3. TypeOrmModule → Initialize entities
   └─ CRITICAL: Load all entity schemas
```

**Check:**
```bash
# Logs phải có:
# ✓ Config loaded
# ✓ Database connected
# ✓ TypeORM initialized
```

---

#### **Phase 2: Auth & User Services**

```
4. JwtModule → JWT token handling
5. PassportModule → Authentication strategies
6. UsersModule → User CRUD
7. AuthModule → Login/Register
   └─ Dependency: UsersModule, JwtModule
```

**Check:**
```bash
POST /auth/register
POST /auth/login
# Phải hoạt động trước khi test các module khác
```

---

#### **Phase 3: Business Logic Services**

```
8. FarmModule → Farm CRUD
   └─ Dependency: UsersModule
   
9. ChatModule → Chat functionality
   └─ Dependency: UsersModule, AIModule
```

---

#### **Phase 4: AI Services (Refactored)**

```
10. GeminiService → Initialize Gemini client
    └─ CRITICAL: Check GEMINI_API_KEY
    
11. EmbeddingService → Initialize HuggingFace
    └─ OPTIONAL: Check HUGGINGFACE_API_KEY
    └─ Fallback nếu không có
    
12. AIRefactoredModule → Full AI pipeline
    └─ Dependency: GeminiService, EmbeddingService, FarmModule
    
    Sub-services:
    ├─ PreprocessingService
    ├─ IntentClassifierService
    ├─ EntityExtractorService
    ├─ ExactMatchService (cần database)
    ├─ VectorSearchService (cần pgvector)
    ├─ RAGService
    ├─ LLMFallbackService
    ├─ ActionRouterService
    └─ AIOrchestrator (main entry point)
```

**Check:**
```bash
GET /ai-refactored/health
# Expected: { status: 'ok' }
```

---

### **Frontend Services (apps/web):**

```
1. NextAuth → Authentication
   └─ CRITICAL: NEXTAUTH_URL, NEXTAUTH_SECRET
   
2. React Query → API caching
3. Socket.IO Client → Real-time chat (optional)
4. App Router → Routing
```

---

## ⚠️ COMMON STARTUP ERRORS & SOLUTIONS

### **Error 1: "pgvector extension not found"**

**Symptom:**
```
ERROR: type "vector" does not exist
```

**Solution:**
```bash
# Install pgvector
sudo apt install postgresql-15-pgvector

# Restart PostgreSQL
sudo systemctl restart postgresql

# Connect and create extension
psql -d agri_chatbot -c "CREATE EXTENSION vector;"
```

---

### **Error 2: "Gemini API key invalid"**

**Symptom:**
```
ERROR: Failed to initialize Gemini service
```

**Solution:**
```bash
# Check API key
echo $GEMINI_API_KEY

# Get new key at: https://aistudio.google.com/

# Update .env
GEMINI_API_KEY=AIza...
```

---

### **Error 3: "Database connection failed"**

**Symptom:**
```
ERROR: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Verify connection
psql -U postgres -d agri_chatbot -c "SELECT 1"
```

---

### **Error 4: "TypeORM migrations not run"**

**Symptom:**
```
ERROR: relation "users" does not exist
```

**Solution:**
```bash
cd apps/api
pnpm db:migrate
```

---

### **Error 5: "NEXTAUTH_SECRET missing"**

**Symptom:**
```
[next-auth] ERROR: NEXTAUTH_SECRET is not set
```

**Solution:**
```bash
# Generate random secret
openssl rand -base64 32

# Add to .env
NEXTAUTH_SECRET=generated-secret-here
```

---

## 🧪 HEALTH CHECK SEQUENCE

### **Để verify system hoạt động đúng:**

```bash
# 1. Database
psql -d agri_chatbot -c "SELECT 1"
# Expected: (1 row)

# 2. Extensions
psql -d agri_chatbot -c "\dx"
# Expected: vector, uuid-ossp

# 3. Tables
psql -d agri_chatbot -c "\dt"
# Expected: 9+ tables

# 4. Backend Health
curl http://localhost:3000/health
# Expected: { status: 'ok' }

# 5. AI Health
curl http://localhost:3000/ai-refactored/health
# Expected: { status: 'ok', service: 'AI Refactored' }

# 6. Frontend
curl http://localhost:3001
# Expected: HTML response

# 7. Auth
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test"}'
# Expected: 201 Created
```

---

## 🚀 STARTUP CHECKLIST

### **Pre-deployment:**

- [ ] PostgreSQL installed & running
- [ ] pgvector extension installed
- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] .env file created with all CRITICAL vars
- [ ] Database created
- [ ] Extensions created (vector, uuid-ossp)
- [ ] Migrations run successfully

### **First-time setup:**

```bash
# 1. Clone & Install
git clone <repo>
cd ex
pnpm install

# 2. Database
psql -U postgres -c "CREATE DATABASE agri_chatbot"
psql -d agri_chatbot -c "CREATE EXTENSION vector"
psql -d agri_chatbot -c "CREATE EXTENSION \"uuid-ossp\""

# 3. Environment
cp env.example .env
# Edit .env with your values

# 4. Migrate
cd apps/api
pnpm db:migrate

# 5. Start
cd ../..
pnpm dev
```

### **Daily startup:**

```bash
# 1. Check services
sudo systemctl status postgresql

# 2. Start app
pnpm dev

# 3. Verify
# - Backend: http://localhost:3000/health
# - Frontend: http://localhost:3001
# - AI: http://localhost:3000/ai-refactored/health
```

---

## 🔍 MODULE DEPENDENCIES GRAPH

```
AppModule (root)
├── ConfigModule (global) ★ MUST START FIRST
│
├── DatabaseModule ★ MUST START SECOND
│   └── TypeOrmModule
│       └── pgvector extension ★ REQUIRED
│
├── AuthModule
│   ├── UsersModule
│   ├── JwtModule
│   └── PassportModule
│
├── FarmModule
│   └── UsersModule
│
├── ChatModule
│   ├── UsersModule
│   └── AIRefactoredModule
│
└── AIRefactoredModule ★ COMPLEX DEPENDENCIES
    ├── GeminiService ★ Requires GEMINI_API_KEY
    ├── EmbeddingService (optional HF key)
    ├── FarmModule (for action router)
    └── TypeOrmModule
        ├── Document entity
        └── DocumentChunk entity
            └── pgvector ★ REQUIRED
```

---

## 📊 RESOURCE REQUIREMENTS

### **Minimum (Development):**
- RAM: 2GB
- CPU: 2 cores
- Disk: 10GB
- Network: Internet for AI APIs

### **Recommended (Development):**
- RAM: 4GB
- CPU: 4 cores
- Disk: 20GB
- Network: Stable internet

### **Production (Estimated):**
- RAM: 8GB
- CPU: 4-8 cores
- Disk: 50GB+
- Network: High-speed, low-latency

---

## 🔐 SECURITY CHECKLIST

### **Before Production:**

- [ ] Change all default passwords
- [ ] Generate strong NEXTAUTH_SECRET (32+ chars)
- [ ] Generate strong JWT_SECRET (32+ chars)
- [ ] Enable HTTPS
- [ ] Set CORS properly
- [ ] Enable rate limiting
- [ ] Validate all environment variables
- [ ] Encrypt database backups
- [ ] Use secret management (not .env in production)
- [ ] Enable database SSL
- [ ] Set up monitoring & alerts

---

## 🐛 DEBUG MODE

### **Enable verbose logging:**

```env
# .env
NODE_ENV=development
LOG_LEVEL=debug
```

### **Check logs:**

```bash
# NestJS logs
tail -f logs/app.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# System logs
journalctl -u postgresql -f
```

---

## 📞 TROUBLESHOOTING CONTACTS

### **Common Issues & Where to Look:**

| Issue | Check | File/Service |
|-------|-------|--------------|
| Database error | PostgreSQL logs | `database.config.ts` |
| AI not working | Gemini/HF API key | `gemini.service.ts`, `.env` |
| Auth failed | JWT config | `jwt.config.ts`, `auth.module.ts` |
| Embedding error | pgvector extension | `embedding.service.ts`, DB |
| Migration failed | Database state | `migrations/` folder |

---

## 🎯 QUICK REFERENCE

### **Important URLs (Local Dev):**

```
Backend API: http://localhost:3000
Frontend: http://localhost:3001
Swagger Docs: http://localhost:3000/api/docs
AI Health: http://localhost:3000/ai-refactored/health
```

### **Important Commands:**

```bash
# Start everything
pnpm dev

# Start backend only
cd apps/api && pnpm dev

# Start frontend only
cd apps/web && pnpm dev

# Database migration
cd apps/api && pnpm db:migrate

# Check types
pnpm type-check

# Lint
pnpm lint
```

### **Important Files:**

```
Environment: .env (root)
Database Config: apps/api/src/common/config/database.config.ts
AI Config: apps/api/src/modules/ai/constants/ai.constants.ts
Migrations: apps/api/src/database/migrations/
```

---

## 🔄 UPDATE HISTORY

| Date | Change | Impact |
|------|--------|--------|
| 2025-01-07 | AI Module Refactored | New AI services, need pgvector |
| - | Initial Setup | Base system |

---

## ✅ FINAL VERIFICATION

**Before considering system "ready":**

```bash
# Run this verification script
./scripts/verify-setup.sh

# Or manual checks:
✓ PostgreSQL running
✓ pgvector installed
✓ All .env vars set
✓ Migrations completed
✓ Backend starts without errors
✓ Frontend starts without errors
✓ Can login/register
✓ AI health check passes
✓ Can create farm
✓ Can send chat message
```

---

## 🆘 EMERGENCY CONTACTS

**If completely stuck:**

1. Check this file first
2. Check `SETUP.md` in `apps/api/src/modules/ai/`
3. Check `README-REFACTORED.md` for AI details
4. Check `AI_REFACTOR_SUMMARY.md` for overview
5. Check logs in `/logs` folder
6. Google the exact error message
7. Check GitHub Issues

---

**Last Updated**: 2025-01-07  
**Maintained By**: Development Team  
**Status**: ✅ Production Ready (AI Refactored)

