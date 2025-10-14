# 🐍 Python AI Service Setup Instruction

## 📋 Tổng quan

Hướng dẫn chi tiết setup Python AI Service sử dụng PhoBERT cho Intent Classification và NER.

## 🎯 Mục tiêu

- ✅ Chạy Python service riêng ở port 8000
- ✅ Sử dụng model `vinai/phobert-base`
- ✅ Xử lý Intent Classification và NER
- ✅ NestJS gửi text → Python service → Trả kết quả

## 🛠️ Bước 1: Cài đặt Python

### Windows:
```bash
# Download Python 3.11+ từ https://python.org
# Hoặc sử dụng Chocolatey:
choco install python

# Hoặc sử dụng winget:
winget install Python.Python.3.11
```

### Kiểm tra Python:
```bash
python --version
# Kết quả: Python 3.11.x
```

## 🛠️ Bước 2: Cài đặt pip và virtual environment

```bash
# Cài đặt pip (thường có sẵn với Python)
pip --version

# Cài đặt virtualenv
pip install virtualenv
```

## 🛠️ Bước 3: Tạo Virtual Environment

```bash
# Di chuyển vào thư mục Python service
cd apps/python-ai-service

# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Kiểm tra (sẽ thấy (venv) ở đầu dòng)
```

## 🛠️ Bước 4: Cài đặt Dependencies

```bash
# Đảm bảo đang trong virtual environment
# (venv) C:\Users\ADMIN\Desktop\ex\apps\python-ai-service>

# Cài đặt dependencies
pip install -r requirements.txt

# Kiểm tra cài đặt
pip list
```

## 🛠️ Bước 5: Cài đặt PyTorch (nếu cần)

```bash
# CPU version (đủ cho development)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# GPU version (nếu có NVIDIA GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## 🛠️ Bước 6: Test Python Service

### 6.1: Chạy service
```bash
# Đảm bảo đang trong virtual environment
cd apps/python-ai-service
python src/main.py
```

### 6.2: Test API
```bash
# Mở terminal mới, test API
curl http://localhost:8000/
curl http://localhost:8000/health

# Test intent classification
curl -X POST http://localhost:8000/intent/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "doanh thu tháng này là bao nhiêu?"}'

# Test NER
curl -X POST http://localhost:8000/ner/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "tôi trồng cà chua ở luống A"}'

# Test combined
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "doanh thu tháng này là bao nhiêu?"}'
```

## 🛠️ Bước 7: Cấu hình NestJS

### 7.1: Thêm environment variable
```bash
# Trong file .env
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

### 7.2: Test NestJS integration
```bash
# Chạy NestJS
cd apps/api
pnpm dev

# Test API
curl -X POST http://localhost:3001/ai-refactored/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "doanh thu tháng này là bao nhiêu?"}'
```

## 🐳 Bước 8: Docker Setup (Optional)

### 8.1: Build Docker image
```bash
# Từ root directory
docker build -t agri-python-ai ./apps/python-ai-service
```

### 8.2: Run với Docker Compose
```bash
# Chạy tất cả services
docker-compose up python-ai-service

# Hoặc chạy tất cả
docker-compose up
```

## 🔧 Troubleshooting

### Lỗi 1: "Module not found"
```bash
# Đảm bảo đang trong virtual environment
# Kiểm tra Python path
python -c "import sys; print(sys.path)"

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Lỗi 2: "CUDA not available"
```bash
# Sử dụng CPU version
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Lỗi 3: "Port 8000 already in use"
```bash
# Tìm process sử dụng port 8000
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F

# Hoặc đổi port trong main.py
```

### Lỗi 4: "Model loading failed"
```bash
# Kiểm tra internet connection
# Model sẽ download lần đầu
# Có thể mất vài phút
```

## 📊 Performance Tips

### 1. Model Loading
- Lần đầu chạy sẽ download model (~500MB)
- Subsequent runs sẽ nhanh hơn
- Model được cache trong `~/.cache/huggingface/`

### 2. Memory Usage
- Base PhoBERT: ~500MB RAM
- Fine-tuned: ~600MB RAM
- GPU: ~1GB VRAM

### 3. Response Time
- First request: ~2-3 seconds (model loading)
- Subsequent: ~200-500ms

## 🎯 Production Setup

### 1. Environment Variables
```bash
# .env
PYTHON_AI_SERVICE_URL=http://localhost:8000
PYTHON_AI_TIMEOUT=10000
PYTHON_AI_RETRY_ATTEMPTS=3
```

### 2. Process Management
```bash
# Sử dụng PM2 cho production
npm install -g pm2

# Start service
pm2 start "python src/main.py" --name python-ai-service

# Monitor
pm2 status
pm2 logs python-ai-service
```

### 3. Nginx Reverse Proxy
```nginx
# nginx.conf
upstream python_ai {
    server localhost:8000;
}

server {
    listen 80;
    location /python-ai/ {
        proxy_pass http://python_ai/;
    }
}
```

## 📚 API Documentation

### Endpoints:

#### 1. Health Check
```http
GET /health
Response: {"status": "healthy", "intent_classifier": true, "ner_extractor": true}
```

#### 2. Intent Classification
```http
POST /intent/classify
Body: {"text": "doanh thu tháng này là bao nhiêu?", "top_k": 3}
Response: {"intent": "financial_query", "confidence": 0.92, ...}
```

#### 3. NER Extraction
```http
POST /ner/extract
Body: {"text": "tôi trồng cà chua ở luống A"}
Response: {"entities": [{"type": "crop_name", "value": "cà chua", ...}]}
```

#### 4. Combined Analysis
```http
POST /analyze
Body: {"text": "doanh thu tháng này là bao nhiêu?", "top_k": 3}
Response: {"intent": "financial_query", "entities": [...], ...}
```

## 🎉 Success Checklist

- [ ] Python 3.11+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed
- [ ] Python service running on port 8000
- [ ] Health check returns 200
- [ ] Intent classification working
- [ ] NER extraction working
- [ ] NestJS integration working
- [ ] Fallback to rule-based when Python service down

## 🆘 Support

Nếu gặp lỗi, check:
1. Python version (3.11+)
2. Virtual environment activated
3. Dependencies installed
4. Port 8000 available
5. Internet connection (for model download)
6. NestJS service running
7. Environment variables set

---

**Status**: ✅ Ready to run!
**Setup Time**: ~10-15 minutes
**Dependencies**: Python 3.11+, pip, virtualenv




