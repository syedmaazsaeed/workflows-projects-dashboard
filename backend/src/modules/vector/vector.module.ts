import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { VectorChunk } from './entities/vector-chunk.entity';
import { VectorService } from './vector.service';
import { VectorController } from './vector.controller';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VectorChunk]),
    ConfigModule,
  ],
  controllers: [VectorController],
  providers: [VectorService, EmbeddingService],
  exports: [VectorService],
})
export class VectorModule {}

