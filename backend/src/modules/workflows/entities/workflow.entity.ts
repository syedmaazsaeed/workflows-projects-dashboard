import { Entity, Column, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum WorkflowSource {
  MANUAL_UPLOAD = 'MANUAL_UPLOAD',
  N8N_SYNC = 'N8N_SYNC',
}

@Entity('workflows')
@Unique(['projectId', 'workflowKey'])
export class Workflow extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'workflow_key', type: 'text' })
  workflowKey: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.ACTIVE,
  })
  status: WorkflowStatus;

  @Column({
    type: 'enum',
    enum: WorkflowSource,
    default: WorkflowSource.MANUAL_UPLOAD,
  })
  source: WorkflowSource;

  @Column({ name: 'n8n_workflow_id', type: 'text', nullable: true })
  n8nWorkflowId: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

