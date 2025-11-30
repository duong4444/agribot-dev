"""
Script tự động sinh dữ liệu training cho NER (Named Entity Recognition)
Domain: IoT Agricultural Chatbot

Entity Types (6 types - FOCUSED):
- DATE: tháng này, quý 1, năm nay, tháng 11, ...
- CROP: cam sành, lúa ST25, xoài cát chu, ...
- AREA: khu A, khu B, khu 1, ...
- DURATION: 5 phút, 10 phút, 1 giờ, ...
- DEVICE: máy bơm, đèn, tưới, bơm, ...
- METRIC: nhiệt độ, độ ẩm, ánh sáng, ...

Use Cases:
- device_control: "Bật {DEVICE} ở {AREA} trong {DURATION}"
- sensor_query: "{METRIC} ở {AREA} là bao nhiêu?"
- financial_query: "Chi phí {DATE} là bao nhiêu?"
- knowledge_query: "Cách trồng {CROP}"
"""

import csv
import json
import random
import re
import logging
import argparse
from typing import List, Dict, Tuple, Set, Optional, Any
from collections import Counter
from pathlib import Path
from dataclasses import dataclass, field
from tqdm import tqdm
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class Config:
    """Configuration for NER data generation"""
    output_file: str = "ner_iot_training_data.csv"
    target_samples: int = 500  # Target số lượng samples
    random_seed: int = 42
    log_level: str = "INFO"
    augment_ratio: float = 0.3  # 30% augmentation
    min_text_len: int = 5
    max_text_len: int = 150


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    return logging.getLogger(__name__)


logger = setup_logging()


# ============================================================================
# ENTITY DATABASES (FOCUSED ON IOT CHATBOT)
# ============================================================================

