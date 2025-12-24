import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Configuration
import configuration from './config/configuration';
import { DatabaseConfig } from './config/database.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { ChatModule } from './modules/chat/chat.module';
import { VectorModule } from './modules/vector/vector.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './modules/storage/storage.module';
import { N8nModule } from './modules/n8n/n8n.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          ttl: 60000, // 1 minute
          limit: config.get('RATE_LIMIT_DEFAULT', 100),
        },
      ]),
    }),

    // Feature modules
    AuthModule,
    ProjectsModule,
    WorkflowsModule,
    WebhooksModule,
    DocumentsModule,
    SecretsModule,
    ChatModule,
    VectorModule,
    AuditModule,
    StorageModule,
    N8nModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

