import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Conversation, Message } from './entities';
import { UsersModule } from '../users/users.module';
import { AIRefactoredModule } from '../ai/ai-refactored.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    UsersModule,
    AIRefactoredModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
