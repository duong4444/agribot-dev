"""
Named Entity Recognition using PhoBERT
Fine-tuned for Vietnamese Agricultural Domain
"""

import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import torch
from loguru import logger
from transformers import AutoModelForTokenClassification, AutoTokenizer
import re


class NERExtractor:
    """
    PhoBERT-based NER Extractor for Vietnamese Agricultural Chatbot
    """
    
    # Entity labels (matching NestJS EntityType enum)
    ENTITY_LABELS = [
        "O",              # 0 - Outside
        "B-DATE",         # 1 - Begin Date
        "I-DATE",         # 2 - Inside Date
        "B-MONEY",        # 3 - Begin Money
        "I-MONEY",        # 4 - Inside Money
        "B-CROP",         # 5 - Begin Crop Name
        "I-CROP",         # 6 - Inside Crop Name
        "B-AREA",         # 7 - Begin Farm Area
        "I-AREA",         # 8 - Inside Farm Area
        "B-DEVICE",       # 9 - Begin Device Name
        "I-DEVICE",       # 10 - Inside Device Name
        "B-ACTIVITY",     # 11 - Begin Activity Type
        "I-ACTIVITY",     # 12 - Inside Activity Type
        "B-METRIC",       # 13 - Begin Metric
        "I-METRIC",       # 14 - Inside Metric
    ]
    
    # Entity type mapping
    ENTITY_TYPE_MAP = {
        "DATE": "date",
        "MONEY": "money",
        "CROP": "crop_name",
        "AREA": "farm_area",
        "DEVICE": "device_name",
        "ACTIVITY": "activity_type",
        "METRIC": "metric",
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
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        logger.info(f"NER Extractor initialized with device: {self.device}")
    
    async def load_model(self):
        """Load PhoBERT model and tokenizer"""
        try:
            logger.info(f"Loading tokenizer from {self.model_name}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            model_dir = Path(__file__).resolve().parents[2] / "models" / "ner_extractor"

            if model_dir.exists():
                logger.info(f"Loading fine-tuned model from {model_dir}...")
                try:
                    self.model = AutoModelForTokenClassification.from_pretrained(
                        model_dir,
                        num_labels=len(self.ENTITY_LABELS)
                    )
                except Exception as load_error:
                    logger.warning(f"Failed to load fine-tuned NER model: {load_error}. Falling back to base PhoBERT.")
                    self.model = AutoModelForTokenClassification.from_pretrained(
                        self.model_name,
                        num_labels=len(self.ENTITY_LABELS)
                    )
            else:
                logger.warning("Fine-tuned NER model not found. Falling back to base PhoBERT (rule-based hybrid).")
                self.model = AutoModelForTokenClassification.from_pretrained(
                    self.model_name,
                    num_labels=len(self.ENTITY_LABELS)
                )
            
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("✅ NER Extractor model loaded successfully")
            
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
                    return_offsets_mapping=True
                )
                offset_mapping = inputs.pop("offset_mapping")[0]
            except NotImplementedError:
                logger.warning(
                    "Tokenizer does not support offset mapping. Skipping PhoBERT span extraction and falling back to rule-based entities only."
                )
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=256,
                    padding=True
                )
                offset_mapping = None
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                predictions = torch.argmax(logits, dim=-1)[0]
            
            entities: List[Dict[str, Any]] = []
            if offset_mapping is not None:
                entities = self._convert_predictions_to_entities(
                    text,
                    predictions.cpu().numpy(),
                    offset_mapping.numpy(),
                    inputs["input_ids"][0].cpu().numpy()
                )
            else:
                entities = self._extract_rule_based_entities(text)
            
            # Apply rule-based post-processing for better accuracy
            entities = self._post_process_entities(text, entities)
            
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
        predictions: List[int],
        offset_mapping: List[Tuple[int, int]],
        input_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """Convert model predictions to entity list"""
        entities = []
        current_entity = None
        
        for idx, (pred, (start, end)) in enumerate(zip(predictions, offset_mapping)):
            # Skip special tokens
            if start == end:
                continue
            
            label = self.ENTITY_LABELS[pred]
            
            if label.startswith("B-"):
                # Save previous entity
                if current_entity:
                    entities.append(current_entity)
                
                # Start new entity
                entity_type = label[2:]
                current_entity = {
                    "type": self.ENTITY_TYPE_MAP.get(entity_type, entity_type.lower()),
                    "raw": text[start:end],
                    "start": start,
                    "end": end,
                    "confidence": 0.85  # Base confidence
                }
            
            elif label.startswith("I-") and current_entity:
                # Continue current entity
                current_entity["raw"] = text[current_entity["start"]:end]
                current_entity["end"] = end
            
            elif label == "O" and current_entity:
                # End current entity
                entities.append(current_entity)
                current_entity = None
        
        # Add last entity
        if current_entity:
            entities.append(current_entity)
        
        return entities
    
    def _post_process_entities(self, text: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply rule-based post-processing to improve accuracy
        Uses patterns similar to the original rule-based system
        """
        processed = []
        
        # Add rule-based entities for common patterns
        rule_entities = self._extract_rule_based_entities(text)
        
        # Merge PhoBERT and rule-based entities
        all_entities = entities + rule_entities
        
        # Remove duplicates and overlaps
        all_entities = self._remove_overlapping_entities(all_entities)
        
        # Normalize values
        for entity in all_entities:
            entity["value"] = self._normalize_entity_value(entity)
        
        return all_entities
    
    def _extract_rule_based_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using rule-based patterns (fallback)"""
        entities = []
        
        # Date patterns
        date_patterns = [
            (r'hôm\s*nay', 'date'),
            (r'hôm\s*qua', 'date'),
            (r'tuần\s*này', 'date'),
            (r'tháng\s*này', 'date'),
            (r'năm\s*này', 'date'),
            (r'\d{1,2}/\d{1,2}/\d{2,4}', 'date'),
        ]
        
        # Money patterns
        money_patterns = [
            (r'\d+[\d,\.]*\s*(đồng|vnđ|vnd|k|triệu|tr|tỷ)', 'money'),
        ]
        
        crop_keywords = [
            "cà chua",
            "cà phê",
            "lúa",
            "ngô",
            "bắp",
            "khoai",
            "rau",
            "ớt",
            "tiêu",
            "sầu riêng"
        ]

        device_keywords = [
            "máy bơm",
            "máy tưới",
            "quạt",
            "cảm biến",
            "sensor",
            "thiết bị"
        ]

        # Combine all patterns
        all_patterns = date_patterns + money_patterns
        
        for pattern, entity_type in all_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append({
                    "type": entity_type,
                    "raw": match.group(0),
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.9  # High confidence for rule-based
                })
        
        return entities
    
    def _remove_overlapping_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove overlapping entities, keeping the one with higher confidence"""
        if not entities:
            return []
        
        # Sort by start position
        sorted_entities = sorted(entities, key=lambda x: (x["start"], -x["confidence"]))
        
        result = []
        last_end = -1
        
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
        
        if "hôm nay" in normalized:
            return now.strftime("%Y-%m-%d")
        elif "hôm qua" in normalized:
            return (now - timedelta(days=1)).strftime("%Y-%m-%d")
        elif "tuần này" in normalized:
            return "this_week"
        elif "tháng này" in normalized:
            return "this_month"
        elif "năm này" in normalized:
            return "this_year"
        
        # Try to parse dd/mm/yyyy
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
        
        value = float(number_match.group(1).replace(',', ''))
        
        # Handle units
        if 'tỷ' in normalized:
            value *= 1000000000
        elif 'triệu' in normalized or 'tr' in normalized:
            value *= 1000000
        elif 'k' in normalized:
            value *= 1000
        
        return str(int(value))

