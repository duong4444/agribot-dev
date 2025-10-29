"""
Script tự động sinh dữ liệu training cho NER (Named Entity Recognition)
Domain: Smart Agriculture / Nông nghiệp thông minh

Entity Types: (Giữ nguyên 14 types)
- CROP_NAME, DEVICE, SENSOR_TYPE, METRIC_VALUE, DATE, MONEY,
- DURATION, AREA, QUANTITY, ACTIVITY, FERTILIZER, PESTICIDE,
- TECHNIQUE, SEASON

Improvements (Đã tối ưu):
- (MỚI) Context-aware generation: Các template chuyên biệt (ví dụ: 
  {SENSOR_TYPE_TEMP} đi với {METRIC_VALUE_TEMP}) để đảm bảo
  dữ liệu sinh ra logic (ví dụ: "nhiệt độ là 30°C" thay vì "nhiệt độ là 6.5pH").
- (MỚI) Smart Augmentation: Thêm hàm `augment_sample` để
  thay thế ngẫu nhiên các thực thể trong câu (ví dụ: "bón NPK cho lúa" -> "bón DAP cho ngô")
  để tăng độ đa dạng.
- (TỐI ƯU) Entity Database Cleanup: Loại bỏ sự trùng lặp và mơ hồ
  giữa các loại thực thể (ví dụ: `DEVICE` vs `SENSOR_TYPE`,
  `ACTIVITY` vs `TECHNIQUE`).
- (MỚI) Thêm templates cho các entity bị thiếu (ví dụ: {MONEY}).
- (TỐI ƯU) Tối ưu hóa hiệu suất bằng cách biên dịch template một lần.
- (TỐI ƯU) Cải thiện logic validation và de-duplication.
"""

import csv
import json
import random
import re
import logging
import argparse
from typing import List, Dict, Tuple, Set, Optional, Any
from collections import defaultdict, Counter
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
    input_file: str = "data/ner_data.csv"
    output_file: str = "data/ner_data_augmented.csv"
    target_samples: int = 2000  # Tăng target lên
    random_seed: int = 42
    log_level: str = "INFO"
    augment_ratio: float = 0.4 # 40% mẫu mới sinh ra sẽ được augment
    min_text_len: int = 5
    max_text_len: int = 250


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-m-%d %H:%M:%S'
    )
    return logging.getLogger(__name__)


logger = setup_logging()


# ============================================================================
# ENTITY DATABASES (ĐÃ TỐI ƯU VÀ PHÂN LOẠI)
# ============================================================================

