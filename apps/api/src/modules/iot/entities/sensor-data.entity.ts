import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  timestamp: Date;
}
