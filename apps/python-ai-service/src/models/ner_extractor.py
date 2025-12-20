"""
Named Entity Recognition using PhoBERT
Fine-tuned for Vietnamese Agricultural Domain
"""

import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import torch
from loguru import logger
# AutoModelForTokenClassification dùng trong bài toán gán nhãn cho từ - tiêu biểu nhất là NER
# mỗi token trong câu sẽ đc gán 1 nhãn, 
#Token classification: 1 nhãn cho mỗi token, intent classification 1 nhãn cho cả câu, 
# Intent: 1 Classification Head cho cả câu.
# NER:    N Classification Heads cho N tokens
from transformers import AutoModelForTokenClassification, AutoTokenizer

# Input text
#    ↓
# Tokenizer (PhoBERT)
#    ↓
# Embedding
#    ↓
# Transformer Encoder (PhoBERT) - hiểu ngữ cảnh
#    ↓
# Token-wise Classification Head - Dự đoán nhãn cho từng token
#    ↓
# Softmax (per token) chuyển thành xác suất
#    ↓
# NER labels

# | Tag | Ý nghĩa |
# | --- | ------- |
# | B   | Begin   |
# | I   | Inside  |
# | O   | Outside |
# | E   | End     |
# | S   | Single  |

class NERExtractor:
    """
    PhoBERT-based NER Extractor for Vietnamese Agricultural IoT Chatbot
    """
    
    # Entity labels (6 types for IoT chatbot)
    # model AI output là số 0,1,2,3,...
    # mảng này là từ điền để dịch 3 -> "B-CROP"
    ENTITY_LABELS = [
        "O",              # 0 - Outside
        "B-DATE",         # 1 - Begin Date
        "I-DATE",         # 2 - Inside Date
        "B-CROP",         # 3 - Begin Crop Name
        "I-CROP",         # 4 - Inside Crop Name
        "B-AREA",         # 5 - Begin Farm Area
        "I-AREA",         # 6 - Inside Farm Area
        "B-DEVICE",       # 7 - Begin Device Name
        "I-DEVICE",       # 8 - Inside Device Name
        "B-METRIC",       # 9 - Begin Metric
        "I-METRIC",       # 10 - Inside Metric
        "B-DURATION",     # 11 - Begin Duration
        "I-DURATION",     # 12 - Inside Duration
    ]
    
    # Entity type mapping trả về cho NESTJS
    ENTITY_TYPE_MAP = {
        "DATE": "date",
        "CROP": "crop_name",
        "AREA": "farm_area",
        "DEVICE": "device_name",
        "METRIC": "metric",
        "DURATION": "duration",
    }
    
    def __init__(self, model_name: str = "vinai/phobert-base"):
        """
        Initialize NER Extractor
        
        Args:
            model_name: HuggingFace model name (default: vinai/phobert-base)
        """
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.entity_labels: List[str] = self.ENTITY_LABELS.copy() #lưu bản sao
        self.entity_type_map: Dict[str, str] = self.ENTITY_TYPE_MAP.copy() #lưu bản sao
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # 10
        logger.info(f"NER Extractor initialized with device: {self.device}")
    
    async def load_model(self):
        """Load PhoBERT model and tokenizer"""
        try:
            # 11
            logger.info(f"Loading tokenizer from {self.model_name}...")
            #load model tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            model_dir = Path(__file__).resolve().parents[2] / "models" / "ner_extractor"

            # Load label mapping if available
            label_map_path = model_dir / "label_mapping.json"
            if label_map_path.exists():
                try:
                    mapping_data = json.loads(label_map_path.read_text(encoding="utf-8"))
                    label_to_id = mapping_data.get("label_to_id") #obj 
                    if isinstance(label_to_id, dict) and label_to_id:
                        # sx label theo ID
                        # tại sao cần sort
                        # predictions = [0, 2, 8, 1, 7]
                        # entity_labels[0] → "O"
                        # Ta cần tra cứu:
                        # entity_labels[2] → "B-CROP"
                        # entity_labels[8] → "I-CROP"
                        # entity_labels[1] → "B-AREA"
                        # entity_labels[7] → "I-AREA"
                        self.entity_labels = sorted(label_to_id.keys(), key=lambda label: label_to_id[label])
                        logger.info(self.entity_labels)
                        # 12
                        logger.info(f"Loaded NER label mapping with {len(self.entity_labels)} labels")
                        
                        # Update entity type map from loaded labels
                        entity_types = mapping_data.get("entity_types", []) #là arr chứa "DEVICE", "AREA",...
                        logger.info(entity_types)
                        if entity_types:
                            for entity_type in entity_types:
                                self.entity_type_map[entity_type] = entity_type.lower()
                except Exception as mapping_error:
                    logger.warning(f"Unable to read NER label mapping: {mapping_error}. Using default labels")

            num_labels = len(self.entity_labels)

            if model_dir.exists():
                # 13
                logger.info(f"Loading fine-tuned model from {model_dir}...")
                try:
                    self.model = AutoModelForTokenClassification.from_pretrained(
                        model_dir,
                        num_labels=num_labels
                    )
                except Exception as load_error:
                    logger.warning(f"Failed to load fine-tuned NER model: {load_error}. Falling back to base PhoBERT.")
                    self.model = AutoModelForTokenClassification.from_pretrained(
                        self.model_name,
                        num_labels=num_labels
                    )
            else:
                logger.warning("Fine-tuned NER model not found. Falling back to base PhoBERT (rule-based hybrid).")
                self.model = AutoModelForTokenClassification.from_pretrained(
                    self.model_name,
                    num_labels=num_labels
                )
            
            self.model.to(self.device)
            self.model.eval()
            # 14
            logger.info("NER Extractor model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load NER Extractor: {str(e)}")
            raise
    
    async def extract(self, text: str) -> Dict[str, Any]:
        """
        Extract named entities from text
        
        Args:
            text: Input text to extract entities from
            
        Returns:
            Dictionary with entities and processing time
        """
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        start_time = time.time()
        
        try:
            # Tokenize input
            try:
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=256,
                    padding=True,
                    return_offsets_mapping=True  # Lấy vị trí ký tự của mỗi token
                )
                print(f"1.ner input tokenizer: {input}") # token id , id của từ vựng trong từ điển PhoBert
                
                offset_mapping = inputs.pop("offset_mapping")[0]
                print(f"2.ner offset_mapping : {offset_mapping}")
                
            except NotImplementedError:
                # PhoBERT tokenizer không hỗ trợ offset mapping
                logger.info(
                    "Tokenizer does not support offset mapping. Using manual token alignment for PhoBERT predictions."
                )

                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=256,
                    padding=True
                )
                print(f"ner Using manual token alignment_input-tokenizier: {inputs}")
                offset_mapping = None
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            print(f"ner move to device_input-tokenizier: {input}")
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                print(f"ner outputs: {outputs}")

                logits = outputs.logits
                print(f"ner logits: {logits}")

                predictions = torch.argmax(logits, dim=-1)[0] #chọn nhãn có điểm cao nhất
                print(f"ner predictions: {predictions}")
                print(f"ner predictions para1-both: {predictions.cpu().numpy()}") #label id
                print(f"ner predictions para2-both: {inputs['input_ids'][0].cpu().numpy()}") #token id

            entities: List[Dict[str, Any]] = []
            if offset_mapping is not None:
                print(f"có offset_mapping: {predictions}")

                entities = self._convert_predictions_to_entities(
                    text,
                    predictions.cpu().numpy(),
                    offset_mapping.numpy(),
                    inputs["input_ids"][0].cpu().numpy()
                )
            else:
                # PhoBERT doesn't support offset mapping
                print(f"KHÔNG CÓ offset_mapping: {predictions}")
