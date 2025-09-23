import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Farm } from '../../farm/entities/farm.entity';
import { DeviceCommand } from './device-command.entity';

export enum DeviceType {
  PUMP = 'pump',
  VALVE = 'valve',
  FAN = 'fan',
  HEATER = 'heater',
  LIGHT = 'light',
  FERTILIZER = 'fertilizer'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  deviceId: string; // MQTT device ID

  @Column({
    type: 'enum',
    enum: DeviceType
  })
  type: DeviceType;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFFLINE
  })
  status: DeviceStatus;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  description: string;

  @Column('json', { nullable: true })
  configuration: any; // Device-specific config

  @Column({ default: false })
  isControllable: boolean;

  @Column({ nullable: true })
  currentState: string; // ON/OFF, percentage, etc.

  @Column({ nullable: true })
  lastCommand: string;

  @Column({ nullable: true })
  lastCommandTime: Date;

  @ManyToOne(() => Farm, farm => farm.devices)
  farm: Farm;

  @Column()
  farmId: string;

  @OneToMany(() => DeviceCommand, command => command.device)
  commands: DeviceCommand[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
