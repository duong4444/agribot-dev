# Quick Start: Cải Thiện NER Performance

## 🎯 Hiện Tại vs Mục Tiêu

**Hiện tại:** F1 = 0.80
**Mục tiêu:** F1 = 0.90+

---

## 🚀 3 Bước Nhanh Nhất (1-2 ngày)

### **Bước 1: Tăng Data Tự Động** ⭐⭐⭐⭐⭐

```powershell
# Chạy data augmentation script
cd c:\Users\ADMIN\Desktop\ex\apps\python-ai-service\train\scripts
python augment_ner_data.py

# Output: ner_data_augmented.csv (948 → 1448 examples)
```

**Expected gain:** +3-5% F1

---

### **Bước 2: Analyze Errors & Tìm Điểm Yếu** ⭐⭐⭐⭐⭐

```powershell
# Phân tích lỗi của model
python analyze_errors.py

# Output:
# - Báo cáo chi tiết: precision/recall cho từng entity type
# - errors_to_review.csv: Các cases model sai
```

**Xem output để biết:**
- Entity type nào model học kém nhất?
- Model hay bỏ sót entity nào?
- Model hay dự đoán sai entity nào?

---

### **Bước 3: Retrain với Data Mới** ⭐⭐⭐⭐⭐

```powershell
# Edit train_ner.py để dùng augmented data
# Line 17: Đổi 'ner_data.csv' → 'ner_data_augmented.csv'

# Retrain
python train_ner.py

# Wait ~30-60 minutes
# Expected F1: 0.85-0.87
```

---

## 📊 Hiểu Kết Quả

### Sau khi chạy `analyze_errors.py`:

```
📊 ERROR ANALYSIS REPORT
============================================================

✅ Overall Accuracy: 152/190 (80.0%)

📈 Per-Entity Type Performance:
Entity Type         Precision    Recall       F1 Score    
------------------------------------------------------------
CROP_NAME           0.92         0.88         0.90        ✅ Tốt
DEVICE              0.75         0.68         0.71        ⚠️ Cần cải thiện
AREA                0.82         0.79         0.80        👍 OK
QUANTITY            0.65         0.61         0.63        ❌ Yếu nhất
...

⚠️  Error Breakdown:
  False Positives: 23  ← Model dự đoán nhưng sai
  False Negatives: 31  ← Model bỏ sót
  Low Confidence: 18   ← Không chắc chắn
```

### Phân Tích:

1. **CROP_NAME**: F1 = 0.90 ✅ → Rất tốt, giữ nguyên
2. **DEVICE**: F1 = 0.71 ⚠️ → Cần thêm examples về thiết bị
3. **QUANTITY**: F1 = 0.63 ❌ → Yếu nhất, ưu tiên cải thiện

### Hành Động Tiếp Theo:

```powershell
# 1. Mở errors_to_review.csv
# 2. Tìm tất cả errors liên quan đến QUANTITY và DEVICE
# 3. Thêm ~100 examples mới vào ner_data.csv cho 2 types này
# 4. Retrain
```

---

## 🔧 Tools Đã Có

### 1. **augment_ner_data.py**
- **Chức năng:** Tự động tạo thêm 500 training examples
- **Phương pháp:** 
  - Synonym replacement (cà chua → quả cà chua)
  - Template generation (cách trồng {crop} ở {area})
- **Output:** `ner_data_augmented.csv`

### 2. **analyze_errors.py**
- **Chức năng:** Phân tích lỗi của model
- **Output:** 
  - Console: Báo cáo chi tiết
  - `errors_to_review.csv`: Danh sách errors cần review

### 3. **rest-client.http**
- **Chức năng:** Test API nhanh trong VS Code
- **Không cần Postman!**

---

## 💡 Tips

### Nếu F1 chưa lên sau augmentation:

**Option A: Thêm Data Manual (Recommended)**
```powershell
# Dựa vào analyze_errors.py
# Thêm 200-300 examples cho entity types yếu
# Focus: QUANTITY, DEVICE, SENSOR_TYPE
```

**Option B: Tune Hyperparameters**
```python
# Edit train_ner.py
learning_rate=1e-5  # Giảm xuống
num_train_epochs=40  # Tăng lên
```

**Option C: Thử PhoBERT-large**
```python
# Edit train_ner.py line 98
model_name = "vinai/phobert-large"
```

---

## 📈 Expected Progress

```
Week 0 (hiện tại):    F1 = 0.80
├─ Augmentation:      F1 = 0.83-0.85
├─ +200 examples:     F1 = 0.86-0.88
├─ Hyperparameter:    F1 = 0.88-0.90
└─ PhoBERT-large:     F1 = 0.90-0.92
```

---

## ✅ Checklist

- [ ] Chạy `augment_ner_data.py`
- [ ] Chạy `analyze_errors.py` để xem điểm yếu
- [ ] Retrain với augmented data
- [ ] Test và đo F1 mới
- [ ] Nếu chưa đạt 0.90:
  - [ ] Thêm 200 examples cho entity types yếu
  - [ ] Retrain lần 2
  - [ ] Test lại

---

## 🆘 Troubleshooting

**Q: Augmentation script báo lỗi?**
```powershell
# Đảm bảo file CSV format đúng
# Check encoding: UTF-8
```

**Q: Analyze script chạy lâu?**
```powershell
# Bình thường, ~2-3 phút cho 190 examples
# Nếu quá 5 phút, Ctrl+C và check GPU
```

**Q: F1 không lên sau retrain?**
```
1. Check validation set có bị contaminate không
2. Xem loss có giảm không trong training
3. Thử giảm learning rate
```

---

## 🎉 Kết Luận

**1 ngày làm việc = +5-10% F1 score!**

Priority:
1. ✅ Augmentation (30 phút)
2. ✅ Error analysis (30 phút)
3. ✅ Retrain (1 giờ)
4. ✅ Add manual data cho weak spots (2-3 giờ)
5. ✅ Retrain lần 2 (1 giờ)

**Total:** 5-6 giờ → F1 từ 0.80 → 0.88+ 🚀
