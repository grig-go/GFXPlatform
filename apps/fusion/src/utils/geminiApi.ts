// Simplified Gemini API utility without AI provider dependency

/**
 * Tests if a Gemini API key is valid
 * @param apiKey - The API key to test
 * @param model - The model to test with (default: gemini-pro)
 * @returns True if valid, throws error if invalid
 */
export async function testGeminiAPIKey(apiKey: string, model: string = 'gemini-pro'): Promise<boolean> {
  try {
    console.log('[geminiApi] Testing Gemini API key with model:', model);
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is empty or invalid');
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Say 'valid' in one word."
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API key validation failed');
    }

    console.log('[geminiApi] ✅ API key is valid');
    return true;
    
  } catch (error: any) {
    console.error('[geminiApi] ❌ API key test failed:', error);
    throw error;
  }
}

/**
 * Generates content using the Gemini API
 * @param prompt - The text prompt
 * @param apiKey - The API key to use
 * @param model - The model to use (default: gemini-pro)
 * @returns The generated text response
 */
export async function generateWithGemini(
  prompt: string,
  apiKey: string,
  model: string = 'gemini-pro'
): Promise<string> {
  try {
    console.log('[geminiApi] Generating content with Gemini using model:', model);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate content');
    }

    const data = await response.json();
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No text generated in response');
    }

    console.log('[geminiApi] ✅ Successfully generated content');
    return text;
    
  } catch (error: any) {
    console.error('[geminiApi] Error generating content:', error);
    throw error;
  }
}

/**
 * Analyzes an image using Gemini's vision capabilities
 * @param imageBase64 - Base64 encoded image
 * @param prompt - The analysis prompt
 * @param apiKey - The API key to use
 * @param model - The model to use (default: gemini-pro-vision for image analysis)
 * @returns The analysis result
 */
export async function analyzeImageWithGemini(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string = 'gemini-pro-vision'
): Promise<string> {
  try {
    console.log('[geminiApi] Analyzing image with Gemini using model:', model);
    
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64Data
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to analyze image');
    }

    const data = await response.json();
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No analysis generated in response');
    }

    console.log('[geminiApi] ✅ Successfully analyzed image');
    return text;
    
  } catch (error: any) {
    console.error('[geminiApi] Error analyzing image:', error);
    throw error;
  }
}

/**
 * Fetches available models from Gemini
 * @param apiKey - The API key to use
 * @returns List of available models
 */
export async function fetchGeminiModels(apiKey: string): Promise<Array<{ value: string; label: string }>> {
  try {
    console.log('[geminiApi] Fetching available models from Gemini...');
    console.log('[geminiApi] API key length:', apiKey?.length);
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is empty or invalid');
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[geminiApi] API error response:', errorData);
      throw new Error(errorData.error?.message || 'Failed to fetch models');
    }

    const data = await response.json();
    
    // Filter for generateContent capable models and format them
    const models = data.models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      )
      .map((model: any) => {
        // Extract model name from full path (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
        const modelName = model.name.split('/').pop();
        return {
          value: modelName,
          label: modelName.split('-').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        };
      })
      .sort((a: any, b: any) => b.label.localeCompare(a.label)); // Reverse sort to get newer versions first

    console.log('[geminiApi] ✅ Successfully fetched models:', models.length);
    return models;
    
  } catch (error: any) {
    console.error('[geminiApi] Error fetching models:', error);
    throw error;
  }
}