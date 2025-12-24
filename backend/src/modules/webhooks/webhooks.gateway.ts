import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/webhooks',
})
export class WebhooksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebhooksGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { projectKey: string; hookKey?: string }) {
    const room = payload.hookKey 
      ? `${payload.projectKey}:${payload.hookKey}`
      : payload.projectKey;
    
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    
    return { subscribed: room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { projectKey: string; hookKey?: string }) {
    const room = payload.hookKey 
      ? `${payload.projectKey}:${payload.hookKey}`
      : payload.projectKey;
    
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    
    return { unsubscribed: room };
  }

  emitWebhookEvent(projectKey: string, hookKey: string, event: Record<string, unknown>) {
    const specificRoom = `${projectKey}:${hookKey}`;
    
    // Emit to specific webhook room
    this.server.to(specificRoom).emit('webhook_event', { hookKey, ...event });
    
    // Also emit to project room
    this.server.to(projectKey).emit('webhook_event', { hookKey, ...event });
  }
}

