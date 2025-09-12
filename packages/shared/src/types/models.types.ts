import { z } from 'zod';

// User Types
export const UserRoleSchema = z.enum(['FARMER', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// Farm Types
export const FarmSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  area: z.number().positive(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Farm = z.infer<typeof FarmSchema>;

// IoT Device Types
export const DeviceTypeSchema = z.enum(['SENSOR', 'CONTROLLER', 'ACTUATOR']);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const SensorTypeSchema = z.enum([
  'SOIL_MOISTURE',
  'TEMPERATURE',
  'HUMIDITY',
  'LIGHT',
  'PH',
  'NUTRIENT',
  'WIND_SPEED',
  'RAINFALL',
]);
export type SensorType = z.infer<typeof SensorTypeSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: DeviceTypeSchema,
  sensorType: SensorTypeSchema.optional(),
  farmId: z.string().uuid(),
  mqttTopic: z.string(),
  isActive: z.boolean(),
  lastSeen: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Device = z.infer<typeof DeviceSchema>;

// Sensor Data Types
export const SensorReadingSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export type SensorReading = z.infer<typeof SensorReadingSchema>;

// Chat Types
export const MessageTypeSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  type: MessageTypeSchema,
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Knowledge Base Types
export const KnowledgeCategorySchema = z.enum([
  'CROP_CARE',
  'PLANTING',
  'HARVESTING',
  'PEST_CONTROL',
  'SOIL_MANAGEMENT',
  'IRRIGATION',
  'WEATHER',
  'EQUIPMENT',
  'GENERAL',
]);
export type KnowledgeCategory = z.infer<typeof KnowledgeCategorySchema>;

export const KnowledgeArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  category: KnowledgeCategorySchema,
  tags: z.array(z.string()),
  isPublished: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KnowledgeArticle = z.infer<typeof KnowledgeArticleSchema>;

// Activity Types
export const ActivityTypeSchema = z.enum([
  'PLANTING',
  'FERTILIZING',
  'WATERING',
  'HARVESTING',
  'PEST_CONTROL',
  'SOIL_TREATMENT',
  'EQUIPMENT_MAINTENANCE',
  'OTHER',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  farmId: z.string().uuid(),
  type: ActivityTypeSchema,
  description: z.string(),
  date: z.string().datetime(),
  cost: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Activity = z.infer<typeof ActivitySchema>;
