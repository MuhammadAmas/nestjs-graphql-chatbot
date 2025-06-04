import { Module } from '@nestjs/common';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { UserModule } from '../users/user.module';

@Module({
  imports: [UserModule],
  providers: [ChatResolver, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
