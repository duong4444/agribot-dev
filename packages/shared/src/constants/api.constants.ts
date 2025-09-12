// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  
  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },
  
  // Farms
  FARMS: {
    BASE: '/farms',
    BY_ID: (id: string) => `/farms/${id}`,
    FIELDS: (farmId: string) => `/farms/${farmId}/fields`,
    ACTIVITIES: (farmId: string) => `/farms/${farmId}/activities`,
  },
  
  // IoT
  IOT: {
    SENSORS: (farmId: string) => `/iot/sensors/${farmId}`,
    DEVICES: (farmId: string) => `/iot/devices/${farmId}`,
    CONTROL: '/iot/control',
    DASHBOARD: (farmId: string) => `/iot/dashboard/${farmId}`,
    COMMANDS: (deviceId: string) => `/iot/commands/${deviceId}`,
  },
  
  // Chat
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    SEND_MESSAGE: '/chat/send',
  },
  
  // Knowledge
  KNOWLEDGE: {
    BASE: '/knowledge',
    SEARCH: '/knowledge/search',
    ARTICLES: '/knowledge/articles',
    CATEGORIES: '/knowledge/categories',
  },
  
  // AI
  AI: {
    QUERY: '/ai/query',
    INTENT: '/ai/intent',
    SENTIMENT: '/ai/sentiment',
    TRANSLATE: '/ai/translate',
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    REPORTS: '/analytics/reports',
    EXPORTS: '/analytics/exports',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống',
  NETWORK_ERROR: 'Lỗi kết nối mạng',
  TIMEOUT: 'Yêu cầu hết thời gian chờ',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Tạo thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xóa thành công',
  SAVED: 'Lưu thành công',
  SENT: 'Gửi thành công',
} as const;
