import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chatt')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('message')
    async sendMessage(@Body('message') message: string) {
        const botReply = await this.chatService.sendMessage(message);
        return { reply: botReply };
    }
}
