"""
Script tự động sinh dữ liệu training cho Intent Classification

Techniques sử dụng:
1. Template-based generation
2. (Cải tiến) Random multi-synonym replacement
3. (Cải tiến) Probabilistic paraphrasing & question variations
4. Entity substitution
5. (Mới) Noise injection (filler words, politeness)
6. (Mới) Case variations
7. (Cải tiến) Global de-duplication at save time

Improvements:
- Chiến lược augmentation đa dạng hơn (chaining methods).
- Thêm các kỹ thuật augmentation thực tế (noise, case).
- Xử lý de-duplication toàn cục và chính xác.
- Tối ưu hóa vòng lặp generation.
- TQDM lồng nhau được quản lý tốt hơn.
"""

import csv
import random
import re
import logging
import argparse
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
from pathlib import Path
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class Config:
    """Configuration for data generation"""
    input_file: str = "data/intent_data_6intents.csv"
    output_file: str = "data/intent_data_augmented_6intents.csv"
    target_samples: int = 200
    max_replacements: int = 2  # Số từ đồng nghĩa tối đa thay thế trong 1 câu
    min_sample_length: int = 3
    max_sample_length: int = 200
    prob_noise: float = 0.3  # Xác suất thêm từ nhiễu
    prob_case_variation: float = 0.3  # Xác suất đổi kiểu chữ
    prob_question_variation: float = 0.2 # Xác suất biến đổi câu hỏi
    prob_use_template: float = 0.5 # Xác suất tạo mới từ template (so với augment)
    enable_parallel: bool = False
    num_workers: int = 4
    random_seed: int = 42
    log_level: str = "INFO"


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
# SYNONYMS, ENTITIES & VARIATIONS
# ============================================================================

SYNONYMS = {
    # Verbs - động từ
    "xem": ["kiểm tra", "cho biết", "hiển thị", "liệt kê", "cho xem", "tra cứu"],
    "tổng": ["tổng cộng", "tính tổng", "tổng kết", "toàn bộ"],
    "thêm": ["tạo", "thêm mới", "tạo mới", "ghi nhận", "lưu lại"],
    "sửa": ["cập nhật", "chỉnh sửa", "thay đổi", "điều chỉnh"],
    "xóa": ["xoá", "loại bỏ", "hủy", "gỡ bỏ", "xóa bỏ"],
    "bật": ["mở", "kích hoạt", "khởi động"],
    "tắt": ["đóng", "ngắt", "dừng", "tạm ngừng"],

    # Time - thời gian
    "tháng này": ["tháng hiện tại", "tháng nay"],
    "năm nay": ["năm này", "năm hiện tại"],
    "hôm nay": ["ngày hôm nay", "hôm này"],
    "tuần này": ["tuần hiện tại", "tuần nay"],

    # Quantity
    "bao nhiêu": ["mấy", "là bao nhiêu", "là mấy"],
    "mấy": ["bao nhiêu", "là mấy", "là bao nhiêu"],

    # Question words
    "làm sao": ["làm thế nào", "cách nào", "bằng cách nào"],
    "tại sao": ["vì sao", "do đâu"],
    "khi nào": ["lúc nào", "thời điểm nào"],
    "phù hợp": ["hợp", "thích hợp", "nên", "phù hợp nhất"],
}

# (Mới) Các từ nhiễu thực tế
NOISE_WORDS = {
    'prefix': [
        "vui lòng", "làm ơn", "xin hãy", "cho tôi hỏi", "bạn ơi", "giúp tôi",
        "hãy", "thử"
    ],
    'suffix': [
        "giúp tôi", "với", "nhé", "nha", "xem nào", "à", "ơi", "đi",
        "giùm"
    ]
}

# TEMPLATES VÀ ENTITIES giữ nguyên như trong file của bạn
# (Giữ nguyên TEMPLATES và ENTITIES ở đây)
# ============================================================================
# TEMPLATES CHO MỖI INTENT
# ============================================================================