ENTITY_DATA = {
    "DATE": [
        # Tháng
        "tháng này", "tháng trước",
        "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
        "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12",
        # Quý
        "quý 1", "quý 2", "quý 3", "quý 4",
        "quý này", "quý trước",
        # Năm
        "năm nay", "năm ngoái", "năm 2023", "năm 2024", "năm 2025"
    ],
    
    "CROP": [
    # --- 1. Lúa & Ngũ cốc ---
    "lúa", "lúa nước", "lúa tẻ", "lúa nếp", 
    "lúa ST24", "lúa ST25", "lúa OM 5451", "lúa IR 50404",
    "lúa nếp cái hoa vàng", "lúa cẩm",
    "ngô", "bắp", "ngô nếp", "ngô ngọt", "ngô lai", "ngô NK7328", "ngô tím",
    
    # --- 2. Cây lấy củ & Tinh bột ---
    "khoai lang", "khoai lang kén", "khoai lang mật", "khoai lang tím Nhật",
    "sắn", "khoai mì", "khoai tây", "khoai mỡ", "khoai sọ", "khoai môn",
    "củ dền", "củ cải", "cà rốt",

    # --- 3. Cây Công Nghiệp & Dược liệu ---
    "cà phê", "cà phê Robusta", "cà phê Arabica", "cà phê chè", "cà phê vối",
    "hồ tiêu", "tiêu đen", "tiêu sọ",
    "cao su", "điều", "hạt điều",
    "chè", "trà", "chè Thái Nguyên", "chè Shan Tuyết", "chè Ô Long",
    "mía", "mía đường", "thuốc lá", "bông", "cây bông vải", "dâu tằm",
    "dừa", "dừa xiêm", "dừa sáp", "cacao",

    # --- 4. Các loại Đậu & Hạt ---
    "đậu tương", "lạc", "đậu phộng", "vừng", "mè",
    "đậu", "đậu cô ve", "đậu đũa", "đậu Hà Lan", "đậu bắp", "đậu xanh", "đậu nành",

    # --- 5. Cây Ăn Quả (Phân loại chi tiết) ---
    # Cam, Quýt, Bưởi, Chanh
    "cam", "cam sành", "cam Vinh", "cam canh", "cam Cao Phong",
    "bưởi", "bưởi da xanh", "bưởi Diễn", "bưởi Năm Roi", "bưởi Phúc Trạch",
    "chanh", "chanh không hạt", "chanh leo", "chanh dây", "tắc", "quất",
    "quýt", "quýt đường", 
    
    # Xoài, Sầu riêng, Mít
    "xoài", "xoài Cát Hòa Lộc", "xoài Đài Loan", "xoài cát chu", "xoài tứ quý",
    "sầu riêng", "sầu riêng Ri6", "sầu riêng Musang King", "sầu riêng Monthong",
    "mít", "mít Thái", "mít tố nữ", "mít ruột đỏ",
    
    # Nhãn, Vải, Chôm chôm
    "nhãn", "nhãn lồng", "nhãn lồng Hưng Yên", "nhãn xuồng cơm vàng", "nhãn Ido",
    "vải", "vải thiều", "vải thiều Lục Ngạn", "vải u trứng",
    "chôm chôm", "chôm chôm nhãn", "chôm chôm Thái",
    
    # Dưa, Chuối, Thanh long
    "dưa hấu", "dưa hấu Hắc Mỹ Nhân", "dưa lưới", "dưa lê",
    "chuối", "chuối tiêu", "chuối tây", "chuối ngự", "chuối cau", "chuối Laba",
    "thanh long", "thanh long ruột đỏ", "thanh long ruột trắng", "thanh long Bình Thuận",
    
    # Các loại quả khác
    "đu đủ", "dứa", "thơm", "khóm",
    "măng cụt", "vú sữa", "vú sữa Lò Rèn",
    "bơ", "bơ 034", "bơ sáp", "bơ booth",
    "na", "mãng cầu", "mãng cầu xiêm",
    "dâu tây", "ổi", "ổi Nữ Hoàng", "ổi lê",
    "mận", "mận hậu", "roi", "hồng xiêm", "sapoche", "lê", "táo",

    # --- 6. Rau xanh & Rau gia vị ---
    # Rau ăn lá
    "rau cải", "cải ngọt", "cải thìa", "cải bẹ xanh", "cải cúc", "tần ô",
    "bắp cải", "cải thảo", "cải bó xôi",
    "rau muống", "rau dền", "rau ngót", "mồng tơi",
    "xà lách", "xà lách mỡ", "xà lách xoong", "cần tây", "rau má",
    
    # Rau ăn quả/củ
    "cà chua", "cà chua bi", "cà chua cherry", "cà tím", "cà pháo",
    "dưa chuột", "dưa leo", "bí đao", "bí xanh", "bí đỏ", "bí ngô",
    "bầu", "mướp", "mướp đắng", "khổ qua", "su su", "su hào",
    "súp lơ", "bông cải xanh", "bông cải trắng", "măng tây",
    "ớt", "ớt chuông", "ớt hiểm", "ớt sừng",

    # Gia vị
    "hành lá", "hành tây", "hành tím",
    "tỏi", "tỏi Lý Sơn", "tỏi cô đơn",
    "gừng", "nghệ", "riềng", "sả",
    "rau mùi", "ngò rí", "rau răm", "thì là", "lá lốt",
    "tía tô", "kinh giới", "húng quế", "húng chanh",

    # --- 7. Hoa & Cây cảnh ---
    "hoa hồng", "hoa lan", "hoa cúc", "hoa ly", "hoa huệ", "hoa đồng tiền",
    "hoa lay ơn", "hoa sen", "hoa súng", "hoa đào", "hoa mai",

    # --- 8. Nấm ---
    "nấm", "nấm rơm", "nấm bào ngư", "nấm hương", "nấm kim châm",
    "nấm mỡ", "nấm đùi gà", "mộc nhĩ", "nấm linh chi"
    ],
    
    "AREA": [
        # Khu chữ
        "khu A", "khu B", "khu C", "khu D", "khu E", "khu F", "khu G", "khu H", "khu I",
        "khu J", "khu K", "khu L", "khu M", "khu N", "khu O", "khu P", "khu Q", "khu R",
        "khu S", "khu T", "khu U", "khu V", "khu W", "khu X", "khu Y", "khu Z",
        # Khu số
        "khu 1", "khu 2", "khu 3", "khu 4", "khu 5",
        # Vườn
        "vườn cam", "vườn xoài", "vườn bưởi",
    ],
    
    "DURATION": [
        # Phút
        "5 phút", "10 phút", "15 phút", "20 phút", "30 phút",
        "45 phút", "60 phút",
        # Giờ
        "1 giờ", "2 giờ", "3 giờ", "4 giờ", "5 giờ",
        "nửa tiếng", "1 tiếng rưỡi",
        # Ngày (ít dùng cho IoT control nhưng có thể có)
        "1 ngày", "2 ngày",
    ],
    
    "DEVICE": [
        # Máy bơm (nhiều aliases)
        "máy bơm", "bơm", "tưới", "máy tưới",
        "bơm nước", "hệ thống tưới",
        # Đèn
        "đèn", "bóng đèn", "đèn chiếu sáng",
        # Khác (nếu mở rộng sau)
        # "quạt", "van nước", "cảm biến",
    ],
    
    "METRIC": [
        # Nhiệt độ
        "nhiệt độ", "nhiệt độ không khí", "nhiệt độ đất",
        # Độ ẩm
        "độ ẩm", "độ ẩm không khí", "độ ẩm đất",
        # Ánh sáng
        "ánh sáng", "cường độ ánh sáng", "lux",
        # Khác

    ],
}


