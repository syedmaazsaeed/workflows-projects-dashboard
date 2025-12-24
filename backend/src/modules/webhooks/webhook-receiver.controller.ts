import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { WebhooksService } from './webhooks.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookReceiverController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':projectKey/:hookKey')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiHeader({ name: 'x-webhook-secret', required: true, description: 'Webhook secret' })
  @ApiOperation({ summary: 'Receive webhook event' })
  @ApiResponse({ status: 200, description: 'Event received' })
  @ApiResponse({ status: 403, description: 'Invalid secret' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async receive(
    @Param('projectKey') projectKey: string,
    @Param('hookKey') hookKey: string,
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
    @Ip() ip: string,
  ) {
    const secret = headers['x-webhook-secret'];
    
    if (!secret) {
      return { success: false, error: 'Missing x-webhook-secret header' };
    }

    // Clean up headers (remove sensitive ones)
    const cleanHeaders = { ...headers };
    delete cleanHeaders['x-webhook-secret'];
    delete cleanHeaders['authorization'];

    return this.webhooksService.receiveWebhook(
      projectKey,
      hookKey,
      cleanHeaders,
      body,
      ip,
      secret,
    );
  }
}