TEMPLATES = {
    "knowledge_query": [
        # Câu hỏi cơ bản về kỹ thuật nông nghiệp
        "Cách {action} {crop}?",
        "{crop} bị {disease} xử lý thế nào?",
        "Kỹ thuật {technique} cho {crop}?",
        "Làm sao để {action} {crop}?",
        "{fertilizer} có tác dụng gì?",
        "Quy trình {action} {crop}?",
        "Phương pháp {technique} là gì?",
        "Bệnh {disease} trên {crop} nhận biết như thế nào?",
        "Lợi ích của {technique}?",
        "Nguồn gốc của {crop}",
        "Xuất xứ của {crop}",
        "Nguồn gốc cây {crop}",
        "Nguồn gốc của cây {crop}",
        "Nguồn gốc {crop}"
        
        # Thời vụ và mật độ trồng (thường bị nhầm với analytics)
        "Thời vụ {action} {crop} ở {region}?",
        "Mật độ trồng {crop} thích hợp?",
        "Thời vụ và mật độ của {crop}?",
        "Mật độ trồng {crop} ở {region}?",
        "Khoảng cách trồng {crop}?",
        "Thời điểm trồng {crop} nào tốt nhất?",
        
        # Gợi ý cây trồng theo mùa
        "{season} nên trồng cây gì?",
        "Gợi ý cây trồng cho {season}?",
        "Cây trồng nào phù hợp với {season}?",
        "{season} ở {region} nên trồng {crop} nào?",
        "Cây gì phù hợp trồng vào {season}?",
        
        # Giá trị kinh tế và thông tin về cây trồng (thường bị nhầm với financial/analytics)
        "Cho tôi thông tin về giá trị kinh tế cây {crop}",
        "Giá trị kinh tế của {crop} như thế nào?",
        "Thông tin về giá trị kinh tế {crop}",
        "{crop} có giá trị kinh tế cao không?",
        "Lợi ích kinh tế khi trồng {crop}?",
        
        # Quy trình canh tác (thường bị nhầm với sensor_query)
        "Quy trình canh tác {crop} có mấy giai đoạn?",
        "Các giai đoạn canh tác {crop}?",
        "{crop} trồng theo quy trình nào?",
        "Chu trình sinh trưởng của {crop}?",
        
        # So sánh bệnh và triệu chứng (thường bị nhầm với analytics)
        "So sánh triệu chứng bệnh {disease} và bệnh {disease2} trên {crop}",
        "Điểm khác biệt giữa bệnh {disease} và {disease2}",
        "Phân biệt bệnh {disease} với {disease2}",
        
        # Tác dụng và công dụng (thường bị nhầm với financial_query)
        "Tác dụng của {crop}",
        "Công dụng {crop} trong y học",
        "{crop} có tác dụng gì?",
        "Lợi ích sức khỏe của {crop}?",
        
        # Câu hỏi về vụ mùa (thường bị nhầm với analytics)
        "Vụ {crop} nào có năng suất cao nhất ở {region}?",
        "Vụ nào trồng {crop} tốt nhất?",
        "Mùa vụ {crop} ở {region}?",
    ],
    
    "financial_query": [
        # Chỉ các câu hỏi thực sự về tài chính cụ thể
        "Tổng {metric} {period} là bao nhiêu?",
        "Chi phí {category} {period}?",
        "Xem báo cáo {report_type} {period}.",
        "Doanh thu từ {crop} {period}?",
        "Lợi nhuận của {item} {period}?",
        "Tính {metric} của {item}.",
        "Cho xem {metric} {period}.",
        "Kiểm tra chi phí {category} {period}.",
        "{period} lỗ hay lãi?",
        "So sánh doanh thu {period1} với {period2}.",
        "Báo cáo tài chính {period}",
        "Thu nhập từ {crop} {period}",
        "Chi tiêu {period} bao nhiêu?",
    ],
    
    "device_control": [
        "Bật {device} ở {area}.",
        "Tắt {device}.",
        "Điều chỉnh {device} về {value}.",
        "Lên lịch {device} {time}.",
        "Kiểm tra trạng thái {device}.",
        "{device} có đang hoạt động không?",
        "Cài đặt {device} {parameter} là {value}.",
        "Cho {device} chạy {duration}.",
        "Ngưng {device} ở {area}.",
        "Tự động {action} {device} khi {condition}.",
        "Thay đổi ngưỡng {sensor} tưới tự động của {area} thành {value}",
        "Điều chỉnh ngưỡng {sensor} tưới tự động của {area} thành {value}",
        "Đặt ngưỡng {sensor} tưới tự động của {area} thành {value}",
        "Thay đổi ngưỡng ánh sáng tự động của {area} thành {value}",
        "Đặt ngưỡng ánh sáng tự động của {area} thành {value}",
        "Chỉnh ngưỡng sáng đèn tự động của {area} thành {value}",
        "Điều chỉnh ngưỡng ánh sáng tự động của {area} thành {value}",
    ],
    
    "sensor_query": [
        # Chỉ các câu hỏi thực sự về dữ liệu cảm biến cụ thể
        "Nhiệt độ hiện tại là bao nhiêu?",
        "Xem số liệu {sensor} {period}.",
        "{sensor} ở {area} là mấy?",
        "Lịch sử {sensor} của {area}?",
        "Cảnh báo về {sensor}.",
        "Giá trị {sensor} có bình thường không?",
        "So sánh {sensor} giữa {area1} và {area2}.",
        "Biểu đồ {sensor} {period}.",
        "{sensor} cao nhất/thấp nhất {period}?",
        "Xu hướng {sensor} {period}.",
        "Dữ liệu {sensor} hôm nay",
        "Cảm biến {sensor} báo gì?",
        "Kiểm tra {sensor} ở {area}",
        "Đo {sensor} hiện tại",
        "Thống kê {sensor} {period}",
        "Số đo {sensor} {area} bao nhiêu?",
    ],
    
    "unknown": [
        "Xin chào",
        "Hello",
        "Hi",
        "Chào bạn",
        "Cảm ơn",
        "Thanks",
        "OK",
        "Được rồi",
        "Tạm biệt",
        "Bye",
    ],
}

