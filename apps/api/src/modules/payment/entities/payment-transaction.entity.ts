import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  amount: number;

  @Column()
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Column()
  type: 'SUBSCRIPTION' | 'CREDITS';

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
