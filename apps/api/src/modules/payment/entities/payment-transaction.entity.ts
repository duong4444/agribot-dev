import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { User } from '../../users/entities/user.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  amount: number;

  @Column()
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Column()
  type: 'SUBSCRIPTION' | 'CREDITS';

  @Column({ nullable: true })
  planCode: string; // Reference to subscription_plan.code (e.g., 'MONTHLY', 'YEARLY')

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ nullable: true })
  subscriptionPlanId: string;

  @Column({ nullable: true })
  vnpayTxnRef: string;

  @Column({ nullable: true })
  vnpayTransactionNo: string;

  @Column({ nullable: true })
  bankCode: string;

  @Column({ nullable: true })
  payDate: string; // VNPAY format: yyyyMMddHHmmss

  @Column({ type: 'text', nullable: true })
  vnpayResponse: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

