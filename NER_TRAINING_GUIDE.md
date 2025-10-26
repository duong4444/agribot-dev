# 🎯 Hướng dẫn Fine-tune NER cho Chatbot Nông nghiệp

## 📋 Tổng quan

Hệ thống NER được thiết kế để nhận diện các entity quan trọng trong nghiệp vụ chatbot nông nghiệp:

### Entity Types (14 loại)

1. **CROP_NAME**: Tên cây trồng (cà chua, lúa, cà phê, ớt...)
2. **DEVICE**: Thiết bị IoT (bơm nước, cảm biến, quạt...)
3. **SENSOR_TYPE**: Loại cảm biến (độ ẩm, nhiệt độ, ánh sáng...)
4. **METRIC_VALUE**: Giá trị đo (32%, 25°C, 500 lux...)
5. **DATE**: Thời gian (hôm nay, tháng này, 15/03/2024...)
6. **MONEY**: Chi phí/doanh thu (2,450,000 VNĐ, 5 triệu...)
7. **DURATION**: Thời lượng (10 phút, 2 giờ...)
8. **AREA**: Khu vực nông trại (luống A, vườn 1...)
9. **QUANTITY**: Số lượng (5kg, 100 cây...)
10. **ACTIVITY**: Hoạt động (tưới nước, bón phân, thu hoạch...)
11. **FERTILIZER**: Loại phân bón (NPK, phân hữu cơ...)
12. **PESTICIDE**: Thuốc trừ sâu
13. **TECHNIQUE**: Kỹ thuật canh tác (gieo trồng, ghép cành...)
14. **SEASON**: Mùa vụ (vụ xuân, mùa mưa...)

---

## 🚀 Các bước thực hiện

### Bước 1: Chuẩn bị dữ liệu

File: `apps/python-ai-service/train/data/ner_data.csv`

**Format:**
```csv
text,entities
"độ ẩm đất hiện tại bao nhiêu","[{""type"":""SENSOR_TYPE"",""value"":""độ ẩm đất"",""start"":0,""end"":11}]"
```

**Lưu ý:**
- Mỗi dòng là 1 câu và danh sách entities dạng JSON
- `start` và `end` là vị trí ký tự trong text (0-indexed)
- Entities có thể chồng lấp hoặc liền kề

**Ví dụ câu phức tạp:**
```csv
"bón phân NPK cho lúa vào ngày mai","[{""type"":""ACTIVITY"",""value"":""bón phân"",""start"":0,""end"":8},{""type"":""FERTILIZER"",""value"":""NPK"",""start"":9,""end"":12},{""type"":""CROP_NAME"",""value"":""lúa"",""start"":17,""end"":20},{""type"":""DATE"",""value"":""ngày mai"",""start"":26,""end"":34}]"
```

### Bước 2: Thêm dữ liệu training

Mở file `ner_data.csv` và thêm nhiều câu hơn (khuyến nghị **ít nhất 200-500 câu** cho mỗi entity type):

```csv
text,entities
"tưới nước cho vườn ớt 15 phút","[{""type"":""ACTIVITY"",""value"":""tưới nước"",""start"":0,""end"":9},{""type"":""CROP_NAME"",""value"":""ớt"",""start"":20,""end"":22},{""type"":""DURATION"",""value"":""15 phút"",""start"":23,""end"":30}]"
"cảm biến độ ẩm báo 28%","[{""type"":""DEVICE"",""value"":""cảm biến độ ẩm"",""start"":0,""end"":15},{""type"":""METRIC_VALUE"",""value"":""28%"",""start"":20,""end"":23}]"
"chi phí phân bón là 1.5 triệu","[{""type"":""FERTILIZER"",""value"":""phân bón"",""start"":8,""end"":16},{""type"":""MONEY"",""value"":""1.5 triệu"",""start"":20,""end"":29}]"
```

### Bước 3: Chạy training

```powershell
cd apps\python-ai-service\train\scripts
python train_ner.py
```

**Quá trình training:**
- Load dữ liệu từ CSV
- Tạo BIO labels (Begin-Inside-Outside)
- Fine-tune PhoBERT với 10 epochs
- Lưu model vào `models/ner_extractor/`
- Lưu `label_mapping.json`

**Thời gian dự kiến:** 10-30 phút (tùy số lượng dữ liệu và GPU)

### Bước 4: Kiểm tra kết quả

Sau khi training xong, kiểm tra các file đã được tạo:

```
models/ner_extractor/
├── config.json
├── pytorch_model.bin
├── tokenizer.json
├── special_tokens_map.json
├── tokenizer_config.json
└── label_mapping.json  ← Quan trọng!
```

### Bước 5: Test NER model

**Khởi động service:**
```powershell
cd apps\python-ai-service
python src/main.py
```

**Test qua API:**
```bash
curl -X POST http://localhost:8000/ner/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "bật bơm nước 10 phút"}'
```

**Kết quả mong đợi:**
```json
{
  "entities": [
    {
      "type": "device_name",
      "value": "bơm nước",
      "raw": "bơm nước",
      "confidence": 0.92,
      "start": 4,
      "end": 12
    },
    {
      "type": "duration",
      "value": "10 phút",
      "raw": "10 phút",
      "confidence": 0.89,
      "start": 13,
      "end": 20
    }
  ],
  "processing_time_ms": 45.2
}
```

---

## 📊 Tips để cải thiện độ chính xác

