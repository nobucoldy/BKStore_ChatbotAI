import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export const getGeminiChatModel = (temperature = 0.4) => {
  return new ChatGoogleGenerativeAI({
    model: 'gemini-3.5-flash-lite',
    apiKey: apiKey,
    temperature,
    maxRetries: 2,
  });
};

export const getGeminiEmbeddings = () => {
  return new GoogleGenerativeAIEmbeddings({
    model: 'gemini-embedding-001',
    apiKey: apiKey,
  });
};
