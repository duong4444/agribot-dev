"""
Error Analysis Script for NER Model
Tìm và phân tích những cases model dự đoán sai hoặc không chắc chắn
"""

import sys
import json
import pandas as pd
from pathlib import Path
from collections import defaultdict, Counter

# Add parent directory to path to import NER extractor
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

import asyncio
from models.ner_extractor import NERExtractor


def load_validation_data():
    """Load validation/test data"""
    csv_path = Path(__file__).parent.parent / "data" / "ner_data.csv"
    df = pd.read_csv(csv_path, encoding='utf-8')
    
    # Use last 20% as validation
    split_idx = int(len(df) * 0.8)
    val_df = df[split_idx:]
    
    print(f"📊 Loaded {len(val_df)} validation examples")
    return val_df


def parse_ground_truth(entities_json):
    """Parse ground truth entities"""
    try:
        entities = json.loads(entities_json)
        return [
            {
                'type': ent['type'].upper(),
                'value': ent['value'],
                'start': ent['start'],
                'end': ent['end']
            }
            for ent in entities
        ]
    except:
        return []


def entities_match(pred_entity, true_entity, iou_threshold=0.5):
    """Check if predicted entity matches ground truth"""
    # Type must match
    if pred_entity['type'].upper() != true_entity['type'].upper():
        return False
    
    # Calculate IoU (Intersection over Union) of spans
    pred_start, pred_end = pred_entity['start'], pred_entity['end']
    true_start, true_end = true_entity['start'], true_entity['end']
    
    # Intersection
    inter_start = max(pred_start, true_start)
    inter_end = min(pred_end, true_end)
    intersection = max(0, inter_end - inter_start)
    
    # Union
    union = (pred_end - pred_start) + (true_end - true_start) - intersection
    
    # IoU
    iou = intersection / union if union > 0 else 0
    
    return iou >= iou_threshold


async def analyze_predictions(ner_extractor, val_df):
    """Analyze model predictions on validation data"""
    
    errors = {
        'false_positives': [],  # Model dự đoán nhưng sai
        'false_negatives': [],  # Model bỏ sót
        'boundary_errors': [],  # Dự đoán đúng type nhưng sai boundary
        'low_confidence': [],   # Confidence thấp
    }
    
    stats = {
        'total': len(val_df),
        'correct': 0,
        'by_entity_type': defaultdict(lambda: {'tp': 0, 'fp': 0, 'fn': 0})
    }
    
    print("🔍 Analyzing predictions...")
    
    for idx, row in val_df.iterrows():
        text = row['text']
        true_entities = parse_ground_truth(row['entities'])
        
        # Get model predictions
        result = await ner_extractor.extract(text)
        pred_entities = result['entities']
        
        # Match predictions with ground truth
        matched_pred = set()
        matched_true = set()
        
        for i, pred in enumerate(pred_entities):
            found_match = False
            for j, true in enumerate(true_entities):
                if entities_match(pred, true):
                    matched_pred.add(i)
                    matched_true.add(j)
                    stats['by_entity_type'][true['type']]['tp'] += 1
                    found_match = True
                    break
            
            if not found_match:
                # False positive
                errors['false_positives'].append({
                    'text': text,
                    'predicted': pred,
                    'true_entities': true_entities
                })
                stats['by_entity_type'][pred['type']]['fp'] += 1
            
            # Check low confidence
            if pred.get('confidence', 1.0) < 0.75:
                errors['low_confidence'].append({
                    'text': text,
                    'entity': pred,
                    'confidence': pred.get('confidence', 1.0)
                })
        
        # Check for false negatives
        for j, true in enumerate(true_entities):
            if j not in matched_true:
                errors['false_negatives'].append({
                    'text': text,
                    'missed': true,
                    'predictions': pred_entities
                })
                stats['by_entity_type'][true['type']]['fn'] += 1
        
        # Count correct examples
        if len(matched_pred) == len(pred_entities) and len(matched_true) == len(true_entities):
            stats['correct'] += 1
        
        if (idx + 1) % 50 == 0:
            print(f"  Processed {idx + 1}/{len(val_df)} examples...")
    
    return errors, stats


