import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Webhook } from './entities/webhook.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookReceiverController } from './webhook-receiver.controller';
import { WebhooksGateway } from './webhooks.gateway';
import { ProjectsModule } from '../projects/projects.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookEvent]),
    ProjectsModule,
    AuditModule,
  ],
  controllers: [WebhooksController, WebhookReceiverController],
  providers: [WebhooksService, WebhooksGateway],
  exports: [WebhooksService],
})
export class WebhooksModule {}

