import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('projects/:projectKey/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs for project' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async findByProject(
    @Param('projectKey') projectKey: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Note: In a full implementation, we'd need to look up the project ID
    // and filter logs accordingly. For now, we return recent logs.
    return this.auditService.findRecent(limit || 50);
  }
}

