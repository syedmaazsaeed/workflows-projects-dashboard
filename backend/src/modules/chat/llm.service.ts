import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type LLMProvider = 'openai' | 'anthropic';

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ChatContext {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly provider: LLMProvider;
  private readonly model: string;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<LLMProvider>('ai.llmProvider') || 'openai';
    this.model = this.configService.get<string>('ai.llmModel') || 'gpt-4o-mini';

    // Initialize providers
    const openaiKey = this.configService.get<string>('ai.openaiApiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const anthropicKey = this.configService.get<string>('ai.anthropicApiKey');
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    this.logger.log(`LLM service initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  async *streamChat(
    messages: ChatContext[],
    systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    switch (this.provider) {
      case 'openai':
        yield* this.streamOpenAI(messages, systemPrompt);
        break;
      case 'anthropic':
        yield* this.streamAnthropic(messages, systemPrompt);
        break;
      default:
        yield* this.streamOpenAI(messages, systemPrompt);
    }
  }

  async chat(messages: ChatContext[], systemPrompt: string): Promise<string> {
    let fullContent = '';
    for await (const chunk of this.streamChat(messages, systemPrompt)) {
      fullContent += chunk.content;
    }
    return fullContent;
  }

  private async *streamOpenAI(
    messages: ChatContext[],
    systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    if (!this.openai) {
      yield { content: 'OpenAI not configured. Please set OPENAI_API_KEY.', done: true };
      return;
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        const done = chunk.choices[0]?.finish_reason === 'stop';
        yield { content, done };
      }
    } catch (error) {
      this.logger.error('OpenAI streaming failed', error);
      yield { content: 'Error generating response.', done: true };
    }
  }

  private async *streamAnthropic(
    messages: ChatContext[],
    systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    if (!this.anthropic) {
      yield { content: 'Anthropic not configured. Please set ANTHROPIC_API_KEY.', done: true };
      return;
    }

    try {
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Cast to any to access messages API (type definitions may not expose it correctly)
      const client = this.anthropic as unknown as { messages: { create: (params: unknown) => Promise<AsyncIterable<unknown>> } };
      const response = await client.messages.create({
        model: this.model.startsWith('claude') ? this.model : 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      });

      for await (const event of response as AsyncIterable<{ type: string; delta?: { type: string; text?: string } }>) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta?.text) {
          yield { content: event.delta.text, done: false };
        } else if (event.type === 'message_stop') {
          yield { content: '', done: true };
        }
      }
    } catch (error) {
      this.logger.error('Anthropic streaming failed', error);
      yield { content: 'Error generating response.', done: true };
    }
  }
}