# ============================================================================
# TEMPLATES (FOCUSED ON 3 USE CASES)
# ============================================================================

TEMPLATES = {
    # 1. DEVICE_CONTROL
    "device_control_simple": [
        "Bật {DEVICE}",
        "Tắt {DEVICE}",
        "Bật {DEVICE} ở {AREA}",
        "Tắt {DEVICE} ở {AREA}",
    ],
    "device_control_duration": [
        "Bật {DEVICE} trong {DURATION}",
        "Tưới {DURATION}",
        "Bật {DEVICE} ở {AREA} trong {DURATION}",
        "Tắt {DEVICE} {AREA} sau {DURATION}",
        "Bật {DEVICE} {AREA} {DURATION}",
    ],
    
    # 2. SENSOR_QUERY
    "sensor_query": [
        "{METRIC} là bao nhiêu",
        "{METRIC} ở {AREA}",
        "{METRIC} của {AREA}",
        "{METRIC} của {AREA} hiện tại",
        "Kiểm tra {METRIC} {AREA}",
        "{METRIC} {AREA} đang là bao nhiêu",
        "Xem {METRIC} ở {AREA}",
        "{AREA} có {METRIC} bao nhiêu",
    ],
    
    # 3. FINANCIAL_QUERY
    "financial_query": [
        "Chi phí {DATE}",
        "Doanh thu {DATE}",
        "Chi phí {DATE} là bao nhiêu",
        "Doanh thu {DATE} bao nhiêu",
        "Tổng chi phí {DATE}",
        "Tổng doanh thu {DATE}",
    ],
    
    # 4. KNOWLEDGE_QUERY
    "knowledge_query": [
        "Cách trồng {CROP}",
        "Kỹ thuật chăm sóc {CROP}",
        "{CROP} cần bón phân gì",
        "{CROP} bị bệnh gì",
        "Thu hoạch {CROP} khi nào",
        "Cho tôi thông tin về nguồn gốc của cây {CROP}",
        "Cho tôi thông tin về cây {CROP}",
        "Cách phòng trừ sâu hại chính cho cây {CROP}",
        "{CROP} có yêu cầu gì về sinh thái",
        "Bón phân cho giai đoạn kích thích ra hoa ở {CROP} như thế nào",
        "Thông tin về giống {CROP}",
        "Tôi muốn biết về giống {CROP}",
        "Sâu đục thân ở {CROP} xử lý như thế nào",
        "Bệnh hại ở {CROP} xử lý như thế nào",
        "Bệnh ở {CROP} xử lý như thế nào",
        "Bệnh vàng lá ở {CROP} xử lý như thế nào",
        "Bệnh thối rễ ở {CROP} xử lý như thế nào",
        "Bệnh phấn trắng ở {CROP} xử lý như thế nào",
        "Bọ trích ở {CROP} xử lý như thế nào",
        "Bệnh loét ở {CROP} xử lý như thế nào",
        "Đất trồng phù hợp cho cây {CROP}",
        "Dấu hiệu của {CROP} thiếu kali",
        "Dấu hiệu của {CROP} thiếu đạm",
        "Dấu hiệu của {CROP} thiếu chất dinh dưỡng",
    ],
    
    # 5. MIXED (Complex)
    "mixed": [
        "Bật {DEVICE} ở {AREA} vì {METRIC} thấp",
        "{METRIC} {AREA} cao quá, tắt {DEVICE}",
    ],
}


