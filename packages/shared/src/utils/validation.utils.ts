import { z } from 'zod';

/**
 * Validation utility functions
 */

// Common validation schemas
export const emailSchema = z.string().email('Email không hợp lệ');
export const phoneSchema = z.string().regex(/^[0-9+\-\s()]+$/, 'Số điện thoại không hợp lệ');
export const passwordSchema = z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự');
export const uuidSchema = z.string().uuid('ID không hợp lệ');

// Vietnamese specific validations
export const vietnameseNameSchema = z.string()
  .min(2, 'Tên phải có ít nhất 2 ký tự')
  .max(50, 'Tên không được quá 50 ký tự')
  .regex(/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠĐưăâêôơđ\s]+$/, 'Tên chỉ được chứa chữ cái và khoảng trắng');

export const vietnamesePhoneSchema = z.string()
  .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại Việt Nam không hợp lệ');

export const vietnameseAddressSchema = z.string()
  .min(10, 'Địa chỉ phải có ít nhất 10 ký tự')
  .max(200, 'Địa chỉ không được quá 200 ký tự');

// Agricultural specific validations
export const farmNameSchema = z.string()
  .min(3, 'Tên trang trại phải có ít nhất 3 ký tự')
  .max(100, 'Tên trang trại không được quá 100 ký tự');

export const areaSchema = z.number()
  .positive('Diện tích phải là số dương')
  .max(10000, 'Diện tích không được quá 10,000 ha');

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90, 'Vĩ độ không hợp lệ'),
  lng: z.number().min(-180).max(180, 'Kinh độ không hợp lệ'),
});

// IoT validations
export const deviceNameSchema = z.string()
  .min(2, 'Tên thiết bị phải có ít nhất 2 ký tự')
  .max(50, 'Tên thiết bị không được quá 50 ký tự');

export const mqttTopicSchema = z.string()
  .regex(/^[a-zA-Z0-9\/\-\_]+$/, 'MQTT topic không hợp lệ')
  .min(3, 'MQTT topic phải có ít nhất 3 ký tự')
  .max(100, 'MQTT topic không được quá 100 ký tự');

export const sensorValueSchema = z.number()
  .finite('Giá trị cảm biến phải là số hợp lệ');

// Chat validations
export const messageContentSchema = z.string()
  .min(1, 'Tin nhắn không được để trống')
  .max(1000, 'Tin nhắn không được quá 1000 ký tự');

export const conversationTitleSchema = z.string()
  .min(3, 'Tiêu đề cuộc trò chuyện phải có ít nhất 3 ký tự')
  .max(100, 'Tiêu đề cuộc trò chuyện không được quá 100 ký tự');

// Knowledge base validations
export const articleTitleSchema = z.string()
  .min(5, 'Tiêu đề bài viết phải có ít nhất 5 ký tự')
  .max(200, 'Tiêu đề bài viết không được quá 200 ký tự');

export const articleContentSchema = z.string()
  .min(50, 'Nội dung bài viết phải có ít nhất 50 ký tự')
  .max(10000, 'Nội dung bài viết không được quá 10,000 ký tự');

// File upload validations
export const fileSizeSchema = z.number()
  .max(10 * 1024 * 1024, 'Kích thước file không được quá 10MB');

export const fileTypeSchema = z.string()
  .refine((type) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json'
    ];
    return allowedTypes.includes(type);
  }, 'Loại file không được hỗ trợ');

// Utility functions
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

export function validatePhone(phone: string): boolean {
  try {
    vietnamesePhoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

export function validatePassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

export function validateVietnameseName(name: string): boolean {
  try {
    vietnameseNameSchema.parse(name);
    return true;
  } catch {
    return false;
  }
}

export function validateFarmName(name: string): boolean {
  try {
    farmNameSchema.parse(name);
    return true;
  } catch {
    return false;
  }
}

export function validateArea(area: number): boolean {
  try {
    areaSchema.parse(area);
    return true;
  } catch {
    return false;
  }
}

export function validateCoordinates(coords: { lat: number; lng: number }): boolean {
  try {
    coordinatesSchema.parse(coords);
    return true;
  } catch {
    return false;
  }
}

export function validateDeviceName(name: string): boolean {
  try {
    deviceNameSchema.parse(name);
    return true;
  } catch {
    return false;
  }
}

export function validateMqttTopic(topic: string): boolean {
  try {
    mqttTopicSchema.parse(topic);
    return true;
  } catch {
    return false;
  }
}

export function validateSensorValue(value: number): boolean {
  try {
    sensorValueSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function validateMessageContent(content: string): boolean {
  try {
    messageContentSchema.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function validateArticleTitle(title: string): boolean {
  try {
    articleTitleSchema.parse(title);
    return true;
  } catch {
    return false;
  }
}

export function validateArticleContent(content: string): boolean {
  try {
    articleContentSchema.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function validateFileSize(size: number): boolean {
  try {
    fileSizeSchema.parse(size);
    return true;
  } catch {
    return false;
  }
}

export function validateFileType(type: string): boolean {
  try {
    fileTypeSchema.parse(type);
    return true;
  } catch {
    return false;
  }
}

// Custom validation functions
export function validateVietnameseText(text: string, minLength: number = 1, maxLength: number = 1000): boolean {
  if (!text || typeof text !== 'string') return false;
  if (text.length < minLength || text.length > maxLength) return false;
  
  // Check if text contains only Vietnamese characters, spaces, and common punctuation
  const vietnameseRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠĐưăâêôơđ\s\.,!?;:()\-]+$/;
  return vietnameseRegex.test(text);
}

export function validateCropName(name: string): boolean {
  const commonCrops = [
    'lúa', 'ngô', 'khoai tây', 'cà chua', 'dưa hấu', 'rau xanh', 'hoa',
    'cây ăn quả', 'cây công nghiệp', 'lúa mì', 'đậu', 'bắp cải', 'cà rốt'
  ];
  
  const normalizedName = name.toLowerCase().trim();
  return commonCrops.some(crop => normalizedName.includes(crop)) || validateVietnameseText(name, 2, 50);
}

export function validateSoilType(type: string): boolean {
  const soilTypes = [
    'đất phù sa', 'đất đỏ bazan', 'đất cát', 'đất sét',
    'đất thịt', 'đất mùn', 'đất than bùn'
  ];
  
  const normalizedType = type.toLowerCase().trim();
  return soilTypes.some(soil => normalizedType.includes(soil)) || validateVietnameseText(type, 3, 50);
}

export function validateWeatherCondition(condition: string): boolean {
  const conditions = [
    'nắng', 'mưa', 'âm u', 'sương mù', 'gió mạnh',
    'nóng', 'lạnh', 'ẩm ướt', 'khô hạn'
  ];
  
  const normalizedCondition = condition.toLowerCase().trim();
  return conditions.some(cond => normalizedCondition.includes(cond)) || validateVietnameseText(condition, 2, 30);
}

// Error message helpers
export function getValidationErrorMessage(error: z.ZodError): string {
  if (error.errors.length === 0) return 'Dữ liệu không hợp lệ';
  
  const firstError = error.errors[0];
  return firstError.message || 'Dữ liệu không hợp lệ';
}

export function getFieldValidationError(errors: z.ZodError, fieldName: string): string | undefined {
  const fieldError = errors.errors.find(error => error.path.includes(fieldName));
  return fieldError?.message;
}
