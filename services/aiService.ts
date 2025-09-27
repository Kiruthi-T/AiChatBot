import { API_CONFIG } from '../constants/config';

export class AIService {
  private static readonly API_TIMEOUT = 30000;

  static async sendMessage(message: string): Promise<string> {
    console.log('🔍 Sending message to AI:', message);
    
    // Validate message
    if (!message || message.trim().length === 0) {
      return 'Please enter a message.';
    }

    // Test API configuration first
    const config = this.checkAPIConfiguration();
    console.log('🔍 API Configuration:', config);

    try {
      // Try DeepSeek first (most reliable free option)
      console.log('🔄 Trying DeepSeek API...');
      const response = await this.tryDeepSeek(message);
      if (response && response.trim().length > 0) {
        console.log('✅ DeepSeek success');
        return response;
      }
      throw new Error('Empty response from DeepSeek');
    } catch (error) {
      console.log('❌ DeepSeek failed:', error.message);
      console.log('🔄 Trying OpenRouter...');
      
      // Try OpenRouter with free models
      try {
        const openRouterResponse = await this.tryOpenRouter(message);
        if (openRouterResponse && openRouterResponse.trim().length > 0) {
          console.log('✅ OpenRouter success');
          return openRouterResponse;
        }
        throw new Error('Empty response from OpenRouter');
      } catch (openRouterError) {
        console.log('❌ OpenRouter failed:', openRouterError.message);
        console.log('🔄 Trying Gemini...');
        
        // Try Gemini as final API fallback
        try {
          const geminiResponse = await this.tryGeminiAPI(message);
          if (geminiResponse && geminiResponse.trim().length > 0) {
            console.log('✅ Gemini success');
            return geminiResponse;
          }
          throw new Error('Empty response from Gemini');
        } catch (geminiError) {
          console.log('❌ All APIs failed, using smart local response');
          return this.getSmartResponse(message);
        }
      }
    }
  }