# ============================================================================
# ENTITIES CHO TEMPLATE SUBSTITUTION
# ============================================================================

ENTITIES = {
    "crop": [
        "lúa", "ngô", "khoai lang", "sắn", "khoai tây", "khoai sọ",
        "lúa ST25", "lúa nếp", "ngô nếp", "ngô lai",
        "cà phê", "hồ tiêu", "điều", "cao su", "chè", "mía", "dừa",
        "cà phê Robusta", "cà phê Arabica", "dừa xiêm",
        "cam", "bưởi", "chanh", "quýt", "tắc", "bưởi da xanh", "cam sành",
        "xoài", "xoài Cát Hòa Lộc", "xoài Đài Loan",
        "sầu riêng", "sầu riêng Ri6", "mít", "mít Thái",
        "nhãn", "vải", "vải thiều", "chôm chôm", "vú sữa", "na",
        "thanh long", "thanh long ruột đỏ",
        "ổi", "bơ", "bơ 034", "măng cụt", "chuối", "chuối tiêu", "đu đủ",
        "dưa hấu", "dưa lưới", "nho", "táo", "lê",
        "cà chua", "cà tím", "cà pháo", "ớt", "ớt chuông",
        "dưa chuột", "dưa leo", "bí đỏ", "bí xanh", "bầu", "mướp",
        "rau cải", "cải ngọt", "cải bẹ xanh", "cải thảo", "bắp cải", "su hào",
        "rau muống", "rau ngót", "mồng tơi", "rau dền", "rau lang",
        "súp lơ", "súp lơ xanh", "cần tây",
        "đậu", "đậu cô ve", "đậu đũa", "đậu bắp", "đậu tương", "lạc",
        "hành lá", "hành tây", "tỏi", "gừng", "nghệ", "riềng", "sả",
        "rau mùi", "rau răm", "tía tô", "kinh giới", "húng quế", "thì là",
        "hoa cúc", "hoa hồng", "hoa lan", "hoa huệ", "hoa đào", "hoa mai",
        "nấm", "nấm rơm", "nấm mỡ", "nấm hương", "nấm bào ngư"
    ],
    
    "disease": [
        "đạo ôn", "khô vằn", "bệnh héo xanh", "thán thư", "phấn trắng",
        "rỉ sắt", "sương mai", "đốm lá", "đốm nâu", "thối rễ", "thối thân",
        "lở cổ rễ", "nấm hồng", "nứt thân", "xì mủ", "chổi rồng",
        "xoăn lá", "virus vàng lá", "Greening", "vàng lá gân xanh",
        "sâu đục thân", "sâu cuốn lá", "sâu tơ", "sâu xanh", "sâu khoang",
        "sâu đục quả", "sâu vẽ bùa", "bệnh loét",
        "rầy nâu", "rầy xanh", "rệp sáp", "rệp muội", "bọ trĩ",
        "bọ phấn trắng", "bọ xít", "bọ nhảy", "ruồi vàng", "nhện đỏ",
        "ốc bươu vàng", "tuyến trùng", "chuột"
    ],
    
    "disease2": [
        "khô vằn", "thán thư", "phấn trắng", "rỉ sắt", "sương mai", 
        "đốm nâu", "thối rễ", "nấm hồng", "xoăn lá", "Greening",
        "bệnh loét", "virus vàng lá", "chổi rồng", "đạo ôn"
    ],
    
    "action": [
        "trồng", "gieo hạt", "bón phân", "tưới nước", "thu hoạch",
        "chăm sóc", "nhân giống", "cải tạo", "xử lý", "phòng trừ"
    ],
    
    "technique": [
        "tưới nhỏ giọt", "trồng xen canh", "ủ phân compost", "nuôi trùn quế",
        "aquaponics", "canh tác hữu cơ", "VAC", "tỉa cành", "ghép cành"
    ],
    
    "fertilizer": [
        "phân NPK", "phân lân", "phân kali", "phân hữu cơ", "phân vi sinh",
        "vôi bột", "phân đạm", "phân chuồng", "phân compost"
    ],
    
    "region": [
        "miền Bắc", "miền Trung", "miền Nam", "Tây Nguyên", "Đồng bằng sông Cửu Long"
    ],

    "season": [
        "mùa đông", "mùa hè", "mùa mưa", "mùa khô", "mùa xuân",
        "mùa thu", "vụ đông", "vụ hè thu", "vụ đông xuân"
    ],
    
    "metric": [
        "doanh thu", "chi phí", "lợi nhuận", "thu nhập", "chi tiêu",
        "công nợ", "tiền lãi", "vốn đầu tư", "sản lượng"
    ],
    
    "category": [
        "phân bón", "thuốc trừ sâu", "giống", "nhân công", "điện nước",
        "xăng dầu", "vật tư", "thức ăn chăn nuôi", "sửa chữa"
    ],
    
    "period": [
        "tháng này", "tháng trước", "năm nay", "quý này", "tuần này",
        "hôm nay", "hôm qua", "tháng 9", "năm 2024", "6 tháng đầu năm"
    ],
    
    "report_type": [
        "tài chính", "dòng tiền", "lỗ lãi", "thu chi", "công nợ", "thuế"
    ],
    
    "item": [
        "vụ mùa", "khu A", "luống B", "vườn cam", "cây sầu riêng",
        "1 hecta lúa", "khu B", "nông trại", "giống ST25"
    ],
    
    "area": [
        "khu A", "khu B", "khu C", "luống 1", "luống 2", "vườn cam",
        "nhà kính", "nhà màng", "khu vực 1", "đồng ruộng", "vườn ươm"
    ],
    
    "activity": [
        "bón phân", "tưới nước", "phun thuốc", "thu hoạch", "làm cỏ",
        "xới đất", "tỉa cành", "gieo mạ", "bảo trì"
    ],
    
    "device": [
        "máy bơm", "hệ thống tưới", "quạt", "đèn", "cửa sổ", "rèm che",
        "máy phun sương", "van tưới", "động cơ", "cảm biến"
    ],
    
    "sensor": [
        "nhiệt độ", "độ ẩm", "pH", "EC", "ánh sáng", "độ ẩm đất", "CO2"
    ],
    
    "value": [
        "25°C", "70%", "mức 3", "tự động", "cao", "thấp"
    ],
    
    "time": [
        "6h sáng", "18h chiều", "vào buổi sáng", "lúc 8h", "mỗi 2 tiếng"
    ],
    
    "duration": [
        "30 phút", "1 giờ", "2 tiếng", "cả ngày"
    ],
    
    "condition": [
        "nhiệt độ > 30°C", "độ ẩm < 50%", "trời mưa", "ban ngày"
    ],
    
    # Additional entities
    "parameter": ["nhiệt độ", "tốc độ", "thời gian", "chế độ"],
    "details": ["thông tin chi tiết", "dữ liệu đầy đủ", "các thông số"],
    "type": ["chi tiết", "tổng hợp", "hàng ngày"],
    "event": ["sự kiện", "hoạt động", "công việc"],
    "identifier": ["số 1", "ID 123", "mã ABC", "khu A"],
    "field": ["tên", "giá trị", "trạng thái", "số lượng"],
    "record": ["bản ghi", "dữ liệu", "thông tin", "ghi chú"],
    "name": ["Hòa Phát", "An Phú", "Tân Lộc"],
    "date": ["15/10", "hôm qua", "tuần trước"],
    "dimension": ["thời gian", "khu vực", "loại cây"],
    "item1": ["lúa", "ngô", "khu A"],
    "item2": ["cà phê", "hồ tiêu", "khu B"],
    "period1": ["tháng này", "quý này"],
    "period2": ["tháng trước", "quý trước"],
    "area1": ["khu A", "vườn cam"],
    "area2": ["khu B", "vườn chanh"],
}

