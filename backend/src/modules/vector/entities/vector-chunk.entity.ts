import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

export enum VectorSourceType {
  WORKFLOW_VERSION = 'WORKFLOW_VERSION',
  DOCUMENT = 'DOCUMENT',
  WEBHOOK_EVENT = 'WEBHOOK_EVENT',
}

export interface ChunkMeta {
  title?: string;
  nodeNames?: string[];
  section?: string;
  type?: string;
}

@Entity('vector_chunks')
@Index(['projectId', 'sourceType'])
export class VectorChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: VectorSourceType,
  })
  sourceType: VectorSourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({ name: 'chunk_text', type: 'text' })
  chunkText: string;

  @Column({ name: 'chunk_meta', type: 'jsonb', default: {} })
  chunkMeta: ChunkMeta;

  // Note: The embedding column is of type vector(1536) in the database
  // TypeORM doesn't have native vector support, so we handle it specially
  @Column({ type: 'text', nullable: true })
  embedding: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

