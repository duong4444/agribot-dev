"""
Intent Classification using PhoBERT
Fine-tuned for Vietnamese Agricultural Domain
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, List

# fw deep learning: dùng để chạy PhoBERT, tensor computation, GPU/CPU
import torch
from loguru import logger
# AutoTokenizer
# Load tokenizer đúng với model
# Tokenizer làm những việc gì?
# Tách văn bản → token
# Gán ID số cho token (vì model chỉ hiểu số)
# Xử lý từ lạ (OOV – out of vocabulary)

# Chuẩn hóa văn bản (lowercase, bỏ dấu câu, v.v.)
# Token IDs là các con số đại diện cho từng từ (hoặc một phần của từ) trong câu.
# Convert text → token IDs

# Token IDs (Đầu vào dạng số) -> MODEL AI -> Logits (Điểm số thô) 
# -> Softmax -> Probability (Xác suất %).

# AutoModelForSequenceClassification
# Model cho classification
# tự động nhìn vào tên model (ví dụ "vinai/phobert-base") và chọn đúng class phù hợp
# Đầu ra: logits → intent
# logits là kết quả thô mà model AI nhả ra trc khi đc chuẩn hoá thành xsuat %
# transformers = tokenizer + model
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# kiểu service - intent-classifier.service
class IntentClassifier:
    """
    PhoBERT-based Intent Classifier for Vietnamese Agricultural Chatbot
    """
    # self <=> this là tham chiếu tới chính instance hiện tại của class
    # Intent labels (matching NestJS IntentType enum)
    # mapping index <-> intent
    INTENT_LABELS = [
        "knowledge_query",      # 0 - Hỏi đáp kiến thức nông nghiệp
        "financial_query",      # 1 - Hỏi về tài chính
        "device_control",       # 2 - Điều khiển thiết bị IoT
        "sensor_query",         # 3 - Hỏi dữ liệu cảm biến
        "unknown",              # 4 - Không xác định
    ]
    
    # <=> contructor nestjs
    # entry1
    def __init__(self, model_name: str = "vinai/phobert-base"):
        """
        Initialize Intent Classifier
        
        Args:
            model_name: HuggingFace model name (default: vinai/phobert-base)
        """
        self.model_name = model_name
        # kbao biến giữ Model & Tokenizer nhưng chưa load ngay để tiết kiệm RAM lúc đầu
        self.tokenizer = None
        self.model = None
        self.intent_labels: List[str] = self.INTENT_LABELS.copy()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # 3
        logger.info(f"Intent Classifier initialized with device: {self.device}")
    
    async def load_model(self):
        """Load PhoBERT model and tokenizer"""
        try:
            # 
            project_root = Path(__file__).resolve().parents[2]
            fine_tuned_path = project_root / "models" / "intent_classifier"
            # 4
            logger.info(f"Loading tokenizer from {self.model_name}...")
            # load tokenizer đúng với model
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
 
            # Load label mapping if available
            # đọc file map nhãn
            label_map_path = fine_tuned_path / "label_mapping.json"
            if label_map_path.exists():
                try:
                    mapping_data = json.loads(label_map_path.read_text(encoding="utf-8"))
                    label_to_id = mapping_data.get("label_to_id") #là obj
            #   "label_to_id": {
            #     "device_control": 0,
            #     "financial_query": 1,
            #     "knowledge_query": 2,
            #     "sensor_query": 3,
            #     "unknown": 4
            #   },
                    if isinstance(label_to_id, dict) and label_to_id:
                        # sort theo id của label
                        # sắp xếp đúng thứ tự model đã học, theo label_mapping.json
                        self.intent_labels = sorted(label_to_id.keys(), key=lambda label: label_to_id[label])
                        logger.info(self.intent_labels)
                        # 5
                        logger.info(f"Loaded label mapping with {len(self.intent_labels)} intents")
                except Exception as mapping_error:
                    logger.warning(f"Unable to read label mapping: {mapping_error}. Falling back to default labels")

            num_labels = len(self.intent_labels) #5
#             Input text
#                 ↓
#              Tokenizer
#                 ↓
#               Embedding
#                 ↓
#             Transformer Encoder _Backbone (PhoBERT) encoder - hiểu ngôn ngữ
#                 ↓
#             Classification Head
#                 ↓
#               Softmax
#                 ↓
#             Intent Label
            # Check if fine-tuned model exists
            if fine_tuned_path.exists():
                # 6
                logger.info(f"Loading fine-tuned model from {fine_tuned_path}...")
                # head classification đã train
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    fine_tuned_path,
                    num_labels=num_labels
                )
            else:
                # dùng thằng PhoBERT để classify intent
                logger.warning("Fine-tuned model not found. Using base PhoBERT with rule-based fallback.")
                logger.warning("For production, please fine-tune the model first!")
                # Initialize with random classification head
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    self.model_name,
                    num_labels=num_labels
                )
            # chuyển model sang nơi chạy CPU hoặc GPU, model và dữ liệu phải cùng device
            self.model.to(self.device)
            # bật chế độ suy luận train() != eval()
            # training: random tắt neuron - dropout on
            # Inference: KHÔNG được random - dropout off
            # ko eval() -> Mỗi lần predict ra kết quả KHÁC NHAU , output ko ổn định
            self.model.eval() #đúng cho inference
            # 7
            logger.info("✅ Intent Classifier model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load Intent Classifier: {str(e)}")
            raise
    # method trong service
    async def classify(self, text: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Classify intent of input text
        
        Args:
            text: Input text to classify
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with intent, confidence, and top predictions
        """