# Biên dịch regex cho synonyms để tăng tốc độ
SYNONYM_PATTERNS = {
    word: (re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE), syns)
    for word, syns in SYNONYMS.items()
}


# ============================================================================
# DATA VALIDATION (Đơn giản hóa)
# ============================================================================

class DataValidator:
    """Validator for generated samples (chỉ kiểm tra định dạng)"""

    def __init__(self, config: Config):
        self.config = config

    def is_valid_format(self, sample: str) -> bool:
        """Check if sample format is valid (không kiểm tra duplicate)"""
        if not sample or not sample.strip():
            return False

        # Check length
        if len(sample) < self.config.min_sample_length:
            return False
        if len(sample) > self.config.max_sample_length:
            return False

        # Check for unfilled placeholders
        if '{' in sample or '}' in sample:
            return False

        return True


# ============================================================================
# AUGMENTATION FUNCTIONS (Cải tiến)
# ============================================================================

class DataAugmenter:
    """Class for data augmentation operations"""

    def __init__(self, config: Config):
        self.config = config
        random.seed(config.random_seed)

    def apply_synonym_replacement(self, text: str) -> str:
        """
        (Cải tiến) Ngẫu nhiên thay thế 1 hoặc nhiều từ đồng nghĩa.
        """
        words_to_replace = []
        for word, (pattern, syns) in SYNONYM_PATTERNS.items():
            if pattern.search(text):
                words_to_replace.append((word, pattern, syns))
        
        if not words_to_replace:
            return text

        random.shuffle(words_to_replace)
        
        num_replacements = random.randint(1, min(len(words_to_replace), self.config.max_replacements))
        
        for i in range(num_replacements):
            word, pattern, syns = words_to_replace[i]
            synonym = random.choice(syns)
            
            # Chỉ thay thế 1 lần để tránh lỗi
            # ví dụ: "mấy" -> "bao nhiêu", rồi "bao nhiêu" -> "mấy"
            text = pattern.sub(synonym, text, count=1)
            
        return text

    def generate_from_template(self, template: str, count: int = 1) -> List[str]:
        """Generate samples from template với entity substitution"""
        samples = set()
        placeholders = re.findall(r'\{(\w+)\}', template)

        # Validate template has all required entities
        missing_entities = [ph for ph in placeholders if ph not in ENTITIES]
        if missing_entities:
            logger.warning(f"Template '{template}' có entities bị thiếu: {missing_entities}")
            return []

        attempts = 0
        max_attempts = count * 10  # Avoid infinite loops

        while len(samples) < count and attempts < max_attempts:
            attempts += 1
            sample = template
            
            # Substitute each placeholder
            # Dùng set để đảm bảo thay thế {area} và {area1} riêng biệt
            for placeholder in set(placeholders): 
                entity_values = ENTITIES[placeholder]
                # Đếm số lần placeholder xuất hiện
                num_occurrences = sample.count(f'{{{placeholder}}}')
                for _ in range(num_occurrences):
                    entity_value = random.choice(entity_values)
                    sample = sample.replace(f'{{{placeholder}}}', entity_value, 1)

            samples.add(sample)
        
        return list(samples)

    def add_question_variations(self, text: str) -> str:
        """(Cải tiến) Biến đổi câu hỏi một cách ngẫu nhiên"""
        if random.random() > self.config.prob_question_variation:
             return text
        
        original_text = text
        
        # 1. Thêm "cho tôi biết" prefix
        if "?" in text and not text.lower().startswith("cho"):
            no_question = text.replace('?', '').strip().lower()
            variations = [
                f"Cho tôi biết {no_question}.",
                f"Hãy cho biết {no_question}.",
                f"Liệt kê {no_question}."
            ]
            text = random.choice(variations)

        # 2. Thêm "cho xem"
        elif not any(word in text.lower() for word in ["cho", "hãy", "xin", "vui lòng", "làm ơn"]):
             text = f"Cho xem {text.lower()}"

        # 3. Đảm bảo có dấu chấm hỏi nếu là câu hỏi
        q_words = ["bao nhiêu", "mấy", "gì", "thế nào", "ở đâu", "khi nào", "tại sao"]
        if any(q in text.lower() for q in q_words) and not text.endswith('?'):
            text = text.strip(" .") + "?"

        return text if text != original_text else original_text


    def add_noise(self, text: str) -> str:
        """(Mới) Thêm từ đệm/từ lịch sự một cách ngẫu nhiên"""
        if random.random() > self.config.prob_noise:
            return text

        # Đảm bảo không thêm nhiễu vào câu điều khiển
        if text.lower().startswith(("bật", "tắt", "mở", "đóng", "dừng")):
             if random.random() < 0.5:
                 suffix = random.choice(NOISE_WORDS['suffix'])
                 return f"{text.strip(' .?')} {suffix}"
             else:
                 return text # Không thêm prefix cho câu điều khiển

        # 50/50 thêm prefix hoặc suffix
        if random.random() < 0.5:
            # Add prefix
            prefix = random.choice(NOISE_WORDS['prefix'])
            return f"{prefix} {text.lower().strip(' .?')}"
        else:
            # Add suffix
            suffix = random.choice(NOISE_WORDS['suffix'])
            return f"{text.strip(' .?')} {suffix}"

    def add_case_variation(self, text: str) -> str:
        """(Mới) Ngẫu nhiên thay đổi kiểu chữ"""
        if random.random() > self.config.prob_case_variation:
            return text
        
        choice = random.choice(['lower', 'upper', 'capitalize'])
        
        if choice == 'lower':
            return text.lower()
        if choice == 'upper':
            return text.upper()
        if choice == 'capitalize':
            # Viết hoa chữ cái đầu (có thể không tự nhiên lắm, nhưng tăng đa dạng)
            return text.capitalize()
        
        return text