  private static cleanResponse(text: string): string {
    if (!text) return "I apologize, but I couldn't generate a proper response.";
    
    // Remove all HTML-like tags and special tokens
    let cleaned = text
      .replace(/<s>/g, '') // Remove <s> tokens
      .replace(/<\/s>/g, '') // Remove </s> tokens
      .replace(/<[^>]*>/g, '') // Remove any other HTML tags
      .replace(/\[INST\]/g, '') // Remove instruction tokens
      .replace(/\[\/INST\]/g, '') // Remove instruction tokens
      .replace(/<\|.*?\|>/g, '') // Remove any <|token|> patterns
      .replace(/[�]/g, '') // Remove replacement characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Remove common AI artifacts at the beginning
    const aiArtifacts = ['<s>', '</s>', '[INST]', '[/INST]', 'assistant:', 'user:', 'system:'];
    aiArtifacts.forEach(artifact => {
      if (cleaned.toLowerCase().startsWith(artifact.toLowerCase())) {
        cleaned = cleaned.substring(artifact.length).trim();
      }
    });

    // If the response seems like it's cut off or starts with punctuation
    if (cleaned.length > 0) {
      const firstChar = cleaned[0];
      if ('!?.,;:'.includes(firstChar)) {
        cleaned = cleaned.substring(1).trim();
      }
      
      // Ensure the response starts with a proper character
      if (cleaned.length > 0 && !/[a-zA-Z0-9]/.test(cleaned[0])) {
        cleaned = cleaned.substring(1).trim();
      }
    }

    // Final cleanup
    cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Trim again

    if (cleaned.length === 0) {
      return "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?";
    }

    // Capitalize first letter if it's lowercase
    if (cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  }

  private static async tryDeepSeek(message: string): Promise<string> {
    if (!API_CONFIG.DEEPSEEK_API_KEY) {
      console.log('❌ DeepSeek API key not configured');
      throw new Error('DeepSeek API key not configured');
    }

    console.log('🔍 DeepSeek Key:', API_CONFIG.DEEPSEEK_API_KEY.substring(0, 10) + '...');
    console.log('🔍 DeepSeek URL:', API_CONFIG.DEEPSEEK_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

    try {
      const response = await fetch(API_CONFIG.DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant. Provide clear, concise, and accurate responses. Keep responses under 500 characters."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔍 DeepSeek Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 DeepSeek Error Response:', errorText);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 DeepSeek Full Response:', JSON.stringify(data, null, 2));
      
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const content = data.choices[0].message.content.trim();
        console.log('🔍 Raw Content:', content);
        const cleanedContent = this.cleanResponse(content);
        console.log('🔍 Cleaned Content:', cleanedContent);
        
        if (cleanedContent.length > 0) {
          return cleanedContent;
        }
      }
      
      throw new Error('Invalid or empty response format from DeepSeek');
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('🔍 DeepSeek Request Error:', error);
      throw error;
    }
  }

  private static async tryOpenRouter(message: string): Promise<string> {
    // Use free models available on OpenRouter
    const freeModels = [
      'mistralai/mistral-7b-instruct:free',
      'huggingfaceh4/zephyr-7b-beta:free',
      'google/gemma-7b-it:free',
      'meta-llama/llama-3-8b-instruct:free'
    ];

    for (const model of freeModels) {
      try {
        console.log(`🔄 Trying ${model} on OpenRouter...`);
        const response = await this.callOpenRouterAPI(message, model);
        if (response && response.trim().length > 0) {
          return response;
        }
      } catch (error) {
        console.log(`❌ ${model} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All OpenRouter models failed');
  }

  private static async callOpenRouterAPI(message: string, model: string): Promise<string> {
    if (!API_CONFIG.OPENROUTER_API_KEY) {
      console.log('❌ OpenRouter API key not configured');
      throw new Error('OpenRouter API key not configured');
    }

    console.log('🔍 OpenRouter Key:', API_CONFIG.OPENROUTER_API_KEY.substring(0, 10) + '...');
    console.log('🔍 OpenRouter URL:', API_CONFIG.OPENROUTER_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

    try {
      const response = await fetch(API_CONFIG.OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8080',
          'X-Title': 'AI Chatbot'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant. Provide clear, concise responses under 300 characters."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔍 OpenRouter Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 OpenRouter Error Response:', errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ OpenRouter response from ${model}:`, data);
      
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const content = data.choices[0].message.content.trim();
        console.log('🔍 Raw Content:', content);
        const cleanedContent = this.cleanResponse(content);
        console.log('🔍 Cleaned Content:', cleanedContent);
        
        if (cleanedContent.length > 0) {
          return cleanedContent;
        }
      }
      
      throw new Error('Invalid response format from OpenRouter');
    } catch (error) {
      clearTimeout(timeoutId);
      console.log(`❌ OpenRouter request failed for ${model}:`, error.message);
      throw error;
    }
  }

  private static async tryGeminiAPI(message: string): Promise<string> {
    try {
      return await this.callOpenRouterAPI(message, 'google/gemini-pro');
    } catch (error) {
      console.log('❌ Gemini via OpenRouter failed, trying local fallback...');
      throw error;
    }
  }

  // Enhanced smart response as final fallback
  private static getSmartResponse(message: string): string {
    const lowerMessage = message.toLowerCase().trim();
    
    if (!message || message.trim().length === 0) {
      return "I noticed you sent an empty message. How can I help you today?";
    }

    // Greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! 👋 I'm your AI assistant. While I'm currently using local responses, I can help with programming questions, web development, and technical topics. What would you like to know?";
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
      return "Goodbye! 👋 Feel free to come back if you have any questions about programming, web development, or technical topics!";
    }

    // Technical questions
    if (lowerMessage.includes('mern') || lowerMessage.includes('mongodb') || lowerMessage.includes('express') || lowerMessage.includes('react') || lowerMessage.includes('node')) {
      return `The MERN stack is a popular JavaScript framework for full-stack development:

🌐 **MERN Components:**
• MongoDB - NoSQL database
• Express.js - Web framework  
• React - Frontend library
• Node.js - Runtime environment

💡 **Key Benefits:**
- Full JavaScript stack
- Great for real-time apps
- Large community support

What specific aspect of MERN are you interested in?`;
    }

    // API/key questions
    if (lowerMessage.includes('api') || lowerMessage.includes('key') || lowerMessage.includes('balance') || lowerMessage.includes('failed')) {
      return `🔧 **API Status Overview:**

To use external AI APIs, you'll need to configure API keys:

1. **DeepSeek** (Recommended): Free tier available at deepseek.com
2. **OpenRouter**: Free models with daily limits
3. **Gemini**: Free via Google AI Studio

Check your API configuration and ensure keys are properly set in your config file.`;
    }

    // Help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('what can you do')) {
      return `I can help you with:

💻 **Web Development**: MERN stack, React, Node.js, APIs
🔧 **Programming**: JavaScript, TypeScript, best practices  
📚 **Technical Concepts**: Debugging, architecture, deployment
💡 **General Guidance**: Project planning, code reviews

What would you like to explore?`;
    }

    // Default engaging response
    const response = `I'd be happy to help with "${message}"! 

While I'm currently using local responses, I can provide guidance on:
- Web development and programming
- Technical concepts and best practices
- Project planning and architecture
- Debugging and problem-solving

Could you tell me more about what you're working on or what specific help you need?`;

    return this.cleanResponse(response);
  }

