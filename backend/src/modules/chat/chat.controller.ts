import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';

import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('projects/:projectKey/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async getSessions(
    @Param('projectKey') projectKey: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.getSessions(projectKey, user.id);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Param('projectKey') projectKey: string,
    @Body() createDto: CreateSessionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.createSession(projectKey, createDto, user.id);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get chat session with messages' })
  @ApiResponse({ status: 200, description: 'Session with messages' })
  async getSession(
    @Param('projectKey') projectKey: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.getSession(projectKey, sessionId, user.id);
  }

  @Post('sessions/:sessionId/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message and get streaming response (SSE)' })
  @ApiResponse({ status: 200, description: 'Streaming response' })
  async sendMessage(
    @Param('projectKey') projectKey: string,
    @Param('sessionId') sessionId: string,
    @Body() sendDto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.chatService.sendMessageStream(
        projectKey,
        sessionId,
        sendDto,
        user.id,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: 'An error occurred' } })}\n\n`);
    }

    res.end();
  }

  @Post('sessions/:sessionId/message/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message and get non-streaming response' })
  @ApiResponse({ status: 200, description: 'Chat response with citations' })
  async sendMessageSync(
    @Param('projectKey') projectKey: string,
    @Param('sessionId') sessionId: string,
    @Body() sendDto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.sendMessage(projectKey, sessionId, sendDto, user.id);
  }
}

