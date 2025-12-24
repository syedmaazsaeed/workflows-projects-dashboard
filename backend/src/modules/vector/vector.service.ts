import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { VectorChunk, VectorSourceType, ChunkMeta } from './entities/vector-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { WorkflowMetadata } from '../workflows/entities/workflow-version.entity';

interface SearchResult {
  id: string;
  sourceType: VectorSourceType;
  sourceId: string;
  chunkText: string;
  chunkMeta: ChunkMeta;
  similarity: number;
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    @InjectRepository(VectorChunk)
    private readonly chunkRepository: Repository<VectorChunk>,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
  ) {}

  async indexWorkflowVersion(
    projectId: string,
    versionId: string,
    workflowJson: Record<string, unknown>,
    metadata: WorkflowMetadata,
  ): Promise<void> {
    // Delete existing chunks for this version
    await this.deleteBySource(projectId, 'WORKFLOW_VERSION', versionId);

    // Extract text chunks from workflow
    const chunks = this.extractWorkflowChunks(workflowJson, metadata);

    // Generate embeddings and store
    await this.storeChunks(projectId, VectorSourceType.WORKFLOW_VERSION, versionId, chunks);
  }

  async indexDocument(
    projectId: string,
    documentId: string,
    title: string,
    content: string,
  ): Promise<void> {
    // Delete existing chunks for this document
    await this.deleteBySource(projectId, 'DOCUMENT', documentId);

    // Split content into chunks
    const chunks = this.chunkText(content, title);

    // Generate embeddings and store
    await this.storeChunks(projectId, VectorSourceType.DOCUMENT, documentId, chunks);
  }

  async indexWebhookEvent(
    projectId: string,
    eventId: string,
    body: unknown,
  ): Promise<void> {
    // Convert body to text
    const text = JSON.stringify(body, null, 2);
    const chunks = [{ text, meta: { type: 'webhook_event' } }];

    await this.storeChunks(projectId, VectorSourceType.WEBHOOK_EVENT, eventId, chunks);
  }

  async search(
    projectId: string,
    query: string,
    options: {
      topK?: number;
      sourceTypes?: VectorSourceType[];
    } = {},
  ): Promise<SearchResult[]> {
    const { topK = 6, sourceTypes } = options;

    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build query
    let sql = `
      SELECT 
        id,
        source_type as "sourceType",
        source_id as "sourceId",
        chunk_text as "chunkText",
        chunk_meta as "chunkMeta",
        1 - (embedding <=> $1::vector) as similarity
      FROM vector_chunks
      WHERE project_id = $2
    `;

    const params: unknown[] = [embeddingStr, projectId];

    if (sourceTypes && sourceTypes.length > 0) {
      sql += ` AND source_type = ANY($3)`;
      params.push(sourceTypes);
    }

    sql += `
      ORDER BY embedding <=> $1::vector
      LIMIT $${params.length + 1}
    `;
    params.push(topK);

    try {
      const results = await this.dataSource.query(sql, params);
      return results;
    } catch (error) {
      this.logger.error('Vector search failed', error);
      return [];
    }
  }

  async deleteBySource(
    projectId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    await this.chunkRepository.delete({
      projectId,
      sourceType: sourceType as VectorSourceType,
      sourceId,
    });
  }

  async reindexProject(projectId: string): Promise<{ chunksCreated: number }> {
    // This would be called by an admin to re-index all content
    // In a full implementation, this would:
    // 1. Get all workflows, documents, and optionally webhook events
    // 2. Re-chunk and re-embed everything
    // For now, just return a placeholder
    this.logger.log(`Reindexing project ${projectId}`);
    return { chunksCreated: 0 };
  }

  private extractWorkflowChunks(
    json: Record<string, unknown>,
    metadata: WorkflowMetadata,
  ): Array<{ text: string; meta: ChunkMeta }> {
    const chunks: Array<{ text: string; meta: ChunkMeta }> = [];
    const nodes = (json.nodes as Array<Record<string, unknown>>) || [];

    // Overall workflow summary
    const workflowName = json.name as string || 'Unnamed Workflow';
    const summaryText = `
Workflow: ${workflowName}
Node Count: ${metadata.nodeCount}
Node Types: ${metadata.nodeTypes.join(', ')}
Triggers: ${metadata.triggers.join(', ') || 'None'}
Services Used: ${metadata.servicesUsed.join(', ')}
    `.trim();

    chunks.push({
      text: summaryText,
      meta: { title: workflowName, section: 'summary' },
    });

    // Individual node descriptions
    for (const node of nodes) {
      const nodeName = node.name as string || 'Unnamed Node';
      const nodeType = node.type as string || 'Unknown';
      const parameters = node.parameters as Record<string, unknown> || {};

      // Create readable description
      let nodeText = `Node: ${nodeName}\nType: ${nodeType}`;
      
      // Add key parameters (avoid huge parameter dumps)
      const importantParams = ['method', 'url', 'operation', 'resource', 'query', 'path'];
      for (const param of importantParams) {
        if (parameters[param]) {
          nodeText += `\n${param}: ${JSON.stringify(parameters[param])}`;
        }
      }

      chunks.push({
        text: nodeText,
        meta: { 
          title: workflowName, 
          nodeNames: [nodeName], 
          section: 'node',
          type: nodeType,
        },
      });
    }

    return chunks;
  }

  private chunkText(
    text: string,
    title: string,
    chunkSize: number = 500,
    overlap: number = 50,
  ): Array<{ text: string; meta: ChunkMeta }> {
    const chunks: Array<{ text: string; meta: ChunkMeta }> = [];
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          meta: { title, section: `chunk_${chunkIndex}` },
        });
        
        // Keep overlap from end of current chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ';
        chunkIndex++;
      }
      
      currentChunk += paragraph + '\n\n';
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        meta: { title, section: `chunk_${chunkIndex}` },
      });
    }

    return chunks;
  }

  private async storeChunks(
    projectId: string,
    sourceType: VectorSourceType,
    sourceId: string,
    chunks: Array<{ text: string; meta: ChunkMeta }>,
  ): Promise<void> {
    if (chunks.length === 0) return;

    // Generate embeddings in batch
    const texts = chunks.map(c => c.text);
    const embeddings = await this.embeddingService.generateBatchEmbeddings(texts);

    // Store chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const embeddingStr = `[${embeddings[i].join(',')}]`;
      
      // Use raw query because TypeORM doesn't handle vector type well
      await this.dataSource.query(
        `INSERT INTO vector_chunks (project_id, source_type, source_id, chunk_text, chunk_meta, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [projectId, sourceType, sourceId, chunks[i].text, chunks[i].meta, embeddingStr],
      );
    }

    this.logger.log(`Stored ${chunks.length} chunks for ${sourceType}:${sourceId}`);
  }
}

