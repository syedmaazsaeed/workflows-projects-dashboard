import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';
import { Workflow } from '../../workflows/entities/workflow.entity';

export enum WebhookRoutingType {
  FORWARD_URL = 'FORWARD_URL',
  TRIGGER_N8N_WORKFLOW = 'TRIGGER_N8N_WORKFLOW',
  TRIGGER_INTERNAL_WORKFLOW = 'TRIGGER_INTERNAL_WORKFLOW',
}

export interface TransformRules {
  headerRewrites?: Record<string, string>;
  bodyMappings?: Array<{
    source: string; // JSONPath expression
    target: string; // target field name
  }>;
  additionalHeaders?: Record<string, string>;
}

@Entity('webhooks')
@Unique(['projectId', 'hookKey'])
export class Webhook extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'hook_key', type: 'text' })
  hookKey: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'secret_hash', type: 'text' })
  secretHash: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({
    name: 'routing_type',
    type: 'enum',
    enum: WebhookRoutingType,
    default: WebhookRoutingType.FORWARD_URL,
  })
  routingType: WebhookRoutingType;

  @Column({ name: 'target_url', type: 'text', nullable: true })
  targetUrl: string | null;

  @Column({ name: 'n8n_webhook_url', type: 'text', nullable: true })
  n8nWebhookUrl: string | null;

  @Column({ name: 'workflow_id', type: 'uuid', nullable: true })
  workflowId: string | null;

  @Column({ name: 'transform_rules', type: 'jsonb', nullable: true })
  transformRules: TransformRules | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Workflow, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow | null;
}

