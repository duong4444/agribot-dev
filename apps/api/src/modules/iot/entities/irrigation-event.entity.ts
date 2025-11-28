import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

export enum IrrigationEventType {
  MANUAL_ON = 'manual_on',
  MANUAL_OFF = 'manual_off',
  DURATION = 'duration',
  AUTO = 'auto',
  AUTO_CONFIG_UPDATE = 'auto_config_update',
}

export enum IrrigationEventStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('irrigation_events')
export class IrrigationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deviceId: string;

  @Column({ type: 'enum', enum: IrrigationEventType })
  type: IrrigationEventType;

  @Column({
    type: 'enum',
    enum: IrrigationEventStatus,
    default: IrrigationEventStatus.PENDING,
  })
  status: IrrigationEventStatus;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'int', nullable: true })
  plannedDuration: number; // seconds

  @Column({ type: 'int', nullable: true })
  actualDuration: number; // seconds (from ESP32 feedback)

  @Column({ type: 'float', nullable: true })
  soilMoistureBefore: number;

  @Column({ type: 'float', nullable: true })
  soilMoistureAfter: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional data (e.g., triggered by user, auto threshold)

  @Column({ nullable: true })
  userId: string; // User who triggered the event (for manual control)

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'serialNumber' })
  device: Device;
}
