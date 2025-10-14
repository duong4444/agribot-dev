"""
Simple Intent Classification Fine-tuning Script
For Vietnamese Agricultural Chatbot
"""

import pandas as pd
import torch
import os
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    TrainingArguments, 
    Trainer
)
from sklearn.model_selection import train_test_split
import numpy as np

# Intent labels mapping
INTENT_LABELS = [
    "financial_query",    # 0
    "crop_query",         # 1
    "device_control",     # 2
    "activity_query",     # 3
    "analytics_query",    # 4
    "farm_query",         # 5
    "sensor_query",       # 6
    "create_record",      # 7
    "update_record",      # 8
    "delete_record",      # 9
]

def create_sample_data():
    """Create sample training data"""
    data = [
        # Financial Query (0)
        ("doanh thu tháng này là bao nhiêu", 0),
        ("chi phí tưới tiêu tháng 3", 0),
        ("lợi nhuận từ cà chua", 0),
        ("tổng tiền thu được", 0),
        ("giá trị sản phẩm", 0),
        ("bao nhiêu tiền", 0),
        ("thu nhập từ farm", 0),
        ("chi phí sản xuất", 0),
        
        # Crop Query (1)
        ("cách trồng cà chua", 1),
        ("thời gian thu hoạch rau", 1),
        ("giống cây nào tốt", 1),
        ("kỹ thuật trồng lúa", 1),
        ("chăm sóc cây trồng", 1),
        ("hạt giống chất lượng", 1),
        ("cây trồng phù hợp", 1),
        ("thu hoạch sản phẩm", 1),
        
        # Device Control (2)
        ("bật hệ thống tưới", 2),
        ("tắt máy bơm nước", 2),
        ("điều khiển cảm biến", 2),
        ("kiểm tra thiết bị", 2),
        ("bật đèn chiếu sáng", 2),
        ("tắt hệ thống", 2),
        ("điều khiển máy móc", 2),
        ("kiểm tra thiết bị", 2),
        
        # Activity Query (3)
        ("tưới nước cho rau", 3),
        ("bón phân cho cây", 3),
        ("thu hoạch sản phẩm", 3),
        ("chăm sóc cây trồng", 3),
        ("hoạt động nông nghiệp", 3),
        ("tưới tiêu", 3),
        ("bón phân", 3),
        ("chăm sóc", 3),
        
        # Analytics Query (4)
        ("phân tích dữ liệu farm", 4),
        ("thống kê sản lượng", 4),
        ("báo cáo tài chính", 4),
        ("biểu đồ tăng trưởng", 4),
        ("analytics nông nghiệp", 4),
        ("thống kê", 4),
        ("báo cáo", 4),
        ("phân tích", 4),
        
        # Farm Query (5)
        ("thông tin về farm", 5),
        ("dữ liệu trang trại", 5),
        ("quản lý nông trại", 5),
        ("thông tin đất đai", 5),
        ("dữ liệu môi trường", 5),
        ("thông tin farm", 5),
        ("dữ liệu trang trại", 5),
        ("quản lý farm", 5),
        
        # Sensor Query (6)
        ("dữ liệu cảm biến", 6),
        ("thông tin nhiệt độ", 6),
        ("độ ẩm không khí", 6),
        ("dữ liệu môi trường", 6),
        ("thông tin thời tiết", 6),
        ("cảm biến", 6),
        ("nhiệt độ", 6),
        ("độ ẩm", 6),
        
        # Create Record (7)
        ("tạo bản ghi mới", 7),
        ("thêm dữ liệu", 7),
        ("ghi nhận hoạt động", 7),
        ("tạo report", 7),
        ("thêm thông tin", 7),
        ("tạo mới", 7),
        ("thêm", 7),
        ("ghi nhận", 7),
        
        # Update Record (8)
        ("cập nhật dữ liệu", 8),
        ("sửa thông tin", 8),
        ("chỉnh sửa record", 8),
        ("update thông tin", 8),
        ("thay đổi dữ liệu", 8),
        ("cập nhật", 8),
        ("sửa", 8),
        ("chỉnh sửa", 8),
        
        # Delete Record (9)
        ("xóa bản ghi", 9),
        ("xóa dữ liệu", 9),
        ("remove record", 9),
        ("xóa thông tin", 9),
        ("delete data", 9),
        ("xóa", 9),
        ("remove", 9),
        ("delete", 9),
    ]
    
    return pd.DataFrame(data, columns=['text', 'label'])

class IntentDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

def main():
    print("🚀 Starting Intent Classification Fine-tuning")
    print("=" * 50)
    
    # 1. Create or load data
    if os.path.exists('intent_data.csv'):
        print("📊 Loading existing data...")
        df = pd.read_csv('intent_data.csv')
    else:
        print("📊 Creating sample data...")
        df = create_sample_data()
        df.to_csv('intent_data.csv', index=False)
    
    print(f"Total examples: {len(df)}")
    print(f"Intent distribution:")
    print(df['label'].value_counts().sort_index())
    
    # 2. Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['text'].tolist(), 
        df['label'].tolist(), 
        test_size=0.2, 
        random_state=42
    )
    
    print(f"\nTrain examples: {len(train_texts)}")
    print(f"Validation examples: {len(val_texts)}")
    
    # 3. Load model and tokenizer
    print("\n🤖 Loading PhoBERT model...")
    model_name = "vinai/phobert-base"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(INTENT_LABELS)
    )
    
    # 4. Tokenize data
    print("🔤 Tokenizing data...")
    def tokenize_function(examples):
        return tokenizer(
            examples, 
            truncation=True, 
            padding=True, 
            max_length=256
        )
    
    train_encodings = tokenize_function(train_texts)
    val_encodings = tokenize_function(val_texts)
    
    # 5. Create datasets
    train_dataset = IntentDataset(train_encodings, train_labels)
    val_dataset = IntentDataset(val_encodings, val_labels)
    
    # 6. Training arguments
    training_args = TrainingArguments(
        output_dir='./models/intent_classifier',
        num_train_epochs=3,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=10,
        evaluation_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        save_steps=50,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to=None,  # Disable wandb
    )
    
    # 7. Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
    )
    
    # 8. Train model
    print("\n🚀 Starting training...")
    trainer.train()
    
    # 9. Save model
    print("\n💾 Saving model...")
    trainer.save_model()
    tokenizer.save_pretrained('./models/intent_classifier')
    
    print("\n✅ Training completed!")
    print("Model saved to: ./models/intent_classifier")
    
    # 10. Test model
    print("\n🧪 Testing model...")
    test_cases = [
        "doanh thu tháng này là bao nhiêu",
        "cách trồng cà chua",
        "bật hệ thống tưới",
        "tưới nước cho rau",
        "phân tích dữ liệu farm"
    ]
    
    for text in test_cases:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
        
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            predicted_class = torch.argmax(predictions, dim=-1).item()
            confidence = predictions[0][predicted_class].item()
        
        print(f"'{text}' → {INTENT_LABELS[predicted_class]} ({confidence:.3f})")

if __name__ == "__main__":
    main()
