import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { WebhookEventStatus } from './entities/webhook-event.entity';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('projects/:projectKey/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all webhooks in project' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async findAll(@Param('projectKey') projectKey: string) {
    return this.webhooksService.findAllByProject(projectKey);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created (secret returned once)' })
  async create(
    @Param('projectKey') projectKey: string,
    @Body() createDto: CreateWebhookDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.webhooksService.create(projectKey, createDto, user.id);
  }

  @Get(':hookKey')
  @ApiOperation({ summary: 'Get webhook by key' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  async findOne(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
  ) {
    return this.webhooksService.findByKey(projectKey, hookKey);
  }

  @Patch(':hookKey')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @Body() updateDto: UpdateWebhookDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.webhooksService.update(projectKey, hookKey, updateDto, user.id);
  }

  @Post(':hookKey/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({ status: 200, description: 'New secret returned' })
  async rotateSecret(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.webhooksService.rotateSecret(projectKey, hookKey, user.id);
  }

  @Get(':hookKey/events')
  @ApiOperation({ summary: 'Get webhook events' })
  @ApiQuery({ name: 'status', required: false, enum: WebhookEventStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of events' })
  async getEvents(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @Query('status') status?: WebhookEventStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.webhooksService.getEvents(projectKey, hookKey, {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':hookKey/events/:eventId')
  @ApiOperation({ summary: 'Get event details' })
  @ApiResponse({ status: 200, description: 'Event details' })
  async getEvent(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @Param('eventId') eventId: string,
  ) {
    return this.webhooksService.getEvent(projectKey, hookKey, eventId);
  }

  @Post(':hookKey/events/:eventId/replay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replay webhook event' })
  @ApiResponse({ status: 200, description: 'Event replayed' })
  async replayEvent(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.webhooksService.replayEvent(projectKey, hookKey, eventId, user.id);
  }
}

