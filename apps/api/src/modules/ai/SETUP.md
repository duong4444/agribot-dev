# AI Module Setup Guide

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Cài đặt pgvector extension cho PostgreSQL
# Ubuntu/Debian:
sudo apt install postgresql-15-pgvector

# macOS (với Homebrew):
brew install pgvector

# Hoặc compile từ source:
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

### 2. Database Setup

```bash
# Connect to your database
psql -U postgres -d agri_chatbot

# Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Verify
\dx
```

### 3. Environment Variables

Thêm vào `.env`:

```env
# AI Services
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash-exp

# HuggingFace (optional - có fallback nếu không có)
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Database (đã có)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agri_chatbot
```

### 4. Run Migrations

```bash
# Tại thư mục apps/api
pnpm db:migrate

# Hoặc nếu dùng TypeORM CLI:
npx typeorm migration:run -d src/database/data-source.ts
```

### 5. Update App Module

Thêm `AIRefactoredModule` vào `app.module.ts`:

```typescript
import { AIRefactoredModule } from './modules/ai/ai-refactored.module';

@Module({
  imports: [
    // ... existing modules
    AIRefactoredModule,
  ],
})
export class AppModule {}
```

### 6. Start Server

```bash
pnpm dev
```

## 🧪 Testing

### Test 1: Health Check

```bash
curl http://localhost:3000/ai-refactored/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "AI Refactored",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Test 2: Intent Classification

```bash
curl "http://localhost:3000/ai-refactored/test/intent?query=doanh%20thu%20th%C3%A1ng%20n%C3%A0y" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 3: Chat Request

```bash
curl -X POST http://localhost:3000/ai-refactored/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "doanh thu tháng này là bao nhiêu?"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Doanh thu tháng này...",
  "data": {...},
  "metadata": {
    "intent": "financial_query",
    "layer": "action_router",
    "confidence": 0.9,
    "responseTime": 245
  }
}
```

## 📝 Sample Documents Upload (Optional)

### Create upload endpoint (TODO)

```typescript
@Post('documents/upload')
@UseInterceptors(FileInterceptor('file'))
async uploadDocument(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: User,
) {
  // Implementation needed
}
```

### Test với sample documents

Tạo file `sample-agriculture.txt`:

```txt
Cách chăm sóc cây cà chua:

1. Tưới nước: Tưới đều đặn 2 lần/ngày vào sáng sớm và chiều mát
2. Bón phân: Bón phân NPK 16-16-8 sau 2 tuần trồng
3. Phòng trừ sâu bệnh: Phun thuốc sinh học định kỳ
4. Thu hoạch: Sau 60-70 ngày kể từ khi trồng

Lưu ý: Cần theo dõi độ ẩm đất thường xuyên
```

## 🔍 Troubleshooting

### Lỗi: "pgvector extension not found"

**Solution**:
```bash
# Reinstall pgvector
sudo apt remove postgresql-15-pgvector
sudo apt install postgresql-15-pgvector

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Lỗi: "HUGGINGFACE_API_KEY not set"

**Solution**: 
- Đây chỉ là warning, hệ thống vẫn hoạt động với fallback embedding
- Để có performance tốt hơn, get API key tại: https://huggingface.co/settings/tokens

### Lỗi: "Gemini API error"

**Solution**:
- Check API key đúng format
- Verify model name: `gemini-2.0-flash-exp`
- Check quota tại: https://aistudio.google.com/

### Lỗi: Migration fails

**Solution**:
```bash
# Drop existing tables (CAREFUL - data loss!)
psql -U postgres -d agri_chatbot -c "DROP TABLE IF EXISTS document_chunks, documents CASCADE;"

# Rerun migration
pnpm db:migrate
```

## 📊 Verify Setup

### Check tables created:

```sql
-- Connect to database
psql -U postgres -d agri_chatbot

-- List tables
\dt

-- Should see:
-- documents
-- document_chunks

-- Check indexes
\di

-- Check extensions
\dx

-- Should see:
-- vector
-- uuid-ossp
```

### Check services running:

```bash
# In NestJS app logs, you should see:
# [AIOrchestrator] AI Orchestrator initialized
# [EmbeddingService] Embedding service initialized with model: sentence-transformers/...
# [GeminiService] Gemini service initialized successfully
```

## 🎯 Next Steps

1. ✅ Setup completed
2. 📄 Upload sample documents (optional - Phase 7)
3. 🤖 Test knowledge queries
4. 💰 Test business queries (doanh thu, chi phí)
5. 🌱 Test crop queries
6. 🔌 Integrate IoT (Phase 8)

## 📚 Documentation

- [Architecture Overview](./README-REFACTORED.md)
- [API Documentation](http://localhost:3000/api/docs) (Swagger)
- [Types Reference](./types/ai.types.ts)
- [Constants & Config](./constants/ai.constants.ts)

## 🆘 Support

Nếu gặp vấn đề:
1. Check logs: `tail -f logs/app.log`
2. Verify environment variables: `printenv | grep -E 'GEMINI|HUGGING|DATABASE'`
3. Test database connection: `psql $DATABASE_URL -c 'SELECT 1'`
4. Check API endpoint: `curl http://localhost:3000/ai-refactored/health`

---

**Setup Time**: ~15-20 phút
**Status**: Ready for production testing 🚀



