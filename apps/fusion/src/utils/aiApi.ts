// Unified AI API utility that routes to the correct provider

import { loadAIProviderSettings, getCurrentAPIKey } from './aiProviderSettings';
import { generateWithOpenAI, analyzeImageWithOpenAI } from './openaiApi';
import { generateWithGemini, analyzeImageWithGemini } from './geminiApi';

/**
 * Generates content using the configured AI provider
 * @param prompt - The text prompt
 * @returns The generated text response
 */
export async function generateContent(prompt: string): Promise<string> {
  const settings = loadAIProviderSettings();
  const apiKey = getCurrentAPIKey(settings);
  
  if (!apiKey) {
    throw new Error(`No API key configured for ${settings.provider}`);
  }
  
  console.log(`[aiApi] Generating content with ${settings.provider} (${settings.model})...`);
  
  if (settings.provider === 'openai') {
    return await generateWithOpenAI(prompt, apiKey, settings.model);
  } else if (settings.provider === 'gemini') {
    return await generateWithGemini(prompt, apiKey, settings.model);
  } else {
    throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

/**
 * Analyzes an image using the configured AI provider
 * @param imageBase64 - Base64 encoded image
 * @param prompt - The analysis prompt
 * @returns The analysis result
 */
export async function analyzeImage(imageBase64: string, prompt: string): Promise<string> {
  const settings = loadAIProviderSettings();
  const apiKey = getCurrentAPIKey(settings);
  
  if (!apiKey) {
    throw new Error(`No API key configured for ${settings.provider}`);
  }
  
  console.log(`[aiApi] Analyzing image with ${settings.provider} (${settings.model})...`);
  
  if (settings.provider === 'openai') {
    return await analyzeImageWithOpenAI(imageBase64, prompt, apiKey, settings.model);
  } else if (settings.provider === 'gemini') {
    return await analyzeImageWithGemini(imageBase64, prompt, apiKey, settings.model);
  } else {
    throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

/**
 * Check if AI is configured and ready to use
 * @returns True if an API key is configured for the current provider
 */
export function isAIConfigured(): boolean {
  const settings = loadAIProviderSettings();
  const apiKey = getCurrentAPIKey(settings);
  return !!apiKey;
}
