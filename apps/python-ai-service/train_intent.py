"""
Simple Intent Classification Fine-tuning Script
For Vietnamese Agricultural Chatbot

Usage:
    python train_intent.py --data intent_data_augmented.csv
    python train_intent.py --data intent_data.csv --epochs 5
    python train_intent.py --help
"""

import pandas as pd
import torch
import os
import argparse
from pathlib import Path
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    TrainingArguments, 
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import numpy as np

# Intent labels mapping (UPDATED: 6 intents only)
INTENT_LABELS = [
    "knowledge_query",    # 0 - Hỏi đáp kiến thức nông nghiệp
    "financial_query",    # 1 - Hỏi về tài chính
    "analytics_query",    # 2 - Yêu cầu phân tích
    "device_control",     # 3 - Điều khiển thiết bị IoT
    "sensor_query",       # 4 - Hỏi dữ liệu cảm biến
    "unknown",            # 5 - Không xác định
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


def compute_metrics(pred):
    """Compute accuracy and F1 score for evaluation"""
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    
    acc = accuracy_score(labels, preds)
    f1 = f1_score(labels, preds, average='weighted')
    
    return {
        'accuracy': acc,
        'f1': f1
    }


def load_data(data_path: str) -> pd.DataFrame:
    """Load training data from CSV file"""
    if not Path(data_path).exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    print(f"📊 Loading data from: {data_path}")
    df = pd.read_csv(data_path)
    
    # Validate required columns
    if 'text' not in df.columns or 'label' not in df.columns:
        raise ValueError("CSV file must contain 'text' and 'label' columns")
    
    # Clean data
    initial_len = len(df)
    df = df.dropna(subset=['text', 'label'])
    df = df.drop_duplicates(subset=['text'])
    
    if len(df) < initial_len:
        print(f"   Cleaned data: {len(df)} samples (removed {initial_len - len(df)} duplicates/NaN)")
    
    return df


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Train Intent Classification Model",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        '--data',
        type=str,
        default='train/data/intent_data_augmented.csv',
        help='Path to training data CSV file (must have text and label columns)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='models/intent_classifier',
        help='Output directory for trained model'
    )
    
    parser.add_argument(
        '--epochs',
        type=int,
        default=10,
        help='Number of training epochs'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Batch size for training'
    )
    
    parser.add_argument(
        '--learning-rate',
        type=float,
        default=2e-5,
        help='Learning rate'
    )
    
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.2,
        help='Validation split ratio (0.0 to 1.0)'
    )
    
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility'
    )
    
    parser.add_argument(
        '--early-stopping-patience',
        type=int,
        default=3,
        help='Early stopping patience (stop if no improvement for N epochs)'
    )
    
    args = parser.parse_args()
    
    # Set random seed
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    
    print("🚀 Starting Intent Classification Fine-tuning")
    print("=" * 60)
    print(f"📁 Data file: {args.data}")
    print(f"📂 Output dir: {args.output}")
    print(f"🔄 Epochs: {args.epochs}")
    print(f"📦 Batch size: {args.batch_size}")
    print(f"📈 Learning rate: {args.learning_rate}")
    print(f"🛑 Early stopping patience: {args.early_stopping_patience} epochs")
    print("=" * 60)
    
    # 1. Load data
    try:
        df = load_data(args.data)
    except (FileNotFoundError, ValueError) as e:
        print(f"❌ Error loading data: {e}")
        
        # Fallback to sample data if file not found
        if "not found" in str(e).lower():
            print("📊 Creating sample data as fallback...")
            df = create_sample_data()
            sample_path = 'intent_data_sample.csv'
            df.to_csv(sample_path, index=False)
            print(f"   Sample data saved to: {sample_path}")
        else:
            return 1
    
    print(f"✓ Total examples: {len(df)}")
    
    # Show label distribution
    label_counts = df['label'].value_counts().sort_index()
    print(f"✓ Intent distribution:")
    for label, count in label_counts.items():
        print(f"   {label}: {count} samples")
    
    # Map string labels to integers if needed
    if df['label'].dtype == 'object':
        unique_labels = sorted(df['label'].unique())
        label_to_id = {label: idx for idx, label in enumerate(unique_labels)}
        df['label_id'] = df['label'].map(label_to_id)
        print(f"✓ Mapped {len(unique_labels)} string labels to integers")
        label_column = 'label_id'
        num_labels = len(unique_labels)
    else:
        label_column = 'label'
        num_labels = len(INTENT_LABELS)
    
    # 2. Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['text'].tolist(), 
        df[label_column].tolist(), 
        test_size=args.test_size, 
        random_state=args.seed,
        stratify=df[label_column].tolist() if len(df) > 10 else None
    )
    
    print(f"\n✂️  Data split:")
    print(f"   Train examples: {len(train_texts)}")
    print(f"   Validation examples: {len(val_texts)}")
    
    # 3. Load model and tokenizer
    print(f"\n🤖 Loading PhoBERT model...")
    model_name = "vinai/phobert-base"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=num_labels
    )
    print(f"   Model loaded with {num_labels} output labels")
    
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
    print("   Tokenization completed")
    
    # 5. Create datasets
    print("📦 Creating datasets...")
    train_dataset = IntentDataset(train_encodings, train_labels)
    val_dataset = IntentDataset(val_encodings, val_labels)
    print("   Datasets created")
    
    # 6. Training arguments
    print(f"\n⚙️  Setting up training...")
    
    # Create output directory
    Path(args.output).mkdir(parents=True, exist_ok=True)
    
    training_args = TrainingArguments(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        warmup_ratio=0.1,
        weight_decay=0.01,
        
        # Logging
        logging_dir=f'{args.output}/logs',
        logging_strategy="epoch",
        
        # Evaluation
        evaluation_strategy="epoch",
        
        # Saving
        save_strategy="epoch",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="loss",  # Theo dõi eval_loss
        greater_is_better=False,  # Loss càng thấp càng tốt
        
        # Performance
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=0,
        
        # Misc
        report_to=None,  # Disable wandb
        seed=args.seed,
    )
    
    print(f"   Output directory: {args.output}")
    print(f"   Training epochs: {args.epochs}")
    print(f"   Batch size: {args.batch_size}")
    print(f"   Learning rate: {args.learning_rate}")
    print(f"   Metric for best model: eval_loss (lower is better)")
    print(f"   Early stopping patience: {args.early_stopping_patience} epochs")
    
    # 7. Create trainer with early stopping
    print("🎯 Creating trainer...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=args.early_stopping_patience)],
    )
    print(f"   Trainer created with early stopping (patience={args.early_stopping_patience})")
    
    # 8. Train model
    print("\n" + "=" * 60)
    print("🚀 STARTING TRAINING...")
    print("=" * 60)
    trainer.train()
    
    # 9. Evaluate final model
    print("\n" + "=" * 60)
    print("📊 FINAL EVALUATION")
    print("=" * 60)
    
    eval_results = trainer.evaluate()
    print(f"\n✓ Final Results:")
    print(f"   Accuracy: {eval_results['eval_accuracy']:.4f}")
    print(f"   F1 Score: {eval_results['eval_f1']:.4f}")
    print(f"   Loss: {eval_results['eval_loss']:.4f}")
    
    # 10. Save model
    print(f"\n💾 Saving model to: {args.output}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output)
    
    # Save label mapping if we created one
    if df['label'].dtype == 'object':
        import json
        label_mapping_path = Path(args.output) / 'label_mapping.json'
        with open(label_mapping_path, 'w', encoding='utf-8') as f:
            json.dump({
                'label_to_id': label_to_id,
                'id_to_label': {v: k for k, v in label_to_id.items()},
                'num_labels': num_labels
            }, f, ensure_ascii=False, indent=2)
        print(f"   Label mapping saved to: {label_mapping_path}")
    
    print("\n✅ Training completed successfully!")
    
    # 11. Test model with sample queries
    print("\n🧪 Testing model with sample queries...")
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
        
        # Get label name
        if df['label'].dtype == 'object':
            predicted_label = [k for k, v in label_to_id.items() if v == predicted_class][0]
        else:
            predicted_label = INTENT_LABELS[predicted_class] if predicted_class < len(INTENT_LABELS) else f"class_{predicted_class}"
            
        print(f"   '{text}' → {predicted_label} ({confidence:.3f})")
    
    print("\n" + "=" * 60)
    print("🎉 ALL DONE!")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    exit(main())