#               numpy chỉ hoạt động trên cpu
                entities = self._convert_predictions_without_offsets(
                    text,
                    # tensor([1, 3, 0])  →  array([1, 3, 0])
                    predictions.cpu().numpy(),
                    inputs["input_ids"][0].cpu().numpy()
                )
            # Apply rule-based post-processing for better accuracy
            # merge với regex, filter rác, normalize values
            entities = self._post_process_entities(text, entities)
            print("\n" + "="*60)
            print("Final entities gửi cho NestJS:")
            print(json.dumps(entities, indent=2, ensure_ascii=False))
            print("="*60)

            processing_time = (time.time() - start_time) * 1000
            
            return {
                "entities": entities,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"NER extraction error: {str(e)}")
            raise
    
    def _convert_predictions_to_entities(
        self,
        text: str,
        predictions: List[int],  # [0, 3, 4, 0, 5, 6]
        offset_mapping: List[Tuple[int, int]], # [(0,5), (6,8), ...]
        input_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """Convert model predictions to entity list"""
        entities = []
        current_entity = None
        
        for idx, (pred, (start, end)) in enumerate(zip(predictions, offset_mapping)):
            # Skip special tokens
            if start == end: # Special tokens như <s>, </s>
                continue
            
            label = self.entity_labels[pred]
            print(f"label: {label}")
            
            if label.startswith("B-"):
                # Save previous entity
                if current_entity:
                    entities.append(current_entity)
                
                # Start new entity
                entity_type = label[2:] #cắt chuỗi bỏ "B-"
                current_entity = {
                    "type": self.ENTITY_TYPE_MAP.get(entity_type, entity_type.lower()),
                    "raw": text[start:end],
                    "start": start,
                    "end": end,
                    "confidence": 0.85  # Base confidence
                }
                print(f"current_entity: {current_entity}")
            
            elif label.startswith("I-") and current_entity:
                # Continue current entity
                current_entity["raw"] = text[current_entity["start"]:end]
                current_entity["end"] = end
            
            elif label == "O" and current_entity:
                # End current entity
                entities.append(current_entity)
                current_entity = None
        
        # Add last entity , nếu entity ở cuối câu
        if current_entity:
            print(f"trong if add last entity")
            entities.append(current_entity)
        
        return entities
    
    def _convert_predictions_without_offsets(
        self,
        text: str,
        predictions: List[int],   # [0, 3, 4, 0, 5, 6]
        input_ids: List[int]    #[1, 5432, 8976, 2]
    ) -> List[Dict[str, Any]]:
        """
        Convert predictions to entities without offset mapping.
        This is a workaround for PhoBERT which doesn't support offset mapping.
        """
        entities = []
        current_entity = None
        # cách trồng cà chua
        print(f"---predictions----: {predictions}") #[0 0 0 2 8 0]
        print(f"---input_ids----: {input_ids}") #[    0   139   719 10709  5344     2]
        # BẢN CHẤT LÀ DETOKEN TOKEN ID -> TEXT
        # SAU ĐÓ TÌM CÁI TEXT VỪA ĐC DETOKEN TRONG USER_PROMPT_TEXT
        # Debug: Log ALL tokens and predictions
        all_tokens_debug = []
        for i, (token_id, pred) in enumerate(zip(input_ids, predictions)):
            token = self.tokenizer.decode([token_id], skip_special_tokens=True)
            print(f"token trong loop debug: {token}")
            label = self.entity_labels[pred]
            all_tokens_debug.append(f"~~'{token}'→{label}")
        logger.info(f"All tokens: {all_tokens_debug}")
        
        pred_labels = [self.entity_labels[p] for p in predictions]
        #pred_labels___: ['O', 'O', 'O', 'B-CROP', 'I-CROP', 'O']
        print(f"pred_labels___: {pred_labels}")
        #non_o_labels: ['B-CROP', 'I-CROP']
        non_o_labels = [l for l in pred_labels if l != 'O']
        print(f"non_o_labels: {non_o_labels}")
        logger.info(f"NER Predictions - Total tokens: {len(predictions)}, Non-O predictions: {len(non_o_labels)}")
        if non_o_labels:
            logger.info(f"Entity predictions found: {non_o_labels}")
        else:
            logger.warning(f"All predictions are 'O' (no entities) - Model may not be trained yet!")
        
        # Normalize text for matching
        text_lower = text.lower()
        current_pos = 0 #vị trí hiện tại trong text
        print(f"1.currPOS: {current_pos}")
        for idx, (pred, token_id) in enumerate(zip(predictions, input_ids)):
            # lấy được nhãn "B-xxxx","I-xxxx","O"
            #[0 0 0 2 8 0] 
            #[0 139 719 10709 5344 2]
            label = self.entity_labels[pred]
            print(f"label trong for_loop ko offset: {label}")
            print(f"tokenID trong for_loop ko offset: {token_id}")

            # Skip special tokens (<s>, </s>, <pad>)
            if token_id in [self.tokenizer.bos_token_id, self.tokenizer.eos_token_id, self.tokenizer.pad_token_id]:
                continue
            
            # Decode token - note PhoBERT adds underscores for word boundaries
            # strip() = trim()
            token_text = self.tokenizer.decode([token_id], skip_special_tokens=True).strip()
            print(f"token_text: {token_text}")
            if not token_text:
                continue
            
            # Remove underscore prefix that PhoBERT uses (e.g., "_cà" -> "cà")
            # key
            token_clean = token_text.replace("_", " ").strip()
            print(f"token_clean: {token_clean}")
            
            # Find token in text (case-insensitive search from current position)
            token_lower = token_clean.lower()
            print(f"final_token_clean_lower: {token_lower}")
            # tìm token trong prompt_text_gốc , 
            # tìm vị trí đầu tiên token xuất hiện tìm từ vị trí current_pos trở đi
            token_start = text_lower.find(token_lower, current_pos)
            print(f"token_start: {token_start}")
            # nếu ko tìm đc token (case khó)
            # vd text gốc khác vs tokenizer "điện thoại" - "điệnthoại"
            if token_start == -1:
                # Try exact match without spaces
                # token_clean= "điện thoại" -> "điệnthoại"
                token_no_space = token_clean.replace(" ", "")
                token_start = text_lower.find(token_no_space.lower(), current_pos)
                if token_start != -1:
                    print(f"tìm thấy token")
                    print(f"token_start trong if viếtliền: {token_start}")

                    token_clean = token_no_space
            
            if token_start == -1:
                # Can't find this token - skip it
                continue
            
            token_end = token_start + len(token_clean)
            current_pos = token_end
            print(f"2.currPOS: {current_pos}")

            # đã có token start,end -> Logic giống hàm có offset
            if label.startswith("B-"):
                # Save previous entity
                if current_entity:
                    entities.append(current_entity)
                
                # Start new entity
                entity_type = label[2:]
                current_entity = {
                    "type": self.ENTITY_TYPE_MAP.get(entity_type, entity_type.lower()),#key,default
                    "raw": text[token_start:token_end],
                    "start": token_start,
                    "end": token_end,
                    "confidence": 0.85
                }
            
            elif label.startswith("I-"):
                if current_entity:
                    # Continue current entity - extend to include this token
                    current_entity["raw"] = text[current_entity["start"]:token_end]
                    current_entity["end"] = token_end
                else:
                    # Orphaned I- tag (B- was skipped/not found) - treat as new entity
                    logger.debug(f"Orphaned I- tag {label} at position {token_start}, treating as B-")
                    entity_type = label[2:]
                    current_entity = {
                        "type": self.ENTITY_TYPE_MAP.get(entity_type, entity_type.lower()),
                        "raw": text[token_start:token_end],
                        "start": token_start,
                        "end": token_end,
                        "confidence": 0.75  # Lower confidence for orphaned tags
                    }
            
            elif label == "O" and current_entity:
                # End current entity
                print(f"!!!! add vào entities")
                entities.append(current_entity)
                current_entity = None
        
        # Add last entity
        if current_entity:
            print(f"!!!! add cuối")
            entities.append(current_entity)

        print(f"entities_extractNoOffset: {entities}")
        
        return entities
    
    def _post_process_entities(self, text: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply rule-based post-processing to improve accuracy
        Uses patterns similar to the original rule-based system
        """
        processed = []
        
        # Add rule-based entities for common patterns (high priority)
        rule_entities = self._extract_rule_based_entities(text)
        print("\n" + "="*60)
        print(" BƯỚC 1 - Rule-based entities (Regex):")
        print(json.dumps(rule_entities, indent=2, ensure_ascii=False))
        print("="*60)
        # Merge PhoBERT and rule-based entities
        all_entities = entities + rule_entities
        print("\n" + "="*60)
        print(" BƯỚC 2 - Merged entities (AI + Regex):")
        print(json.dumps(all_entities, indent=2, ensure_ascii=False))
        print("="*60)
        
        # Remove duplicates and overlaps (prefer rule-based for multi-word)
        all_entities = self._remove_overlapping_entities(all_entities)
        print("\n" + "="*60)
        print(" BƯỚC 3 - Sau khi loại bỏ overlap:")
        print(json.dumps(all_entities, indent=2, ensure_ascii=False))
        print("="*60)
        
        # Filter out invalid single-word entities
        all_entities = self._filter_invalid_entities(text, all_entities)
        print("\n" + "="*60)
        print(" BƯỚC 4 - Sau khi lọc invalid entities:")
        print(json.dumps(all_entities, indent=2, ensure_ascii=False))
        print("="*60)
        
        # Normalize values
        for entity in all_entities:
            entity["value"] = self._normalize_entity_value(entity)
        print("\n" + "="*60)
        print(" BƯỚC 5 - Sau khi normalize values:")
        print(json.dumps(all_entities, indent=2, ensure_ascii=False))
        print("="*60)
        
        return all_entities
    
    def _extract_rule_based_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using rule-based patterns (fallback)"""
        entities = []
        
        # Date patterns (prioritize longer/more specific patterns first)
        date_patterns = [
            # Month + Year combinations (most specific first)
            (r'tháng\s*\d{1,2}\s*năm\s*\d{4}', 'date'),  # tháng 11 năm 2024
            (r'tháng\s*\d{1,2}\s*năm\s*(?:ngoái|trước)', 'date'),  # tháng 11 năm ngoái
            # Year patterns
            (r'năm\s*\d{4}', 'date'),  # năm 2024
            (r'năm\s*(?:nay|này)', 'date'),  # năm nay
            (r'năm\s*(?:ngoái|trước)', 'date'),  # năm ngoái
            # Month patterns
            (r'tháng\s*\d{1,2}', 'date'),  # tháng 11
            (r'tháng\s*(?:này|nay)', 'date'),  # tháng này
            (r'tháng\s*trước', 'date'),  # tháng trước
            # Quarter patterns
            (r'quý\s*\d', 'date'),  # quý 1, quý 2
            # Week patterns
            (r'tuần\s*(?:này|nay)', 'date'),  # tuần này
            (r'tuần\s*trước', 'date'),  # tuần trước
            # Day patterns
            (r'hôm\s*nay', 'date'),
            (r'hôm\s*qua', 'date'),
            # Date format
            (r'\d{1,2}/\d{1,2}/\d{2,4}', 'date'),
        ]
        
        # Multi-word crop patterns (prioritize longer matches)
        crop_patterns = [
            # Common 2-3 word crops
            (r'\bcà\s+chua\b', 'crop_name'),
            (r'\bcà\s+phê\b', 'crop_name'),
            (r'\bcà\s+rốt\b', 'crop_name'),
            (r'\bcà\s+tím\b', 'crop_name'),
            (r'\bkhoai\s+lang\b', 'crop_name'),
            (r'\bkhoai\s+tây\b', 'crop_name'),
            (r'\bkhoai\s+mì\b', 'crop_name'),
            (r'\bsầu\s+riêng\b', 'crop_name'),
            (r'\bthanh\s+long\b', 'crop_name'),
            (r'\bhồ\s+tiêu\b', 'crop_name'),
            (r'\bcao\s+su\b', 'crop_name'),
            (r'\bđậu\s+tương\b', 'crop_name'),
            (r'\bđậu\s+phộng\b', 'crop_name'),
            (r'\bbắp\s+cải\b', 'crop_name'),
            (r'\brau\s+muống\b', 'crop_name'),
            (r'\brau\s+dền\b', 'crop_name'),
            (r'\bdưa\s+chuột\b', 'crop_name'),
            (r'\bdưa\s+hấu\b', 'crop_name'),
            (r'\bsu\s+su\b', 'crop_name'),
            (r'\bsu\s+hào\b', 'crop_name'),
            (r'\bcủ\s+cải\b', 'crop_name'),
        ]
        
        # Multi-word device patterns
        device_patterns = [
            (r'\bmáy\s+bơm\b', 'device_name'),
            (r'\bmáy\s+tưới\b', 'device_name'),
            (r'\bmáy\s+phun\b', 'device_name'),
            (r'\bvan\s+nước\b', 'device_name'),
            (r'\bcảm\s+biến\b', 'device_name'),
            (r'\bhệ\s+thống\s+tưới\b', 'device_name'),
        ]
        
        # Farm area patterns
        area_patterns = [
            (r'\bhàng\s+\d+\b', 'farm_area'),  # hàng 1, hàng 2
            (r'\bluống\s+\d+\b', 'farm_area'),  # luống 1
            (r'\bkhu\s+[A-Z]\b', 'farm_area'),  # khu A
            (r'\bkhu\s+\d+\b', 'farm_area'),  # khu 1
            (r'\bvườn\s+\w+\b', 'farm_area'),  # vườn cam
        ]
        
        # Duration patterns
        duration_patterns = [
            (r'\d+\s*phút', 'duration'),  # 5 phút, 10 phút
            (r'\d+\s*giờ', 'duration'),   # 1 giờ, 2 giờ
            (r'\d+\s*ngày', 'duration'),  # 1 ngày
            (r'nửa\s+tiếng', 'duration'), # nửa tiếng
            (r'\d+\s*tiếng\s*rưỡi', 'duration'), # 1 tiếng rưỡi
        ]

        # Combine all patterns (prioritize multi-word patterns first)
        all_patterns = (
            crop_patterns + 
            device_patterns + 
            area_patterns + 
            duration_patterns +
            date_patterns
        )
        # pattern = regex, entity_type = type
        for pattern, entity_type in all_patterns:
            # finditer tìm tất cả các đoạn văn khớp với mẫu trong text
            # re là thư viện built in của Python để làm việc với regex
            for match in re.finditer(pattern, text, re.IGNORECASE):
                print(f"append trong match")
                entities.append({
                    "type": entity_type,
                    "raw": match.group(0),
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.95  # Very high confidence for rule-based multi-word
                })
                print("\n" + "="*60)
                print("🔍 Entities tìm được bằng Regex:")
                print(json.dumps(entities, indent=2, ensure_ascii=False))
                print("="*60)
        
        return entities
    
    def _filter_invalid_entities(self, text: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter out invalid entities based on context and common sense rules
        """
        filtered = []
        
        # Invalid single words that are often misclassified
        invalid_crop_words = {"nam", "bắc", "trung", "miền", "chua", "tây", "đông"}
        invalid_area_words = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "0"}
        
        for entity in entities:
            raw_lower = entity["raw"].lower().strip()
            entity_type = entity["type"]
            
            # Filter invalid crop names
            if entity_type == "crop_name":
                # Reject single invalid words
                if raw_lower in invalid_crop_words:
                    logger.debug(f"Filtered invalid crop: '{entity['raw']}'")
                    continue
                # Reject very short single-character crops (except valid ones)
                if len(raw_lower) == 1:
                    continue
            
            # Filter invalid farm areas
            if entity_type == "farm_area":
                # Reject standalone numbers without context
                if raw_lower in invalid_area_words:
                    logger.debug(f"Filtered invalid area: '{entity['raw']}'")
                    continue
            
            filtered.append(entity)
        
        return filtered
    
    def _remove_overlapping_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove overlapping entities, keeping the one with higher confidence and longer span"""
        if not entities:
            return []
        
        # Sort by start position, then by confidence (higher first), then by length (longer first)
        # sort theo vị trị bắt đầu (tăng dần),
        # (dấu - để đảo ngc thứ tự) nếu cùng vị trí ưu tiên confidence cao hơn
        # nếu cùng vị trí và confidence ưu tiên entity dài hơn
        sorted_entities = sorted(
            entities, 
            key=lambda x: (x["start"], -x["confidence"], -(x["end"] - x["start"]))
        )
        
        result = []
        last_end = -1
        # last_end vị trí kết thúc của entity cuối cùng được chọn
        for entity in sorted_entities:
            if entity["start"] >= last_end:
                result.append(entity)
                last_end = entity["end"]
        
        return result
    
    def _normalize_entity_value(self, entity: Dict[str, Any]) -> str:
        """Normalize entity value based on type"""
        raw = entity["raw"]
        entity_type = entity["type"]
        
        if entity_type == "date":
            return self._normalize_date(raw)
        elif entity_type == "money":
            return self._normalize_money(raw)
        else:
            return raw.strip()
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalize date to ISO format or relative format"""
        from datetime import datetime, timedelta
        
        normalized = date_str.lower().strip()
        now = datetime.now()
        
        # Keep Vietnamese date expressions as-is for NestJS date parser
        if "hôm nay" in normalized:
            return now.strftime("%Y-%m-%d")
        elif "hôm qua" in normalized:
            return (now - timedelta(days=1)).strftime("%Y-%m-%d")
        elif "tuần này" in normalized:
            return "tuần này"  # Keep Vietnamese
        elif "tuần trước" in normalized:
            return "tuần trước"  # Keep Vietnamese
        elif "tháng này" in normalized:
            return "tháng này"  # Keep Vietnamese
        elif "tháng trước" in normalized:
            return "tháng trước"  # Keep Vietnamese
        elif "năm này" in normalized:
            return "năm nay"  # Keep Vietnamese
        elif "năm trước" in normalized or "năm ngoái" in normalized:
            return "năm trước"  # Keep Vietnamese
        
        # Try to parse dd/mm/yyyy
        # Input: "15/3/24"
        # Output: "2024-03-15"
        date_match = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', normalized)
        if date_match:
            day, month, year = date_match.groups()
            year = f"20{year}" if len(year) == 2 else year
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        return date_str
    
    def _normalize_money(self, money_str: str) -> str:
        """Normalize money to number (VND)"""
        normalized = money_str.lower().strip()
        
        # Extract number
        number_match = re.search(r'([\d,\.]+)', normalized)
        if not number_match:
            return "0"
        
        value = float(number_match.group(1).replace(',', '.'))
        
        # Handle units
        if 'tỷ' in normalized:
            value *= 1000000000
        elif 'triệu' in normalized or 'tr' in normalized:
            value *= 1000000
        elif 'k' in normalized:
            value *= 1000
        
        return str(int(value))