# ============================================================================
# DATA LOADING & SAVING
# ============================================================================

def load_existing_data(filepath: str) -> Dict[str, List[str]]:
    """Load existing training data with error handling"""
    data_by_intent = defaultdict(list)
    file_path = Path(filepath)
    
    if not file_path.exists():
        logger.warning(f"File {filepath} không tồn tại. Sẽ tạo mới.")
        return data_by_intent
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            if not reader.fieldnames or 'text' not in reader.fieldnames or 'label' not in reader.fieldnames:
                logger.error(f"File {filepath} không có đúng format (cần 'text' và 'label' columns)")
                return data_by_intent
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    text = row.get('text', '').strip()
                    label = row.get('label', '').strip()
                    
                    if text and label:
                        data_by_intent[label].append(text)
                    else:
                        logger.warning(f"Row {row_num}: Empty text or label")
                        
                except Exception as e:
                    logger.error(f"Error reading row {row_num}: {e}")
                    continue
        
        logger.info(f"Loaded {len(data_by_intent)} intents with {sum(len(v) for v in data_by_intent.values())} total samples from {filepath}")
        
    except Exception as e:
        logger.error(f"Error loading file {filepath}: {e}")
        return defaultdict(list)
    
    return data_by_intent


def save_augmented_data(data: Dict[str, List[str]], output_filepath: str) -> bool:
    """
    (Cải tiến) Save augmented data to CSV with GLOBAL DE-DUPLICATION.
    """
    try:
        # Ensure output directory exists
        output_path = Path(output_filepath)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Prepare rows
        rows = []
        for intent, samples in data.items():
            for sample in samples:
                rows.append({'text': sample.strip(), 'label': intent})
        
        if not rows:
            logger.error("No data to save")
            return False
        
        # Shuffle for better distribution
        random.shuffle(rows)
        
        # (Quan trọng) Global De-duplication
        final_rows = []
        seen_normalized = set()
        
        for row in rows:
            normalized = row['text'].lower()
            if normalized not in seen_normalized:
                final_rows.append(row)
                seen_normalized.add(normalized)
            
        # Write to file
        with open(output_filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['text', 'label'])
            writer.writeheader()
            writer.writerows(final_rows)
        
        logger.info(f"✅ Saved {len(final_rows)} UNIQUE samples to {output_filepath} (from {len(rows)} total generated)")
        
        # Print distribution
        intent_counts = Counter(row['label'] for row in final_rows)
        logger.info("\n📊 Final Distribution (Unique):")
        for intent, count in sorted(intent_counts.items()):
            logger.info(f"  {intent}: {count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error saving file {output_filepath}: {e}")
        return False


