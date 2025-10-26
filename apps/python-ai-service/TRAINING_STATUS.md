# NER Training Status

## ⚠️ Model Not Trained Yet

The NER model exists in `models/ner_extractor/` but it's **NOT trained**. It's just the base PhoBERT model without NER fine-tuning.

### Why NER Extraction Returns 0 Entities:
- The model file (`pytorch_model.bin`) exists but contains untrained weights
- Training failed at epoch 1 due to disk space errors
- An untrained model will predict mostly "O" (Outside/No entity) labels

### What You Need to Do:

1. **Run the training script** (updated to avoid disk errors):
   ```powershell
   cd c:\Users\ADMIN\Desktop\ex\apps\python-ai-service
   .\venv\Scripts\Activate.ps1
   cd train\scripts
   python train_ner.py
   ```

2. **Training will**:
   - Load 948 training examples ✅
   - Train for 10 epochs (~45-60 minutes)
   - NOT save checkpoints during training (to avoid disk errors)
   - Save the final trained model at the end

3. **After training completes**:
   - Restart your FastAPI server
   - NER extraction will work properly
   - Entities will be detected: CROP_NAME, DEVICE, AREA, DATE, MONEY, etc.

### Current Configuration:
- ✅ CSV data fixed (948 examples)
- ✅ JSON parsing errors resolved
- ✅ Training script configured to avoid disk space issues
- ⚠️ **Training not completed yet**

### Expected Results After Training:
```json
{
  "text": "tưới cây cà chua ở luống A",
  "entities": [
    {
      "type": "crop_name",
      "value": "cà chua",
      "start": 9,
      "end": 16
    },
    {
      "type": "area",
      "value": "luống A",
      "start": 20,
      "end": 27
    }
  ]
}
```

## Next Step: **Train the model!**