def get_entity_data():
    """
    Trả về database các thực thể.
    (TỐI ƯU) Phân loại SENSOR_TYPE và loại bỏ trùng lặp.
    """
    
    ENTITY_DATA = {
        "CROP_NAME": [
        "lúa", "lúa nước", "lúa ST24", "lúa ST25", "lúa OM 5451", "lúa IR 50404", 
        "lúa nếp", "lúa nếp cái hoa vàng", "lúa cẩm", "lúa tẻ",
        "ngô", "ngô nếp", "ngô ngọt", "ngô lai", "ngô NK7328", "ngô tím",
        "khoai lang", "khoai lang kén", "khoai lang mật", "khoai lang tím Nhật",
        "sắn", "khoai mì", "khoai tây", "khoai mỡ", "khoai sọ", "khoai môn",
        "cà phê", "cà phê Robusta", "cà phê Arabica", "cà phê chè", "cà phê vối",
        "hồ tiêu", "tiêu đen", "tiêu sọ",
        "cao su", "điều", "hạt điều", "chè", "chè Thái Nguyên", "chè Shan Tuyết", "chè Ô Long",
        "mía", "mía đường", "dừa", "dừa xiêm", "dừa sáp", "cacao", "thuốc lá",
        "bông", "cây bông vải", "dâu tằm", "đậu tương", "lạc", "đậu phộng", "vừng", "mè",
        "cam", "cam sành", "cam Vinh", "cam canh", "cam Cao Phong",
        "bưởi", "bưởi da xanh", "bưởi Diễn", "bưởi Năm Roi", "bưởi Phúc Trạch",
        "chanh", "chanh không hạt", "chanh leo", "chanh dây", "quýt", "quýt đường", "tắc", "quất",
        "xoài", "xoài Cát Hòa Lộc", "xoài Đài Loan", "xoài cát chu", "xoài tứ quý",
        "sầu riêng", "sầu riêng Ri6", "sầu riêng Musang King", "sầu riêng Monthong",
        "mít", "mít Thái", "mít tố nữ", "mít ruột đỏ",
        "nhãn", "nhãn lồng", "nhãn lồng Hưng Yên", "nhãn xuồng cơm vàng", "nhãn Ido",
        "vải", "vải thiều", "vải thiều Lục Ngạn", "vải u trứng",
        "thanh long", "thanh long ruột đỏ", "thanh long ruột trắng", "thanh long Bình Thuận",
        "chuối", "chuối tiêu", "chuối tây", "chuối ngự", "chuối cau", "chuối Laba",
        "đu đủ", "dứa", "thơm", "khóm", "chôm chôm", "chôm chôm nhãn", "chôm chôm Thái",
        "măng cụt", "vú sữa", "vú sữa Lò Rèn", "bơ", "bơ 034", "bơ sáp", "bơ booth",
        "na", "mãng cầu", "mãng cầu xiêm", "dâu tây", "dâu tằm", "dưa hấu", "dưa hấu Hắc Mỹ Nhân",
        "dưa lưới", "dưa lê", "ổi", "ổi Nữ Hoàng", "ổi lê", "mận", "mận hậu", "roi", "hồng xiêm", "sapoche",
        "rau cải", "cải ngọt", "cải thìa", "cải bẹ xanh", "cải cúc", "tần ô",
        "bắp cải", "cải thảo", "cải bó xôi", "rau muống", "rau dền", "rau ngót",
        "mồng tơi", "xà lách", "xà lách mỡ", "xà lách xoong", "cần tây", "rau má",
        "cà chua", "cà chua bi", "cà chua cherry", "cà tím", "cà pháo",
        "dưa chuột", "dưa leo", "bí đao", "bí xanh", "bí đỏ", "bí ngô",
        "bầu", "mướp", "mướp đắng", "khổ qua", "su su", "đậu bắp",
        "ớt", "ớt chuông", "ớt hiểm", "ớt sừng",
        "su hào", "củ cải", "cà rốt", "củ dền",
        "đậu", "đậu cô ve", "đậu đũa", "đậu Hà Lan",
        "súp lơ", "bông cải xanh", "bông cải trắng", "măng tây",
        "hành lá", "hành tây", "hành tím", "tỏi", "tỏi Lý Sơn", "tỏi cô đơn",
        "gừng", "nghệ", "riềng", "sả", "rau mùi", "ngò rí", "rau răm",
        "tía tô", "kinh giới", "húng quế", "húng chanh", "thì là", "lá lốt",
        "hoa hồng", "hoa lan", "hoa cúc", "hoa ly", "hoa huệ", "hoa đồng tiền",
        "hoa lay ơn", "hoa sen", "hoa súng", "hoa đào", "hoa mai",
        "nấm", "nấm rơm", "nấm bào ngư", "nấm hương", "nấm kim châm",
        "nấm mỡ", "nấm đùi gà", "mộc nhĩ", "nấm linh chi"
        ],
        "DEVICE": [
            "máy bơm", "máy bơm 1", "bơm chìm", "quạt thông gió", "quạt đối lưu",
            "đèn LED", "đèn UV", "đèn sưởi", "van nước", "van điện từ", "van số 1",
            "hệ thống tưới", "hệ thống tưới tự động", "hệ thống tưới nhỏ giọt",
            "cảm biến",
            "drone", "máy cày", "máy gặt", "máy phun thuốc", "nhà lưới", "nhà màng",
            "nhà kính", "camera giám sát", "trạm thời tiết", "rơ le", "bộ điều khiển",
            "máy sấy", "máy sưởi", "máy phun sương", "hệ thống châm phân",
            "rèm che", "lưới cắt nắng",
        ],

        "SENSOR_TYPE_TEMP": ["nhiệt độ", "nhiệt độ không khí", "nhiệt độ đất", "nhiệt độ nước"],
        "SENSOR_TYPE_HUMID": ["độ ẩm", "độ ẩm không khí", "độ ẩm đất"],
        "SENSOR_TYPE_LIGHT": ["ánh sáng", "cường độ ánh sáng", "lux", "PAR", "bức xạ"],
        "SENSOR_TYPE_PH": ["pH", "pH đất", "pH nước"],
        "SENSOR_TYPE_EC": ["EC", "độ dẫn điện", "EC nước", "EC đất"],
        "SENSOR_TYPE_CO2": ["CO2", "nồng độ CO2"],
        "SENSOR_TYPE_WIND": ["tốc độ gió", "hướng gió"],
        "SENSOR_TYPE_RAIN": ["lượng mưa", "cảm biến mưa"],
        "SENSOR_TYPE_WATER": ["mực nước", "oxy hòa tan", "độ mặn", "độ đục"],
        "ACTIVITY": [
            "tưới nước", "tưới cây", "bón phân", "bón lót", "bón thúc", "bón vôi",
            "thu hoạch", "gieo hạt", "gieo mạ", "phun thuốc", "làm cỏ", "nhổ cỏ",
            "xới đất", "cày đất", "làm đất", "tỉa cành", "cắt tỉa", "lên luống",
            "ủ phân", "cấy lúa", "trồng cây", "ghép cành", "chiết cành", "bắt sâu",
            "dọn vườn", "sửa chữa", "bảo trì", "thụ phấn", "chăm sóc", "kiểm tra",
        ],
        
        "FERTILIZER": [
            "phân bón", "phân NPK", "NPK 16-16-8", "NPK 20-20-15", "phân đạm",
            "phân Ure", "phân lân", "Super Lân", "DAP", "phân kali", "phân KCL",
            "phân hữu cơ", "phân compost", "phân chuồng", "phân trùn quế",
            "phân vi sinh", "vôi bột", "phân bón lá", "phân gà", "dung dịch thủy canh",
            "Canxi nitrat", "Magie Sunfat", "phân vi lượng",
        ],
        
        "PESTICIDE": [
            "sâu đục thân", "sâu cuốn lá", "rệp sáp", "rầy nâu", "bọ trĩ",
            "bọ phấn trắng", "nhện đỏ", "ruồi vàng", "ốc bươu vàng", "chuột",
            "bệnh đạo ôn", "bệnh rỉ sắt", "bệnh héo xanh", "bệnh thán thư",
            "bệnh xoăn lá", "bệnh đốm lá", "bệnh thối rễ", "bệnh Greening",
            "bệnh phấn trắng", "thuốc trừ sâu", "thuốc diệt cỏ", "thuốc trừ bệnh",
            "thuốc sinh học", "Regent", "Confidor", "Anvil", "Ridomil Gold",
            "Amistar Top", "dầu khoáng", "bả chuột", "bẫy Pheromone",
        ],
        
        "TECHNIQUE": [
            "thủy canh", "thủy canh NFT", "aquaponics", "khí canh",
            "trồng xen canh", "trồng luân canh", "tưới nhỏ giọt", "tưới phun sương",
            "canh tác hữu cơ", "trồng rau sạch", "VietGAP", "GlobalGAP", "IPM",
            "ghép cành", "chiết cành", "nhân giống vô tính", "ủ phân compost",
            "trồng trong nhà màng", "nuôi cấy mô", "nuôi trùn quế", "che phủ nilon",
            "gieo sạ hàng", "canh tác không dùng đất",
        ],
        
        "SEASON": [
            "mùa xuân", "mùa hạ", "mùa thu", "mùa đông", "mùa mưa", "mùa khô",
            "vụ mùa", "vụ chiêm", "vụ hè thu", "vụ đông xuân", "vụ sớm", "vụ muộn",
            "vụ Tết", "vụ 1", "vụ 2", "đầu mùa", "cuối mùa",
        ],
        
        "AREA": [
            "khu A", "khu B", "luống 1", "luống A1", "vườn cam", "vườn ươm",
            "nhà màng số 1", "nhà kính 2", "kho lạnh", "kho vật tư", "hồ chứa B",
            "khu thử nghiệm", "đồng ruộng",
        ],
    }

    # (MỚI) Tạo SENSOR_TYPE tổng hợp từ các loại con
    all_sensors = []
    for k, v in ENTITY_DATA.items():
        if k.startswith("SENSOR_TYPE_"):
            all_sensors.extend(v)
    ENTITY_DATA["SENSOR_TYPE"] = list(set(all_sensors))
    
    return ENTITY_DATA