# export interface PythonAIResponse {
#   success: boolean;
#   intent: string;
#   intent_confidence: number;
#   all_intents: Array<{ intent: string; confidence: number }>;
#   entities: Entity[];
#   processing_time_ms: number;
# }
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        start_time = time.time()
        
        try:
            # Tokenize input KEY1
            inputs = self.tokenizer(
                text,
                return_tensors="pt", # pt = PyTorch Tensor (kiểu dữ liệu ma trận số của PyTorch)
                truncation=True, # Cắt bớt nếu câu quá dài (>256 từ)
                max_length=256,
                padding=True  # Thêm số 0 vào cuối nếu câu quá ngắn (cho đủ độ dài chuẩn)
            )
            # AI ko đọc đc chữ , nó cần biến 1 chuỗi thành các con số ID.
            # Ví dụ: "Bật đèn" -> [101, 892, 342, 102] (Các con số này gọi là Tensor).
            print(f"1_input sau tokenizer: {inputs}")
            # {'input_ids': tensor([[    0,   139,   719, 10709,  5344,     2]]), '
            # token_type_ids': tensor([[0, 0, 0, 0, 0, 0]]), 
            # 'attention_mask': tensor([[1, 1, 1, 1, 1, 1]])}
            # Move to device
            # inputs.items() là lấy cặp [key, value]
            # v.to(self.device) là đẩy ma trận số vào Card màn hình (GPU) hoặc CPU
            # Model và toàn bộ tensor input phải nằm trên cùng một device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            print(f"2-input move to device: {inputs}")
            # Get predictions
            # Token IDs (Đầu vào dạng số) -> MODEL AI -> Logits (Điểm số thô) 
            # -> Softmax -> Probability (Xác suất %).
            # KEY2
            with torch.no_grad(): # giảm RAM,tăng tốc, chuẩn inference
                outputs = self.model(**inputs) # Đưa số vào Model, **inputs là rải (spread) tham số
                logits = outputs.logits # Lấy điểm thô (VD: Bật đèn=4.5, Hỏi giá=-2.0)
                # là điểm số Model chấm cho từng ý định (số có thể âm || dương vô cùng)
                probabilities = torch.softmax(logits, dim=-1) # Chuyển điểm thô thành % (0-100%), softmax hàm toán học biến điểm số thành %
            
            # Get top-k predictions
# top_probs: Xác suất (VD: [0.9, 0.05, 0.05] - 90%, 5%, 5%)
# top_indices: Mã số của ý định (VD: [2, 0, 1] - Ý định số 2, số 0, số 1)
            # KEY3
            top_probs, top_indices = torch.topk(probabilities[0], k=min(top_k, len(self.intent_labels)))
            print(f"3 xác suất: {top_probs}")
            print(f"4 index của intent map: {top_indices}")
#             3 xác suất: tensor([9.9966e-01, 1.5042e-04, 6.8836e-05], device='cuda:0')
#             4 index của intent map: tensor([2, 1, 4], device='cuda:0')
# 5-bestIntent: knowledge_query
# 6-bestConfidence: 0.9996635913848877
            # Format results, biến dữ liệu thô của PyTorch thành JSON để trả vể Nestjs
            all_intents = []
            # zip giúp 2 danh sách cùng lúc
            for prob, idx in zip(top_probs.cpu().numpy(), top_indices.cpu().numpy()):
                all_intents.append({
                    "intent": self.intent_labels[idx],
                    "confidence": float(prob)
                })
            
            # Best prediction
            best_intent = self.intent_labels[top_indices[0].item()]
            print(f"5-bestIntent: {best_intent}")

            best_confidence = float(top_probs[0].item())
            print(f"6-bestConfidence: {best_confidence}")
            # KEY4
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

