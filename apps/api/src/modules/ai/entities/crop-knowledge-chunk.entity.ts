import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

/**
 * Crop Knowledge Chunk Entity
 * 
 * Lưu trữ các chunks kiến thức nông nghiệp đã được phân tích
 * từ file markdown với metadata đầy đủ cho FTS
 */
@Entity('crop_knowledge_chunks')
@Index('idx_crop_knowledge_loai_cay', ['loaiCay'])
@Index('idx_crop_knowledge_chu_de', ['chuDeLon'])
@Index('idx_crop_knowledge_search_vector', ['searchVector'])
@Index('idx_crop_knowledge_composite', ['loaiCay', 'chuDeLon', 'tieuDeChunk'])
export class CropKnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chunk_id', unique: true })
  @Index('idx_chunk_id_unique')
  chunkId: string; // Custom ID format: filename_001

  @Column({ name: 'loai_cay' })
  loaiCay: string; // Crop type from H1

  @Column({ name: 'nguon' })
  nguon: string; // Source filename

  @Column({ name: 'chu_de_lon' })
  chuDeLon: string; // H2 section

  @Column({ name: 'tieu_de_chunk' })
  tieuDeChunk: string; // H3 title

  @Column({ name: 'noi_dung', type: 'text' })
  noiDung: string; // Chunk content

  @Column({ name: 'thu_tu', type: 'int' })
  thuTu: number; // Order in document

  // Full-text search vector with weights
  @Column({ 
    name: 'search_vector',
    type: 'tsvector',
    nullable: true,
    select: false, // Don't select by default
  })
  searchVector: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    word_count?: number;
    char_count?: number;
    has_list?: boolean;
    has_bold?: boolean;
    keywords?: string[];
    [key: string]: any;
  };

  // Link to original document
  @Column({ name: 'document_id', nullable: true })
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: Document;

  // User who uploaded
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  // Status
  @Column({ 
    type: 'enum',
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'pending';

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Version for optimistic locking
  @Column({ type: 'int', default: 1 })
  version: number;
}
