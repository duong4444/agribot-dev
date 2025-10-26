# 🎓 Hướng dẫn chi tiết Fine-Tune PhoBERT (Local) - Dành cho người mới

> **Mục tiêu**: Huấn luyện PhoBERT cho Intent Classification và NER. Giải thích từng bước chi tiết.

---

## 📋 Tổng quan luồng xử lý

```
CÀI ĐẶT → CHUẨN BỊ DATA → TRAINING → TEST → TÍCH HỢP
   ↓            ↓             ↓         ↓        ↓
Python      CSV/JSON     PhoBERT    Script   Service
 venv        labels       epochs    verify   restart
```

---

## 1️⃣ Cài đặt môi trường (Windows)

### Bước 1.1: Kiểm tra Python

```powershell
# Mở PowerShell, kiểm tra phiên bản
python --version
```
**Cần:** Python 3.10+ 
**Nếu chưa có:** tải từ python.org, tick "Add to PATH" khi cài.

### Bước 1.2: Di chuyển vào thư mục

```powershell
cd C:\Users\ADMIN\Desktop\ex\apps\python-ai-service
```

### Bước 1.3: Tạo virtual environment

```powershell
# Tạo venv
python -m venv venv

# Kích hoạt
venv\Scripts\activate
```
**Kiểm tra:** Dòng lệnh có `(venv)` ở đầu.

### Bước 1.4: Cài thư viện

```powershell
# Cập nhật pip
python -m pip install --upgrade pip

# Cài dependencies
pip install transformers datasets torch pandas scikit-learn numpy accelerate evaluate
```
**Thời gian:** 5-15 phút. Torch ~2GB.

---

## 2️⃣ Chuẩn bị dữ liệu

### Bước 2.1: Tạo thư mục

```powershell
mkdir train\data
mkdir train\scripts
mkdir models\intent_classifier
```

### Bước 2.2: Tạo file dữ liệu Intent

**File:** `train/data/intent_data.csv`

```csv
text,label
doanh thu tháng này là bao nhiêu,0
chi phí tưới tiêu tháng 3,0
lợi nhuận từ cà chua,0
cách trồng cà chua,1
thời gian thu hoạch rau,1
giống cây nào tốt,1
bật hệ thống tưới,2
tắt máy bơm nước,2
điều khiển cảm biến,2
tưới nước cho rau,3
bón phân cho cây,3
thu hoạch sản phẩm,3
phân tích dữ liệu farm,4
thống kê sản lượng,4
báo cáo tài chính,4
```

**Label mapping:**
- 0 = financial_query
- 1 = crop_query  
- 2 = device_control
- 3 = activity_query
- 4 = analytics_query
- 5 = farm_query
- 6 = sensor_query
- 7 = create_record
- 8 = update_record
- 9 = delete_record

**Lưu ý:** Cần ít nhất 10-20 câu/intent. Càng nhiều càng tốt.

---

## 3️⃣ Script Training Intent (chi tiết)

### File: `train/scripts/train_intent.py`

Tạo file này với nội dung đầy đủ có giải thích:

```python
"""Training Intent Classification - Có giải thích từng bước"""

import pandas as pd
from datasets import Dataset
from sklearn.model_selection import train_test_split
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import numpy as np

# ============ CẤU HÌNH ============
DATA_PATH = "../data/intent_data.csv"
OUTPUT_DIR = "../../models/intent_classifier"
MODEL_NAME = "vinai/phobert-base"
NUM_EPOCHS = 4
BATCH_SIZE = 8  # Giảm xuống 4 nếu máy yếu

print("🚀 Bắt đầu training...")

# ============ LOAD DỮ LIỆU ============
print(f"📊 Load dữ liệu từ {DATA_PATH}")
df = pd.read_csv(DATA_PATH)
print(f"   Tổng: {len(df)} câu, {df['label'].nunique()} intents")

# ============ CHIA TRAIN/VAL ============
print("✂️  Chia train (80%) và validation (20%)")
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'].tolist(),
    df['label'].tolist(),
    test_size=0.2,
    random_state=42,
    stratify=df['label']
)
print(f"   Train: {len(train_texts)}, Val: {len(val_texts)}")

# ============ LOAD MODEL ============
print(f"🤖 Load {MODEL_NAME}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=df['label'].nunique()
)

# ============ TOKENIZE ============
print("🔤 Tokenize dữ liệu...")
def tokenize_fn(texts):
    return tokenizer(texts, truncation=True, padding='max_length', max_length=256)

train_enc = tokenize_fn(train_texts)
val_enc = tokenize_fn(val_texts)

# ============ TẠO DATASET ============
class IntentDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels
    
    def __getitem__(self, idx):
        item = {k: torch.tensor(v[idx]) for k, v in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item
    
    def __len__(self):
        return len(self.labels)

train_dataset = IntentDataset(train_enc, train_labels)
val_dataset = IntentDataset(val_enc, val_labels)

# ============ CẤU HÌNH TRAINING ============
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    num_train_epochs=NUM_EPOCHS,
    weight_decay=0.01,
    logging_steps=10,
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    accuracy = (predictions == labels).mean()
    return {"accuracy": accuracy}

# ============ TRAINING ============
print(f"\n🏋️  Training {NUM_EPOCHS} epochs...")
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics,
)

trainer.train()

# ============ LƯU MODEL ============
print(f"\n💾 Lưu model vào {OUTPUT_DIR}")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# ============ ĐÁNH GIÁ ============
eval_results = trainer.evaluate()
print(f"\n✅ Hoàn thành! Accuracy: {eval_results['eval_accuracy']:.2%}")
print(f"📁 Model tại: {OUTPUT_DIR}")
```

