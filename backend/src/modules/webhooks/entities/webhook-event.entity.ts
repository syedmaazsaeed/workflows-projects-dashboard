import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityWithoutUpdate } from '../../../common/entities/base.entity';
import { Webhook } from './webhook.entity';

export enum WebhookEventStatus {
  RECEIVED = 'RECEIVED',
  ROUTED = 'ROUTED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface RouteResult {
  success: boolean;
  statusCode?: number;
  responseBody?: unknown;
  error?: string;
  duration?: number;
}

@Entity('webhook_events')
export class WebhookEvent extends BaseEntityWithoutUpdate {
  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' })
  receivedAt: Date;

  @Column({ name: 'request_headers', type: 'jsonb', default: {} })
  requestHeaders: Record<string, string>;

  @Column({ name: 'request_body', type: 'jsonb', default: {} })
  requestBody: unknown;

  @Column({ name: 'request_ip', type: 'text', nullable: true })
  requestIp: string | null;

  @Column({
    type: 'enum',
    enum: WebhookEventStatus,
    default: WebhookEventStatus.RECEIVED,
  })
  status: WebhookEventStatus;

  @Column({ name: 'route_result', type: 'jsonb', nullable: true })
  routeResult: RouteResult | null;

  @Column({ name: 'replay_of_event_id', type: 'uuid', nullable: true })
  replayOfEventId: string | null;

  @ManyToOne(() => Webhook, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @ManyToOne(() => WebhookEvent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replay_of_event_id' })
  replayOfEvent: WebhookEvent | null;
}

