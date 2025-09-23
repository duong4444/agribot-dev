import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Device } from './device.entity';
import { User } from '../../users/entities/user.entity';

export enum CommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  EXECUTED = 'executed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity('device_commands')
export class DeviceCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  command: string; // MQTT command

  @Column('json', { nullable: true })
  parameters: any; // Command parameters

  @Column({
    type: 'enum',
    enum: CommandStatus,
    default: CommandStatus.PENDING
  })
  status: CommandStatus;

  @Column({ nullable: true })
  response: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  executedAt: Date;

  @ManyToOne(() => Device, device => device.commands)
  device: Device;

  @Column()
  deviceId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