# ============================================================================
# NER DATA GENERATION
# ============================================================================

@dataclass
class NerSample:
    """Class để lưu trữ một mẫu NER"""
    text: str
    entities: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_csv_row(self) -> Tuple[str, str]:
        return (self.text, json.dumps(self.entities, ensure_ascii=False))


class NERDataGenerator:
    """Generate NER training data for IoT chatbot"""
    
    def __init__(self, config: Config):
        self.config = config
        random.seed(config.random_seed)
        self.generated_texts: Set[str] = set()
        
        # Compile templates
        self.template_list = [
            template
            for category, templates in TEMPLATES.items()
            for template in templates
        ]
        logger.info(f"Compiled {len(self.template_list)} templates.")

    def is_valid(self, sample: NerSample) -> bool:
        """Kiểm tra sample hợp lệ"""
        if not sample.text or not sample.entities:
            return False
        if not (self.config.min_text_len <= len(sample.text) <= self.config.max_text_len):
            return False
        
        # De-duplicate
        normalized_text = sample.text.lower()
        if normalized_text in self.generated_texts:
            return False
            
        # Validate entity positions
        for ent in sample.entities:
            start, end = ent['start'], ent['end']
            if sample.text[start:end] != ent['value']:
                logger.warning(f"Entity mismatch: '{sample.text[start:end]}' != '{ent['value']}'")
                return False
        
        self.generated_texts.add(normalized_text)
        return True

    def fill_template(self, template: str) -> Optional[NerSample]:
        """Fill template với entities"""
        text = template
        entities = []
        offset = 0
        
        matches = list(re.finditer(r'\{(\w+)\}', template))
        if not matches:
            return None
        
        for match in matches:
            entity_type = match.group(1)
            placeholder = match.group(0)
            
            # Get value
            if entity_type in ENTITY_DATA:
                value = random.choice(ENTITY_DATA[entity_type])
            else:
                logger.warning(f"Unknown entity type: {entity_type}")
                continue
            
            # Calculate position
            start = match.start() + offset
            end = start + len(value)
            
            # Replace in text
            text = text[:start] + value + text[match.end() + offset:]
            
            # Update offset
            offset += len(value) - len(placeholder)
            
            # Add entity
            entities.append({
                "type": entity_type,
                "value": value,
                "start": start,
                "end": end
            })
        
        return NerSample(text, entities)

    def augment_sample(self, sample: NerSample) -> Optional[NerSample]:
        """Augment sample bằng cách thay thế entity"""
        if not sample.entities:
            return None
        
        # Chọn entity để thay thế
        ent_to_replace = random.choice(sample.entities)
        ent_type = ent_to_replace['type']
        old_value = ent_to_replace['value']
        
        # Lấy giá trị mới
        if ent_type not in ENTITY_DATA or len(ENTITY_DATA[ent_type]) <= 1:
            return None
        
        new_value = random.choice(ENTITY_DATA[ent_type])
        # Đảm bảo khác giá trị cũ
        attempts = 0
        while new_value == old_value and attempts < 5:
            new_value = random.choice(ENTITY_DATA[ent_type])
            attempts += 1
        
        if new_value == old_value:
            return None
        
        # Tạo text mới
        start_replace = ent_to_replace['start']
        end_replace = ent_to_replace['end']
        new_text = sample.text[:start_replace] + new_value + sample.text[end_replace:]
        
        # Tính toán lại entities
        new_entities = []
        offset = len(new_value) - len(old_value)
        
        for ent in sample.entities:
            new_ent = ent.copy()
            if ent == ent_to_replace:
                new_ent['value'] = new_value
                new_ent['end'] = new_ent['start'] + len(new_value)
            elif ent['start'] > start_replace:
                new_ent['start'] += offset
                new_ent['end'] += offset
            
            new_entities.append(new_ent)
        
        return NerSample(new_text, new_entities)

    def generate(self, target_count: int) -> List[NerSample]:
        """Main generation method"""
        all_samples: List[NerSample] = []
        
        logger.info(f"Generating {target_count} samples...")
        
        pbar = tqdm(total=target_count, desc="Generating")
        attempts = 0
        max_attempts = target_count * 20
        
        while len(all_samples) < target_count and attempts < max_attempts:
            attempts += 1
            
            # Generate from template
            template = random.choice(self.template_list)
            new_sample = self.fill_template(template)
            
            if new_sample and self.is_valid(new_sample):
                all_samples.append(new_sample)
                pbar.update(1)
                
                # Augment
                if random.random() < self.config.augment_ratio:
                    aug_sample = self.augment_sample(new_sample)
                    if aug_sample and self.is_valid(aug_sample):
                        all_samples.append(aug_sample)
                        pbar.update(1)
        
        pbar.close()
        
        if attempts >= max_attempts:
            logger.warning(f"Reached max attempts. Generated {len(all_samples)} samples.")
        
        logger.info(f"Total samples: {len(all_samples)}")
        return all_samples


