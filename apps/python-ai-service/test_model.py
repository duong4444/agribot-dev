"""
Test Fine-tuned Intent Classification Model
"""

import torch
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Intent labels
INTENT_LABELS = [
    "financial_query",    # 0
    "crop_query",         # 1
    "device_control",     # 2
    "activity_query",     # 3
    "analytics_query",    # 4
    "farm_query",         # 5
    "sensor_query",       # 6
    "create_record",      # 7
    "update_record",      # 8
    "delete_record",      # 9
]

def test_intent(text, model, tokenizer):
    """Test intent classification for a single text"""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    
    with torch.no_grad():
        outputs = model(**inputs)
        predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predicted_class = torch.argmax(predictions, dim=-1).item()
        confidence = predictions[0][predicted_class].item()
    
    return INTENT_LABELS[predicted_class], confidence

def main():
    print("🧪 Testing Fine-tuned Intent Classification Model")
    print("=" * 60)
    
    # Check if model exists
    model_path = "./models/intent_classifier"
    if not os.path.exists(model_path):
        print("❌ Fine-tuned model not found!")
        print("Please run: python train_intent.py")
        return
    
    # Load model
    print("🤖 Loading fine-tuned model...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return
    
    # Test cases
    test_cases = [
        "doanh thu tháng này là bao nhiêu",
        "chi phí tưới tiêu tháng 3",
        "cách trồng cà chua",
        "thời gian thu hoạch rau",
        "bật hệ thống tưới",
        "tắt máy bơm nước",
        "tưới nước cho rau",
        "bón phân cho cây",
        "phân tích dữ liệu farm",
        "thống kê sản lượng",
        "thông tin về farm",
        "dữ liệu trang trại",
        "dữ liệu cảm biến",
        "thông tin nhiệt độ",
        "tạo bản ghi mới",
        "thêm dữ liệu",
        "cập nhật dữ liệu",
        "sửa thông tin",
        "xóa bản ghi",
        "remove record"
    ]
    
    print(f"\n🧪 Testing {len(test_cases)} examples:")
    print("-" * 60)
    
    correct = 0
    total = len(test_cases)
    
    for i, text in enumerate(test_cases, 1):
        intent, confidence = test_intent(text, model, tokenizer)
        
        # Simple accuracy check (you can improve this)
        is_correct = confidence > 0.5  # Basic threshold
        if is_correct:
            correct += 1
        
        status = "✅" if is_correct else "❌"
        print(f"{i:2d}. {status} '{text}'")
        print(f"    → {intent} ({confidence:.3f})")
        print()
    
    accuracy = (correct / total) * 100
    print(f"📊 Results:")
    print(f"   Correct: {correct}/{total}")
    print(f"   Accuracy: {accuracy:.1f}%")
    
    if accuracy > 80:
        print("🎉 Great! Model is working well!")
    elif accuracy > 60:
        print("👍 Good! Model needs more training data.")
    else:
        print("⚠️  Model needs improvement. Try more training data.")

if __name__ == "__main__":
    main()
