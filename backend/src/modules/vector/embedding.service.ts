import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type EmbeddingProvider = 'openai' | 'anthropic' | 'local';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: EmbeddingProvider;
  private readonly model: string;
  private readonly dimensions: number;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<EmbeddingProvider>('ai.embeddingProvider') || 'openai';
    this.model = this.configService.get<string>('ai.embeddingModel') || 'text-embedding-3-small';
    this.dimensions = this.configService.get<number>('ai.embeddingDimensions') || 1536;

    // Initialize providers
    const openaiKey = this.configService.get<string>('ai.openaiApiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const anthropicKey = this.configService.get<string>('ai.anthropicApiKey');
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    this.logger.log(`Embedding service initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    switch (this.provider) {
      case 'openai':
        return this.generateOpenAIEmbedding(text);
      case 'anthropic':
        // Anthropic doesn't have embeddings API, fall back to OpenAI or local
        this.logger.warn('Anthropic does not support embeddings, falling back to OpenAI');
        return this.generateOpenAIEmbedding(text);
      case 'local':
        return this.generateLocalEmbedding(text);
      default:
        return this.generateOpenAIEmbedding(text);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // For OpenAI, batch embeddings are more efficient
    if (this.provider === 'openai' && this.openai) {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      return response.data.map(d => d.embedding);
    }

    // For other providers, generate one by one
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured, using placeholder embedding');
      return this.generatePlaceholderEmbedding();
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('OpenAI embedding failed', error);
      return this.generatePlaceholderEmbedding();
    }
  }

  private generateLocalEmbedding(text: string): Promise<number[]> {
    // Placeholder for local embedding model
    // In production, you might use transformers.js or a local model
    this.logger.warn('Local embeddings not implemented, using placeholder');
    return Promise.resolve(this.generatePlaceholderEmbedding());
  }

  private generatePlaceholderEmbedding(): number[] {
    // Generate a random embedding for development/testing
    return Array.from({ length: this.dimensions }, () => Math.random() * 2 - 1);
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

