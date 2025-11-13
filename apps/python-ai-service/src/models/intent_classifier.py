"""
Intent Classification using PhoBERT
Fine-tuned for Vietnamese Agricultural Domain
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, List

import torch
from loguru import logger
from transformers import AutoModelForSequenceClassification, AutoTokenizer


class IntentClassifier:
    """
    PhoBERT-based Intent Classifier for Vietnamese Agricultural Chatbot
    """
    
    # Intent labels (matching NestJS IntentType enum)
    INTENT_LABELS = [
        "knowledge_query",      # 0 - Hỏi đáp kiến thức nông nghiệp
        "financial_query",      # 1 - Hỏi về tài chính
        "device_control",       # 2 - Điều khiển thiết bị IoT
        "sensor_query",         # 3 - Hỏi dữ liệu cảm biến
        "unknown",              # 4 - Không xác định
    ]
    
    def __init__(self, model_name: str = "vinai/phobert-base"):
        """
        Initialize Intent Classifier
        
        Args:
            model_name: HuggingFace model name (default: vinai/phobert-base)
        """
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.intent_labels: List[str] = self.INTENT_LABELS.copy()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        logger.info(f"Intent Classifier initialized with device: {self.device}")
    
    async def load_model(self):
        """Load PhoBERT model and tokenizer"""
        try:
            project_root = Path(__file__).resolve().parents[2]
            fine_tuned_path = project_root / "models" / "intent_classifier"

            logger.info(f"Loading tokenizer from {self.model_name}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            # Load label mapping if available
            label_map_path = fine_tuned_path / "label_mapping.json"
            if label_map_path.exists():
                try:
                    mapping_data = json.loads(label_map_path.read_text(encoding="utf-8"))
                    label_to_id = mapping_data.get("label_to_id")
                    if isinstance(label_to_id, dict) and label_to_id:
                        self.intent_labels = sorted(label_to_id.keys(), key=lambda label: label_to_id[label])
                        logger.info(f"Loaded label mapping with {len(self.intent_labels)} intents")
                except Exception as mapping_error:
                    logger.warning(f"Unable to read label mapping: {mapping_error}. Falling back to default labels")

            num_labels = len(self.intent_labels)

            # Check if fine-tuned model exists
            if fine_tuned_path.exists():
                logger.info(f"Loading fine-tuned model from {fine_tuned_path}...")
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    fine_tuned_path,
                    num_labels=num_labels
                )
            else:
                logger.warning("Fine-tuned model not found. Using base PhoBERT with rule-based fallback.")
                logger.warning("For production, please fine-tune the model first!")
                # Initialize with random classification head
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    self.model_name,
                    num_labels=num_labels
                )
            
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("✅ Intent Classifier model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load Intent Classifier: {str(e)}")
            raise
    
    async def classify(self, text: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Classify intent of input text
        
        Args:
            text: Input text to classify
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with intent, confidence, and top predictions
        """
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        start_time = time.time()
        
        try:
            # Tokenize input
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=256,
                padding=True
            )
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)
            
            # Get top-k predictions
            top_probs, top_indices = torch.topk(probabilities[0], k=min(top_k, len(self.intent_labels)))
            
            # Format results
            all_intents = []
            for prob, idx in zip(top_probs.cpu().numpy(), top_indices.cpu().numpy()):
                all_intents.append({
                    "intent": self.intent_labels[idx],
                    "confidence": float(prob)
                })
            
            # Best prediction
            best_intent = self.intent_labels[top_indices[0].item()]
            best_confidence = float(top_probs[0].item())
            
            # If confidence is too low, use rule-based fallback
            if best_confidence < 0.3:
                logger.warning(f"Low confidence ({best_confidence:.3f}), using rule-based fallback")
                return self._rule_based_classify(text, start_time)
            
            processing_time = (time.time() - start_time) * 1000
            
            return {
                "intent": best_intent,
                "confidence": best_confidence,
                "all_intents": all_intents,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"Classification error: {str(e)}")
            # Fallback to rule-based classification
            return self._rule_based_classify(text, start_time)
    
    def _rule_based_classify(self, text: str, start_time: float) -> Dict[str, Any]:
        """Rule-based fallback classification"""
        text_lower = text.lower()
        
        # Pattern keywords for remaining intents
        financial_keywords = ['doanh thu', 'thu nhập', 'lợi nhuận', 'chi phí', 'tiền', 'giá', 'bao nhiêu tiền', 'tổng tiền', 'giá trị']
        device_keywords = ['bật', 'tắt', 'điều khiển', 'control', 'máy', 'thiết bị', 'hệ thống']
        sensor_keywords = ['nhiệt độ', 'độ ẩm', 'cảm biến', 'sensor', 'đo', 'giám sát']
        
        # Check patterns with priority
        if any(word in text_lower for word in financial_keywords):
            intent = 'financial_query'
            confidence = 0.9
        elif any(word in text_lower for word in device_keywords):
            intent = 'device_control'
            confidence = 0.9
        elif any(word in text_lower for word in sensor_keywords):
            intent = 'sensor_query'
            confidence = 0.9
        else:
            intent = 'knowledge_query'
            confidence = 0.7
        
        processing_time = (time.time() - start_time) * 1000
        
        # Generate alternative intents
        all_intents = [
            {"intent": intent, "confidence": confidence},
            {"intent": "knowledge_query", "confidence": 0.2},
            {"intent": "financial_query", "confidence": 0.1}
        ]
        
        return {
            "intent": intent,
            "confidence": confidence,
            "all_intents": all_intents,
            "processing_time_ms": processing_time
        }