---

## 4️⃣ Chạy Training

### Bước 4.1: Di chuyển vào thư mục scripts

```powershell
cd train\scripts
```

### Bước 4.2: Chạy script

```powershell
python train_intent.py
```

### Bước 4.3: Theo dõi quá trình

**Output mẫu:**
```
🚀 Bắt đầu training...
📊 Load dữ liệu từ ../data/intent_data.csv
   Tổng: 50 câu, 10 intents
✂️  Chia train (80%) và validation (20%)
   Train: 40, Val: 10
🤖 Load vinai/phobert-base...
Downloading... 100%
🔤 Tokenize dữ liệu...

🏋️  Training 4 epochs...
Epoch 1/4: [████] Loss: 2.12, Acc: 0.45
Epoch 2/4: [████] Loss: 1.56, Acc: 0.70
Epoch 3/4: [████] Loss: 0.89, Acc: 0.85
Epoch 4/4: [████] Loss: 0.45, Acc: 0.95

💾 Lưu model vào ../../models/intent_classifier
✅ Hoàn thành! Accuracy: 95.00%
```

**Thời gian dự kiến:**
- CPU: 20-60 phút (tùy máy)
- GPU: 5-15 phút

---

## 5️⃣ Kiểm thử Model

### File: `train/scripts/test_intent.py`

```python
"""Test fine-tuned Intent model"""

from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

MODEL_PATH = "../../models/intent_classifier"

# Label names
INTENT_LABELS = [
    "financial_query", "crop_query", "device_control",
    "activity_query", "analytics_query", "farm_query",
    "sensor_query", "create_record", "update_record",
    "delete_record"
]

# Load model
print(f"📦 Load model từ {MODEL_PATH}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

def predict(text):
    """Dự đoán intent của câu"""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)
        idx = torch.argmax(probs).item()
        confidence = probs[0][idx].item()
    return INTENT_LABELS[idx], confidence

# Test cases
test_cases = [
    "Doanh thu tháng này là bao nhiêu",
    "Cách trồng cà chua",
    "Bật hệ thống tưới",
    "Tưới nước cho rau",
    "Phân tích dữ liệu farm"
]

print("\n🧪 Testing model:\n")
for text in test_cases:
    intent, conf = predict(text)
    print(f"'{text}'")
    print(f"  → {intent} ({conf:.2%})\n")
```

### Chạy test:

```powershell
python test_intent.py
```

**Output mong đợi:**
```
📦 Load model từ ../../models/intent_classifier
🧪 Testing model:

'Doanh thu tháng này là bao nhiêu'
  → financial_query (95.23%)

'Cách trồng cà chua'
  → crop_query (92.45%)

'Bật hệ thống tưới'
  → device_control (89.67%)
```

---

## 6️⃣ Tích hợp vào Service

### Bước 6.1: Kiểm tra checkpoint

```powershell
cd ..\..
dir models\intent_classifier
```

**Phải thấy:**
- `config.json`
- `pytorch_model.bin`
- `tokenizer.json`
- `vocab.txt`

### Bước 6.2: Khởi động lại service

```powershell
cd src
python main.py
```

**Log mong đợi:**
```
📦 Loading Intent Classifier (PhoBERT)...
Loading fine-tuned model from ./models/intent_classifier...
✅ Intent Classifier loaded successfully
🎉 Python AI Service ready!
```

### Bước 6.3: Test API

Mở PowerShell mới:

```powershell
curl -X POST http://localhost:8000/intent/classify `
  -H "Content-Type: application/json" `
  -d '{\"text\": \"Doanh thu tháng này bao nhiêu\"}'
```

