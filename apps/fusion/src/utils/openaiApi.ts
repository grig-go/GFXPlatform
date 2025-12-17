// OpenAI API utility for Fusion app
//
// This utility handles different types of OpenAI models:
// 1. Chat models (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, etc.) - use /v1/chat/completions
// 2. Completion models (gpt-3.5-turbo-instruct, davinci-002, etc.) - use /v1/completions
// 3. Newer models (gpt-4o, o1-*) require max_completion_tokens instead of max_tokens
//
// Only chat models with vision support can analyze images.

/**
 * Models that use the legacy /v1/completions endpoint (not chat)
 */
const COMPLETION_MODELS = [
  'gpt-3.5-turbo-instruct',
  'davinci-002',
  'babbage-002',
  'text-davinci-003',
  'text-davinci-002',
  'text-curie-001',
  'text-babbage-001',
  'text-ada-001',
];

/**
 * Models that require max_completion_tokens instead of max_tokens
 * This includes o1 models and newer GPT-4o variants
 */
const MAX_COMPLETION_TOKENS_MODELS = [
  'o1-preview',
  'o1-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'chatgpt-4o-latest',
];

/**
 * Checks if a model is a completion model (not chat)
 */
function isCompletionModel(model: string): boolean {
  return COMPLETION_MODELS.some(m => model.includes(m));
}

/**
 * Checks if a model requires max_completion_tokens
 */
function requiresMaxCompletionTokens(model: string): boolean {
  return MAX_COMPLETION_TOKENS_MODELS.some(m => model.includes(m));
}

/**
 * Tests if an OpenAI API key is valid
 * @param apiKey - The API key to test
 * @returns True if valid, throws error if invalid
 */
export async function testOpenAIAPIKey(apiKey: string): Promise<boolean> {
  try {
    console.log('[openaiApi] Testing OpenAI API key...');
    
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: "Say 'valid' in one word." }],
          max_tokens: 5
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API key validation failed');
    }

    console.log('[openaiApi] ✅ API key is valid');
    return true;
    
  } catch (error: any) {
    console.error('[openaiApi] ❌ API key test failed:', error);
    throw error;
  }
}

/**
 * Generates content using the OpenAI API
 * @param prompt - The text prompt
 * @param apiKey - The API key to use
 * @param model - The model to use (default: gpt-4o-mini)
 * @returns The generated text response
 */
export async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  try {
    console.log('[openaiApi] Generating content with OpenAI...');
    console.log('[openaiApi] Using model:', model);
    
    // Handle completion models differently from chat models
    if (isCompletionModel(model)) {
      console.log('[openaiApi] Using completions endpoint for model:', model);
      
      const response = await fetch(
        'https://api.openai.com/v1/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            max_tokens: 1000,
            temperature: 0.7
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate content');
      }

      const data = await response.json();
      const text = data.choices?.[0]?.text;
      
      if (!text) {
        throw new Error('No text generated in response');
      }

      console.log('[openaiApi] ✅ Successfully generated content');
      return text;
    }
    
    // Handle chat models
    const usesMaxCompletionTokens = requiresMaxCompletionTokens(model);
    console.log('[openaiApi] Uses max_completion_tokens:', usesMaxCompletionTokens);
    
    const requestBody: any = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    };
    
    // Add the appropriate token limit parameter if needed
    if (usesMaxCompletionTokens) {
      requestBody.max_completion_tokens = 1000;
    }
    // Note: For most chat models, we can omit max_tokens and let the model decide
    
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate content');
    }

    const data = await response.json();
    
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error('No text generated in response');
    }

    console.log('[openaiApi] ✅ Successfully generated content');
    return text;
    
  } catch (error: any) {
    console.error('[openaiApi] Error generating content:', error);
    throw error;
  }
}

/**
 * Analyzes an image using OpenAI's vision capabilities
 * @param imageBase64 - Base64 encoded image or URL
 * @param prompt - The analysis prompt
 * @param apiKey - The API key to use
 * @param model - The model to use (default: gpt-4o-mini)
 * @returns The analysis result
 */
export async function analyzeImageWithOpenAI(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  try {
    console.log('[openaiApi] Analyzing image with OpenAI...');
    console.log('[openaiApi] Using model:', model);
    
    // Check if this is a completion model (not chat)
    if (isCompletionModel(model)) {
      throw new Error(
        `Model "${model}" is not a chat model and does not support vision. Please select a chat model like gpt-4o-mini, gpt-4o, or gpt-4-vision-preview.`
      );
    }
    
    // Determine which token parameter to use
    const usesMaxCompletionTokens = requiresMaxCompletionTokens(model);
    console.log('[openaiApi] Uses max_completion_tokens:', usesMaxCompletionTokens);
    
    const requestBody: any = {
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    };
    
    // Add the appropriate token limit parameter
    if (usesMaxCompletionTokens) {
      requestBody.max_completion_tokens = 1000;
    } else {
      requestBody.max_tokens = 1000;
    }
    
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to analyze image');
    }

    const data = await response.json();
    
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error('No analysis generated in response');
    }

    console.log('[openaiApi] ✅ Successfully analyzed image');
    return text;
    
  } catch (error: any) {
    console.error('[openaiApi] Error analyzing image:', error);
    throw error;
  }
}

/**
 * Get recommended vision-capable OpenAI models
 */
export function getRecommendedVisionModels(): Array<{ value: string; label: string }> {
  return [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended - Fast & High Quality)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended - Fast & Affordable)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (High Quality)' },
    { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision Preview' },
  ];
}

/**
 * Fetches available models from OpenAI
 * @param apiKey - The API key to use
 * @param visionOnly - If true, only return models that support vision (default: false)
 * @returns List of available models
 */
export async function fetchOpenAIModels(
  apiKey: string, 
  visionOnly: boolean = false
): Promise<Array<{ value: string; label: string }>> {
  try {
    console.log('[openaiApi] Fetching available models from OpenAI...');
    console.log('[openaiApi] API key length:', apiKey?.length);
    console.log('[openaiApi] Vision only filter:', visionOnly);
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is empty or invalid');
    }
    
    const response = await fetch(
      'https://api.openai.com/v1/models',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[openaiApi] API error response:', errorData);
      throw new Error(errorData.error?.message || 'Failed to fetch models');
    }

    const data = await response.json();
    
    // Filter for GPT models
    let models = data.data.filter((model: any) => {
      const id = model.id.toLowerCase();
      
      // Include GPT models
      if (!id.includes('gpt')) {
        return false;
      }
      
      // Exclude embedding and audio models
      if (id.includes('embed') || id.includes('whisper') || id.includes('tts') || id.includes('dall-e')) {
        return false;
      }
      
      // If vision only, exclude completion models (they don't support vision)
      if (visionOnly && isCompletionModel(model.id)) {
        return false;
      }
      
      return true;
    });
    
    // Format the models
    const formattedModels = models.map((model: any) => ({
      value: model.id,
      label: model.id.split('-').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));
    
    // Sort with preferred models first
    const sortedModels = formattedModels.sort((a: any, b: any) => {
      // Priority order
      const priority = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5'];
      
      const aPriority = priority.findIndex(p => a.value.includes(p));
      const bPriority = priority.findIndex(p => b.value.includes(p));
      
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      
      return a.label.localeCompare(b.label);
    });

    console.log('[openaiApi] ✅ Successfully fetched models:', sortedModels.length);
    return sortedModels;
    
  } catch (error: any) {
    console.error('[openaiApi] Error fetching models:', error);
    throw error;
  }
}