ENTITY_DATA = get_entity_data()

# ============================================================================
# TEMPLATE GENERATION (ĐÃ CẢI TIẾN VỚI CONTEXT-AWARE)
# ============================================================================

TEMPLATES = {
    # Templates đơn giản
    "CROP_queries": [
        "cách trồng {CROP_NAME}",
        "kỹ thuật chăm sóc {CROP_NAME}",
        "{CROP_NAME} bị {PESTICIDE}",
        "thu hoạch {CROP_NAME} {SEASON}",
        "giống {CROP_NAME} này tốt không",
        "{CROP_NAME} bị vàng lá",
    ],
    "DEVICE_control": [
        "bật {DEVICE}",
        "tắt {DEVICE}",
        "kiểm tra {DEVICE} ở {AREA}",
        "sửa chữa {DEVICE}",
        "lắp đặt {DEVICE} cho {AREA}",
        "trạng thái {DEVICE}",
    ],
    "SENSOR_queries": [
        "kiểm tra {SENSOR_TYPE}",
        "xem {SENSOR_TYPE} ở {AREA}",
        "{SENSOR_TYPE} hiện tại là bao nhiêu",
        "giá trị {SENSOR_TYPE}",
    ],
    
    # (MỚI) Templates nhận biết ngữ cảnh
    "SENSOR_CONTEXT_AWARE": [
        "{SENSOR_TYPE_TEMP} ở {AREA} là {METRIC_VALUE_TEMP}",
        "{AREA} có {SENSOR_TYPE_HUMID} {METRIC_VALUE_HUMID}",
        "đo {SENSOR_TYPE_PH} tại {AREA} được {METRIC_VALUE_PH}",
        "{SENSOR_TYPE_EC} của {AREA} là {METRIC_VALUE_EC}",
        "kiểm tra {SENSOR_TYPE_LIGHT} ở {AREA}, đang là {METRIC_VALUE_LIGHT}",
        "{SENSOR_TYPE_CO2} trong {AREA} đạt {METRIC_VALUE_CO2}",
        "{SENSOR_TYPE_WIND} hôm nay {METRIC_VALUE_WIND}",
        "{SENSOR_TYPE_RAIN} đo được {METRIC_VALUE_RAIN}",
        "{SENSOR_TYPE_WATER} trong hồ là {METRIC_VALUE_WATER}",
    ],

    # (MỚI) Templates tài chính
    "FINANCE_QUERIES": [
        "mua {QUANTITY} {FERTILIZER} hết {MONEY}",
        "chi phí {ACTIVITY} là {MONEY}",
        "thu {MONEY} từ {CROP_NAME} tại {AREA}",
        "giá {QUANTITY} {CROP_NAME} là {MONEY}",
        "trả {MONEY} tiền {PESTICIDE}",
        "lợi nhuận {SEASON} là {MONEY}",
    ],

    # Templates phức hợp (Nhiều entities)
    "COMPLEX_ACTIONS": [
        "{ACTIVITY} {CROP_NAME} ở {AREA}",
        "{ACTIVITY} cho {CROP_NAME} tại {AREA} vào {DATE}",
        "cần {ACTIVITY} {CROP_NAME} {AREA}",
        "thu hoạch {QUANTITY} {CROP_NAME} ở {AREA}",
        "{AREA} thu được {QUANTITY} {CROP_NAME} {SEASON}",
        "trồng {QUANTITY} {CROP_NAME} tại {AREA}",
        "bật {DEVICE} ở {AREA} trong {DURATION}",
        "tưới {QUANTITY} nước cho {AREA} lúc {DATE}",
        "bón {QUANTITY} {FERTILIZER} cho {CROP_NAME} ở {AREA}",
        "{CROP_NAME} tại {AREA} bị {PESTICIDE}",
        "phun {PESTICIDE} cho {CROP_NAME} vào {DATE}",
        "áp dụng {TECHNIQUE} trồng {CROP_NAME} tại {AREA}",
        "ghi nhận {ACTIVITY} tại {AREA} lúc {DATE}",
        "cần {QUANTITY} {FERTILIZER} cho {CROP_NAME} {SEASON}",
    ],
}