**Response:**
```json
{
  "intent": "financial_query",
  "confidence": 0.95,
  "all_intents": [
    {"intent": "financial_query", "confidence": 0.95},
    {"intent": "analytics_query", "confidence": 0.03}
  ],
  "processing_time_ms": 45.2
}
```

---

## 7️⃣ Xử lý lỗi thường gặp

### Lỗi 1: "CUDA out of memory"

**Nguyên nhân:** GPU không đủ RAM.

**Giải pháp:**
1. Giảm `BATCH_SIZE` xuống 4 hoặc 2
2. Hoặc tắt GPU, dùng CPU (thêm vào script):
   ```python
   import os
   os.environ["CUDA_VISIBLE_DEVICES"] = ""
   ```

### Lỗi 2: "ModuleNotFoundError: No module named 'transformers'"

**Nguyên nhân:** Chưa cài thư viện hoặc chạy ngoài venv.

**Giải pháp:**
```powershell
# Kích hoạt venv
venv\Scripts\activate

# Cài lại
pip install transformers datasets torch
```

### Lỗi 3: "No such file or directory: intent_data.csv"

**Nguyên nhân:** File CSV không đúng vị trí hoặc đường dẫn sai.

**Giải pháp:**
1. Kiểm tra file tồn tại: `dir ..\data\intent_data.csv`
2. Chỉnh `DATA_PATH` trong script nếu cần

### Lỗi 4: Training quá chậm

**Nguyên nhân:** Máy yếu hoặc dữ liệu lớn.

**Giải pháp:**
1. Giảm `NUM_EPOCHS` xuống 2-3
2. Giảm `BATCH_SIZE` xuống 4
3. Giảm `max_length` xuống 128

### Lỗi 5: Accuracy thấp (<70%)

**Nguyên nhân:** Dữ liệu ít hoặc không đủ đa dạng.

**Giải pháp:**
1. Thêm nhiều câu hơn (mục tiêu 50-100 câu/intent)
2. Đa dạng cách diễn đạt
3. Tăng `NUM_EPOCHS` lên 5-6

---

## 8️⃣ Luồng hoạt động chi tiết Training

```
┌─────────────────────────────────────────────────────┐
│  TRAINING LOOP (mỗi epoch)                          │
└─────────────────────────────────────────────────────┘

1. LOAD BATCH DATA
   ↓
   [Batch: 8 câu] → ["doanh thu...", "bật máy...", ...]
   
2. TOKENIZE
   ↓
   Text → Numbers: [101, 5432, 234, ..., 102]
   
3. FORWARD PASS
   ↓
   Input → PhoBERT → Logits [0.1, 0.8, 0.05, ...]
                              ↓
                         Predictions [1]
   
4. CALCULATE LOSS
   ↓
   Compare: Prediction vs True Label
   Loss = CrossEntropyLoss(pred, label)
   
5. BACKWARD PASS
   ↓
   Tính gradient (đạo hàm)
   Update trọng số model
   
6. REPEAT
   ↓
   Next batch → Quay lại bước 1

SAU MỖI EPOCH:
   ↓
   Chạy VALIDATION để đánh giá
   Lưu checkpoint nếu accuracy tốt hơn
```

---

## 9️⃣ NER Training (Nâng cao - Tùy chọn)

NER phức tạp hơn Intent. Nếu bạn cần, tham khảo:
- Notebook HuggingFace: https://huggingface.co/docs/transformers/tasks/token_classification
- Hoặc xem `FINE_TUNING_GUIDE.md` để có script mẫu đầy đủ

**Lưu ý:** Ưu tiên làm Intent trước. Sau khi quen rồi mới làm NER.

---

## ✅ Checklist hoàn thành

- [ ] Cài Python 3.10+
- [ ] Tạo và kích hoạt virtualenv
- [ ] Cài transformers, torch, datasets
- [ ] Chuẩn bị `intent_data.csv` (ít nhất 50 câu)
- [ ] Tạo script `train_intent.py`
- [ ] Chạy training thành công
- [ ] Test với `test_intent.py`
- [ ] Checkpoint lưu tại `models/intent_classifier/`
- [ ] Restart service và thấy log "fine-tuned model"
- [ ] Test API trả về confidence >0.8

---

## 📚 Tài liệu tham khảo

- PhoBERT: https://github.com/VinAIResearch/PhoBERT
- Transformers docs: https://huggingface.co/docs/transformers
- PyTorch tutorial: https://pytorch.org/tutorials/

---

**Chúc bạn fine-tune thành công! 🚀**

Nếu gặp vấn đề, kiểm tra lại từng bước hoặc tham khảo phần xử lý lỗi.
