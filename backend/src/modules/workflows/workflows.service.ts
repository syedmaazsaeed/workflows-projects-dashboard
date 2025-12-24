import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Workflow, WorkflowStatus, WorkflowSource } from './entities/workflow.entity';
import { WorkflowVersion, WorkflowMetadata } from './entities/workflow-version.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ProjectsService } from '../projects/projects.service';
import { StorageService } from '../storage/storage.service';
import { VectorService } from '../vector/vector.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowVersion)
    private readonly versionRepository: Repository<WorkflowVersion>,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
    private readonly vectorService: VectorService,
    private readonly auditService: AuditService,
  ) {}

  async findAllByProject(projectKey: string): Promise<Workflow[]> {
    const project = await this.projectsService.findByKey(projectKey);
    return this.workflowRepository.find({
      where: { projectId: project.id },
      order: { updatedAt: 'DESC' },
    });
  }

  async findByKey(projectKey: string, workflowKey: string): Promise<Workflow> {
    const project = await this.projectsService.findByKey(projectKey);
    const workflow = await this.workflowRepository.findOne({
      where: { projectId: project.id, workflowKey },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowKey}' not found`);
    }

    return workflow;
  }

  async create(projectKey: string, createDto: CreateWorkflowDto, userId: string): Promise<Workflow> {
    const project = await this.projectsService.findByKey(projectKey);

    // Check if workflow key already exists
    const existing = await this.workflowRepository.findOne({
      where: { projectId: project.id, workflowKey: createDto.workflowKey },
    });

    if (existing) {
      throw new ConflictException(`Workflow key '${createDto.workflowKey}' already exists in this project`);
    }

    const workflow = this.workflowRepository.create({
      ...createDto,
      projectId: project.id,
    });

    const saved = await this.workflowRepository.save(workflow);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WORKFLOW_CREATE',
      entityType: 'workflow',
      entityId: saved.id,
      details: { projectKey, workflowKey: saved.workflowKey },
    });

    return saved;
  }

  async update(
    projectKey: string,
    workflowKey: string,
    updateDto: UpdateWorkflowDto,
    userId: string,
  ): Promise<Workflow> {
    const workflow = await this.findByKey(projectKey, workflowKey);

    Object.assign(workflow, updateDto);
    const saved = await this.workflowRepository.save(workflow);

    await this.auditService.log({
      actorUserId: userId,
      action: 'WORKFLOW_UPDATE',
      entityType: 'workflow',
      entityId: saved.id,
      details: { projectKey, workflowKey, changes: updateDto },
    });

    return saved;
  }

  async uploadJson(
    projectKey: string,
    workflowKey: string,
    jsonContent: string,
    userId: string,
  ): Promise<WorkflowVersion> {
    const workflow = await this.findByKey(projectKey, workflowKey);

    // Parse and validate JSON
    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(jsonContent);
    } catch {
      throw new BadRequestException('Invalid JSON content');
    }

    // Compute hash
    const jsonHash = crypto.createHash('sha256').update(jsonContent).digest('hex');

    // Check for duplicate version
    const existingVersion = await this.versionRepository.findOne({
      where: { workflowId: workflow.id, jsonHash },
    });

    if (existingVersion) {
      throw new ConflictException('This exact version already exists');
    }

    // Get next version number
    const latestVersion = await this.versionRepository.findOne({
      where: { workflowId: workflow.id },
      order: { version: 'DESC' },
    });
    const nextVersion = (latestVersion?.version || 0) + 1;

    // Store JSON
    const storagePath = `workflows/${workflow.projectId}/${workflow.id}/v${nextVersion}.json`;
    await this.storageService.store(storagePath, jsonContent);

    // Extract metadata
    const metadata = this.extractMetadata(parsedJson);

    // Create version
    const version = this.versionRepository.create({
      workflowId: workflow.id,
      version: nextVersion,
      jsonStorageUrl: storagePath,
      jsonHash,
      metadata,
      createdById: userId,
    });

    const savedVersion = await this.versionRepository.save(version);

    // Update workflow name from JSON if available
    if (parsedJson.name && typeof parsedJson.name === 'string') {
      workflow.name = parsedJson.name;
      await this.workflowRepository.save(workflow);
    }

    // Index for vector search
    await this.vectorService.indexWorkflowVersion(
      workflow.projectId,
      savedVersion.id,
      parsedJson,
      metadata,
    );

    await this.auditService.log({
      actorUserId: userId,
      action: 'WORKFLOW_UPLOAD',
      entityType: 'workflow_version',
      entityId: savedVersion.id,
      details: { projectKey, workflowKey, version: nextVersion },
    });

    return savedVersion;
  }

  async getVersions(projectKey: string, workflowKey: string): Promise<WorkflowVersion[]> {
    const workflow = await this.findByKey(projectKey, workflowKey);
    return this.versionRepository.find({
      where: { workflowId: workflow.id },
      order: { version: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async getVersion(
    projectKey: string,
    workflowKey: string,
    version: number,
  ): Promise<WorkflowVersion> {
    const workflow = await this.findByKey(projectKey, workflowKey);
    const workflowVersion = await this.versionRepository.findOne({
      where: { workflowId: workflow.id, version },
      relations: ['createdBy'],
    });

    if (!workflowVersion) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    return workflowVersion;
  }

  async downloadVersion(
    projectKey: string,
    workflowKey: string,
    version: number,
  ): Promise<string> {
    const workflowVersion = await this.getVersion(projectKey, workflowKey, version);
    return this.storageService.retrieve(workflowVersion.jsonStorageUrl);
  }

  async compareVersions(
    projectKey: string,
    workflowKey: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<{ from: unknown; to: unknown }> {
    const fromJson = await this.downloadVersion(projectKey, workflowKey, fromVersion);
    const toJson = await this.downloadVersion(projectKey, workflowKey, toVersion);

    return {
      from: JSON.parse(fromJson),
      to: JSON.parse(toJson),
    };
  }

  async getLatestVersion(workflowId: string): Promise<WorkflowVersion | null> {
    return this.versionRepository.findOne({
      where: { workflowId },
      order: { version: 'DESC' },
    });
  }

  private extractMetadata(json: Record<string, unknown>): WorkflowMetadata {
    const nodes = (json.nodes as Array<Record<string, unknown>>) || [];
    const connections = json.connections as Record<string, unknown> || {};

    const nodeTypes = nodes.map(n => n.type as string).filter(Boolean);
    const nodeNames = nodes.map(n => n.name as string).filter(Boolean);
    
    // Extract triggers (nodes that start with "trigger" or specific types)
    const triggerTypes = ['n8n-nodes-base.webhook', 'n8n-nodes-base.cron', 'n8n-nodes-base.manualTrigger'];
    const triggers = nodes
      .filter(n => triggerTypes.some(t => (n.type as string)?.includes(t)))
      .map(n => n.name as string);

    // Extract webhook paths
    const webhooks = nodes
      .filter(n => (n.type as string)?.includes('webhook'))
      .map(n => {
        const params = n.parameters as Record<string, unknown>;
        return params?.path as string || '';
      })
      .filter(Boolean);

    // Extract services used (from node types)
    const servicesUsed = [...new Set(
      nodeTypes
        .map(t => {
          const match = t.match(/n8n-nodes-base\.(\w+)/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null)
    )];

    // Count connections
    const connectionCount = Object.values(connections).reduce<number>((acc, conn) => {
      if (Array.isArray(conn)) {
        return acc + conn.length;
      }
      return acc;
    }, 0);

    return {
      nodeCount: nodes.length,
      nodeTypes: [...new Set(nodeTypes)],
      triggers,
      webhooks,
      servicesUsed,
      connections: connectionCount,
    };
  }
}

