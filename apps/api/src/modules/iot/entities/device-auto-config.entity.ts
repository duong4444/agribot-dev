import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_auto_configs')
export class DeviceAutoConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  deviceId: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'float', default: 30.0 })
  moistureThreshold: number; // % độ ẩm đất

  @Column({ type: 'int', default: 600 })
  irrigationDuration: number; // seconds

  @Column({ type: 'int', default: 3600 })
  cooldownPeriod: number; // seconds

  // Lighting Configuration
  @Column({ default: false })
  lightEnabled: boolean;

  @Column({ type: 'float', default: 100.0 })
  lightThreshold: number; // Lux

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'serialNumber' })
  device: Device;
}
