import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Farm } from './farm.entity';
import { FarmActivity } from './farm-activity.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  type: string; // e.g., 'GREENHOUSE', 'OUTDOOR'

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  farmId: string;

  @ManyToOne(() => Farm, (farm) => farm.areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmId' })
  farm: Farm;

  @OneToMany(() => FarmActivity, (activity) => activity.area)
  activities: FarmActivity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
