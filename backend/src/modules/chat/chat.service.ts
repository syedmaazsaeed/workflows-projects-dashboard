import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage, ChatMessageRole, Citation } from './entities/chat-message.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ProjectsService } from '../projects/projects.service';
import { VectorService } from '../vector/vector.service';
import { LLMService, ChatContext } from './llm.service';

export interface ChatResponse {
  messageId: string;
  content: string;
  citations: Citation[];
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly projectsService: ProjectsService,
    private readonly vectorService: VectorService,
    private readonly llmService: LLMService,
  ) {}

  async getSessions(projectKey: string, userId: string): Promise<ChatSession[]> {
    const project = await this.projectsService.findByKey(projectKey);
    return this.sessionRepository.find({
      where: { projectId: project.id, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createSession(
    projectKey: string,
    createDto: CreateSessionDto,
    userId: string,
  ): Promise<ChatSession> {
    const project = await this.projectsService.findByKey(projectKey);

    const session = this.sessionRepository.create({
      projectId: project.id,
      userId,
      title: createDto.title || 'New Chat',
    });

    return this.sessionRepository.save(session);
  }

  async getSession(
    projectKey: string,
    sessionId: string,
    userId: string,
  ): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
    const project = await this.projectsService.findByKey(projectKey);
    
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, projectId: project.id, userId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return { session, messages };
  }

  async *sendMessageStream(
    projectKey: string,
    sessionId: string,
    sendDto: SendMessageDto,
    userId: string,
  ): AsyncGenerator<{ type: 'content' | 'done'; data: unknown }> {
    const project = await this.projectsService.findByKey(projectKey);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, projectId: project.id, userId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Save user message
    const userMessage = this.messageRepository.create({
      sessionId,
      role: ChatMessageRole.USER,
      content: sendDto.message,
    });
    await this.messageRepository.save(userMessage);

    // Search for relevant context
    const searchResults = await this.vectorService.search(project.id, sendDto.message, {
      topK: 6,
    });

    // Build context from search results
    const contextParts = searchResults.map((result, index) => {
      const sourceLabel = this.getSourceLabel(result.sourceType);
      return `[${index + 1}] ${sourceLabel}: ${result.chunkMeta.title || 'Unknown'}\n${result.chunkText}`;
    });

    const contextText = contextParts.join('\n\n---\n\n');

    // Build citations
    const citations: Citation[] = searchResults.map(result => ({
      sourceType: result.sourceType,
      sourceId: result.sourceId,
      chunkTextPreview: result.chunkText.substring(0, 100) + '...',
      title: result.chunkMeta.title,
    }));

    // Get conversation history
    const history = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: 10, // Last 10 messages
    });

    const chatHistory: ChatContext[] = history.map(msg => ({
      role: msg.role === ChatMessageRole.USER ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(contextText, citations.length > 0);

    // Stream response
    let fullContent = '';

    for await (const chunk of this.llmService.streamChat(chatHistory, systemPrompt)) {
      fullContent += chunk.content;
      yield { type: 'content', data: { content: chunk.content } };
      
      if (chunk.done) {
        break;
      }
    }

    // Save assistant message
    const assistantMessage = this.messageRepository.create({
      sessionId,
      role: ChatMessageRole.ASSISTANT,
      content: fullContent,
      citations: citations.length > 0 ? citations : null,
    });
    await this.messageRepository.save(assistantMessage);

    // Update session title if first message
    if (history.length <= 1) {
      session.title = sendDto.message.substring(0, 50) + (sendDto.message.length > 50 ? '...' : '');
      await this.sessionRepository.save(session);
    }

    yield {
      type: 'done',
      data: {
        messageId: assistantMessage.id,
        citations,
      },
    };
  }

  async sendMessage(
    projectKey: string,
    sessionId: string,
    sendDto: SendMessageDto,
    userId: string,
  ): Promise<ChatResponse> {
    let result: ChatResponse = { messageId: '', content: '', citations: [] };

    for await (const chunk of this.sendMessageStream(projectKey, sessionId, sendDto, userId)) {
      if (chunk.type === 'content') {
        result.content += (chunk.data as { content: string }).content;
      } else if (chunk.type === 'done') {
        const doneData = chunk.data as { messageId: string; citations: Citation[] };
        result.messageId = doneData.messageId;
        result.citations = doneData.citations;
      }
    }

    return result;
  }

  private getSourceLabel(sourceType: string): string {
    switch (sourceType) {
      case 'WORKFLOW_VERSION':
        return 'Workflow';
      case 'DOCUMENT':
        return 'Document';
      case 'WEBHOOK_EVENT':
        return 'Webhook Event';
      default:
        return 'Source';
    }
  }

  private buildSystemPrompt(context: string, hasContext: boolean): string {
    return `You are an AI assistant for the Automation Hub platform. You help users understand their n8n workflows, project documentation, and webhook configurations.

${hasContext ? `Here is relevant context from the user's project:

${context}

---

` : ''}
Guidelines:
1. Answer questions based on the provided context when available.
2. If the context contains relevant information, cite the sources using [1], [2], etc.
3. Be concise but thorough in your explanations.
4. If you're not sure about something, say so.
5. For workflow-related questions, explain the flow and purpose of nodes.
6. For webhook questions, explain the routing and configuration.
7. Format your responses in clear, readable markdown.

Respond to the user's question:`;
  }
}

