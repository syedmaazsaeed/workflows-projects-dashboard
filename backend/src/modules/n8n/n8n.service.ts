import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkflowsService } from '../workflows/workflows.service';
import { AuditService } from '../audit/audit.service';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: unknown[];
  connections: unknown;
  settings?: unknown;
  staticData?: unknown;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly baseUrl: string | null;
  private readonly apiKey: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly workflowsService: WorkflowsService,
    private readonly auditService: AuditService,
  ) {
    this.baseUrl = this.configService.get<string>('n8n.baseUrl') || null;
    this.apiKey = this.configService.get<string>('n8n.apiKey') || null;

    if (this.baseUrl && this.apiKey) {
      this.logger.log(`n8n integration configured: ${this.baseUrl}`);
    } else {
      this.logger.warn('n8n integration not configured');
    }
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  async pullWorkflow(
    projectKey: string,
    workflowKey: string,
    n8nWorkflowId: string,
    userId: string,
  ): Promise<{ success: boolean; version?: number; error?: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('n8n integration not configured');
    }

    try {
      // Fetch workflow from n8n
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${n8nWorkflowId}`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
      }

      const workflow: N8nWorkflow = await response.json();

      // Upload as new version
      const jsonContent = JSON.stringify(workflow, null, 2);
      const version = await this.workflowsService.uploadJson(
        projectKey,
        workflowKey,
        jsonContent,
        userId,
      );

      // Update workflow metadata
      await this.workflowsService.update(
        projectKey,
        workflowKey,
        {
          name: workflow.name,
          n8nWorkflowId,
        },
        userId,
      );

      await this.auditService.log({
        actorUserId: userId,
        action: 'N8N_PULL',
        entityType: 'workflow',
        entityId: version.workflowId,
        details: { projectKey, workflowKey, n8nWorkflowId },
      });

      return { success: true, version: version.version };
    } catch (error) {
      this.logger.error('Failed to pull workflow from n8n', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async pushWorkflow(
    projectKey: string,
    workflowKey: string,
    userId: string,
  ): Promise<{ success: boolean; n8nWorkflowId?: string; error?: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('n8n integration not configured');
    }

    try {
      // Get workflow and latest version
      const workflow = await this.workflowsService.findByKey(projectKey, workflowKey);
      const latestVersion = await this.workflowsService.getLatestVersion(workflow.id);

      if (!latestVersion) {
        throw new Error('No versions found for this workflow');
      }

      // Download the JSON
      const jsonContent = await this.workflowsService.downloadVersion(
        projectKey,
        workflowKey,
        latestVersion.version,
      );
      const workflowData = JSON.parse(jsonContent);

      let n8nWorkflowId = workflow.n8nWorkflowId;
      let response: Response;

      if (n8nWorkflowId) {
        // Update existing workflow
        response = await fetch(`${this.baseUrl}/api/v1/workflows/${n8nWorkflowId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.apiKey!,
          },
          body: JSON.stringify({
            name: workflowData.name || workflow.name,
            nodes: workflowData.nodes,
            connections: workflowData.connections,
            settings: workflowData.settings,
          }),
        });
      } else {
        // Create new workflow
        response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.apiKey!,
          },
          body: JSON.stringify({
            name: workflowData.name || workflow.name,
            nodes: workflowData.nodes,
            connections: workflowData.connections,
            settings: workflowData.settings,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
      }

      const result: N8nWorkflow = await response.json();

      // Update workflow with n8n ID
      if (!n8nWorkflowId) {
        await this.workflowsService.update(
          projectKey,
          workflowKey,
          { n8nWorkflowId: result.id },
          userId,
        );
        n8nWorkflowId = result.id;
      }

      await this.auditService.log({
        actorUserId: userId,
        action: 'N8N_PUSH',
        entityType: 'workflow',
        entityId: workflow.id,
        details: { projectKey, workflowKey, n8nWorkflowId },
      });

      return { success: true, n8nWorkflowId };
    } catch (error) {
      this.logger.error('Failed to push workflow to n8n', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async listN8nWorkflows(): Promise<N8nWorkflow[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException('n8n integration not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': this.apiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }
}

