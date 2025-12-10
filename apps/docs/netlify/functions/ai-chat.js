// Netlify serverless function for AI chat in production
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const request = JSON.parse(event.body);
    const { provider, model, messages, systemPrompt, maxTokens = 8192, temperature = 0.7 } = request;

    if (!provider || !model || !messages) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: provider, model, messages' }),
      };
    }

    let response;

    if (provider === 'claude') {
      const claudeApiKey = process.env.CLAUDE_API_KEY;
      if (!claudeApiKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'CLAUDE_API_KEY not configured' }),
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
    } else if (provider === 'gemini') {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        };
      }

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages,
            generationConfig: { maxOutputTokens: maxTokens, temperature },
          }),
        }
      );
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unknown provider: ${provider}` }),
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: errorData.error?.message || `API request failed: ${response.status}`,
        }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('AI chat error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
