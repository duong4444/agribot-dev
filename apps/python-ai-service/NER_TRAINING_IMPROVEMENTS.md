# Cải Tiến NER Training Pipeline

## 🎯 Vấn Đề Đã Khắc Phục

### 1. **PhoBERT không hỗ trợ `return_offsets_mapping`**
**Vấn đề:** Code cũ cố gọi `return_offsets_mapping=True` → gây lỗi với PhoBERT tokenizer

**Giải pháp:** Tạo hàm `_align_labels_with_tokens()` để:
- Tạo character-level entity map từ annotations
- Decode từng token PhoBERT
- Match token với vị trí trong text
- Gán label BIO chính xác cho mỗi token

### 2. **Label Alignment Không Chính Xác**
**Vấn đề:** Code cũ dùng word-level split đơn giản → không khớp với PhoBERT tokenization

**Giải pháp:** 
```python
# Tạo character-level entity map
char_labels = ['O'] * len(text)
for entity in entities:
    char_labels[start] = f"B-{entity_type}"
    for i in range(start + 1, end):
        char_labels[i] = f"I-{entity_type}"

# Match từng token với character positions
token_start = text.lower().find(token_clean.lower(), current_pos)
label = char_labels[token_start]
```

### 3. **Thiếu Metrics & Evaluation**
**Vấn đề:** Chỉ theo dõi loss, không biết model học tốt như thế nào

**Giải pháp:** Thêm `compute_metrics()` với:
- ✅ **Precision**: Độ chính xác của predictions
- ✅ **Recall**: Tỷ lệ entities được phát hiện
- ✅ **F1 Score**: Harmonic mean của precision & recall

### 4. **Training Configuration Chưa Tối Ưu**
**Cải tiến:**
```python
# CŨ
num_train_epochs=20
learning_rate=3e-5
save_strategy="no"  # Không save checkpoints
metric_for_best_model="eval_loss"

# MỚI
num_train_epochs=30  # Tăng epochs
learning_rate=2e-5  # Giảm LR cho stable
save_strategy="epoch"  # Save mỗi epoch
save_total_limit=3  # Giữ 3 best checkpoints
metric_for_best_model="f1"  # Dùng F1 thay vì loss
load_best_model_at_end=True  # Load best model
fp16=True  # Mixed precision (nhanh hơn 2x)
```

### 5. **Thêm Early Stopping**
**Lợi ích:** Tự động dừng nếu không cải thiện sau 3 epochs → tiết kiệm thời gian

```python
callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
```

---

## 📊 Kết Quả Mong Đợi

### Trước Khi Cải Tiến:
```json
{
  "entities": [
    {"type": "crop_name", "value": "cách"}  ❌ Sai
  ]
}
```

### Sau Khi Cải Tiến:
```json
{
  "entities": [
    {"type": "crop_name", "value": "cà chua"}  ✅ Đúng
  ]
}
```

---

## 🚀 Cách Sử Dụng

### 1. Cài đặt dependencies:
```powershell
cd c:\Users\ADMIN\Desktop\ex\apps\python-ai-service
.\venv\Scripts\Activate.ps1
pip install seqeval  # Thư viện mới cần thiết
```

### 2. Train model với code mới:
```powershell
cd train\scripts
python train_ner.py
```

### 3. Theo dõi training:
```
🚀 Starting NER training...
Train examples: 758
Validation examples: 190
Training for 30 epochs with early stopping
Using device: cuda
------------------------------------------------------------

Epoch 1/30:
  train_loss: 0.234
  eval_loss: 0.145
  eval_precision: 0.78
  eval_recall: 0.82
  eval_f1: 0.80  ⬅️ Theo dõi metric này

Epoch 2/30:
  ...
```

### 4. Sau khi training xong:
```powershell
# Restart FastAPI server
python src/main.py
```

### 5. Test:
```bash
POST http://localhost:8000/ner/extract
{
  "text": "cách trồng cà chua"
}

# Expected response:
{
  "entities": [
    {
      "type": "crop_name",
      "value": "cà chua",
      "start": 12,
      "end": 19,
      "confidence": 0.85
    }
  ]
}
```

---

## 🔧 Chi Tiết Kỹ Thuật

### Token Alignment Logic:
```python
def _align_labels_with_tokens(text, entities, input_ids):
    # 1. Tạo character-level entity map
    char_labels = ['O'] * len(text)
    for entity in entities:
        char_labels[start] = f"B-{entity_type}"
        for i in range(start+1, end):
            char_labels[i] = f"I-{entity_type}"
    
    # 2. Decode từng token và tìm vị trí
    for idx, token_id in enumerate(input_ids):
        token = tokenizer.decode([token_id])
        token_clean = token.replace('_', ' ').strip()
        
        # 3. Tìm token trong text
        token_start = text.lower().find(token_clean.lower(), current_pos)
        
        # 4. Gán label từ character map
        label = char_labels[token_start]
        label_ids[idx] = label_to_id[label]
        
        current_pos = token_start + len(token_clean)
```

### Ví dụ cụ thể:
```
Text: "cách trồng cà chua"
Entity: {"type": "CROP_NAME", "value": "cà chua", "start": 11, "end": 18}

Character-level map:
[O O O O O O O O O O O B-CROP_NAME I-CROP_NAME I-CROP_NAME ...]
 c á c h   t r ồ n g   c à           c            h            u  a

PhoBERT tokens:
[<s>, cách, trồng, cà, chua, </s>]

Token labels:
[ignore, O, O, B-CROP_NAME, I-CROP_NAME, ignore]
         ↑  ↑  ↑            ↑
         Position 0-3: "cách" → O
         Position 5-10: "trồng" → O  
         Position 11-12: "cà" → B-CROP_NAME ✅
         Position 14-17: "chua" → I-CROP_NAME ✅
```

---

## 📈 Performance Tips

1. **Nếu training quá lâu**: Giảm `num_train_epochs` xuống 20
2. **Nếu out of memory**: Giảm `per_device_train_batch_size` xuống 4
3. **Nếu overfitting**: Tăng `weight_decay` lên 0.02
4. **Nếu muốn nhanh hơn**: Bật `fp16=True` (cần GPU)

---

## ✅ Checklist

- [x] Fix PhoBERT offset mapping issue
- [x] Implement character-level label alignment
- [x] Add F1/Precision/Recall metrics
- [x] Optimize training hyperparameters
- [x] Add early stopping
- [x] Enable mixed precision training
- [x] Save best model based on F1 score

---

## 🎉 Kết Luận

Training pipeline đã được **tối ưu hoàn toàn** cho PhoBERT và Vietnamese agricultural domain. Model sẽ học được entity boundaries chính xác và đạt F1 score cao hơn đáng kể!
