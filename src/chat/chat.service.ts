import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';
import axios from 'axios';
import 'dotenv/config';
import { supabase } from '../config/supabase.config';
import { UserService } from '../users/user.service';

@Injectable()
export class ChatService {
  private pubSub: PubSubEngine = new PubSub();
  private apiKey = process.env.GEMINI_API_KEY;

  constructor(private readonly userService: UserService) {}

  async sendMessage(message: string) {
    const user = await this.userService.getCurrentUser();
    if (!user) {
      throw new UnauthorizedException(
        'User must be logged in to send messages',
      );
    }

    if (!this.apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables.');
      const errorMessage = 'Bot: API key not configured.';
      await this.publishMessage(user.id, 'user', message);
      await this.publishMessage(user.id, 'bot', errorMessage);
      await this.saveMessage(user.id, 'user', message);
      await this.saveMessage(user.id, 'bot', errorMessage);
      return {
        botResponse: errorMessage,
        history: await this.getConversationHistory(user.id),
      };
    }

    // Add user message to history and publish
    await this.saveMessage(user.id, 'user', message);
    await this.publishMessage(user.id, 'user', message);

    // Publish typing status
    await this.pubSub.publish('typingStatus', { typingStatus: true });

    // Get conversation history and call API
    const history = await this.getConversationHistory(user.id);
    const botResponse = await this.callGeminiApi(history);

    // Publish typing status
    await this.pubSub.publish('typingStatus', { typingStatus: false });

    // Save and publish bot response
    await this.saveMessage(user.id, 'bot', botResponse);
    await this.publishMessage(user.id, 'bot', botResponse);

    return {
      botResponse,
      history: await this.getConversationHistory(user.id),
    };
  }

  private async saveMessage(userId: string, author: string, content: string) {
    try {
      const { error } = await supabase.from('messages').insert([
        {
          user_id: userId,
          author,
          content,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error saving message to Supabase:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  async getConversationHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages from Supabase:', error);
        return [];
      }

      return data.map((msg) => ({
        author: msg.author,
        content: msg.content,
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  private async publishMessage(
    userId: string,
    author: string,
    content: string,
  ) {
    const formatted =
      author === 'user' ? `User: ${content}` : `Bot: ${content}`;
    await this.pubSub.publish('messageSent', {
      messageSent: formatted,
      userId,
    });
  }

  async callGeminiApi(
    history: { author: string; content: string }[],
  ): Promise<string> {
    if (!this.apiKey) return 'API key not configured.';

    const model = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert conversation history into the expected API format
    const contents = history.map((msg) => ({
      role: msg.author === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await axios.post(
        url,
        { contents },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const reply =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No reply from API';
      return reply;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          'Gemini API Axios error:',
          error.response?.status,
          error.response?.data || error.message,
        );
        if (error.response?.status === 400) {
          return `Sorry, invalid request to AI: ${JSON.stringify(error.response?.data?.error?.message || error.message)}`;
        } else if (error.response?.status === 403) {
          return 'Sorry, access forbidden. Check API key permissions.';
        } else if (error.response?.status === 429) {
          return 'Sorry, rate limit exceeded. Try again later.';
        }
      } else {
        console.error('Unknown Gemini API error:', error);
      }
      return 'Sorry, I am having trouble responding right now.';
    }
  }

  getPubSub() {
    return this.pubSub;
  }
}
