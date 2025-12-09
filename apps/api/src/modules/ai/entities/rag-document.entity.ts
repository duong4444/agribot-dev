import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RagChunk } from './rag-chunk.entity';

export enum RagDocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('rag_documents')
@Index('idx_rag_documents_user_id', ['userId'])
@Index('idx_rag_documents_status', ['processingStatus'])
@Index('idx_rag_documents_category', ['category'])
export class RagDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column()
  filepath: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({
    name: 'processing_status',
    type: 'varchar',
    default: RagDocumentStatus.PENDING,
  })
  processingStatus: RagDocumentStatus;

  @Column({ name: 'chunk_count', type: 'int', default: 0 })
  chunkCount: number;

  @Column({ name: 'embedding_generated', default: false })
  embeddingGenerated: boolean;

  @Column('jsonb', { nullable: true })
  metadata: {
    fileSize: number;
    language: string;
    totalTokens?: number;
    embeddingModel?: string;
    chunkingStrategy?: string;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;

  @OneToMany(() => RagChunk, chunk => chunk.ragDocument)
  chunks: RagChunk[];
}
