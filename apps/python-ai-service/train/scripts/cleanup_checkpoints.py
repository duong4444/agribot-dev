"""
Clean up old checkpoints to free disk space
"""
import shutil
from pathlib import Path

models_dir = Path('../../models/ner_extractor')

if models_dir.exists():
    # Remove checkpoint directories
    for checkpoint_dir in models_dir.glob('checkpoint-*'):
        if checkpoint_dir.is_dir():
            print(f"Removing {checkpoint_dir.name}...")
            shutil.rmtree(checkpoint_dir)
            print(f"✅ Removed {checkpoint_dir.name}")
    
    print("✅ Cleanup complete!")
else:
    print("No checkpoints directory found.")
