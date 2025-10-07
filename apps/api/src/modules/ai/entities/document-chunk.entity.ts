import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_chunks')
@Index('idx_chunks_document', ['documentId'])
@Index('idx_chunks_index', ['chunkIndex'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'int', nullable: true })
  pageNumber: number;

  @Column({ type: 'int', nullable: true })
  startPosition: number;

  @Column({ type: 'int', nullable: true })
  endPosition: number;

  @Column({ type: 'int' })
  tokenCount: number;

  // Embedding vector for semantic search (pgvector)
  // Using cube or vector extension
  @Index('idx_chunks_embedding', { synchronize: false })
  @Column({
    type: 'json',
    nullable: true,
  })
  embedding: number[];

  // Full-text search column
  @Index('idx_chunks_fts')
  @Column({
    type: 'tsvector',
    nullable: true,
    select: false,
  })
  searchVector: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    documentFilename?: string;
    category?: string;
    tags?: string[];
    language?: string;
    [key: string]: any;
  };

  @Column()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @CreateDateColumn()
  createdAt: Date;
}



