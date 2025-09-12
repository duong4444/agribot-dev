// Application Constants
export const APP_CONFIG = {
  NAME: 'AgriBot',
  DESCRIPTION: 'Agricultural Chatbot System with AI and IoT',
  VERSION: '1.0.0',
  AUTHOR: 'Your Team',
  SUPPORT_EMAIL: 'support@agribot.com',
  WEBSITE: 'https://agribot.com',
} as const;

// Vietnamese Language Constants
export const VIETNAMESE = {
  MONTHS: [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ],
  DAYS: [
    'Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư',
    'Thứ năm', 'Thứ sáu', 'Thứ bảy'
  ],
  SEASONS: {
    SPRING: 'Mùa xuân',
    SUMMER: 'Mùa hè',
    AUTUMN: 'Mùa thu',
    WINTER: 'Mùa đông',
  },
} as const;

// Agricultural Constants
export const AGRICULTURE = {
  CROP_TYPES: [
    'Lúa', 'Ngô', 'Khoai tây', 'Cà chua', 'Dưa hấu',
    'Rau xanh', 'Hoa', 'Cây ăn quả', 'Cây công nghiệp'
  ],
  SOIL_TYPES: [
    'Đất phù sa', 'Đất đỏ bazan', 'Đất cát', 'Đất sét',
    'Đất thịt', 'Đất mùn', 'Đất than bùn'
  ],
  WEATHER_CONDITIONS: [
    'Nắng', 'Mưa', 'Âm u', 'Sương mù', 'Gió mạnh',
    'Nóng', 'Lạnh', 'Ẩm ướt', 'Khô hạn'
  ],
  IRRIGATION_METHODS: [
    'Tưới phun', 'Tưới nhỏ giọt', 'Tưới ngập', 'Tưới thủ công'
  ],
} as const;

// IoT Constants
export const IOT = {
  SENSOR_TYPES: [
    'SOIL_MOISTURE', 'TEMPERATURE', 'HUMIDITY', 'LIGHT',
    'PH', 'NUTRIENT', 'WIND_SPEED', 'RAINFALL'
  ],
  DEVICE_TYPES: [
    'SENSOR', 'CONTROLLER', 'ACTUATOR'
  ],
  COMMAND_TYPES: [
    'IRRIGATE', 'FERTILIZE', 'MONITOR', 'ALERT', 'SCHEDULE'
  ],
  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance',
    ERROR: 'error',
  },
} as const;

// AI Constants
export const AI = {
  INTENT_TYPES: [
    'general_question', 'iot_control', 'data_query',
    'irrigation_request', 'pest_control', 'weather_inquiry',
    'harvest_advice', 'soil_management'
  ],
  SENTIMENT_TYPES: [
    'positive', 'negative', 'neutral'
  ],
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
  },
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json'
  ],
  ALLOWED_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.json'
  ],
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  FARM_DATA: (farmId: string) => `farm:data:${farmId}`,
  SENSOR_READINGS: (farmId: string) => `sensor:readings:${farmId}`,
  AI_RESPONSE: (query: string) => `ai:response:${Buffer.from(query).toString('base64')}`,
  KNOWLEDGE_SEARCH: (query: string) => `knowledge:search:${Buffer.from(query).toString('base64')}`,
} as const;

// Time Constants
export const TIME = {
  CACHE_TTL: {
    SHORT: 5 * 60, // 5 minutes
    MEDIUM: 30 * 60, // 30 minutes
    LONG: 2 * 60 * 60, // 2 hours
    VERY_LONG: 24 * 60 * 60, // 24 hours
  },
  SESSION_TIMEOUT: 7 * 24 * 60 * 60, // 7 days
  REFRESH_TOKEN_TTL: 30 * 24 * 60 * 60, // 30 days
} as const;