# ============================================================================
# MAIN GENERATION LOGIC (Cải tiến)
# ============================================================================

def generate_for_intent(
    intent: str,
    samples: List[str],
    target_count: int,
    config: Config,
    disable_tqdm: bool = False
) -> Tuple[str, List[str]]:
    """
    (Cải tiến) Generate augmented samples for a single intent.
    Sử dụng chiến lược kết hợp (chaining) augmentation.
    """
    augmenter = DataAugmenter(config)
    validator = DataValidator(config)
    
    final_samples = set()
    
    # 1. Thêm các mẫu gốc hợp lệ
    for s in samples:
        if validator.is_valid_format(s):
            final_samples.add(s)

    # 2. Tạo pool để augment, chỉ dùng mẫu gốc để tránh "drift"
    pool_for_augmentation = list(final_samples)
    if not pool_for_augmentation:
        logger.warning(f"  {intent}: No valid original samples to augment from.")
        
    template_list = TEMPLATES.get(intent, [])
    if not template_list:
         logger.warning(f"  {intent}: No templates found.")
         
    # 3. Vòng lặp generation
    current_count = len(final_samples)
    
    pbar = tqdm(total=target_count, desc=f"  {intent}", leave=False, disable=disable_tqdm)
    pbar.update(current_count)
    
    attempts = 0
    max_attempts = target_count * 10  # Gấp 10 lần số mẫu target
    
    while current_count < target_count and attempts < max_attempts:
        attempts += 1
        new_sample = ""
        
        # 4. Quyết định chiến lược: tạo mới từ template hay augment mẫu cũ
        use_template = (random.random() < config.prob_use_template and template_list)
        
        try:
            if use_template:
                # Tạo mới từ template
                template = random.choice(template_list)
                generated = augmenter.generate_from_template(template, 1)
                if not generated:
                    continue
                new_sample = generated[0]
            
            elif pool_for_augmentation:
                # Augment từ 1 mẫu gốc
                base_sample = random.choice(pool_for_augmentation)
                
                # 5. (Quan trọng) Áp dụng CHUỖI augmentations
                aug_sample = augmenter.apply_synonym_replacement(base_sample)
                aug_sample = augmenter.add_question_variations(aug_sample)
                aug_sample = augmenter.add_noise(aug_sample)
                aug_sample = augmenter.add_case_variation(aug_sample)
                new_sample = aug_sample
            
            else:
                 # Không có mẫu gốc và không thể dùng template -> dừng
                 if not template_list:
                      logger.warning(f"  {intent}: No originals and no templates. Stopping.")
                      break
                 else:
                      continue # Thử lại với template

            # 6. Validate và thêm vào set
            if validator.is_valid_format(new_sample):
                normalized = new_sample.lower()
                if normalized not in {s.lower() for s in final_samples}:
                    final_samples.add(new_sample)
                    current_count += 1
                    pbar.update(1)

        except Exception as e:
            logger.error(f"Error during augmentation for {intent}: {e}")
            continue # Bỏ qua mẫu bị lỗi
            
    pbar.close()
    
    if attempts >= max_attempts:
        logger.warning(f"  {intent}: Reached max attempts ({max_attempts}) but only generated {current_count}/{target_count} samples.")
    else:
        logger.debug(f"  {intent}: Generated {current_count} samples.")
        
    return intent, list(final_samples)


