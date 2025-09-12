import { z } from 'zod';

// Common utility types
export const TimestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof TimestampSchema>;

export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

export const EmailSchema = z.string().email();
export type Email = z.infer<typeof EmailSchema>;

export const PhoneSchema = z.string().regex(/^[0-9+\-\s()]+$/);
export type Phone = z.infer<typeof PhoneSchema>;

// Pagination
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// Date range
export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

// Coordinates
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

// File upload
export const FileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number().positive(),
  url: z.string().url(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

// Search and filter
export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  filters: z.record(z.any()).optional(),
  dateRange: DateRangeSchema.optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// Notification
export const NotificationSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  message: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  isRead: z.boolean().default(false),
  createdAt: TimestampSchema,
});

export type Notification = z.infer<typeof NotificationSchema>;

// Settings
export const UserSettingsSchema = z.object({
  language: z.string().default('vi'),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
  }),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
