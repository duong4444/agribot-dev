import pandas as pd
import torch
import argparse
import json
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


def compute_metrics(pred):
    """Compute accuracy and F1 score"""
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    acc = accuracy_score(labels, preds)
    f1 = f1_score(labels, preds, average='weighted')
    return {'accuracy': acc, 'f1': f1}


def main():
    # Parse arguments
    parser = argparse.ArgumentParser(description='Train Intent Classification Model')
    parser.add_argument('--data', type=str, default='../data/intent_data_augmented.csv',
                        help='Path to CSV data file')
    parser.add_argument('--output', type=str, default='../../models/intent_classifier',
                        help='Output directory for model')
    parser.add_argument('--epochs', type=int, default=10,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16,
                        help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=2e-5,
                        help='Learning rate')
    parser.add_argument('--early-stopping-patience', type=int, default=3,
                        help='Early stopping patience (epochs without improvement)')
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 Intent Classification Training")
    print("=" * 60)
    print(f"📁 Data file: {args.data}")
    print(f"📂 Output: {args.output}")
    print(f"🔄 Epochs: {args.epochs}")
    print(f"📦 Batch size: {args.batch_size}")
    print(f"🛑 Early stopping patience: {args.early_stopping_patience} epochs")
    print("=" * 60)

    # 1. Load data
    print("\n📊 Loading data...")
    if not Path(args.data).exists():
        print(f"❌ Error: File not found: {args.data}")
        return 1
    
    df = pd.read_csv(args.data)
    print(f"✓ Total examples: {len(df)}")

    # 2. Map string labels to integers
    print("\n🔢 Mapping labels...")
    unique_labels = sorted(df['label'].unique())
    label_to_id = {label: idx for idx, label in enumerate(unique_labels)}
    id_to_label = {idx: label for label, idx in label_to_id.items()}
    num_labels = len(unique_labels)
    
    print(f"✓ Found {num_labels} unique labels:")
    for label, idx in label_to_id.items():
        count = len(df[df['label'] == label])
        print(f"   {idx:2d}. {label:20s} ({count:4d} samples)")

    # Convert labels to integers
    df['label_id'] = df['label'].map(label_to_id)

    # 3. Split data
    print("\n✂️  Splitting data...")
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['text'].tolist(), 
        df['label_id'].tolist(), 
        test_size=0.2, 
        random_state=42,
        stratify=df['label_id'].tolist()
    )

    print(f"✓ Train examples: {len(train_texts)}")
    print(f"✓ Validation examples: {len(val_texts)}")

    # 4. Load model and tokenizer
    print("\n🤖 Loading PhoBERT model...")
    model_name = "vinai/phobert-base"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=num_labels
    )
    print(f"✓ Model loaded with {num_labels} output labels")

    # 5. Tokenize data
    print("\n🔤 Tokenizing data...")
    def tokenize_function(examples):
        return tokenizer(
            examples, 
            truncation=True, 
            padding=True, 
            max_length=256
        )

    train_encodings = tokenize_function(train_texts)
    val_encodings = tokenize_function(val_texts)
    print("✓ Tokenization completed")

    # 6. Create datasets
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

    train_dataset = IntentDataset(train_encodings, train_labels)
    val_dataset = IntentDataset(val_encodings, val_labels)
    print("✓ Datasets created")

    # 7. Training arguments
    print("\n⚙️  Setting up training...")
    Path(args.output).mkdir(parents=True, exist_ok=True)
    
    training_args = TrainingArguments(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        warmup_ratio=0.1,
        weight_decay=0.01,
        
        # Logging & Evaluation
        logging_dir=f'{args.output}/logs',
        logging_strategy="epoch",
        evaluation_strategy="epoch",
        
        # Saving
        save_strategy="epoch",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="loss",  # Theo dõi eval_loss
        greater_is_better=False,  # Loss càng thấp càng tốt
        
        # Performance
        fp16=torch.cuda.is_available(),
        report_to=None,
    )
    print(f"✓ Training configured: {args.epochs} epochs, batch size {args.batch_size}")
    print(f"✓ Early stopping: Stop if eval_loss doesn't improve for {args.early_stopping_patience} epochs")

    # 8. Create trainer with early stopping
    print("\n🎯 Creating trainer...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=args.early_stopping_patience)],
    )
    print(f"✓ Trainer created with early stopping (patience={args.early_stopping_patience})")

    # 9. Train model
    print("\n" + "=" * 60)
    print("🚀 STARTING TRAINING...")
    print("=" * 60)
    trainer.train()

    # 10. Evaluate
    print("\n" + "=" * 60)
    print("📊 FINAL EVALUATION")
    print("=" * 60)
    eval_results = trainer.evaluate()
    print(f"\n✓ Final Results:")
    print(f"   Accuracy: {eval_results['eval_accuracy']:.4f}")
    print(f"   F1 Score: {eval_results['eval_f1']:.4f}")
    print(f"   Loss: {eval_results['eval_loss']:.4f}")

    # 11. Save model
    print(f"\n💾 Saving model to: {args.output}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output)

    # Save label mapping
    label_mapping_path = Path(args.output) / 'label_mapping.json'
    with open(label_mapping_path, 'w', encoding='utf-8') as f:
        json.dump({
            'label_to_id': label_to_id, 
            'id_to_label': id_to_label,
            'num_labels': num_labels
        }, f, ensure_ascii=False, indent=2)
    print(f"✓ Label mapping saved to: {label_mapping_path}")

    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    exit(main())