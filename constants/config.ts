import { VITE_OPENROUTER_API_KEY } from '@env';
import { DEEPSEEK_API_KEY } from '@env';
import { OPENAI_API_KEY } from '@env';
import { GEMINI_API_KEY } from '@env';

export const API_CONFIG = {
  OPENROUTER_API_KEY: VITE_OPENROUTER_API_KEY,
  DEEPSEEK_API_KEY: DEEPSEEK_API_KEY,
  OPENAI_API_KEY: OPENAI_API_KEY,
  GEMINI_API_KEY: GEMINI_API_KEY,

  // API endpoints
  OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
  DEEPSEEK_URL: 'https://api.deepseek.com/v1/chat/completions',
  OPENAI_URL: 'https://api.openai.com/v1/chat/completions',
};
