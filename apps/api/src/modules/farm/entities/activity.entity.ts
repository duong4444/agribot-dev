import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum ActivityType {
  PLANTING = 'PLANTING',        // Gieo trồng
  WATERING = 'WATERING',        // Tưới nước
  FERTILIZING = 'FERTILIZING',  // Bón phân
  PEST_CONTROL = 'PEST_CONTROL', // Phòng trừ sâu bệnh
  PRUNING = 'PRUNING',          // Cắt tỉa
  HARVESTING = 'HARVESTING',    // Thu hoạch
  SOIL_PREPARATION = 'SOIL_PREPARATION', // Chuẩn bị đất
  WEEDING = 'WEEDING',          // Làm cỏ
  OTHER = 'OTHER',              // Khác
}

export enum ActivityStatus {
  PLANNED = 'PLANNED',          // Đã lên kế hoạch
  IN_PROGRESS = 'IN_PROGRESS',  // Đang thực hiện
  COMPLETED = 'COMPLETED',      // Đã hoàn thành
  CANCELLED = 'CANCELLED',      // Đã hủy
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // Tiêu đề hoạt động

  @Column({ nullable: true })
  description: string; // Mô tả chi tiết

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.PLANNED,
  })
  status: ActivityStatus;

  @Column({ type: 'timestamp' })
  scheduledDate: Date; // Ngày dự kiến thực hiện

  @Column({ type: 'timestamp', nullable: true })
  actualDate: Date; // Ngày thực hiện thực tế

  @Column({ type: 'int', nullable: true })
  duration: number; // Thời gian thực hiện (phút)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number; // Chi phí (VNĐ)

  @Column({ type: 'jsonb', nullable: true })
  materials: {
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }[]; // Vật liệu sử dụng

  @Column({ type: 'jsonb', nullable: true })
  weather: {
    temperature: number;
    humidity: number;
    condition: string; // sunny, cloudy, rainy, etc.
  }; // Thông tin thời tiết

  @Column({ type: 'jsonb', nullable: true })
  notes: {
    observations: string;
    issues: string;
    recommendations: string;
  }; // Ghi chú

  @Column({ type: 'jsonb', nullable: true })
  location: {
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }; // Vị trí thực hiện

  @Column({ nullable: true })
  farmId: string;

  @ManyToOne('Farm', 'activities', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'farmId' })
  farm: any;

  @Column({ nullable: true })
  cropId: string;

  @ManyToOne('Crop', 'activities', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
