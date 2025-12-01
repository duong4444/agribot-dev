import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

export enum LightingEventType {
  MANUAL_ON = 'manual_on',
  MANUAL_OFF = 'manual_off',
  AUTO = 'auto',
  SCHEDULE = 'schedule',
  AUTO_CONFIG_UPDATE = 'auto_config_update',
}

export enum LightingEventStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('lighting_events')
export class LightingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deviceId: string;

  @Column({ type: 'enum', enum: LightingEventType })
  type: LightingEventType;

  @Column({
    type: 'enum',
    enum: LightingEventStatus,
    default: LightingEventStatus.PENDING,
  })
  status: LightingEventStatus;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'float', nullable: true })
  lightLevelBefore: number;

  @Column({ type: 'float', nullable: true })
  lightLevelAfter: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional data (e.g., threshold, schedule info)

  @Column({ nullable: true })
  userId: string; // User who triggered the event (for manual control)

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'serialNumber' })
  device: Device;
}