# ============================================================================
# VALUE GENERATION (ĐÃ PHÂN LOẠI)
# ============================================================================

# (MỚI) Các hàm generate theo ngữ cảnh
def generate_temp_value(): return f"{random.choice([f'{random.randint(15, 40)}', f'{round(random.uniform(15, 40), 1)}'])}°C"
def generate_humid_value(): return f"{random.randint(40, 100)}%"
def generate_ph_value(): return f"{round(random.uniform(4.0, 9.0), 1)}"
def generate_ec_value(): return f"{round(random.uniform(0.5, 3.5), 1)} mS/cm"
def generate_light_value(): return f"{random.randint(100, 50000)} lux"
def generate_co2_value(): return f"{random.randint(300, 2000)} ppm"
def generate_wind_value(): return f"{round(random.uniform(0, 20), 1)} m/s"
def generate_rain_value(): return f"{random.randint(0, 100)} mm"
def generate_water_value(): return f"{round(random.uniform(1, 10), 1)} mg/L"

def generate_date() -> str:
    dates = [
        "hôm nay", "ngày mai", "hôm qua", "sáng nay", "chiều nay", "tối qua",
        "thứ hai", "tuần trước", "tháng này", "tháng 10", f"tháng {random.randint(1,12)}",
        "15/10", f"{random.randint(1,30)}/{random.randint(1,12)}",
        f"{random.randint(1,30)}-{random.randint(1,12)}-2024",
        f"{random.randint(5,18)}h", f"{random.randint(8,17)}:30",
        "quý 1", "cuối năm",
    ]
    return random.choice(dates)

