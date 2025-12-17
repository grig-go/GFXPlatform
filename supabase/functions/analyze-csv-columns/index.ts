// Edge Function: supabase/functions/analyze-csv-columns/index.ts
import { Anthropic } from 'npm:@anthropic-ai/sdk@0.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? ''
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { sample, hasHeaders } = await req.json();
    if (!sample || !Array.isArray(sample) || sample.length === 0) {
      throw new Error('Invalid sample data');
    }

    // Check if API key is configured
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    // Prepare data for Claude
    const sampleText = sample.slice(0, 10).map((row) => Array.isArray(row) ? row.join('\t') : Object.values(row).join('\t')).join('\n');

    const prompt = `Analyze this CSV/TSV data and suggest appropriate column names.

The data ${hasHeaders ? 'has' : 'does not have'} headers.
Sample data (tab-separated):
${sampleText}

Please analyze each column and suggest descriptive names based on the data patterns. Consider:
1. Data types (numbers, dates, emails, URLs, etc.)
2. Value patterns and formats
3. Potential business meaning

Return a JSON object with:
- columnNames: array of suggested names
- columnTypes: array of detected types (string, number, date, email, url, etc.)
- confidence: your confidence level (0-1)
- reasoning: brief explanation of your suggestions`;

    // Call Claude API using SDK
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: 'You are a helpful AI assistant that analyzes data. Respond with valid JSON only, no explanations or markdown formatting.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = completion.content[0]?.text || '';

    // Parse Claude's response
    let suggestions;
    try {
      // Extract JSON from Claude's response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse Claude response');
      }
    } catch (err) {
      // Fallback parsing
      suggestions = {
        columnNames: [],
        columnTypes: [],
        confidence: 0.5,
        reasoning: 'Could not parse AI response'
      };
    }

    return new Response(JSON.stringify({
      success: true,
      suggestions
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
