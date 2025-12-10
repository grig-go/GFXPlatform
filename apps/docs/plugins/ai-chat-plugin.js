// Docusaurus plugin that adds /ai-chat endpoint for development
const fs = require('fs');
const path = require('path');

// Load .env from project root
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// AI chat handler logic
async function handleAiChat(req, res) {
  loadEnv();

  const { provider, model, messages, systemPrompt, maxTokens = 8192, temperature = 0.7 } = req.body;

  if (!provider || !model || !messages) {
    return res.status(400).json({ error: 'Missing required fields: provider, model, messages' });
  }

  try {
    let response;

    if (provider === 'claude') {
      const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
      if (!claudeApiKey) {
        return res.status(500).json({ error: 'CLAUDE_API_KEY not set in .env file' });
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
        return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
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
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `API request failed: ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

module.exports = function aiChatPlugin() {
  return {
    name: 'ai-chat-plugin',

    configureWebpack(config, isServer) {
      // Only configure dev server in development
      if (process.env.NODE_ENV === 'production' || isServer) {
        return {};
      }

      return {
        devServer: {
          setupMiddlewares: (middlewares, devServer) => {
            const express = require('express');

            // Add JSON body parser and AI chat endpoint
            devServer.app.use('/ai-chat', express.json());
            devServer.app.post('/ai-chat', handleAiChat);

            console.log('🤖 AI Chat endpoint available at /ai-chat');

            return middlewares;
          },
        },
      };
    },
  };
};