def print_error_analysis(errors, stats):
    """Print detailed error analysis"""
    print("\n" + "=" * 60)
    print("📊 ERROR ANALYSIS REPORT")
    print("=" * 60)
    
    # Overall stats
    print(f"\n✅ Overall Accuracy: {stats['correct']}/{stats['total']} ({100*stats['correct']/stats['total']:.1f}%)")
    
    # Per-entity type stats
    print("\n📈 Per-Entity Type Performance:")
    print(f"{'Entity Type':<20} {'Precision':<12} {'Recall':<12} {'F1 Score':<12}")
    print("-" * 60)
    
    for entity_type, counts in sorted(stats['by_entity_type'].items()):
        tp = counts['tp']
        fp = counts['fp']
        fn = counts['fn']
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"{entity_type:<20} {precision:<12.2%} {recall:<12.2%} {f1:<12.2%}")
    
    # Error breakdown
    print(f"\n⚠️  Error Breakdown:")
    print(f"  False Positives: {len(errors['false_positives'])}")
    print(f"  False Negatives: {len(errors['false_negatives'])}")
    print(f"  Low Confidence: {len(errors['low_confidence'])}")
    
    # Show examples
    print("\n❌ Sample False Positives (top 5):")
    for i, err in enumerate(errors['false_positives'][:5], 1):
        print(f"\n  {i}. Text: \"{err['text']}\"")
        print(f"     Predicted: {err['predicted']['type']} = \"{err['predicted']['value']}\"")
        true_ents = [f"{e['type']}={e['value']}" for e in err['true_entities']]
        print(f"     Should be: {true_ents}")
    
    print("\n❌ Sample False Negatives (top 5):")
    for i, err in enumerate(errors['false_negatives'][:5], 1):
        print(f"\n  {i}. Text: \"{err['text']}\"")
        print(f"     Missed: {err['missed']['type']} = \"{err['missed']['value']}\"")
        pred_ents = [f"{e['type']}={e['value']}" for e in err['predictions']]
        print(f"     Model predicted: {pred_ents}")
    
    print("\n⚡ Low Confidence Predictions (top 5):")
    for i, err in enumerate(sorted(errors['low_confidence'], key=lambda x: x['confidence'])[:5], 1):
        print(f"\n  {i}. Text: \"{err['text']}\"")
        print(f"     Entity: {err['entity']['type']} = \"{err['entity']['value']}\"")
        print(f"     Confidence: {err['confidence']:.2%}")


def save_errors_for_review(errors, output_path):
    """Save errors to CSV for manual review"""
    review_data = []
    
    # False positives
    for err in errors['false_positives']:
        review_data.append({
            'text': err['text'],
            'error_type': 'FALSE_POSITIVE',
            'predicted_type': err['predicted']['type'],
            'predicted_value': err['predicted']['value'],
            'true_entities': json.dumps(err['true_entities'], ensure_ascii=False)
        })
    
    # False negatives
    for err in errors['false_negatives']:
        review_data.append({
            'text': err['text'],
            'error_type': 'FALSE_NEGATIVE',
            'predicted_type': '',
            'predicted_value': '',
            'missed_type': err['missed']['type'],
            'missed_value': err['missed']['value']
        })
    
    df = pd.DataFrame(review_data)
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"\n💾 Saved {len(review_data)} errors to: {output_path}")
    print("   Review and label these to improve model!")


async def main():
    print("=" * 60)
    print("🔍 NER Error Analysis")
    print("=" * 60)
    
    # Load NER model
    print("\n📦 Loading NER model...")
    ner_extractor = NERExtractor()
    await ner_extractor.load_model()
    
    # Load validation data
    val_df = load_validation_data()
    
    # Analyze predictions
    errors, stats = await analyze_predictions(ner_extractor, val_df)
    
    # Print analysis
    print_error_analysis(errors, stats)
    
    # Save errors for review
    output_path = Path(__file__).parent.parent / "data" / "errors_to_review.csv"
    save_errors_for_review(errors, output_path)
    
    print("\n" + "=" * 60)
    print("💡 Next Steps:")
    print("  1. Review errors_to_review.csv")
    print("  2. Add more training data for problematic entity types")
    print("  3. Improve post-processing rules")
    print("  4. Retrain model")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