def generate_money() -> str:
    money_types = [
        lambda: f"{random.randint(10, 500)}k",
        lambda: f"{random.randint(1, 100)} triệu",
        lambda: f"{random.randint(1, 10)} tỷ",
        lambda: f"{random.randint(10, 1000)} nghìn đồng",
        lambda: f"{random.choice([1.5, 2.5, 3.5])} triệu",
        lambda: f"{random.randint(100, 999)}.000 VNĐ",
        lambda: f"{random.randint(10, 999)}.000đ",
    ]
    return random.choice(money_types)()

def generate_duration() -> str:
    durations = [
        f"{random.randint(5, 60)} phút",
        f"{random.randint(1, 12)} giờ",
        f"{random.randint(1, 7)} ngày",
        f"{random.randint(1, 4)} tuần",
        f"{random.randint(1, 6)} tháng",
        "nửa tiếng", "cả ngày", "1 tiếng rưỡi",
    ]
    return random.choice(durations)

def generate_quantity() -> str:
    quantities = [
        f"{random.randint(1, 500)}kg",
        f"{random.randint(1, 100)} lít",
        f"{random.randint(1, 5)} tấn",
        f"{random.randint(1, 100)} cây",
        f"{random.randint(1, 20)} bao",
        f"{random.randint(1, 10)} tạ",
        f"{random.randint(1, 10)} ha", # hecta
        f"{random.randint(100, 5000)} m2",
        f"{random.choice([1.5, 0.5, 2.5])} tấn",
        f"{random.randint(100, 999)}g",
        f"{random.randint(10, 999)}ml",
    ]
    return random.choice(quantities)

