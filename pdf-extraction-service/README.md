# PDF Extraction Microservice

Python microservice để extract text từ PDF files, hỗ trợ cả text-based PDF và scanned PDF.

## Features

- ✅ **Text-based PDF**: Dùng `pdfplumber` (~0.5s/trang)
- ✅ **Scanned PDF**: Dùng `PaddleOCR` (2-5s/trang)
- ✅ **Auto-detect**: Tự động phát hiện loại PDF
- ✅ **Skip images**: Tự động bỏ qua ảnh minh họa
- ✅ **Vietnamese support**: Hỗ trợ tiếng Việt

## Installation

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

Service sẽ chạy tại: `http://localhost:8002`

### Docker

```bash
# Build image
docker build -t pdf-extraction-service .

# Run container
docker run -p 8002:8002 pdf-extraction-service
```

## API Endpoints

### `GET /`
Health check và service info

### `GET /health`
Health check endpoint

### `POST /extract`
Extract text từ PDF file

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file)

**Response:**
```json
{
  "text": "Extracted text content...",
  "method": "pdfplumber",
  "page_count": 10,
  "processing_time": 2.5,
  "metadata": {
    "pages": [...],
    "total_chars": 5000,
    "images_skipped": 3
  }
}
```

## Testing

```bash
# Test with curl
curl -X POST http://localhost:8002/extract \
  -F "file=@test.pdf"
```

## System Requirements

- Python 3.10+
- poppler-utils (for pdf2image)
- 2GB+ RAM (for PaddleOCR)

## Performance

- **Text PDF**: ~0.5s per page
- **Scanned PDF**: 2-5s per page (depends on image quality)

## Notes

- PaddleOCR models (~100MB) sẽ được download tự động lần đầu chạy
- Để tăng tốc độ, có thể enable GPU bằng cách set `USE_GPU=true`
