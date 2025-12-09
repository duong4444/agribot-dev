import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DocumentCategory {
  CROP_CARE = 'crop_care',
  PLANTING = 'planting',
  HARVESTING = 'harvesting',
  PEST_CONTROL = 'pest_control',
  SOIL_MANAGEMENT = 'soil_management',
  IRRIGATION = 'irrigation',
  WEATHER = 'weather',
  EQUIPMENT = 'equipment',
  GENERAL = 'general',
}

@Entity('documents')
@Index('idx_documents_filename', ['filename'])
@Index('idx_documents_category', ['category'])
@Index('idx_documents_status', ['processingStatus'])
@Index('idx_documents_user', ['userId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  filepath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'text', nullable: true })
  rawText: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  processingStatus: DocumentStatus;

  @Column({ default: false })
  indexed: boolean;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    nullable: true,
  })
  category: DocumentCategory;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 'vi' })
  language: string;

  @Column({ type: 'int', default: 0 })
  chunkCount: number;

  // Full-text search column (tsvector for Postgres)
  @Index('idx_documents_fts')
  @Column({
    type: 'tsvector',
    nullable: true,
    select: false,
  })
  searchVector: any;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}



