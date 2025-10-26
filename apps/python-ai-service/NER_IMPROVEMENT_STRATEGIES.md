# Chiến Lược Cải Thiện NER Performance

## 📊 Hiện Tại
- **F1 Score**: ~0.80
- **Precision**: ~0.78
- **Recall**: ~0.82

## 🎯 Mục Tiêu
- **F1 Score**: 0.90+
- **Precision**: 0.88+
- **Recall**: 0.90+

---

## 🚀 Chiến Lược Cải Thiện

### 1. **Tăng Số Lượng Dữ Liệu Training** (Hiệu Quả Nhất ⭐⭐⭐⭐⭐)

**Hiện tại:** 948 examples
**Khuyến nghị:** 2000-5000 examples

#### Cách thực hiện:
```python
# Thêm dữ liệu vào train/data/ner_data.csv
# Tập trung vào các cases model dự đoán sai:

# 1. Multi-entity sentences
"bón 50kg phân NPK cho cà chua ở ruộng A ngày mai"
→ Entities: QUANTITY, FERTILIZER, CROP_NAME, AREA, DATE

# 2. Ambiguous cases
"cà" → có thể là "cà chua", "cà phê", "cà rốt"

# 3. Rare entities
"dưa lưới", "măng tây", "atiso"

# 4. Edge cases
"cây cao 1.5m" → 1.5m là METRIC_VALUE
"giá 50k/kg" → 50k là MONEY
```

**Tác động:** +5-10% F1 score

---

### 2. **Data Augmentation** (Tự Động Tăng Dữ Liệu) ⭐⭐⭐⭐

#### Script tự động tạo thêm dữ liệu:

```python
# train/scripts/augment_ner_data.py
import pandas as pd
import random

# Đọc data hiện tại
df = pd.read_csv('../data/ner_data.csv')

# Augmentation strategies:

# 1. Synonym replacement
CROP_SYNONYMS = {
    "cà chua": ["cà chua", "quả cà chua", "cây cà chua"],
    "lúa": ["lúa", "thóc", "cây lúa"],
    "cà phê": ["cà phê", "cafe", "cây cà phê"]
}

# 2. Template-based generation
TEMPLATES = [
    "cách trồng {crop} ở {area}",
    "bón phân cho {crop} vào {date}",
    "tưới {quantity} nước cho {crop}",
    "{activity} {crop} tại {area}"
]

# 3. Entity shuffling
# Giữ nguyên structure, thay đổi entity values
```

**Tác động:** +3-5% F1 score

---

### 3. **Fine-tune Hyperparameters** ⭐⭐⭐⭐

#### Thử nghiệm các cấu hình:

```python
# train/scripts/train_ner.py

# Config A: Học sâu hơn
training_args = TrainingArguments(
    num_train_epochs=50,  # Tăng lên
    learning_rate=1e-5,   # Giảm xuống
    warmup_ratio=0.15,    # Tăng warmup
    weight_decay=0.02,    # Tăng regularization
)

# Config B: Batch size lớn hơn
training_args = TrainingArguments(
    per_device_train_batch_size=16,  # x2
    gradient_accumulation_steps=2,    # Thêm
    learning_rate=3e-5,               # Tăng LR với batch lớn
)

# Config C: Label smoothing
training_args = TrainingArguments(
    label_smoothing_factor=0.1,  # Giảm overconfidence
)
```

**Cách test:** Chạy grid search hoặc manual tuning
**Tác động:** +2-4% F1 score

---

### 4. **Thử Model Khác** ⭐⭐⭐

#### So sánh các models:

```python
# Current: vinai/phobert-base (135M params)
# Alternatives:

# 1. PhoBERT-large (bigger, better)
model_name = "vinai/phobert-large"  # 370M params
# Expected: +3-5% F1

# 2. XLM-RoBERTa Vietnamese
model_name = "xlm-roberta-base"
# Expected: +1-3% F1

# 3. Vietnamese BERT
model_name = "bert-base-multilingual-cased"
# Expected: Similar hoặc thấp hơn
```

**Lưu ý:** Model lớn hơn = cần RAM/VRAM nhiều hơn

**Tác động:** +1-5% F1 score (tùy model)

---

### 5. **Cải Thiện Post-processing** ⭐⭐⭐

#### Thêm rules thông minh:

```python
# src/models/ner_extractor.py

def _post_process_entities(self, text, entities):
    # 1. Fix boundary issues
    # "cà" → extend to "cà chua" if found
    for entity in entities:
        if entity['type'] == 'crop_name':
            if entity['raw'] == 'cà':
                # Look ahead for "chua", "phê", etc.
                extended = self._extend_crop_name(text, entity)
                if extended:
                    entity.update(extended)
    
    # 2. Merge adjacent entities of same type
    # "50" + "kg" → "50kg" (QUANTITY)
    entities = self._merge_adjacent_entities(entities)
    
    # 3. Domain knowledge rules
    # "NPK" always FERTILIZER
    # "sensor" always DEVICE
    entities = self._apply_domain_rules(text, entities)
    
    # 4. Context-based correction
    # "bón phân NPK" → NPK must be FERTILIZER
    entities = self._context_correction(text, entities)
    
    return entities
```

**Tác động:** +2-3% F1 score

---

