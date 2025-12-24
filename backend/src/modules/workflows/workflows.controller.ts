import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';

import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('projects/:projectKey/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflows in project' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async findAll(@Param('projectKey') projectKey: string) {
    return this.workflowsService.findAllByProject(projectKey);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async create(
    @Param('projectKey') projectKey: string,
    @Body() createDto: CreateWorkflowDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workflowsService.create(projectKey, createDto, user.id);
  }

  @Get(':workflowKey')
  @ApiOperation({ summary: 'Get workflow by key' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async findOne(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
  ) {
    return this.workflowsService.findByKey(projectKey, workflowKey);
  }

  @Patch(':workflowKey')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  async update(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @Body() updateDto: UpdateWorkflowDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workflowsService.update(projectKey, workflowKey, updateDto, user.id);
  }

  @Post(':workflowKey/upload-json')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload workflow JSON file' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async uploadJson(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const jsonContent = file.buffer.toString('utf-8');
    return this.workflowsService.uploadJson(projectKey, workflowKey, jsonContent, user.id);
  }

  @Get(':workflowKey/versions')
  @ApiOperation({ summary: 'Get all versions of workflow' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async getVersions(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
  ) {
    return this.workflowsService.getVersions(projectKey, workflowKey);
  }

  @Get(':workflowKey/versions/:version/download')
  @ApiOperation({ summary: 'Download workflow version JSON' })
  @ApiResponse({ status: 200, description: 'JSON file' })
  async downloadVersion(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @Param('version', ParseIntPipe) version: number,
    @Res() res: Response,
  ) {
    const json = await this.workflowsService.downloadVersion(projectKey, workflowKey, version);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${workflowKey}-v${version}.json"`,
    );
    res.send(json);
  }

  @Get(':workflowKey/compare')
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiResponse({ status: 200, description: 'Version diff' })
  async compareVersions(
    @Param('projectKey') projectKey: string,
    @Param('workflowKey') workflowKey: string,
    @Query('from', ParseIntPipe) from: number,
    @Query('to', ParseIntPipe) to: number,
  ) {
    return this.workflowsService.compareVersions(projectKey, workflowKey, from, to);
  }
}

