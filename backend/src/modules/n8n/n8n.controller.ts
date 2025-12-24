import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { N8nService } from './n8n.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('n8n')
@ApiBearerAuth()
@Controller('projects/:projectKey/workflows/:workflowKey/n8n')
export class N8nController {
  constructor(private readonly n8nService: N8nService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check n8n integration status' })
  @ApiResponse({ status: 200, description: 'Integration status' })
  async getStatus() {
    return { configured: this.n8nService.isConfigured() };
  }

  @Post('pull')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Pull workflow from n8n' })
  @ApiResponse({ status: 200, description: 'Pull result' })
  async pull(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @Body() body: { n8nWorkflowId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.n8nService.pullWorkflow(
      projectKey,
      workflowKey,
      body.n8nWorkflowId,
      user.id,
    );
  }

  @Post('push')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Push workflow to n8n' })
  @ApiResponse({ status: 200, description: 'Push result' })
  async push(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.n8nService.pushWorkflow(projectKey, workflowKey, user.id);
  }
}