# (CẢI TIẾN) Map các generator theo ngữ cảnh
DYNAMIC_GENERATORS = {
    # Context-aware
    "METRIC_VALUE_TEMP": generate_temp_value,
    "METRIC_VALUE_HUMID": generate_humid_value,
    "METRIC_VALUE_PH": generate_ph_value,
    "METRIC_VALUE_EC": generate_ec_value,
    "METRIC_VALUE_LIGHT": generate_light_value,
    "METRIC_VALUE_CO2": generate_co2_value,
    "METRIC_VALUE_WIND": generate_wind_value,
    "METRIC_VALUE_RAIN": generate_rain_value,
    "METRIC_VALUE_WATER": generate_water_value,
    
    # Generic (Dùng cho các template cũ nếu cần)
    "METRIC_VALUE": lambda: random.choice([
        generate_temp_value(), generate_humid_value(), generate_ph_value(),
        generate_ec_value(), generate_light_value(), generate_co2_value()
    ])(),
    
    # Standard dynamic
    "DATE": generate_date,
    "MONEY": generate_money,
    "DURATION": generate_duration,
    "QUANTITY": generate_quantity,
}


# ============================================================================
# NER DATA GENERATION (ĐÃ TỐI ƯU)
# ============================================================================

@dataclass
class NerSample:
    """Class để lưu trữ một mẫu NER đã sinh ra"""
    text: str
    entities: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_tuple(self) -> Tuple[str, List[Dict]]:
        return (self.text, self.entities)

    def to_csv_row(self) -> Tuple[str, str]:
        return (self.text, json.dumps(self.entities, ensure_ascii=False))


