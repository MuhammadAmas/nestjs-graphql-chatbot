import { Injectable } from '@nestjs/common';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';
import axios from 'axios';
import 'dotenv/config';

@Injectable()
export class ChatService {
    private pubSub: PubSubEngine = new PubSub();
    private apiKey = process.env.GEMINI_API_KEY;

    // Store the conversation history here (in memory for demo)
    private conversationHistory: { author: string; content: string }[] = [];

    async sendMessage(message: string) {
        if (!this.apiKey) {
            console.error("GEMINI_API_KEY is not set in environment variables.");
            const errorMessage = "Bot: API key not configured.";
            await this.publishMessage('user', message);
            await this.publishMessage('bot', errorMessage);
            return errorMessage;
        }

        // Add user message to history and publish
        this.conversationHistory.push({ author: 'user', content: message });
        await this.publishMessage('user', message);

        // Publish typing status: true
        await this.pubSub.publish('typingStatus', { typingStatus: true });

        // Call Gemini API with full conversation history
        const botResponse = await this.callGeminiApi(this.conversationHistory);

        // Publish typing status: false
        await this.pubSub.publish('typingStatus', { typingStatus: false });

        // Add bot response to history and publish
        this.conversationHistory.push({ author: 'bot', content: botResponse });
        await this.publishMessage('bot', botResponse);

        return botResponse;
    }


    // Helper to publish message to subscription
    private async publishMessage(author: string, content: string) {
        const formatted = author === 'user' ? `User: ${content}` : `Bot: ${content}`;
        await this.pubSub.publish('messageSent', { messageSent: formatted });
    }

    async callGeminiApi(history: { author: string; content: string }[]): Promise<string> {
        // return 'fake responseee'
        if (!this.apiKey) return 'API key not configured.';

        const model = 'gemini-1.5-flash-latest';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        // Convert your conversation history into the expected API format
        // Each message is a "part" with an optional "role" (user/model)
        const contents = history.map((msg) => ({
            parts: [{ text: msg.content }],
            role: msg.author === 'user' ? 'user' : 'model',
        }));

        const requestBody = { contents };

        try {
            const response = await axios.post(url, requestBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            // Extract bot reply text (assuming first candidate's first part)
            const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No reply from API';

            return reply;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Gemini API Axios error:', error.response?.status, error.response?.data || error.message);
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
