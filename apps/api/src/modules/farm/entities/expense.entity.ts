import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum ExpenseType {
  SEEDS = 'SEEDS',              // Hạt giống
  FERTILIZER = 'FERTILIZER',    // Phân bón
  PESTICIDE = 'PESTICIDE',      // Thuốc trừ sâu
  EQUIPMENT = 'EQUIPMENT',      // Thiết bị
  LABOR = 'LABOR',              // Nhân công
  WATER = 'WATER',              // Nước tưới
  ELECTRICITY = 'ELECTRICITY',  // Điện
  FUEL = 'FUEL',                // Nhiên liệu
  TRANSPORTATION = 'TRANSPORTATION', // Vận chuyển
  MAINTENANCE = 'MAINTENANCE',  // Bảo trì
  OTHER = 'OTHER',              // Khác
}

export enum ExpenseStatus {
  PENDING = 'PENDING',          // Chờ thanh toán
  PAID = 'PAID',                // Đã thanh toán
  CANCELLED = 'CANCELLED',      // Đã hủy
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // Tiêu đề chi phí

  @Column({ nullable: true })
  description: string; // Mô tả chi tiết

  @Column({
    type: 'enum',
    enum: ExpenseType,
  })
  type: ExpenseType;

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PENDING,
  })
  status: ExpenseStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number; // Số tiền (VNĐ)

  @Column({ type: 'int', nullable: true })
  quantity: number; // Số lượng

  @Column({ nullable: true })
  unit: string; // Đơn vị (kg, lít, cái, etc.)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number; // Giá đơn vị (VNĐ)

  @Column({ type: 'date' })
  expenseDate: Date; // Ngày chi phí

  @Column({ type: 'date', nullable: true })
  dueDate: Date; // Ngày đến hạn thanh toán

  @Column({ type: 'date', nullable: true })
  paidDate: Date; // Ngày thanh toán

  @Column({ nullable: true })
  supplier: string; // Nhà cung cấp

  @Column({ nullable: true })
  invoiceNumber: string; // Số hóa đơn

  @Column({ type: 'jsonb', nullable: true })
  paymentMethod: {
    type: string; // cash, bank_transfer, credit_card, etc.
    reference: string; // Số tham chiếu
    bankAccount?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  receipt: {
    filename: string;
    url: string;
    uploadedAt: Date;
  }; // Hóa đơn/chứng từ

  @Column({ type: 'jsonb', nullable: true })
  tags: string[]; // Tags để phân loại

  @Column({ nullable: true })
  farmId: string;

  @ManyToOne('Farm', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'farmId' })
  farm: any;

  @Column({ nullable: true })
  cropId: string;

  @ManyToOne('Crop', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: any;

  @Column({ nullable: true })
  activityId: string;

  @ManyToOne('Activity', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activityId' })
  activity: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