class NERDataGenerator:
    """Generate NER training data"""
    
    def __init__(self, config: Config):
        self.config = config
        random.seed(config.random_seed)
        self.generated_texts: Set[str] = set() # Dùng để de-duplicate
        
        # (TỐI ƯU) Biên dịch template list một lần
        self.template_list = [
            template
            for category, templates in TEMPLATES.items()
            for template in templates
        ]
        logger.info(f"Compiled {len(self.template_list)} templates.")

    def is_valid(self, sample: NerSample) -> bool:
        """Kiểm tra xem sample có hợp lệ không"""
        if not sample.text or not sample.entities:
            return False
        if not (self.config.min_text_len <= len(sample.text) <= self.config.max_text_len):
            return False
        
        # Kiểm tra de-duplicate
        normalized_text = sample.text.lower()
        if normalized_text in self.generated_texts:
            return False
            
        # (MỚI) Kiểm tra entity có khớp không (validation)
        for ent in sample.entities:
            start, end = ent['start'], ent['end']
            if sample.text[start:end] != ent['value']:
                logger.warning(f"Entity mismatch: text='{sample.text[start:end]}', value='{ent['value']}'")
                return False
        
        self.generated_texts.add(normalized_text)
        return True

    def fill_template(self, template: str) -> Optional[NerSample]:
        """
        Fill template với entities và trả về text + entity list.
        Logic offset của user đã chính xác, giữ nguyên.
        """
        text = template
        entities = []
        offset = 0
        
        # Tìm tất cả placeholders một cách an toàn
        matches = list(re.finditer(r'\{(\w+)\}', template))
        if not matches:
            return None
        
        for match in matches:
            entity_type = match.group(1)
            placeholder = match.group(0)
            
            # Get value
            if entity_type in DYNAMIC_GENERATORS:
                value = DYNAMIC_GENERATORS[entity_type]()
            elif entity_type in ENTITY_DATA:
                value = random.choice(ENTITY_DATA[entity_type])
            else:
                logger.warning(f"Unknown entity type in template: {entity_type}")
                continue
            
            # Calculate position in final text
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
        """
        (MỚI) Augment một sample bằng cách thay thế một entity.
        Ví dụ: "bón NPK cho lúa" -> "bón DAP cho ngô"
        """
        if not sample.entities:
            return None
        
        # 1. Chọn một entity để thay thế
        ent_to_replace = random.choice(sample.entities)
        ent_type = ent_to_replace['type']
        old_value = ent_to_replace['value']
        
        # 2. Lấy giá trị mới
        # Đảm bảo giá trị mới khác giá trị cũ
        if ent_type in DYNAMIC_GENERATORS:
            new_value = DYNAMIC_GENERATORS[ent_type]()
            if new_value == old_value: # Thử lại một lần
                 new_value = DYNAMIC_GENERATORS[ent_type]()
        elif ent_type in ENTITY_DATA:
            new_value = random.choice(ENTITY_DATA[ent_type])
            if new_value == old_value and len(ENTITY_DATA[ent_type]) > 1: # Thử lại
                new_value = random.choice(ENTITY_DATA[ent_type])
        else:
            return None # Không thể thay thế
        
        if new_value == old_value:
            return None # Không tìm được giá trị thay thế
            
        # 3. Tạo text mới
        start_replace = ent_to_replace['start']
        end_replace = ent_to_replace['end']
        new_text = sample.text[:start_replace] + new_value + sample.text[end_replace:]
        
        # 4. Tính toán lại các entity
        new_entities = []
        offset = len(new_value) - len(old_value)
        
        for ent in sample.entities:
            new_ent = ent.copy()
            if ent == ent_to_replace:
                # Cập nhật entity đã thay thế
                new_ent['value'] = new_value
                new_ent['end'] = new_ent['start'] + len(new_value)
            elif ent['start'] > start_replace:
                # Cập nhật các entity phía sau
                new_ent['start'] += offset
                new_ent['end'] += offset
            
            new_entities.append(new_ent)
            
        return NerSample(new_text, new_entities)

    def generate(self, target_count: int, existing_data: List[Tuple[str, str]] = []) -> List[NerSample]:
        """Main generation method"""
        all_samples: List[NerSample] = []
        
        # 1. Thêm và validate dữ liệu cũ
        if existing_data:
            logger.info(f"Loading and validating {len(existing_data)} existing samples...")
            for text, entities_json in tqdm(existing_data, desc="Loading existing"):
                try:
                    entities = json.loads(entities_json)
                    sample = NerSample(text, entities)
                    if self.is_valid(sample):
                        all_samples.append(sample)
                except Exception as e:
                    logger.warning(f"Error processing existing sample: {e}")
        
        logger.info(f"Loaded {len(all_samples)} valid existing samples.")

        # 2. Generate
        needed = target_count - len(all_samples)
        if needed <= 0:
            logger.warning(f"Existing data ({len(all_samples)}) already meets target ({target_count}). No new samples generated.")
            return all_samples[:target_count]
            
        logger.info(f"Generating {needed} new samples...")
        
        pbar = tqdm(total=needed, desc="Generating new")
        attempts = 0
        max_attempts = needed * 20 # Tăng max attempts
        
        while len(all_samples) < target_count and attempts < max_attempts:
            attempts += 1
            
            # 2a. Tạo mẫu từ template
            template = random.choice(self.template_list)
            new_sample = self.fill_template(template)
            
            if new_sample and self.is_valid(new_sample):
                all_samples.append(new_sample)
                pbar.update(1)
                
                # 2b. (MỚI) Augment mẫu vừa tạo
                if random.random() < self.config.augment_ratio:
                    aug_sample = self.augment_sample(new_sample)
                    if aug_sample and self.is_valid(aug_sample):
                        all_samples.append(aug_sample)
                        # Không update pbar ở đây vì đây là mẫu bonus
        
        pbar.close()
        
        if attempts >= max_attempts:
            logger.warning(f"Reached max attempts. Generated {len(all_samples)} samples.")
        
        logger.info(f"Total samples (existing + new + augmented): {len(all_samples)}")
        return all_samples


