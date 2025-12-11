import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // 'MONTHLY', 'YEARLY', 'WEEKLY', etc.

  @Column()
  name: string; // 'Gói Tháng', 'Gói Năm'

  @Column({ type: 'text', nullable: true })
  description: string; // Mô tả chi tiết

  @Column('decimal', { precision: 12, scale: 0 })
  price: number; // 200000, 2000000

  @Column('int')
  credits: number; // 200, 2500

  @Column('int')
  durationDays: number; // 30, 365

  @Column({ default: true })
  isActive: boolean; // Admin có thể tắt/bật gói

  @Column({ default: 0 })
  displayOrder: number; // Thứ tự hiển thị

  @Column({ nullable: true })
  discountPercent: number; // 17% cho yearly

  @Column({ nullable: true })
  badgeText: string; // 'Tiết kiệm 17%'

  @Column({ default: false })
  isPopular: boolean; // Đánh dấu gói được đề xuất

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
