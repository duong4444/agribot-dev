import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RagDocument } from './rag-document.entity';

@Entity('rag_chunks')
@Index('idx_rag_chunks_document_id', ['ragDocumentId'])
@Index('idx_rag_chunks_chunk_index', ['ragDocumentId', 'chunkIndex'])
export class RagChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rag_document_id' })
  ragDocumentId: string;

  @ManyToOne(() => RagDocument, doc => doc.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rag_document_id' })
  ragDocument: RagDocument;

  @Column('text')
  content: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ name: 'start_position', type: 'int' })
  startPosition: number;

  @Column({ name: 'end_position', type: 'int' })
  endPosition: number;

  // Vector embedding (768 dimensions)
  // Note: pgvector stores this as vector(768) type in PostgreSQL
  // TypeORM doesn't have native support for pgvector, so we use 'text' and handle conversion
  @Column({
    type: 'text',
    transformer: {
      to: (value: number[]) => JSON.stringify(value),
      from: (value: string) => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      },
    },
  })
  embedding: number[];

  @Column('jsonb', { nullable: true })
  metadata: {
    tokens: number;
    language: string;
    keywords?: string[];
    entities?: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // For search results
  similarity?: number;
}