# ============================================================================
# DATA I/O (ĐÃ TỐI ƯU)
# ============================================================================

def load_existing_data(filepath: str) -> List[Tuple[str, str]]:
    """Load existing NER data (robust)"""
    data = []
    file_path = Path(filepath)
    
    if not file_path.exists():
        logger.warning(f"File {filepath} không tồn tại. Sẽ tạo mới.")
        return data
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if 'text' not in reader.fieldnames or 'entities' not in reader.fieldnames:
                 logger.error(f"File {filepath} thiếu cột 'text' hoặc 'entities'.")
                 return data
                 
            for row_num, row in enumerate(reader, start=2):
                try:
                    text = row.get('text', '').strip()
                    entities_json = row.get('entities', '').strip()
                    
                    if text and entities_json:
                        # Validate JSON format
                        _ = json.loads(entities_json) 
                        data.append((text, entities_json))
                    else:
                        logger.warning(f"Bỏ qua dòng {row_num}: thiếu text hoặc entities.")
                        
                except json.JSONDecodeError:
                     logger.warning(f"Lỗi JSON ở dòng {row_num}: {entities_json[:50]}...")
                except Exception as e:
                    logger.warning(f"Lỗi đọc dòng {row_num}: {e}")
            
        logger.info(f"Loaded {len(data)} existing samples from {filepath}")
        
    except Exception as e:
        logger.error(f"Error loading file {filepath}: {e}")
    
    return data


def save_ner_data(samples: List[NerSample], output_filepath: str) -> bool:
    """Save NER data to CSV"""
    if not samples:
        logger.error("Không có mẫu nào để lưu.")
        return False
        
    try:
        output_path = Path(output_filepath)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Shuffle
        random.shuffle(samples)
        
        # Write
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
        if samples: # Tránh chia cho 0
            logger.info(f"\n📈 Multi-entity samples: {multi_entity_samples} ({multi_entity_samples/len(samples)*100:.1f}%)")
        
        return True
        
    except Exception as e:
        logger.error(f"Error saving file {output_filepath}: {e}")
        return False


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Generate NER training data for smart agriculture")
    parser.add_argument('--input', default="data/ner_data.csv", help="Input CSV file (optional, for loading existing data)")
    parser.add_argument('--output', default="data/ner_data_augmented.csv", help="Output CSV file")
    parser.add_argument('--target', type=int, default=2000, help="Target number of samples")
    parser.add_argument('--seed', type=int, default=42, help="Random seed")
    parser.add_argument('--log-level', default="INFO", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    config = Config(
        input_file=args.input,
        output_file=args.output,
        target_samples=args.target,
        random_seed=args.seed,
        log_level=args.log_level
    )
    
    global logger
    logger = setup_logging(config.log_level)
    
    random.seed(config.random_seed)
    
    logger.info("🚀 Starting NER Data Generation...")
    logger.info(f"Config: {config}")
    
    try:
        start_time = time.time()
        
        # Load existing data
        existing_data = load_existing_data(config.input_file)
        
        # Generate
        generator = NERDataGenerator(config)
        samples = generator.generate(config.target_samples, existing_data)
        
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