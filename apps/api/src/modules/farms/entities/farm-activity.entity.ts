import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Farm } from './farm.entity';
import { Area } from './area.entity';
import { Crop } from './crop.entity';

export enum ActivityType {
  SEEDING = 'SEEDING',
  FERTILIZE = 'FERTILIZE',
  PESTICIDE = 'PESTICIDE',
  HARVEST = 'HARVEST',
  OTHER = 'OTHER',
}

@Entity('farm_activities')
export class FarmActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    default: ActivityType.OTHER,
  })
  type: ActivityType;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenue: number;

  @Column()
  farmId: string;

  @ManyToOne(() => Farm, (farm) => farm.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmId' })
  farm: Farm;

  @Column({ nullable: true })
  areaId: string;

  @ManyToOne(() => Area, (area) => area.activities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @Column({ nullable: true })
  cropId: string;

  @ManyToOne(() => Crop, (crop) => crop.activities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