  // Check if any APIs are configured
  static checkAPIConfiguration(): { hasAnyKey: boolean; configuredServices: string[] } {
    const configuredServices = [];
    
    if (API_CONFIG.DEEPSEEK_API_KEY && API_CONFIG.DEEPSEEK_API_KEY.length > 10) configuredServices.push('DeepSeek');
    if (API_CONFIG.OPENROUTER_API_KEY && API_CONFIG.OPENROUTER_API_KEY.length > 10) configuredServices.push('OpenRouter');
    if (API_CONFIG.GEMINI_API_KEY && API_CONFIG.GEMINI_API_KEY.length > 10) configuredServices.push('Gemini');
    if (API_CONFIG.OPENAI_API_KEY && API_CONFIG.OPENAI_API_KEY.length > 10) configuredServices.push('OpenAI');

    return {
      hasAnyKey: configuredServices.length > 0,
      configuredServices
    };
  }

  // Test API connectivity
  static async testAPIConnectivity(): Promise<{ service: string; status: string; response?: string }[]> {
    const results = [];
    const testMessage = "Hello! Please respond with a short greeting.";

    // Test DeepSeek
    try {
      if (API_CONFIG.DEEPSEEK_API_KEY && API_CONFIG.DEEPSEEK_API_KEY.length > 10) {
        console.log('🧪 Testing DeepSeek connectivity...');
        const response = await this.tryDeepSeek(testMessage);
        results.push({ service: 'DeepSeek', status: '✅ Working', response: response.substring(0, 100) + '...' });
      } else {
        results.push({ service: 'DeepSeek', status: '❌ No valid API key' });
      }
    } catch (error) {
      results.push({ service: 'DeepSeek', status: `❌ Error: ${error.message}` });
    }

    // Test OpenRouter
    try {
      if (API_CONFIG.OPENROUTER_API_KEY && API_CONFIG.OPENROUTER_API_KEY.length > 10) {
        console.log('🧪 Testing OpenRouter connectivity...');
        const response = await this.callOpenRouterAPI(testMessage, 'mistralai/mistral-7b-instruct:free');
        results.push({ service: 'OpenRouter', status: '✅ Working', response: response.substring(0, 100) + '...' });
      } else {
        results.push({ service: 'OpenRouter', status: '❌ No valid API key' });
      }
    } catch (error) {
      results.push({ service: 'OpenRouter', status: `❌ Error: ${error.message}` });
    }

    return results;
  }

  // Debug method to test all APIs
  static async debugAPIs(): Promise<string> {
    const config = this.checkAPIConfiguration();
    const testResults = await this.testAPIConnectivity();
    
    let result = `🔧 **API Debug Information**\n\n`;
    result += `**Configured Services:** ${config.configuredServices.join(', ') || 'None'}\n\n`;
    result += `**Test Results:**\n`;
    
    testResults.forEach(test => {
      result += `• ${test.service}: ${test.status}\n`;
      if (test.response) {
        result += `  Response: ${test.response}\n`;
      }
    });
    
    return this.cleanResponse(result);
  }
}