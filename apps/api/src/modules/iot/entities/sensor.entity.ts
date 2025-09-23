import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Farm } from '../../farm/entities/farm.entity';
import { SensorReading } from './sensor-reading.entity';

export enum SensorType {
  MOISTURE = 'moisture',
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  LIGHT = 'light',
  PH = 'ph',
  NUTRIENT = 'nutrient'
}

export enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  deviceId: string; // MQTT device ID

  @Column({
    type: 'enum',
    enum: SensorType
  })
  type: SensorType;

  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE
  })
  status: SensorStatus;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  description: string;

  @Column('json', { nullable: true })
  configuration: any; // Sensor-specific config

  @Column({ nullable: true })
  lastReading: number;

  @Column({ nullable: true })
  lastReadingTime: Date;

  @Column({ nullable: true })
  minThreshold: number;

  @Column({ nullable: true })
  maxThreshold: number;

  @ManyToOne(() => Farm, farm => farm.sensors)
  farm: Farm;

  @Column()
  farmId: string;

  @OneToMany(() => SensorReading, reading => reading.sensor)
  readings: SensorReading[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
