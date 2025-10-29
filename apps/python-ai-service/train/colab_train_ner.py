"""
🌾 Smart Agriculture NER Training for Google Colab
==================================================

Copy this entire file content and paste into a new Google Colab cell.
Then run it!

Setup:
1. Go to https://colab.research.google.com/
2. Runtime → Change runtime type → T4 GPU
3. Copy this file content into a code cell
4. Upload your ner_data_augmented.csv when prompted
5. Run the cell
6. Wait ~40-60 minutes
7. Download the model ZIP file

"""

# ========================================
# STEP 1: Check GPU
# ========================================
print("="*60)
print("  STEP 1: CHECKING GPU")
print("="*60)

import torch
print(f"\nGPU Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
else:
    print("\n⚠️  WARNING: No GPU detected!")
    print("Go to: Runtime → Change runtime type → T4 GPU\n")

# ========================================
# STEP 2: Install Dependencies
# ========================================
print("\n" + "="*60)
print("  STEP 2: INSTALLING DEPENDENCIES")
print("="*60 + "\n")

import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package])

packages = [
    "transformers>=4.35.0",  # Use latest stable instead of pinned version
    "datasets",
    "accelerate",
    "sentencepiece",
    "seqeval",
    "scikit-learn"
]

print("NOTE: Using Colab's pre-installed packages when possible...")
for pkg in packages:
    print(f"Installing {pkg}...")
    install(pkg)

print("\n✓ All dependencies installed!")

# ========================================
# STEP 3: Upload Data
# ========================================
print("\n" + "="*60)
print("  STEP 3: DATA UPLOAD")
print("="*60 + "\n")

from google.colab import files
import os
import pandas as pd

print("Please upload your ner_data_augmented.csv file")
print("(Click 'Choose Files' button below)\n")

uploaded = files.upload()

# Find and rename NER data file
data_file = None
for filename in uploaded.keys():
    if 'ner' in filename.lower() and filename.endswith('.csv'):
        os.rename(filename, 'ner_data_augmented.csv')
        data_file = 'ner_data_augmented.csv'
        print(f"\n✓ Uploaded: {filename} → {data_file}")
        break

if not data_file:
    print("\n❌ ERROR: No NER data file found!")
    print("Please upload a CSV file with 'ner' in the name.")
    raise SystemExit(1)

# Verify data
df = pd.read_csv(data_file, encoding='utf-8')
print(f"\n✓ Data loaded: {len(df)} samples")
print(f"✓ Columns: {list(df.columns)}")

if 'text' not in df.columns or 'entities' not in df.columns:
    print("\n❌ ERROR: Data must have 'text' and 'entities' columns!")
    raise SystemExit(1)

print("\nData preview:")
print(df.head(2))

# ========================================
# STEP 4: Prepare Training
# ========================================
print("\n" + "="*60)
print("  STEP 4: PREPARING TRAINING")
print("="*60 + "\n")

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
from seqeval.metrics import f1_score, precision_score, recall_score

# Define entity labels (BIO format)
ENTITY_TYPES = [
    "CROP_NAME", "DEVICE", "SENSOR_TYPE", "METRIC_VALUE",
    "DATE", "MONEY", "DURATION", "AREA",
    "QUANTITY", "ACTIVITY", "FERTILIZER", "PESTICIDE",
    "TECHNIQUE", "SEASON"
]

# Create BIO labels
label_list = ["O"]  # Outside
for entity_type in ENTITY_TYPES:
    label_list.append(f"B-{entity_type}")  # Begin
    label_list.append(f"I-{entity_type}")  # Inside

label_to_id = {label: idx for idx, label in enumerate(label_list)}
id_to_label = {idx: label for label, idx in label_to_id.items()}

print(f"Total labels: {len(label_list)}")
print(f"Entity types: {len(ENTITY_TYPES)}")

# Parse entities function
def parse_entities(text, entities_json):
    """Parse entity annotations."""
    try:
        entities = json.loads(entities_json)
    except json.JSONDecodeError:
        return []

    parsed_entities = []
    for entity in entities:
        try:
            start = int(entity["start"])
            end = int(entity["end"])
            entity_type = entity["type"].upper()
            start = max(0, min(len(text), start))
            end = max(start, min(len(text), end))
            parsed_entities.append({
                "start": start,
                "end": end,
                "type": entity_type
            })
        except (KeyError, ValueError, TypeError):
            continue

    parsed_entities.sort(key=lambda ent: ent["start"])
    return parsed_entities

# Parse all entities
print("\nParsing entities...")
texts = df['text'].tolist()
all_entities = []

for idx, row in df.iterrows():
    entities = parse_entities(row['text'], row['entities'])
    all_entities.append(entities)

print(f"✓ Parsed {len(all_entities)} examples")

