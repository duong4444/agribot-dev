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
import { User } from '../../users/entities/user.entity';

export enum FarmStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum FarmType {
  VEGETABLE = 'VEGETABLE',      // Rau củ
  FRUIT = 'FRUIT',              // Cây ăn quả
  GRAIN = 'GRAIN',              // Ngũ cốc
  FLOWER = 'FLOWER',            // Hoa
  MIXED = 'MIXED',              // Hỗn hợp
}

@Entity('farms')
export class Farm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string; // Địa chỉ nông trại

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area: number; // Diện tích (m²)

  @Column({
    type: 'enum',
    enum: FarmType,
    default: FarmType.MIXED,
  })
  type: FarmType;

  @Column({
    type: 'enum',
    enum: FarmStatus,
    default: FarmStatus.ACTIVE,
  })
  status: FarmStatus;

  @Column({ type: 'jsonb', nullable: true })
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  soilInfo: {
    type: string;        // Loại đất
    pH: number;          // Độ pH
    nutrients: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  climateInfo: {
    temperature: {
      min: number;
      max: number;
      average: number;
    };
    humidity: {
      min: number;
      max: number;
      average: number;
    };
    rainfall: number; // Lượng mưa trung bình (mm/năm)
  };

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany('Crop', 'farm', {
    cascade: true,
  })
  crops: any[];

  @OneToMany('Activity', 'farm', {
    cascade: true,
  })
  activities: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
