"""
Quick script to check if NER model has been trained
"""
import torch
from pathlib import Path

model_path = Path("models/ner_extractor/pytorch_model.bin")

if not model_path.exists():
    print("❌ Model file not found!")
    exit(1)

print("📦 Loading model weights...")
state_dict = torch.load(model_path, map_location='cpu')

# Check classifier layer (this is what gets trained for NER)
if 'classifier.weight' in state_dict:
    classifier_weight = state_dict['classifier.weight']
    
    # Check if weights look random (untrained) or learned (trained)
    # Untrained weights are typically small random values near 0
    weight_mean = classifier_weight.abs().mean().item()
    weight_std = classifier_weight.std().item()
    weight_max = classifier_weight.abs().max().item()
    
    print(f"\n📊 Classifier Layer Statistics:")
    print(f"   Shape: {classifier_weight.shape}")
    print(f"   Mean absolute value: {weight_mean:.6f}")
    print(f"   Std deviation: {weight_std:.6f}")
    print(f"   Max absolute value: {weight_max:.6f}")
    
    # Heuristic: trained models typically have larger, more varied weights
    if weight_mean < 0.01 and weight_max < 0.1:
        print("\n⚠️  LIKELY UNTRAINED - Weights are very small (near initialization)")
        print("   → Run training script: python train/scripts/train_ner.py")
    elif weight_mean > 0.05 or weight_max > 0.5:
        print("\n✅ LIKELY TRAINED - Weights show learning")
    else:
        print("\n❓ UNCERTAIN - Weights are borderline")
        print("   Recommend re-training to be sure")
else:
    print("❌ No classifier layer found in model!")

print(f"\n📁 Model file size: {model_path.stat().st_size / (1024*1024):.1f} MB")
