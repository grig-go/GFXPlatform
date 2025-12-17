// AI Vision Analysis utility for analyzing screenshots

import { analyzeImageWithOpenAI } from './openaiApi';
import { analyzeImageWithGemini } from './geminiApi';
import type { AIProviderSettings } from './aiProviderSettings';

/**
 * Default prompt for election map anomaly analysis
 */
const DEFAULT_ANOMALY_PROMPT = `You are analyzing an election map visualization. Please identify and describe:

1. **Electoral Anomalies**: Unusual patterns in voting results, unexpected state outcomes, or significant shifts
2. **Geographic Patterns**: Clusters, regions, or corridors showing distinct trends
3. **Competitive Races**: Close contests or surprising margins
4. **Historical Context**: How this compares to typical election patterns
5. **Key Insights**: 3-5 bullet points highlighting the most important observations

Format your response with clear sections and be specific about what you observe in the map.`;

/**
 * Analyzes a screenshot using the configured AI provider
 * @param imageBase64 - Base64 encoded screenshot
 * @param providerSettings - AI provider configuration
 * @param globalPrompt - Global prompt to prepend to the analysis (optional)
 * @param customPrompt - Optional custom prompt (uses default if not provided)
 * @returns Analysis text from the AI
 */
export async function analyzeScreenshotWithAI(
  imageBase64: string,
  providerSettings: AIProviderSettings,
  globalPrompt?: string,
  customPrompt?: string
): Promise<string> {
  // Combine global prompt with the specific prompt
  let prompt = customPrompt || DEFAULT_ANOMALY_PROMPT;
  
  if (globalPrompt && globalPrompt.trim() !== '') {
    prompt = `${globalPrompt.trim()}\n\n${prompt}`;
    console.log('[aiVisionAnalysis] Using global prompt prepended to analysis prompt');
  }
  
  console.log('[aiVisionAnalysis] Starting analysis with provider:', providerSettings.provider);
  console.log('[aiVisionAnalysis] Using model:', providerSettings.model);

  try {
    if (providerSettings.provider === 'openai') {
      if (!providerSettings.openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please configure it in AI Settings.');
      }
      
      // For OpenAI, use the selected model or default to gpt-4o-mini which supports vision
      const model = providerSettings.model || 'gpt-4o-mini';
      console.log('[aiVisionAnalysis] Calling OpenAI with model:', model);
      
      try {
        return await analyzeImageWithOpenAI(
          imageBase64,
          prompt,
          providerSettings.openaiApiKey,
          model
        );
      } catch (error: any) {
        // Provide helpful error messages for common issues
        if (error.message.includes('not a chat model')) {
          throw new Error(
            `The selected model "${model}" does not support vision analysis. ` +
            `Please select a vision-capable model like "gpt-4o-mini" or "gpt-4o" in AI Settings.`
          );
        }
        if (error.message.includes('max_tokens') || error.message.includes('max_completion_tokens')) {
          throw new Error(
            `The selected model "${model}" has specific requirements. ` +
            `Try using "gpt-4o-mini" or "gpt-4o" instead, or contact support if this issue persists.`
          );
        }
        throw error;
      }
    } else if (providerSettings.provider === 'gemini') {
      if (!providerSettings.geminiApiKey) {
        throw new Error('Gemini API key not configured. Please configure it in AI Settings.');
      }
      
      // For Gemini, determine which model to use
      // If the selected model already supports vision, use it
      // Otherwise, use gemini-pro-vision for image analysis
      let model = providerSettings.model || 'gemini-pro-vision';
      
      // If user selected a non-vision model, switch to vision variant
      if (model === 'gemini-pro') {
        model = 'gemini-pro-vision';
        console.log('[aiVisionAnalysis] Switching to vision model: gemini-pro-vision');
      } else if (model.includes('1.5') && !model.includes('vision')) {
        // For 1.5 models, they support vision natively
        console.log('[aiVisionAnalysis] Using Gemini 1.5 model with native vision support:', model);
      }
      
      console.log('[aiVisionAnalysis] Calling Gemini with model:', model);
      
      return await analyzeImageWithGemini(
        imageBase64,
        prompt,
        providerSettings.geminiApiKey,
        model
      );
    } else {
      throw new Error(`Unsupported AI provider: ${providerSettings.provider}`);
    }
  } catch (error: any) {
    console.error('[aiVisionAnalysis] Analysis failed:', error);
    throw error;
  }
}

/**
 * Validates that AI settings are properly configured for vision analysis
 * @param providerSettings - AI provider configuration
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateAIVisionSettings(providerSettings: AIProviderSettings): {
  isValid: boolean;
  error?: string;
} {
  if (!providerSettings.provider) {
    return {
      isValid: false,
      error: 'No AI provider selected. Please configure AI settings first.'
    };
  }

  if (providerSettings.provider === 'openai') {
    if (!providerSettings.openaiApiKey) {
      return {
        isValid: false,
        error: 'OpenAI API key not configured. Please add it in AI Settings.'
      };
    }
  } else if (providerSettings.provider === 'gemini') {
    if (!providerSettings.geminiApiKey) {
      return {
        isValid: false,
        error: 'Gemini API key not configured. Please add it in AI Settings.'
      };
    }
  }

  return { isValid: true };
}
