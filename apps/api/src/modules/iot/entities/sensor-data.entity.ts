import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from './device.entity';

@Entity('sensor_data')
export class SensorData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column('float', { nullable: true })
  temperature: number;

  @Column('float', { nullable: true })
  humidity: number;

  @Column('float', { nullable: true, name: 'soil_moisture' })
  soilMoisture: number;

  @Column('float', { nullable: true, name: 'light_level' })
  lightLevel: number;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;

  @ManyToOne(() => Device, (device) => device.sensorData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_internal_id' })
  device: Device;

  @Column({ nullable: true, name: 'device_internal_id' })
  deviceInternalId: string;
}