# Load PhoBERT
print("\nLoading PhoBERT model...")
model_name = "vinai/phobert-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name,
    num_labels=len(label_list),
    id2label=id_to_label,
    label2id=label_to_id
)
print(f"✓ Model loaded: {model_name}")
print(f"✓ Parameters: {model.num_parameters():,}")

# Split dataset
train_texts, val_texts, train_entities, val_entities = train_test_split(
    texts, all_entities, test_size=0.2, random_state=42
)

print(f"\nDataset split:")
print(f"  Train: {len(train_texts)} samples")
print(f"  Validation: {len(val_texts)} samples")

# Create NER Dataset with proper BIO label alignment
class NERDataset(torch.utils.data.Dataset):
    def __init__(self, texts, entities, tokenizer, label_to_id, max_length=128):
        self.texts = texts
        self.entities = entities
        self.tokenizer = tokenizer
        self.label_to_id = label_to_id
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        entities = self.entities[idx]
        
        # Tokenize text
        encoding = self.tokenizer(
            text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        # Get tokens to manually compute offsets (PhoBERT doesn't support return_offsets_mapping)
        tokens = self.tokenizer.convert_ids_to_tokens(encoding['input_ids'].squeeze().tolist())
        
        # Initialize all labels as "O" (outside entity)
        label_ids = [self.label_to_id["O"]] * self.max_length
        
        # Manually compute token positions in original text
        # This is a simplified approach that works with PhoBERT's tokenization
        current_pos = 0
        token_char_positions = []
        
        for token_idx, token in enumerate(tokens):
            # Skip special tokens
            if token in ['<s>', '</s>', '<pad>']:
                token_char_positions.append((0, 0))  # Mark as special token
                continue
            
            # Clean token (remove BPE markers like @@)
            clean_token = token.replace('@@', '').replace('_', ' ').strip()
            
            if not clean_token:
                token_char_positions.append((current_pos, current_pos))
                continue
            
            # Find token in text starting from current position
            token_start = text.find(clean_token, current_pos)
            if token_start == -1:
                # Token not found, approximate position
                token_char_positions.append((current_pos, current_pos + len(clean_token)))
                current_pos += len(clean_token)
            else:
                token_end = token_start + len(clean_token)
                token_char_positions.append((token_start, token_end))
                current_pos = token_end
        
        # Align entities with tokens using computed positions
        for entity in entities:
            entity_start = entity["start"]
            entity_end = entity["end"]
            entity_type = entity["type"]
            
            # Find tokens that overlap with this entity
            entity_token_start = None
            entity_token_end = None
            
            for token_idx, (token_start, token_end) in enumerate(token_char_positions):
                # Skip special tokens (position is (0, 0))
                if token_start == 0 and token_end == 0:
                    continue
                
                # Check if token overlaps with entity
                if token_start < entity_end and token_end > entity_start:
                    if entity_token_start is None:
                        entity_token_start = token_idx
                    entity_token_end = token_idx
            
            # Assign BIO labels
            if entity_token_start is not None:
                # First token gets B- (Begin) label
                b_label = f"B-{entity_type}"
                if b_label in self.label_to_id:
                    label_ids[entity_token_start] = self.label_to_id[b_label]
                
                # Subsequent tokens get I- (Inside) label
                i_label = f"I-{entity_type}"
                if i_label in self.label_to_id:
                    for token_idx in range(entity_token_start + 1, entity_token_end + 1):
                        label_ids[token_idx] = self.label_to_id[i_label]
        
        # Mark special tokens with -100 to ignore in loss
        for token_idx, (token_start, token_end) in enumerate(token_char_positions):
            if token_start == 0 and token_end == 0:
                label_ids[token_idx] = -100
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(label_ids, dtype=torch.long)
        }

train_dataset = NERDataset(train_texts, train_entities, tokenizer, label_to_id)
val_dataset = NERDataset(val_texts, val_entities, tokenizer, label_to_id)

print(f"\n✓ Datasets created")

# Define metrics
def compute_metrics(pred):
    predictions, labels = pred
    predictions = np.argmax(predictions, axis=2)
    
    true_labels = []
    true_predictions = []
    
    for prediction, label in zip(predictions, labels):
        true_label = []
        true_pred = []
        for p, l in zip(prediction, label):
            if l != -100:
                true_label.append(id_to_label[l])
                true_pred.append(id_to_label[p])
        true_labels.append(true_label)
        true_predictions.append(true_pred)
    
    return {
        "precision": precision_score(true_labels, true_predictions),
        "recall": recall_score(true_labels, true_predictions),
        "f1": f1_score(true_labels, true_predictions),
    }

print("✓ Metrics function defined")

# ========================================
# STEP 5: TRAIN MODEL
# ========================================
print("\n" + "="*60)
print("  STEP 5: TRAINING MODEL")
print("="*60 + "\n")