def generate_augmented_data(
    existing_data: Dict[str, List[str]],
    config: Config
) -> Dict[str, List[str]]:
    """Generate augmented data cho mỗi intent"""
    augmented_data = {}
    
    logger.info("\n🔄 Starting data augmentation...")
    
    # Tính toán lại target_count với độ ưu tiên cho knowledge_query
    avg_samples = sum(len(s) for s in existing_data.values()) / len(existing_data)
    base_target_count = max(config.target_samples, int(avg_samples))
    
    # Tạo nhiều mẫu knowledge_query hơn vì đây là intent chính
    def get_target_count_for_intent(intent: str) -> int:
        if intent == "knowledge_query":
            return int(base_target_count * 1.5)  # Tăng 50% cho knowledge_query
        elif intent in ["financial_query", "sensor_query", "device_control"]:
            return base_target_count
        else:  # unknown
            return int(base_target_count * 0.7)  # Giảm 30% cho unknown
    
    logger.info(f"Base target ~{base_target_count} samples, knowledge_query gets ~{get_target_count_for_intent('knowledge_query')} samples.")
    
    if config.enable_parallel and len(existing_data) > 1:
        # Parallel processing
        logger.info(f"Using parallel processing with {config.num_workers} workers")
        
        with ThreadPoolExecutor(max_workers=config.num_workers) as executor:
            futures = {
                executor.submit(
                    generate_for_intent,
                    intent,
                    samples,
                    get_target_count_for_intent(intent),
                    config,
                    disable_tqdm=True # Tắt TQDM con khi chạy song song
                ): intent
                for intent, samples in existing_data.items()
            }
            
            for future in tqdm(as_completed(futures), total=len(futures), desc="Processing intents"):
                try:
                    intent, samples_list = future.result()
                    augmented_data[intent] = samples_list
                except Exception as e:
                    intent = futures[future]
                    logger.error(f"Error processing intent {intent}: {e}", exc_info=True)
    else:
        # Sequential processing
        logger.info("Using sequential processing")
        for intent, samples in tqdm(existing_data.items(), desc="Processing intents"):
            try:
                _, augmented_samples = generate_for_intent(
                    intent,
                    samples,
                    get_target_count_for_intent(intent),
                    config,
                    disable_tqdm=False # Bật TQDM con
                )
                augmented_data[intent] = augmented_samples
            except Exception as e:
                logger.error(f"Error processing intent {intent}: {e}", exc_info=True)
    
    return augmented_data


