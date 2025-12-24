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

import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('secrets')
@ApiBearerAuth()
@Controller('projects/:projectKey/secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all secrets in project (masked)' })
  @ApiResponse({ status: 200, description: 'List of secrets (values masked)' })
  async findAll(
    @Param('projectKey') projectKey: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.secretsService.findAllByProject(projectKey, user.role);
  }

  @Post()
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Create a new secret' })
  @ApiResponse({ status: 201, description: 'Secret created' })
  async create(
    @Param('projectKey') projectKey: string,
    @Body() createDto: CreateSecretDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.secretsService.create(projectKey, createDto, user.id);
  }

  @Get(':secretId/value')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get decrypted secret value (Admin only)' })
  @ApiResponse({ status: 200, description: 'Decrypted value' })
  async getValue(
    @Param('projectKey') projectKey: string,
    @Param('secretId') secretId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const value = await this.secretsService.getDecryptedValue(projectKey, secretId, user.role);
    return { value };
  }

  @Patch(':secretId')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Update secret' })
  @ApiResponse({ status: 200, description: 'Secret updated' })
  async update(
    @Param('projectKey') projectKey: string,
    @Param('secretId') secretId: string,
    @Body() updateDto: UpdateSecretDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.secretsService.update(projectKey, secretId, updateDto, user.id);
  }

  @Delete(':secretId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete secret (Admin only)' })
  @ApiResponse({ status: 204, description: 'Secret deleted' })
  async delete(
    @Param('projectKey') projectKey: string,
    @Param('secretId') secretId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.secretsService.delete(projectKey, secretId, user.id);
  }
}

