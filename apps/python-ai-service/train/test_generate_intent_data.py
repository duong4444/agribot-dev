"""
Test script for generate_intent_data.py improvements
Run this to verify all features work correctly
"""

import sys
import tempfile
import csv
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from generate_intent_data import (
    Config,
    DataValidator,
    DataAugmenter,
    load_existing_data,
    save_augmented_data,
    generate_augmented_data,
    TEMPLATES,
    ENTITIES
)


def test_config():
    """Test Config dataclass"""
    print("Testing Config...")
    config = Config()
    assert config.target_samples == 200
    assert config.random_seed == 42
    print("[PASS] Config test passed")


def test_data_validator():
    """Test DataValidator class"""
    print("\nTesting DataValidator...")
    config = Config()
    validator = DataValidator(config)
    
    # Valid sample
    assert validator.is_valid("Xem thông tin cây trồng") == True
    
    # Too short
    assert validator.is_valid("Hi") == False
    
    # Unfilled placeholder
    assert validator.is_valid("Xem {crop} này") == False
    
    # Duplicate
    validator.is_valid("Test sample")
    assert validator.is_valid("test sample") == False  # Should detect duplicate (case-insensitive)
    
    print("[PASS] DataValidator test passed")


def test_data_augmenter():
    """Test DataAugmenter class"""
    print("\nTesting DataAugmenter...")
    config = Config()
    augmenter = DataAugmenter(config)
    
    # Test synonym replacement
    variations = augmenter.apply_synonyms("Xem tổng doanh thu tháng này")
    assert len(variations) > 0
    print(f"  Generated {len(variations)} synonym variations")
    
    # Test template generation
    if "knowledge_query" in TEMPLATES:
        template = TEMPLATES["knowledge_query"][0]
        samples = augmenter.generate_from_template(template, count=5)
        assert len(samples) > 0
        print(f"  Generated {len(samples)} samples from template")
        
        # Verify no unfilled placeholders
        for sample in samples:
            assert '{' not in sample and '}' not in sample
    
    # Test question variations
    variations = augmenter.add_question_variations("Chi phí là bao nhiêu?")
    assert len(variations) > 0
    print(f"  Generated {len(variations)} question variations")
    
    print("[PASS] DataAugmenter test passed")


def test_entity_coverage():
    """Test that all template placeholders have entities"""
    print("\nTesting entity coverage...")
    missing_entities = set()
    
    for intent, templates in TEMPLATES.items():
        for template in templates:
            import re
            placeholders = re.findall(r'\{(\w+)\}', template)
            for placeholder in placeholders:
                if placeholder not in ENTITIES:
                    missing_entities.add((intent, template, placeholder))
    
    if missing_entities:
        print("[WARN] Missing entities found:")
        for intent, template, placeholder in missing_entities:
            print(f"  Intent: {intent}")
            print(f"  Template: {template}")
            print(f"  Missing: {placeholder}")
        assert False, "Some templates have missing entities"
    
    print("[PASS] Entity coverage test passed")


def test_file_operations():
    """Test load and save operations"""
    print("\nTesting file operations...")
    
    # Create temporary test data
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['text', 'label'])
        writer.writeheader()
        writer.writerow({'text': 'Xem doanh thu tháng này', 'label': 'financial_query'})
        writer.writerow({'text': 'Thông tin cây trồng', 'label': 'crop_query'})
        temp_input = f.name
    
    try:
        # Test loading
        data = load_existing_data(temp_input)
        assert 'financial_query' in data
        assert 'crop_query' in data
        assert len(data['financial_query']) == 1
        print("  [OK] Load operation works")
        
        # Test saving
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as f:
            temp_output = f.name
        
        test_data = {
            'test_intent': ['Sample 1', 'Sample 2', 'Sample 3']
        }
        success = save_augmented_data(test_data, temp_output)
        assert success == True
        
        # Verify saved data
        saved_data = load_existing_data(temp_output)
        assert 'test_intent' in saved_data
        assert len(saved_data['test_intent']) == 3
        print("  [OK] Save operation works")
        
        # Cleanup
        Path(temp_output).unlink(missing_ok=True)
        
    finally:
        Path(temp_input).unlink(missing_ok=True)
    
    print("[PASS] File operations test passed")


def test_end_to_end():
    """Test end-to-end augmentation process"""
    print("\nTesting end-to-end augmentation...")
    
    # Create minimal test data
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['text', 'label'])
        writer.writeheader()
        # Add multiple samples for each intent
        for _ in range(5):
            writer.writerow({'text': 'Xem doanh thu tháng này', 'label': 'financial_query'})
            writer.writerow({'text': 'Thông tin cây trồng khu A', 'label': 'crop_query'})
        temp_input = f.name
    
    try:
        # Load data
        existing_data = load_existing_data(temp_input)
        
        # Generate augmented data (small target for testing)
        config = Config(target_samples=20, log_level="WARNING")
        augmented_data = generate_augmented_data(existing_data, config)
        
        # Verify results
        assert len(augmented_data) == 2  # Two intents
        for intent, samples in augmented_data.items():
            print(f"  Intent '{intent}': {len(samples)} samples")
            assert len(samples) >= 5  # At least original samples
        
        print("[PASS] End-to-end test passed")
        
    finally:
        Path(temp_input).unlink(missing_ok=True)


def run_all_tests():
    """Run all tests"""
    print("="*60)
    print("Running tests for generate_intent_data.py improvements")
    print("="*60)
    
    tests = [
        test_config,
        test_data_validator,
        test_data_augmenter,
        test_entity_coverage,
        test_file_operations,
        test_end_to_end,
    ]
    
    failed_tests = []
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"[FAIL] {test.__name__} failed: {e}")
            failed_tests.append((test.__name__, e))
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    if not failed_tests:
        print("[SUCCESS] All tests passed! The improvements are working correctly.")
    else:
        print(f"[FAIL] {len(failed_tests)} test(s) failed:")
        for test_name, error in failed_tests:
            print(f"  - {test_name}: {error}")
    print("="*60)
    
    return len(failed_tests) == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