# ============================================================================
# STATISTICS & REPORTING
# ============================================================================

def print_statistics(
    before_data: Dict[str, List[str]],
    after_data: Dict[str, List[str]] # after_data đã được de-duped
):
    """Print detailed statistics about the augmentation"""
    logger.info("\n" + "="*60)
    logger.info("📈 AUGMENTATION STATISTICS")
    logger.info("="*60)
    
    total_before = sum(len(samples) for samples in before_data.values())
    total_after = sum(len(samples) for samples in after_data.values())
    
    logger.info(f"\nTotal intents: {len(before_data)}")
    logger.info(f"Total samples (before): {total_before}")
    logger.info(f"Total samples (after, unique): {total_after} (+{total_after - total_before})")
    
    logger.info(f"\nPer-intent breakdown (Unique Counts):")
    logger.info("-" * 60)
    logger.info(f"{'Intent':<25} {'Before':<10} {'After':<10} {'Increase':<10}")
    logger.info("-" * 60)
    
    # Cần de-dupe data 'before' để so sánh công bằng
    before_counts = {}
    for intent, samples in before_data.items():
        before_counts[intent] = len(set(s.lower() for s in samples))
        
    after_counts = {}
    for intent, samples in after_data.items():
        after_counts[intent] = len(set(s.lower() for s in samples)) # Dù đã de-dupe nhưng để chắc chắn

    for intent in sorted(after_counts.keys()):
        before_count = before_counts.get(intent, 0)
        after_count = after_counts.get(intent, 0)
        increase = after_count - before_count
        logger.info(f"{intent:<25} {before_count:<10} {after_count:<10} +{increase:<9}")
    
    logger.info("="*60)


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Generate augmented intent data")
    parser.add_argument('--input', default="data/intent_data_6intents.csv", help="Input CSV file")
    parser.add_argument('--output', default="data/intent_data_augmented_6intents.csv", help="Output CSV file")
    parser.add_argument('--target', type=int, default=200, help="Target samples per intent (sẽ được điều chỉnh nếu số lượng mẫu gốc trung bình cao hơn)")
    parser.add_argument('--parallel', action='store_true', help="Enable parallel processing")
    parser.add_argument('--workers', type=int, default=4, help="Number of parallel workers")
    parser.add_argument('--seed', type=int, default=42, help="Random seed")
    parser.add_argument('--log-level', default="INFO", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    # Create configuration
    config = Config(
        input_file=args.input,
        output_file=args.output,
        target_samples=args.target,
        enable_parallel=args.parallel,
        num_workers=args.workers,
        random_seed=args.seed,
        log_level=args.log_level
    )
    
    # Setup logging with config level
    global logger
    logger = setup_logging(config.log_level)
    
    # Set random seed
    random.seed(config.random_seed)
    
    logger.info("🚀 Starting Intent Data Generation...")
    logger.info(f"Config: {config}")
    
    try:
        start_time = time.time()
        
        # 1. Load existing data
        existing_data = load_existing_data(config.input_file)
        
        if not existing_data:
            logger.error("No data loaded. Exiting.")
            return 1
            
        # 2. Generate augmented data
        augmented_data = generate_augmented_data(existing_data, config)
        
        if not augmented_data:
            logger.error("No augmented data generated. Exiting.")
            return 1
            
        # 3. Save to file (hàm này đã bao gồm global de-duplication)
        success = save_augmented_data(augmented_data, config.output_file)
        
        if not success:
            logger.error("Failed to save data. Exiting.")
            return 1
            
        # 4. Print statistics
        # Lấy 'after_data' đã được de-dupe bằng cách load lại file vừa save
        # Đây là cách chính xác nhất để thống kê
        final_data = load_existing_data(config.output_file)
        print_statistics(existing_data, final_data)
        
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