### 1. Tăng dữ liệu training
- Mỗi entity type cần **ít nhất 200-500 ví dụ**
- Đa dạng cách diễn đạt: "bật bơm", "mở bơm", "khởi động bơm nước"
- Bao gồm cả câu phủ định: "không tưới", "chưa bón phân"

### 2. Cân bằng dữ liệu
- Đảm bảo các entity type có số lượng tương đương
- Nếu một loại quá ít, model sẽ kém chính xác với loại đó

### 3. Xử lý edge cases
- Viết tắt: "NPK", "pH", "IoT"
- Số liệu: "1.5 triệu", "32%", "25°C"
- Ngày tháng: "15/3", "tháng 3", "Q1/2024"

### 4. Tăng epochs nếu cần
Trong `train_ner.py`, dòng 153:
```python
num_train_epochs=10,  # Tăng lên 15-20 nếu dữ liệu nhiều
```

### 5. Điều chỉnh batch size
```python
per_device_train_batch_size=8,  # Giảm xuống 4 nếu thiếu RAM/VRAM
```

---

## 🔧 Troubleshooting

### Lỗi: "CUDA out of memory"
**Giải pháp:**
```python
# Trong train_ner.py
per_device_train_batch_size=4,  # Giảm từ 8 xuống 4
```

### Lỗi: "Entities empty after training"
**Nguyên nhân:** Tokenizer không hỗ trợ `return_offsets_mapping`

**Giải pháp:** Script hiện tại đã xử lý fallback sang rule-based. Để cải thiện:
1. Tăng dữ liệu training
2. Sử dụng Fast tokenizer nếu có

### Model không nhận diện đúng entity mới
**Giải pháp:**
1. Kiểm tra `label_mapping.json` có chứa entity type mới
2. Thêm nhiều ví dụ cho entity type đó (>100 câu)
3. Train lại với epochs cao hơn

---

## 📝 Ví dụ dữ liệu theo nghiệp vụ

### Nghiệp vụ 1: Hỏi đáp kiến thức
```csv
"cách trồng cà chua vụ xuân","[{""type"":""TECHNIQUE"",""value"":""cách trồng"",""start"":0,""end"":10},{""type"":""CROP_NAME"",""value"":""cà chua"",""start"":11,""end"":18},{""type"":""SEASON"",""value"":""vụ xuân"",""start"":19,""end"":26}]"
"kỹ thuật ghép cành cho cây lúa","[{""type"":""TECHNIQUE"",""value"":""ghép cành"",""start"":9,""end"":18},{""type"":""CROP_NAME"",""value"":""lúa"",""start"":27,""end"":30}]"
```

### Nghiệp vụ 2: IoT & điều khiển
```csv
"độ ẩm đất hiện tại 32%","[{""type"":""SENSOR_TYPE"",""value"":""độ ẩm đất"",""start"":0,""end"":11},{""type"":""METRIC_VALUE"",""value"":""32%"",""start"":19,""end"":22}]"
"bật quạt thông gió 2 giờ","[{""type"":""DEVICE"",""value"":""quạt thông gió"",""start"":4,""end"":18},{""type"":""DURATION"",""value"":""2 giờ"",""start"":19,""end"":24}]"
"nhiệt độ nhà kính là 28 độ","[{""type"":""SENSOR_TYPE"",""value"":""nhiệt độ"",""start"":0,""end"":8},{""type"":""AREA"",""value"":""nhà kính"",""start"":9,""end"":17},{""type"":""METRIC_VALUE"",""value"":""28 độ"",""start"":21,""end"":26}]"
```

### Nghiệp vụ 3: Quản lý nông trại
```csv
"chi phí tháng 3 là 5 triệu","[{""type"":""DATE"",""value"":""tháng 3"",""start"":8,""end"":15},{""type"":""MONEY"",""value"":""5 triệu"",""start"":19,""end"":26}]"
"thu hoạch 50kg cà phê hôm qua","[{""type"":""ACTIVITY"",""value"":""thu hoạch"",""start"":0,""end"":9},{""type"":""QUANTITY"",""value"":""50kg"",""start"":10,""end"":14},{""type"":""CROP_NAME"",""value"":""cà phê"",""start"":15,""end"":21},{""type"":""DATE"",""value"":""hôm qua"",""start"":22,""end"":29}]"
"bón 10kg phân NPK cho luống A","[{""type"":""QUANTITY"",""value"":""10kg"",""start"":4,""end"":8},{""type"":""FERTILIZER"",""value"":""phân NPK"",""start"":9,""end"":17},{""type"":""AREA"",""value"":""luống A"",""start"":22,""end"":29}]"
```

---

## ✅ Checklist hoàn thành

- [ ] Đã thêm ít nhất 200 câu vào `ner_data.csv`
- [ ] Mỗi entity type có ít nhất 50 ví dụ
- [ ] Chạy `train_ner.py` thành công
- [ ] File `label_mapping.json` đã được tạo
- [ ] Service khởi động không lỗi
- [ ] Test API `/ner/extract` trả về entities đúng
- [ ] Độ chính xác > 80% trên tập validation

---

## 🎓 Tài liệu tham khảo

- PhoBERT paper: https://arxiv.org/abs/2003.00744
- Transformers NER guide: https://huggingface.co/docs/transformers/tasks/token_classification
- BIO tagging: https://en.wikipedia.org/wiki/Inside–outside–beginning_(tagging)
