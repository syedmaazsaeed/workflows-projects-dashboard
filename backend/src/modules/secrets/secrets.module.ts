import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Secret } from './entities/secret.entity';
import { SecretsService } from './secrets.service';
import { SecretsController } from './secrets.controller';
import { ProjectsModule } from '../projects/projects.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Secret]),
    ProjectsModule,
    AuditModule,
  ],
  controllers: [SecretsController],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}

