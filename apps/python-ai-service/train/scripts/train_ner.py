import pandas as pd
import torch
import json
import numpy as np
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from seqeval.metrics import f1_score, precision_score, recall_score, classification_report

# 1. Load data
print("📊 Loading NER data...")
try:
    df = pd.read_csv('../data/ner_data.csv', encoding='utf-8')
    print(f"✅ Successfully loaded {len(df)} examples")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    raise

# 2. Define entity labels (BIO format)
ENTITY_TYPES = [
    "CROP_NAME",      # Tên cây trồng
    "DEVICE",         # Thiết bị IoT
    "SENSOR_TYPE",    # Loại cảm biến
    "METRIC_VALUE",   # Giá trị đo
    "DATE",           # Thời gian
    "MONEY",          # Tiền tệ
    "DURATION",       # Thời lượng
    "AREA",           # Khu vực
    "QUANTITY",       # Số lượng
    "ACTIVITY",       # Hoạt động
    "FERTILIZER",     # Phân bón
    "PESTICIDE",      # Thuốc trừ sâu
    "TECHNIQUE",      # Kỹ thuật
    "SEASON",         # Mùa vụ
]

# Create BIO labels
label_list = ["O"]  # Outside
for entity_type in ENTITY_TYPES:
    label_list.append(f"B-{entity_type}")  # Begin
    label_list.append(f"I-{entity_type}")  # Inside

label_to_id = {label: idx for idx, label in enumerate(label_list)}
id_to_label = {idx: label for label, idx in label_to_id.items()}

print(f"Total labels: {len(label_list)}")
print(f"Label mapping: {label_to_id}")

# 3. Parse entities from JSON strings
def parse_entities(text, entities_json):
    """Parse entity annotations ensuring numeric offsets and uppercase types."""
    try:
        entities = json.loads(entities_json)
    except json.JSONDecodeError as exc:
        print(f"⚠️  Invalid entity JSON for text: {text[:30]}... Error: {exc}")
        return []

    parsed_entities = []
    for entity in entities:
        try:
            start = int(entity["start"])
            end = int(entity["end"])
            entity_type = entity["type"].upper()
            # Clamp offsets to text boundaries
            start = max(0, min(len(text), start))
            end = max(start, min(len(text), end))
            parsed_entities.append({
                "start": start,
                "end": end,
                "type": entity_type
            })
        except (KeyError, ValueError, TypeError) as exc:
            print(f"⚠️  Skipping malformed entity {entity}: {exc}")

    # Sort entities by start offset to ease alignment later
    parsed_entities.sort(key=lambda ent: ent["start"])
    return parsed_entities

# 4. Prepare dataset
print("🔤 Preparing dataset...")
texts = df['text'].tolist()
all_entities = []

for idx, row in df.iterrows():
    try:
        entities = parse_entities(row['text'], row['entities'])
        all_entities.append(entities)
    except Exception as e:
        print(f"Error parsing row {idx}: {e}")
        all_entities.append([])

# 5. Load tokenizer and model
print("🤖 Loading PhoBERT model...")
model_name = "vinai/phobert-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# For NER, we need token classification
num_labels = len(label_list)
print(f"Number of labels: {num_labels}")

model = AutoModelForTokenClassification.from_pretrained(
    model_name,
    num_labels=num_labels
)

# 6. Split data
train_texts, val_texts, train_entities, val_entities = train_test_split(
    texts, all_entities, test_size=0.2, random_state=42
)

print(f"Train examples: {len(train_texts)}")
print(f"Validation examples: {len(val_texts)}")