# Training arguments - optimized for T4 GPU
training_args_kwargs = dict(
    output_dir='./ner_model',
    num_train_epochs=15,  # Reduced from 30 for faster training
    per_device_train_batch_size=32,  # Increased for better GPU utilization
    per_device_eval_batch_size=32,
    warmup_ratio=0.1,
    weight_decay=0.01,
    learning_rate=3e-5,  # Slightly higher for faster convergence
    logging_dir='./logs',
    logging_steps=50,  # More frequent logging
    save_strategy="epoch",
    save_total_limit=2,  # Keep only 2 best checkpoints to save space
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,
    report_to="none",
    fp16=torch.cuda.is_available(),  # Mixed precision for faster training
    gradient_accumulation_steps=1,
    dataloader_num_workers=2,  # Parallel data loading
)

if "evaluation_strategy" in TrainingArguments.__dataclass_fields__:
    training_args_kwargs["evaluation_strategy"] = "epoch"
else:
    training_args_kwargs["eval_strategy"] = "epoch"

training_args = TrainingArguments(**training_args_kwargs)

# Create trainer
data_collator = DataCollatorForTokenClassification(tokenizer)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
)

print("Training configuration:")
print(f"  Epochs: {training_args.num_train_epochs}")
print(f"  Batch size: {training_args.per_device_train_batch_size}")
print(f"  Learning rate: {training_args.learning_rate}")
print(f"  Early stopping: 3 epochs patience")
print(f"  Mixed precision (FP16): {training_args.fp16}")
print(f"  Device: {'GPU' if torch.cuda.is_available() else 'CPU'}")
print(f"\nOptimizations:")
print(f"  ✓ Proper BIO label alignment")
print(f"  ✓ Larger batch size for GPU efficiency")
print(f"  ✓ Mixed precision training")
print(f"  ✓ Parallel data loading")
print(f"\nExpected time: 20-30 minutes on T4 GPU")
print("\nStarting training...\n")

# Train
train_result = trainer.train()

print("\n" + "="*60)
print("  TRAINING COMPLETED!")
print("="*60)

# ========================================
# STEP 6: EVALUATE
# ========================================
print("\n" + "="*60)
print("  STEP 6: EVALUATING MODEL")
print("="*60 + "\n")

eval_results = trainer.evaluate()

print("FINAL VALIDATION RESULTS:")
print("-" * 60)
for key, value in eval_results.items():
    print(f"  {key:.<40} {value:.4f}")
print("-" * 60)

f1 = eval_results.get('eval_f1', 0)
if f1 >= 0.90:
    print("\n🎉 EXCELLENT MODEL! F1 >= 0.90")
elif f1 >= 0.85:
    print("\n✅ GOOD MODEL! F1 >= 0.85")
elif f1 >= 0.75:
    print("\n✓ ACCEPTABLE MODEL! F1 >= 0.75")
else:
    print(f"\n⚠️  Model F1 score: {f1:.4f}")
    print("   Consider: more training data, longer training, or hyperparameter tuning")

# ========================================
# STEP 7: SAVE & DOWNLOAD
# ========================================
print("\n" + "="*60)
print("  STEP 7: SAVING & DOWNLOADING MODEL")
print("="*60 + "\n")

# Save model
print("Saving model...")
trainer.save_model('./ner_model_final')
tokenizer.save_pretrained('./ner_model_final')

# Save label mapping
with open('./ner_model_final/label_mapping.json', 'w', encoding='utf-8') as f:
    json.dump({
        'label_to_id': label_to_id,
        'id_to_label': id_to_label,
        'entity_types': ENTITY_TYPES,
        'f1_score': float(f1)
    }, f, ensure_ascii=False, indent=2)

print("✓ Model saved to: ./ner_model_final")

# List files
files_list = os.listdir('./ner_model_final')
print(f"\nSaved files ({len(files_list)}):")
for f in sorted(files_list):
    size = os.path.getsize(f'./ner_model_final/{f}')
    print(f"  {f:.<50} {size/1e6:>8.2f} MB")

# Create ZIP
print("\nCreating ZIP file...")
import subprocess
subprocess.run(['zip', '-r', '-q', 'ner_model_final.zip', './ner_model_final'])
zip_size = os.path.getsize('ner_model_final.zip')
print(f"✓ Created: ner_model_final.zip ({zip_size/1e6:.2f} MB)")

# Download
print("\nDownloading model...")
from google.colab import files
files.download('ner_model_final.zip')

print("\n" + "="*60)
print("  ✅ SUCCESS! MODEL READY TO USE")
print("="*60)
print("\nNext steps:")
print("  1. Extract ner_model_final.zip on your computer")
print("  2. Copy extracted folder to:")
print("     apps/python-ai-service/models/ner_extractor")
print("  3. Test with: python test_model.py")
print("  4. Deploy to production")
print("\n" + "="*60)

