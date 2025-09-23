import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    try {
      // TODO: Implement JWT authentication for WebSocket
      // const token = client.handshake.auth.token;
      // const user = await this.validateToken(token);
      // this.connectedUsers.set(client.id, user.id);
      
      client.emit('connected', { message: 'Connected to chat server' });
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await client.join(`conversation_${data.conversationId}`);
      client.emit('joined_conversation', {
        conversationId: data.conversationId,
        message: 'Joined conversation',
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await client.leave(`conversation_${data.conversationId}`);
      client.emit('left_conversation', {
        conversationId: data.conversationId,
        message: 'Left conversation',
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to leave conversation' });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // TODO: Get user from JWT token
      // const userId = this.connectedUsers.get(client.id);
      // const user = await this.getUserById(userId);
      
      // Tạm thời tạo user mock
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
      } as any;

      const result = await this.chatService.sendMessage(mockUser, data);

      // Gửi tin nhắn đến tất cả client trong conversation
      this.server
        .to(`conversation_${result.conversation.id}`)
        .emit('new_message', {
          message: result.message,
          response: result.response,
          conversation: result.conversation,
        });

      // Gửi xác nhận cho client gửi tin nhắn
      client.emit('message_sent', {
        message: result.message,
        response: result.response,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: this.connectedUsers.get(client.id),
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: this.connectedUsers.get(client.id),
      isTyping: false,
    });
  }

  // Broadcast message to all users in a conversation
  broadcastToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, event: string, data: any) {
    // Find socket by userId
    for (const [socketId, uid] of this.connectedUsers.entries()) {
      if (uid === userId) {
        this.server.to(socketId).emit(event, data);
        break;
      }
    }
  }
}