# ============================================================================
# DATA I/O
# ============================================================================

def save_ner_data(samples: List[NerSample], output_filepath: str) -> bool:
    """Save NER data to CSV"""
    if not samples:
        logger.error("No samples to save.")
        return False
    
    try:
        output_path = Path(output_filepath)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Shuffle
        random.shuffle(samples)
        
        # Write CSV
        with open(output_filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['text', 'entities'])
            
            for sample in samples:
                writer.writerow(sample.to_csv_row())
        
        logger.info(f"✅ Saved {len(samples)} samples to {output_filepath}")
        
        # Statistics
        entity_counts = Counter()
        for sample in samples:
            for entity in sample.entities:
                entity_counts[entity['type']] += 1
        
        logger.info("\n📊 Entity Distribution:")
        for entity_type, count in sorted(entity_counts.items(), key=lambda x: -x[1]):
            logger.info(f"  {entity_type}: {count}")
        
        # Multi-entity stats
        multi_entity_samples = sum(1 for s in samples if len(s.entities) > 1)
        logger.info(f"\n📈 Multi-entity samples: {multi_entity_samples} ({multi_entity_samples/len(samples)*100:.1f}%)")
        
        return True
        
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        return False


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Generate NER training data for IoT chatbot")
    parser.add_argument('--output', default="ner_iot_training_data.csv", help="Output CSV file")
    parser.add_argument('--target', type=int, default=500, help="Target number of samples")
    parser.add_argument('--seed', type=int, default=42, help="Random seed")
    parser.add_argument('--log-level', default="INFO", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    config = Config(
        output_file=args.output,
        target_samples=args.target,
        random_seed=args.seed,
        log_level=args.log_level
    )
    
    global logger
    logger = setup_logging(config.log_level)
    
    random.seed(config.random_seed)
    
    logger.info("🚀 Starting NER Data Generation for IoT Chatbot...")
    logger.info(f"Config: {config}")
    
    try:
        start_time = time.time()
        
        # Generate
        generator = NERDataGenerator(config)
        samples = generator.generate(config.target_samples)
        
        if not samples:
            logger.error("No samples generated. Exiting.")
            return 1
        
        # Save
        success = save_ner_data(samples, config.output_file)
        
        if not success:
            logger.error("Failed to save data. Exiting.")
            return 1
        
        end_time = time.time()
        logger.info(f"\n✨ Done in {end_time - start_time:.2f} seconds!")
        return 0
        
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Process interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
