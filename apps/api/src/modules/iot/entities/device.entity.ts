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
import { Area } from '../../farms/entities/area.entity';
import { SensorData } from './sensor-data.entity';

export enum DeviceType {
  SENSOR_NODE = 'SENSOR_NODE',
  CONTROLLER = 'CONTROLLER',
  GATEWAY = 'GATEWAY',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'serial_number' })
  serialNumber: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.SENSOR_NODE,
  })
  type: DeviceType;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true, name: 'area_id' })
  areaId: string;

  @ManyToOne(() => Area, (area) => area.devices, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => SensorData, (data) => data.device)
  sensorData: SensorData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
