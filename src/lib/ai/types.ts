
export type AIProvider = 'huggingface' | 'gemini' | 'openai';

export interface AIKeyConfig {
  provider: AIProvider;
  key: string;
  requestCount: number;
  lastUsed: Date;
  dailyLimit: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}
