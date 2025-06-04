import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserService } from '../users/user.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  @Get('history')
  async getHistory() {
    const user = await this.userService.getCurrentUser();
    if (!user) {
      throw new UnauthorizedException(
        'User must be logged in to view messages',
      );
    }
    return {
      history: await this.chatService.getConversationHistory(user.id),
    };
  }

  @Post('message')
  async sendMessage(@Body('message') message: string) {
    try {
      const user = await this.userService.getCurrentUser();
      if (!user) {
        return {
          status: 401,
          message: 'User must be logged in to view messages',
        };
      }
      const response = await this.chatService.sendMessage(message);
      return response.history;
    } catch (error: any) {
      console.log('Error from chat controller', error.message);
      return {
        status: error.status,
        message: error.message,
      };
    }
  }
}
