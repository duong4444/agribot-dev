import pandas as pd
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    TrainingArguments, 
    Trainer
)
# from datasets import Dataset
from sklearn.model_selection import train_test_split
import numpy as np

# 1. Load data
print("📊 Loading data...")
df = pd.read_csv('../data/intent_data.csv')
print(f"Total examples: {len(df)}")

# 2. Map string labels to integers
print("🔢 Mapping labels...")
unique_labels = sorted(df['label'].unique())
label_to_id = {label: idx for idx, label in enumerate(unique_labels)}
id_to_label = {idx: label for label, idx in label_to_id.items()}
print(f"Label mapping: {label_to_id}")

# Convert labels to integers
df['label_id'] = df['label'].map(label_to_id)

# 3. Split data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'].tolist(), 
    df['label_id'].tolist(), 
    test_size=0.2, 
    random_state=42,
    stratify=df['label_id'].tolist()
)

print(f"Train examples: {len(train_texts)}")
print(f"Validation examples: {len(val_texts)}")

# 4. Load model and tokenizer
print("🤖 Loading PhoBERT model...")
model_name = "vinai/phobert-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
num_labels = len(unique_labels)
print(f"Number of labels: {num_labels}")
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=num_labels
)

# 5. Tokenize data
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

# # 7. Training arguments
# training_args = TrainingArguments(
#     output_dir='../../models/intent_classifier',
#     num_train_epochs=3,
#     per_device_train_batch_size=16,
#     per_device_eval_batch_size=16,
#     warmup_steps=500,
#     weight_decay=0.01,
#     logging_dir='./logs',
#     logging_steps=10,
#     evaluation_strategy="steps",
#     eval_steps=100,
#     save_strategy="steps",
#     save_steps=100,
#     load_best_model_at_end=True,
#     metric_for_best_model="eval_loss",
#     greater_is_better=False,
# )

# 7. Training arguments
training_args = TrainingArguments(
    output_dir='../../models/intent_classifier',
    num_train_epochs=20,                  # <-- TĂNG LÊN 20
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=50,                  # <-- GIẢM TỪ 500 XUỐNG
    weight_decay=0.01,
    logging_dir='./logs',
    
    # --- Chiến lược đơn giản và hiệu quả hơn ---
    logging_strategy="epoch",         # Báo cáo log sau mỗi epoch
    evaluation_strategy="epoch",      # Chạy "kiểm tra" sau mỗi epoch
    save_strategy="epoch",            # Lưu model (nếu tốt hơn) sau mỗi epoch
    
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
)

# 8. Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
)

# 9. Train model
print("🚀 Starting training...")
trainer.train()

# 10. Save model
print("💾 Saving model...")
trainer.save_model()
tokenizer.save_pretrained('../../models/intent_classifier')

# Save label mapping
import json
with open('../../models/intent_classifier/label_mapping.json', 'w', encoding='utf-8') as f:
    json.dump({'label_to_id': label_to_id, 'id_to_label': id_to_label}, f, ensure_ascii=False, indent=2)

print("✅ Training completed!")
print("Model saved to: ../../models/intent_classifier")