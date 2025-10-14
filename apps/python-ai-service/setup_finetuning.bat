@echo off
echo 🎓 Fine-tuning Setup for Intent Classification
echo ============================================

echo.
echo 📋 This script will:
echo 1. Create sample training data
echo 2. Train PhoBERT model for intent classification
echo 3. Test the fine-tuned model
echo.

echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo 📊 Creating sample data...
python -c "
import pandas as pd
import os

# Create sample data
data = [
    ('doanh thu tháng này là bao nhiêu', 0),
    ('chi phí tưới tiêu tháng 3', 0),
    ('lợi nhuận từ cà chua', 0),
    ('cách trồng cà chua', 1),
    ('thời gian thu hoạch rau', 1),
    ('giống cây nào tốt', 1),
    ('bật hệ thống tưới', 2),
    ('tắt máy bơm nước', 2),
    ('điều khiển cảm biến', 2),
    ('tưới nước cho rau', 3),
    ('bón phân cho cây', 3),
    ('thu hoạch sản phẩm', 3),
    ('phân tích dữ liệu farm', 4),
    ('thống kê sản lượng', 4),
    ('báo cáo tài chính', 4),
    ('thông tin về farm', 5),
    ('dữ liệu trang trại', 5),
    ('quản lý nông trại', 5),
    ('dữ liệu cảm biến', 6),
    ('thông tin nhiệt độ', 6),
    ('độ ẩm không khí', 6),
    ('tạo bản ghi mới', 7),
    ('thêm dữ liệu', 7),
    ('ghi nhận hoạt động', 7),
    ('cập nhật dữ liệu', 8),
    ('sửa thông tin', 8),
    ('chỉnh sửa record', 8),
    ('xóa bản ghi', 9),
    ('xóa dữ liệu', 9),
    ('remove record', 9),
]

df = pd.DataFrame(data, columns=['text', 'label'])
df.to_csv('intent_data.csv', index=False)
print('✅ Sample data created: intent_data.csv')
print(f'Total examples: {len(df)}')
"

echo.
echo 🚀 Starting training...
echo This may take 10-30 minutes depending on your hardware...
python train_intent.py

echo.
echo 🧪 Testing fine-tuned model...
python test_model.py

echo.
echo 🎉 Fine-tuning completed!
echo.
echo 📝 Next steps:
echo 1. Restart Python service: python src/main.py
echo 2. Test with: curl -X POST http://localhost:8000/intent/classify -H "Content-Type: application/json" -d "{\"text\": \"doanh thu tháng này\"}"
echo.
pause