# 8. Create datasets with manual offset calculation for PhoBERT
class NERDataset(torch.utils.data.Dataset):
    def __init__(self, texts, entities, tokenizer, label_to_id, max_length: int = 256):
        self.texts = texts
        self.entities = entities
        self.tokenizer = tokenizer
        self.label_to_id = label_to_id
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def _align_labels_with_tokens(self, text, entities, input_ids):
        """Manually align entity labels with PhoBERT tokens"""
        label_ids = [-100] * len(input_ids)  # -100 = ignore in loss
        
        # Create character-level entity map
        char_labels = ['O'] * len(text)
        for entity in entities:
            start = entity['start']
            end = entity['end']
            entity_type = entity['type'].upper()
            
            if start < len(text) and end <= len(text):
                char_labels[start] = f"B-{entity_type}"
                for i in range(start + 1, end):
                    if i < len(text):
                        char_labels[i] = f"I-{entity_type}"
        
        # Match tokens to characters
        current_pos = 0
        for idx, token_id in enumerate(input_ids):
            # Skip special tokens
            if token_id in [self.tokenizer.bos_token_id, 
                           self.tokenizer.eos_token_id, 
                           self.tokenizer.pad_token_id]:
                continue
            
            # Decode token
            token = self.tokenizer.decode([token_id], skip_special_tokens=True).strip()
            if not token:
                continue
            
            # Remove PhoBERT's underscore prefix
            token_clean = token.replace('_', ' ').strip()
            
            # Find token in text
            token_start = text.lower().find(token_clean.lower(), current_pos)
            if token_start == -1:
                # Token not found, label as O
                label_ids[idx] = self.label_to_id.get('O', 0)
                continue
            
            # Get label from first character of token
            label = char_labels[token_start] if token_start < len(char_labels) else 'O'
            label_ids[idx] = self.label_to_id.get(label, self.label_to_id.get('O', 0))
            
            # Update position
            current_pos = token_start + len(token_clean)
        
        return label_ids
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        entities = self.entities[idx]
        
        # Tokenize (PhoBERT doesn't support return_offsets_mapping)
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].squeeze().tolist()
        
        # Align labels manually
        label_ids = self._align_labels_with_tokens(text, entities, input_ids)
        
        # Pad labels to max_length if needed
        if len(label_ids) < self.max_length:
            label_ids += [-100] * (self.max_length - len(label_ids))
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(label_ids[:self.max_length], dtype=torch.long)
        }

train_dataset = NERDataset(train_texts, train_entities, tokenizer, label_to_id)
val_dataset = NERDataset(val_texts, val_entities, tokenizer, label_to_id)

# 9. Define metrics for evaluation
def compute_metrics(pred):
    """Compute F1, precision, recall for NER"""
    predictions, labels = pred
    predictions = np.argmax(predictions, axis=2)
    
    # Remove ignored index (-100) and convert to labels
    true_labels = []
    true_predictions = []
    
    for prediction, label in zip(predictions, labels):
        true_label = []
        true_pred = []
        for p, l in zip(prediction, label):
            if l != -100:  # Ignore special tokens
                true_label.append(id_to_label[l])
                true_pred.append(id_to_label[p])
        true_labels.append(true_label)
        true_predictions.append(true_pred)
    
    return {
        "precision": precision_score(true_labels, true_predictions),
        "recall": recall_score(true_labels, true_predictions),
        "f1": f1_score(true_labels, true_predictions),
    }

# 10. Training arguments (tối ưu)
training_args = TrainingArguments(
    output_dir='../../models/ner_extractor',
    num_train_epochs=30,  # Tăng epochs
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_ratio=0.1,  # 10% warmup
    weight_decay=0.01,
    learning_rate=2e-5,  # Lower LR cho stable training
    logging_dir='./logs',
    logging_steps=50,
    logging_strategy="steps",
    evaluation_strategy="epoch",
    save_strategy="epoch",  # Save mỗi epoch để có thể load best model
    save_total_limit=3,  # Chỉ giữ 3 checkpoints gần nhất
    load_best_model_at_end=True,
    save_safetensors=False,
    metric_for_best_model="f1",  # Dùng F1 score thay vì loss
    greater_is_better=True,
    report_to="none",  # Tắt wandb/tensorboard logging
    fp16=torch.cuda.is_available(),  # Mixed precision nếu có GPU
)

# 11. Create trainer với metrics và early stopping
data_collator = DataCollatorForTokenClassification(tokenizer)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]  # Stop nếu không cải thiện sau 3 epochs
)

# 12. Train model
print("🚀 Starting NER training...")
print(f"Train examples: {len(train_dataset)}")
print(f"Validation examples: {len(val_dataset)}")
print(f"Training for {training_args.num_train_epochs} epochs with early stopping")
print(f"Using device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
print("-" * 60)

train_result = trainer.train()

# 13. Evaluate final model
print("\n📊 Evaluating final model...")
eval_results = trainer.evaluate()
print(f"Final validation results:")
for key, value in eval_results.items():
    print(f"  {key}: {value:.4f}")

# 14. Save best model
print("\n💾 Saving best NER model...")
trainer.save_model()
tokenizer.save_pretrained('../../models/ner_extractor')

# Save label mapping
with open('../../models/ner_extractor/label_mapping.json', 'w', encoding='utf-8') as f:
    json.dump({
        'label_to_id': label_to_id,
        'id_to_label': id_to_label,
        'entity_types': ENTITY_TYPES
    }, f, ensure_ascii=False, indent=2)

print("✅ NER training completed!")
print("Model saved to: ../../models/ner_extractor")
