import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { VectorService } from './vector.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('vector')
@ApiBearerAuth()
@Controller('projects/:projectKey')
export class VectorController {
  constructor(
    private readonly vectorService: VectorService,
  ) {}

  @Post('reindex')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reindex all project content for vector search (Admin only)' })
  @ApiResponse({ status: 200, description: 'Reindexing started' })
  async reindex(@Param('projectKey') projectKey: string) {
    // Note: In a full implementation, we'd need to inject ProjectsService
    // and get the project ID. For now, return a placeholder.
    return { message: 'Reindexing started', projectKey };
  }
}

