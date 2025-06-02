import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { ChatService } from './chat.service';


@Resolver()
export class ChatResolver {
    constructor(private readonly chatService: ChatService) { }

    @Query(() => String)
    hello() {
        return 'Hello from chatbot!';
    }

    @Mutation(() => String)
    async sendMessage(@Args('message') message: string) {
        return this.chatService.sendMessage(message);
    }
    @Subscription(() => Boolean)
    typingStatus() {
        return (this.chatService.getPubSub() as any).asyncIterator('typingStatus');
    }

    @Subscription(() => String, {
        resolve: (payload) => payload.messageSent,
    })
    messageSent(): AsyncIterator<string> {
        return (this.chatService.getPubSub() as any).asyncIterator('messageSent');
    }

}
