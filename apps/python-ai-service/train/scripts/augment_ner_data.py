"""
Data Augmentation Script for NER Training
Tự động tạo thêm dữ liệu training từ data hiện có
"""

import pandas as pd
import json
import random
from pathlib import Path

# Synonym dictionaries for augmentation
CROP_SYNONYMS = {
    "cà chua": ["cà chua", "quả cà chua", "cây cà chua"],
    "cà phê": ["cà phê", "cafe", "cây cà phê"],
    "lúa": ["lúa", "thóc", "cây lúa"],
    "ngô": ["ngô", "bắp", "cây ngô"],
    "ớt": ["ớt", "tiêu", "cây ớt"],
}

AREA_SYNONYMS = {
    "ruộng": ["ruộng", "thửa ruộng", "khu ruộng"],
    "vườn": ["vườn", "khu vườn"],
    "nhà kính": ["nhà kính", "greenhouse"],
}

DEVICE_SYNONYMS = {
    "máy bơm": ["máy bơm", "bơm nước", "thiết bị bơm"],
    "sensor": ["sensor", "cảm biến", "thiết bị cảm biến"],
}

# Templates for generating new sentences
TEMPLATES = [
    # CROP_NAME templates
    ("cách trồng {crop}", "CROP_NAME"),
    ("kỹ thuật trồng {crop}", "CROP_NAME"),
    ("chăm sóc {crop}", "CROP_NAME"),
    ("bón phân cho {crop}", "CROP_NAME"),
    ("tưới nước cho {crop}", "CROP_NAME"),
    
    # AREA templates
    ("tại {area}", "AREA"),
    ("ở {area}", "AREA"),
    ("khu vực {area}", "AREA"),
    
    # Multi-entity templates
    ("trồng {crop} tại {area}", ["CROP_NAME", "AREA"]),
    ("bón phân cho {crop} ở {area}", ["CROP_NAME", "AREA"]),
    ("{activity} {crop} vào {date}", ["ACTIVITY", "CROP_NAME", "DATE"]),
]


def load_original_data():
    """Load original training data"""
    csv_path = Path(__file__).parent.parent / "data" / "ner_data.csv"
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"📊 Loaded {len(df)} original examples")
    return df


def synonym_replacement(text, entities_json, replacement_dict):
    """Replace entities with synonyms"""
    try:
        entities = json.loads(entities_json)
        new_examples = []
        
        for entity in entities:
            entity_value = entity['value']
            
            # Find synonyms
            if entity_value in replacement_dict:
                synonyms = replacement_dict[entity_value]
                
                for synonym in synonyms:
                    if synonym != entity_value:  # Skip original
                        # Replace in text
                        new_text = text.replace(entity_value, synonym)
                        
                        # Update entity
                        new_entities = []
                        for ent in entities:
                            new_ent = ent.copy()
                            if ent['value'] == entity_value:
                                # Update positions
                                old_len = len(entity_value)
                                new_len = len(synonym)
                                diff = new_len - old_len
                                
                                new_ent['value'] = synonym
                                new_ent['end'] = new_ent['start'] + new_len
                            new_entities.append(new_ent)
                        
                        new_examples.append({
                            'text': new_text,
                            'entities': json.dumps(new_entities, ensure_ascii=False)
                        })
        
        return new_examples
    except:
        return []


def generate_from_templates(num_samples=200):
    """Generate new examples from templates"""
    generated = []
    
    crops = ["cà chua", "cà phê", "lúa", "ngô", "ớt", "dưa hấu", "sầu riêng"]
    areas = ["ruộng A", "vườn số 5", "nhà kính 1", "khu B"]
    activities = ["tưới", "bón phân", "phun thuốc", "thu hoạch"]
    dates = ["hôm nay", "ngày mai", "tuần này", "tháng này"]
    
    for _ in range(num_samples):
        # Random simple template
        template = random.choice([
            "cách trồng {crop}",
            "{crop} tại {area}",
            "chăm sóc {crop} ở {area}",
            "{activity} {crop} vào {date}",
        ])
        
        # Fill template
        text = template
        entities = []
        
        if "{crop}" in template:
            crop = random.choice(crops)
            start = text.find("{crop}")
            text = text.replace("{crop}", crop)
            entities.append({
                "type": "CROP_NAME",
                "value": crop,
                "start": start,
                "end": start + len(crop)
            })
        
        if "{area}" in template:
            area = random.choice(areas)
            start = text.find("{area}")
            text = text.replace("{area}", area)
            entities.append({
                "type": "AREA",
                "value": area,
                "start": start,
                "end": start + len(area)
            })
        
        if "{activity}" in template:
            activity = random.choice(activities)
            start = text.find("{activity}")
            text = text.replace("{activity}", activity)
            entities.append({
                "type": "ACTIVITY",
                "value": activity,
                "start": start,
                "end": start + len(activity)
            })
        
        if "{date}" in template:
            date = random.choice(dates)
            start = text.find("{date}")
            text = text.replace("{date}", date)
            entities.append({
                "type": "DATE",
                "value": date,
                "start": start,
                "end": start + len(date)
            })
        
        generated.append({
            'text': text,
            'entities': json.dumps(entities, ensure_ascii=False)
        })
    
    return generated


def augment_data(df, num_augmented=500):
    """Main augmentation function"""
    augmented_examples = []
    
    print("🔄 Applying synonym replacement...")
    for idx, row in df.iterrows():
        # Apply crop synonyms
        crop_augs = synonym_replacement(
            row['text'], 
            row['entities'], 
            CROP_SYNONYMS
        )
        augmented_examples.extend(crop_augs[:2])  # Max 2 per example
        
        # Apply area synonyms
        area_augs = synonym_replacement(
            row['text'], 
            row['entities'], 
            AREA_SYNONYMS
        )
        augmented_examples.extend(area_augs[:2])
        
        if len(augmented_examples) >= num_augmented // 2:
            break
    
    print(f"✅ Generated {len(augmented_examples)} synonym-based examples")
    
    # Generate from templates
    print("🎲 Generating from templates...")
    template_examples = generate_from_templates(num_augmented // 2)
    print(f"✅ Generated {len(template_examples)} template-based examples")
    
    # Combine
    all_augmented = augmented_examples + template_examples
    
    # Remove duplicates
    seen = set()
    unique_augmented = []
    for ex in all_augmented:
        if ex['text'] not in seen:
            seen.add(ex['text'])
            unique_augmented.append(ex)
    
    print(f"📦 Total unique augmented examples: {len(unique_augmented)}")
    return unique_augmented[:num_augmented]


def main():
    print("=" * 60)
    print("📊 NER Data Augmentation")
    print("=" * 60)
    
    # Load original data
    df = load_original_data()
    
    # Augment
    augmented = augment_data(df, num_augmented=500)
    
    # Create augmented dataframe
    aug_df = pd.DataFrame(augmented)
    
    # Combine with original
    combined_df = pd.concat([df, aug_df], ignore_index=True)
    
    # Save
    output_path = Path(__file__).parent.parent / "data" / "ner_data_augmented.csv"
    combined_df.to_csv(output_path, index=False, encoding='utf-8')
    
    print(f"\n✅ Saved augmented data to: {output_path}")
    print(f"📊 Original examples: {len(df)}")
    print(f"📊 Augmented examples: {len(aug_df)}")
    print(f"📊 Total examples: {len(combined_df)}")
    print("\n💡 Next step: Use ner_data_augmented.csv for training!")


if __name__ == "__main__":
    main()
