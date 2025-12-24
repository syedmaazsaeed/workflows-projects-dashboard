import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntityWithoutUpdate } from '../../../common/entities/base.entity';
import { Workflow } from './workflow.entity';
import { User } from '../../auth/entities/user.entity';

export interface WorkflowMetadata {
  nodeCount: number;
  nodeTypes: string[];
  triggers: string[];
  webhooks: string[];
  servicesUsed: string[];
  connections: number;
}

@Entity('workflow_versions')
@Unique(['workflowId', 'version'])
export class WorkflowVersion extends BaseEntityWithoutUpdate {
  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'json_storage_url', type: 'text' })
  jsonStorageUrl: string;

  @Column({ name: 'json_hash', type: 'text' })
  jsonHash: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: WorkflowMetadata;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => Workflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}

