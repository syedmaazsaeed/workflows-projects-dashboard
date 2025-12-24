import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JSONPath } from 'jsonpath-plus';

import { Webhook, WebhookRoutingType, TransformRules } from './entities/webhook.entity';
import { WebhookEvent, WebhookEventStatus, RouteResult } from './entities/webhook-event.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksGateway } from './webhooks.gateway';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookEvent)
    private readonly eventRepository: Repository<WebhookEvent>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly webhooksGateway: WebhooksGateway,
  ) {}

  async findAllByProject(projectKey: string): Promise<Webhook[]> {
    const project = await this.projectsService.findByKey(projectKey);
    return this.webhookRepository.find({
      where: { projectId: project.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findByKey(projectKey: string, hookKey: string): Promise<Webhook> {
    const project = await this.projectsService.findByKey(projectKey);
    const webhook = await this.webhookRepository.findOne({
      where: { projectId: project.id, hookKey },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook '${hookKey}' not found`);
    }

    return webhook;
  }

  async create(projectKey: string, createDto: CreateWebhookDto, userId: string): Promise<{ webhook: Webhook; secret: string }> {
    const project = await this.projectsService.findByKey(projectKey);

    // Check if hook key already exists
    const existing = await this.webhookRepository.findOne({
      where: { projectId: project.id, hookKey: createDto.hookKey },
    });

    if (existing) {
      throw new ConflictException(`Webhook key '${createDto.hookKey}' already exists in this project`);
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');
    const secretHash = await bcrypt.hash(secret, 12);

    const webhook = this.webhookRepository.create({
      ...createDto,
      projectId: project.id,
      secretHash,
    });

    const saved = await this.webhookRepository.save(webhook);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WEBHOOK_CREATE',
      entityType: 'webhook',
      entityId: saved.id,
      details: { projectKey, hookKey: saved.hookKey },
    });

    // Return webhook with the plain secret (only shown once)
    return { webhook: saved, secret };
  }

  async update(
    projectKey: string,
    hookKey: string,
    updateDto: UpdateWebhookDto,
    userId: string,
  ): Promise<Webhook> {
    const webhook = await this.findByKey(projectKey, hookKey);

    Object.assign(webhook, updateDto);
    const saved = await this.webhookRepository.save(webhook);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WEBHOOK_UPDATE',
      entityType: 'webhook',
      entityId: saved.id,
      details: { projectKey, hookKey, changes: updateDto },
    });

    return saved;
  }

  async rotateSecret(
    projectKey: string,
    hookKey: string,
    userId: string,
  ): Promise<{ secret: string }> {
    const webhook = await this.findByKey(projectKey, hookKey);

    const secret = crypto.randomBytes(32).toString('hex');
    const secretHash = await bcrypt.hash(secret, 12);

    webhook.secretHash = secretHash;
    await this.webhookRepository.save(webhook);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WEBHOOK_ROTATE_SECRET',
      entityType: 'webhook',
      entityId: webhook.id,
      details: { projectKey, hookKey },
    });

    return { secret };
  }

  async getEvents(
    projectKey: string,
    hookKey: string,
    options: { status?: WebhookEventStatus; limit?: number; offset?: number } = {},
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    const webhook = await this.findByKey(projectKey, hookKey);

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.webhookId = :webhookId', { webhookId: webhook.id });

    if (options.status) {
      queryBuilder.andWhere('event.status = :status', { status: options.status });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('event.receivedAt', 'DESC')
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    const events = await queryBuilder.getMany();

    return { events, total };
  }

  async getEvent(
    projectKey: string,
    hookKey: string,
    eventId: string,
  ): Promise<WebhookEvent> {
    const webhook = await this.findByKey(projectKey, hookKey);
    const event = await this.eventRepository.findOne({
      where: { id: eventId, webhookId: webhook.id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async replayEvent(
    projectKey: string,
    hookKey: string,
    eventId: string,
    userId: string,
  ): Promise<WebhookEvent> {
    const originalEvent = await this.getEvent(projectKey, hookKey, eventId);
    const webhook = await this.findByKey(projectKey, hookKey);

    // Create new event as replay
    const replayEvent = this.eventRepository.create({
      webhookId: webhook.id,
      requestHeaders: originalEvent.requestHeaders,
      requestBody: originalEvent.requestBody,
      requestIp: 'replay',
      status: WebhookEventStatus.RECEIVED,
      replayOfEventId: originalEvent.id,
    });

    const saved = await this.eventRepository.save(replayEvent);

    // Process the replay
    await this.routeEvent(webhook, saved);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WEBHOOK_EVENT_REPLAY',
      entityType: 'webhook_event',
      entityId: saved.id,
      details: { projectKey, hookKey, originalEventId: eventId },
    });

    return this.eventRepository.findOne({ where: { id: saved.id } }) as Promise<WebhookEvent>;
  }

  // Public webhook receiver
  async receiveWebhook(
    projectKey: string,
    hookKey: string,
    headers: Record<string, string>,
    body: unknown,
    ip: string,
    secret: string,
  ): Promise<{ success: boolean; eventId: string }> {
    // Find project and webhook
    let project;
    try {
      project = await this.projectsService.findByKey(projectKey);
    } catch {
      throw new NotFoundException('Webhook not found');
    }

    const webhook = await this.webhookRepository.findOne({
      where: { projectId: project.id, hookKey },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (!webhook.isEnabled) {
      throw new ForbiddenException('Webhook is disabled');
    }

    // Verify secret
    const isValidSecret = await bcrypt.compare(secret, webhook.secretHash);
    if (!isValidSecret) {
      throw new ForbiddenException('Invalid webhook secret');
    }

    // Create event record
    const event = this.eventRepository.create({
      webhookId: webhook.id,
      requestHeaders: headers,
      requestBody: body,
      requestIp: ip,
      status: WebhookEventStatus.RECEIVED,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Emit real-time update
    this.webhooksGateway.emitWebhookEvent(project.projectKey, hookKey, {
      eventId: savedEvent.id,
      status: savedEvent.status,
      receivedAt: savedEvent.receivedAt,
    });

    // Route the event asynchronously
    this.routeEvent(webhook, savedEvent).catch(console.error);

    return { success: true, eventId: savedEvent.id };
  }

  private async routeEvent(webhook: Webhook, event: WebhookEvent): Promise<void> {
    event.status = WebhookEventStatus.ROUTED;
    await this.eventRepository.save(event);

    let result: RouteResult;

    try {
      // Apply transform rules if any
      let transformedBody = event.requestBody;
      let transformedHeaders = { ...event.requestHeaders };

      if (webhook.transformRules) {
        const transformed = this.applyTransformRules(
          webhook.transformRules,
          event.requestBody,
          event.requestHeaders,
        );
        transformedBody = transformed.body;
        transformedHeaders = transformed.headers;
      }

      const startTime = Date.now();

      switch (webhook.routingType) {
        case WebhookRoutingType.FORWARD_URL:
          if (!webhook.targetUrl) {
            throw new Error('Target URL not configured');
          }
          result = await this.forwardToUrl(webhook.targetUrl, transformedBody, transformedHeaders);
          break;

        case WebhookRoutingType.TRIGGER_N8N_WORKFLOW:
          if (!webhook.n8nWebhookUrl) {
            throw new Error('n8n webhook URL not configured');
          }
          result = await this.forwardToUrl(webhook.n8nWebhookUrl, transformedBody, transformedHeaders);
          break;

        case WebhookRoutingType.TRIGGER_INTERNAL_WORKFLOW:
          // Placeholder for internal workflow execution
          result = {
            success: true,
            statusCode: 200,
            responseBody: { message: 'Internal workflow triggered' },
            duration: Date.now() - startTime,
          };
          break;

        default:
          throw new Error(`Unknown routing type: ${webhook.routingType}`);
      }

      result.duration = Date.now() - startTime;
      event.status = result.success ? WebhookEventStatus.SUCCESS : WebhookEventStatus.FAILED;
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      event.status = WebhookEventStatus.FAILED;
    }

    event.routeResult = result;
    await this.eventRepository.save(event);

    // Emit status update
    const project = await this.projectsService.findById(webhook.projectId);
    this.webhooksGateway.emitWebhookEvent(project.projectKey, webhook.hookKey, {
      eventId: event.id,
      status: event.status,
      routeResult: result,
    });
  }

  private async forwardToUrl(
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<RouteResult> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });

      let responseBody;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      return {
        success: response.ok,
        statusCode: response.status,
        responseBody,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  private applyTransformRules(
    rules: TransformRules,
    body: unknown,
    headers: Record<string, string>,
  ): { body: unknown; headers: Record<string, string> } {
    let transformedBody = body;
    let transformedHeaders = { ...headers };

    // Apply header rewrites
    if (rules.headerRewrites) {
      for (const [key, value] of Object.entries(rules.headerRewrites)) {
        transformedHeaders[key] = value;
      }
    }

    // Add additional headers
    if (rules.additionalHeaders) {
      transformedHeaders = { ...transformedHeaders, ...rules.additionalHeaders };
    }

    // Apply body mappings using JSONPath
    if (rules.bodyMappings && rules.bodyMappings.length > 0) {
      const newBody: Record<string, unknown> = {};
      for (const mapping of rules.bodyMappings) {
        try {
          const values = JSONPath({ path: mapping.source, json: body as object });
          newBody[mapping.target] = values.length === 1 ? values[0] : values;
        } catch {
          // Skip invalid JSONPath expressions
        }
      }
      transformedBody = newBody;
    }

    return { body: transformedBody, headers: transformedHeaders };
  }
}

