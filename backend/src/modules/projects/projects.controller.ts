import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects accessible to current user' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.findAll(user.id, user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({ status: 409, description: 'Project key already exists' })
  async create(
    @Body() createDto: CreateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.create(createDto, user.id);
  }

  @Get(':projectKey')
  @ApiOperation({ summary: 'Get project by key' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('projectKey') projectKey: string) {
    return this.projectsService.findByKey(projectKey);
  }

  @Patch(':projectKey')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  async update(
    @Param('projectKey') projectKey: string,
    @Body() updateDto: UpdateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.update(projectKey, updateDto, user.id);
  }

  @Delete(':projectKey')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (Admin only)' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  async delete(
    @Param('projectKey') projectKey: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.projectsService.delete(projectKey, user.id, user.role);
  }

  @Get(':projectKey/members')
  @ApiOperation({ summary: 'Get project members' })
  @ApiResponse({ status: 200, description: 'List of project members' })
  async getMembers(@Param('projectKey') projectKey: string) {
    return this.projectsService.getMembers(projectKey);
  }

  @Post(':projectKey/members')
  @ApiOperation({ summary: 'Add member to project' })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Param('projectKey') projectKey: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.addMember(projectKey, addMemberDto, user.id);
  }

  @Delete(':projectKey/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('projectKey') projectKey: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.projectsService.removeMember(projectKey, userId, user.id);
  }
}

