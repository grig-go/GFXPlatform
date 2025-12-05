import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface AIRequest {
  provider: 'gemini' | 'claude';
  model: string;
  messages: any[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const request: AIRequest = JSON.parse(event.body || '{}');
    const { provider, model, messages, systemPrompt, maxTokens = 8192, temperature = 0.7 } = request;

    if (!provider || !model || !messages) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: provider, model, messages' }),
      };
    }

    let response;

    if (provider === 'gemini') {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Gemini API key not configured on server' }),
        };
      }

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        }
      );
    } else if (provider === 'claude') {
      const claudeApiKey = process.env.CLAUDE_API_KEY;
      if (!claudeApiKey) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Claude API key not configured on server' }),
        };
      }

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        }),
      });
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Unknown provider: ${provider}` }),
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: errorData.error?.message || `API request failed: ${response.status}`,
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error('AI proxy error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

export { handler };
