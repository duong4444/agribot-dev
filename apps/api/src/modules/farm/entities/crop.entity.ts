import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum CropStatus {
  PLANNED = 'PLANNED',          // Đã lên kế hoạch
  PLANTED = 'PLANTED',          // Đã gieo trồng
  GROWING = 'GROWING',          // Đang phát triển
  MATURE = 'MATURE',            // Đã trưởng thành
  HARVESTED = 'HARVESTED',      // Đã thu hoạch
  FAILED = 'FAILED',            // Thất bại
}

export enum CropType {
  VEGETABLE = 'VEGETABLE',      // Rau củ
  FRUIT = 'FRUIT',              // Cây ăn quả
  GRAIN = 'GRAIN',              // Ngũ cốc
  HERB = 'HERB',                // Thảo mộc
  FLOWER = 'FLOWER',            // Hoa
}

@Entity('crops')
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Tên cây trồng (VD: Cà chua, Lúa, Ớt)

  @Column({ nullable: true })
  variety: string; // Giống cây (VD: Cà chua cherry, Lúa IR64)

  @Column({
    type: 'enum',
    enum: CropType,
    default: CropType.VEGETABLE,
  })
  type: CropType;

  @Column({
    type: 'enum',
    enum: CropStatus,
    default: CropStatus.PLANNED,
  })
  status: CropStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  plantedArea: number; // Diện tích trồng (m²)

  @Column({ type: 'int', nullable: true })
  plantCount: number; // Số lượng cây

  @Column({ type: 'date', nullable: true })
  plantingDate: Date; // Ngày gieo trồng

  @Column({ type: 'date', nullable: true })
  expectedHarvestDate: Date; // Ngày thu hoạch dự kiến

  @Column({ type: 'date', nullable: true })
  actualHarvestDate: Date; // Ngày thu hoạch thực tế

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expectedYield: number; // Sản lượng dự kiến (kg)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualYield: number; // Sản lượng thực tế (kg)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketPrice: number; // Giá thị trường (VNĐ/kg)

  @Column({ type: 'jsonb', nullable: true })
  growingConditions: {
    soilType: string;
    pH: number;
    temperature: {
      min: number;
      max: number;
    };
    humidity: {
      min: number;
      max: number;
    };
    wateringFrequency: string; // Tần suất tưới nước
    fertilizerSchedule: string; // Lịch bón phân
  };

  @Column({ type: 'jsonb', nullable: true })
  careInstructions: {
    watering: string;
    fertilizing: string;
    pestControl: string;
    pruning: string;
    other: string;
  };

  @Column({ nullable: true })
  farmId: string;

  @ManyToOne('Farm', 'crops', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'farmId' })
  farm: any;

  @OneToMany('Activity', 'crop', {
    cascade: true,
  })
  activities: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
