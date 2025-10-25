"""
Intent Classification using PhoBERT
Fine-tuned for Vietnamese Agricultural Domain
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, List, Any
import time
from loguru import logger
import os


class IntentClassifier:
    """
    PhoBERT-based Intent Classifier for Vietnamese Agricultural Chatbot
    """
    
    # Intent labels (matching NestJS IntentType enum)
    INTENT_LABELS = [
        "knowledge_query",      # 0
        "financial_query",      # 1
        "crop_query",           # 2
        "activity_query",       # 3
        "analytics_query",      # 4
        "farm_query",           # 5
        "device_control",       # 6
        "sensor_query",         # 7
        "create_record",        # 8
        "update_record",        # 9
        "delete_record",        # 10
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
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        logger.info(f"Intent Classifier initialized with device: {self.device}")
    
    async def load_model(self):
        """Load PhoBERT model and tokenizer"""
        try:
            logger.info(f"Loading tokenizer from {self.model_name}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Check if fine-tuned model exists
            fine_tuned_path = "./models/intent_classifier"
            if os.path.exists(fine_tuned_path):
                logger.info(f"Loading fine-tuned model from {fine_tuned_path}...")
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    fine_tuned_path,
                    num_labels=len(self.INTENT_LABELS)
                )
            else:
                logger.warning("Fine-tuned model not found. Using base PhoBERT with rule-based fallback.")
                logger.warning("For production, please fine-tune the model first!")
                # Initialize with random classification head
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    self.model_name,
                    num_labels=len(self.INTENT_LABELS)
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
            top_probs, top_indices = torch.topk(probabilities[0], k=min(top_k, len(self.INTENT_LABELS)))
            
            # Format results
            all_intents = []
            for prob, idx in zip(top_probs.cpu().numpy(), top_indices.cpu().numpy()):
                all_intents.append({
                    "intent": self.INTENT_LABELS[idx],
                    "confidence": float(prob)
                })
            
            # Best prediction
            best_intent = self.INTENT_LABELS[top_indices[0].item()]
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
        
        # Financial patterns
        financial_keywords = ['doanh thu', 'thu nhập', 'lợi nhuận', 'chi phí', 'tiền', 'giá', 'bao nhiêu tiền', 'tổng tiền', 'giá trị']
        crop_keywords = ['trồng', 'cây', 'cà chua', 'rau', 'crop', 'giống', 'hạt giống', 'cây trồng']
        device_keywords = ['bật', 'tắt', 'điều khiển', 'control', 'máy', 'thiết bị', 'hệ thống']
        activity_keywords = ['tưới', 'bón phân', 'thu hoạch', 'chăm sóc', 'hoạt động']
        analytics_keywords = ['phân tích', 'thống kê', 'báo cáo', 'biểu đồ', 'chart', 'analytics']
        
        # Check patterns with priority
        if any(word in text_lower for word in financial_keywords):
            intent = 'financial_query'
            confidence = 0.9
        elif any(word in text_lower for word in crop_keywords):
            intent = 'crop_query'
            confidence = 0.9
        elif any(word in text_lower for word in device_keywords):
            intent = 'device_control'
            confidence = 0.9
        elif any(word in text_lower for word in activity_keywords):
            intent = 'activity_query'
            confidence = 0.9
        elif any(word in text_lower for word in analytics_keywords):
            intent = 'analytics_query'
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

