import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { N8nService } from './n8n.service';
import { N8nController } from './n8n.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, WorkflowsModule, AuditModule],
  controllers: [N8nController],
  providers: [N8nService],
  exports: [N8nService],
})
export class N8nModule {}