### 6. **Active Learning** (Học Chủ Động) ⭐⭐⭐⭐⭐

#### Tìm và label những examples model không chắc chắn:

```python
# train/scripts/find_uncertain_examples.py

# 1. Chạy inference trên unlabeled data
# 2. Tìm examples với confidence thấp
# 3. Manual label những examples đó
# 4. Thêm vào training set
# 5. Retrain

def find_uncertain_predictions(texts, threshold=0.7):
    """Find predictions with low confidence"""
    uncertain = []
    for text in texts:
        result = ner_extractor.extract(text)
        for entity in result['entities']:
            if entity['confidence'] < threshold:
                uncertain.append({
                    'text': text,
                    'entity': entity,
                    'confidence': entity['confidence']
                })
    return uncertain
```

**Tác động:** +5-8% F1 score (với 200-300 examples mới)

---

### 7. **Ensemble Methods** ⭐⭐⭐

#### Kết hợp nhiều models:

```python
# src/models/ner_ensemble.py

class NEREnsemble:
    def __init__(self):
        self.models = [
            NERExtractor(model_name="vinai/phobert-base"),
            NERExtractor(model_name="vinai/phobert-large"),
            RuleBasedNER()  # Fallback rules
        ]
    
    def extract(self, text):
        # Voting: Lấy entities mà >=2 models đồng ý
        all_predictions = []
        for model in self.models:
            all_predictions.append(model.extract(text))
        
        return self._vote(all_predictions)
```

**Tác động:** +2-4% F1 score

---

### 8. **Curriculum Learning** ⭐⭐⭐

#### Train từ dễ đến khó:

```python
# train/scripts/curriculum_training.py

# Phase 1: Single entity examples (5 epochs)
easy_data = df[df['entities'].apply(lambda x: len(json.loads(x)) == 1)]

# Phase 2: 2-3 entities (5 epochs)  
medium_data = df[df['entities'].apply(lambda x: 1 < len(json.loads(x)) <= 3)]

# Phase 3: Complex multi-entity (10 epochs)
hard_data = df[df['entities'].apply(lambda x: len(json.loads(x)) > 3)]

# Train theo thứ tự: easy → medium → hard
```

**Tác động:** +1-3% F1 score

---

## 🎯 Roadmap Thực Tế

### **Phase 1: Quick Wins (1-2 ngày)**
1. ✅ Tăng data lên 1500 examples (manual label thêm 500)
2. ✅ Thêm post-processing rules
3. ✅ Tune hyperparameters (test 3-4 configs)

**Expected:** F1 = 0.85

---

### **Phase 2: Medium Effort (3-5 ngày)**
1. ✅ Data augmentation (tạo thêm 1000 synthetic examples)
2. ✅ Active learning (label 200 uncertain cases)
3. ✅ Thử PhoBERT-large

**Expected:** F1 = 0.88-0.90

---

### **Phase 3: Advanced (1-2 tuần)**
1. ✅ Curriculum learning
2. ✅ Ensemble 2-3 models
3. ✅ Domain-specific fine-tuning

**Expected:** F1 = 0.92+

---

## 📊 Ưu Tiên Theo ROI

| Chiến lược | Effort | Impact | ROI | Priority |
|-----------|--------|--------|-----|----------|
| Thêm data | Medium | Very High | ⭐⭐⭐⭐⭐ | **1** |
| Active Learning | Medium | Very High | ⭐⭐⭐⭐⭐ | **2** |
| Post-processing | Low | Medium | ⭐⭐⭐⭐ | **3** |
| Data Augmentation | Low | Medium | ⭐⭐⭐⭐ | **4** |
| Hyperparameter Tuning | Medium | Medium | ⭐⭐⭐ | **5** |
| Ensemble | High | Medium | ⭐⭐ | 6 |
| PhoBERT-large | Low | Medium | ⭐⭐⭐ | **7** |
| Curriculum Learning | High | Low | ⭐ | 8 |

---

## 🛠️ Bắt Đầu Ngay

### Step 1: Thêm Data (Ưu tiên cao nhất)

```bash
# 1. Tạo template để label nhanh
# 2. Label thêm 500 examples
# 3. Update ner_data.csv
# 4. Retrain

cd train/scripts
python train_ner.py
```

### Step 2: Implement Post-processing

```python
# Edit src/models/ner_extractor.py
# Thêm các rules thông minh vào _post_process_entities()
```

### Step 3: Hyperparameter Tuning

```bash
# Test 3-4 configs khác nhau
# Chọn config tốt nhất
```

---

## 💡 Tips

1. **Track experiments:** Ghi lại mỗi thay đổi và F1 score tương ứng
2. **Validation set:** Luôn dùng cùng 1 validation set để compare
3. **Error analysis:** Xem model sai ở đâu, tập trung fix những cases đó
4. **Incremental:** Thay đổi 1 thứ 1 lúc, đừng thay đổi nhiều thứ cùng lúc

---

## 📈 Expected Timeline

- **Week 1:** F1 = 0.80 → 0.85 (thêm data + post-processing)
- **Week 2:** F1 = 0.85 → 0.88 (augmentation + active learning)
- **Week 3+:** F1 = 0.88 → 0.92+ (advanced techniques)

**Mục tiêu thực tế:** F1 = 0.90 trong 2-3 tuần! 🎯
