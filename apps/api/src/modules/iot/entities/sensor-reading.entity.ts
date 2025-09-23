import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('sensor_readings')
export class SensorReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column('json', { nullable: true })
  metadata: any; // Additional sensor data

  @Column({ default: false })
  isAlert: boolean; // If reading exceeds thresholds

  @Column({ nullable: true })
  alertMessage: string;

  @ManyToOne(() => Sensor, sensor => sensor.readings)
  sensor: Sensor;

  @Column()
  sensorId: string;

  @CreateDateColumn()
  timestamp: Date;
}
