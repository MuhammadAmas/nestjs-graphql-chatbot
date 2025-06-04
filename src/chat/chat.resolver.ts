import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { UserService } from '../users/user.service';
import { ObjectType, Field } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';

@Resolver()
export class ChatResolver {
  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  @Query(() => String)
  hello() {
    return 'Hello from chatbot!';
  }

  @Query(() => [MessageType])
  async getConversationHistory() {
    const user = await this.userService.getCurrentUser();
    if (!user) {
      throw new UnauthorizedException(
        'User must be logged in to view messages',
      );
    }
    return this.chatService.getConversationHistory(user.id);
  }

  @Mutation(() => ChatResponse)
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

@ObjectType()
export class MessageType {
  @Field()
  author: string;

  @Field()
  content: string;
}

@ObjectType()
export class ChatResponse {
  @Field()
  botResponse: string;

  @Field(() => [MessageType])
  history: MessageType[];
}
