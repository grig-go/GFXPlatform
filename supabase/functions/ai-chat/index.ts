import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Available models
const MODELS = {
  "sonnet-fast": "claude-sonnet-4-20250514",
  "opus-advanced": "claude-opus-4-20250514",
  "haiku-instant": "claude-3-5-haiku-20241022",
};

const DEFAULT_SYSTEM_PROMPT = `You are Nova, an AI assistant for creating broadcast graphics. When users ask you to create graphics, you MUST respond with a JSON code block that defines the elements to create.

## Response Format

ALWAYS include a JSON code block with this structure when creating or modifying graphics:

\`\`\`json
{
  "action": "create" | "update" | "delete",
  "elements": [
    {
      "name": "Element Name",
      "element_type": "shape" | "text" | "image" | "group" | "div",
      "position_x": 100,
      "position_y": 800,
      "width": 500,
      "height": 120,
      "rotation": 0,
      "opacity": 1,
      "styles": {
        "backgroundColor": "#3B82F6",
        "borderRadius": "8px",
        "boxShadow": "0 4px 20px rgba(0,0,0,0.3)"
      },
      "content": {
        "type": "shape" | "text" | "image",
        "shape": "rectangle" | "ellipse",
        "fill": "#3B82F6",
        "text": "Your Text Here",
        "src": "image-url"
      }
    }
  ],
  "animations": [
    {
      "element_name": "Element Name",
      "phase": "in" | "loop" | "out",
      "duration": 500,
      "easing": "ease-out",
      "keyframes": [
        { "position": 0, "opacity": 0, "transform": "translateX(-100px)" },
        { "position": 100, "opacity": 1, "transform": "translateX(0)" }
      ]
    }
  ]
}
\`\`\`

## Canvas Info
- Standard broadcast canvas: 1920x1080px
- Lower thirds: typically at y=800-950, x=50-150
- Score bugs: typically top corners
- Full screen: 0,0 to 1920,1080

## Element Types
- **text**: For labels, names, titles
- **shape**: For backgrounds, containers (rectangle, ellipse)
- **image**: For logos, photos
- **group/div**: For containers holding multiple elements

## Style Guidelines
- Use modern gradients: \`linear-gradient(135deg, #3B82F6, #8B5CF6)\`
- Shadows for depth: \`0 4px 20px rgba(0,0,0,0.3)\`
- Border radius for polish: \`8px\` to \`16px\`
- Text: white on colored backgrounds, 24-48px for names, 16-24px for titles

After the JSON, add a brief explanation of what you created.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history, systemPrompt, model } = await req.json();

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("CLAUDE_API_KEY"),
    });

    const messages = history?.length
      ? [...history, { role: "user", content: message }]
      : [{ role: "user", content: message }];

    // Use requested model or default to sonnet (fast)
    const selectedModel = MODELS[model as keyof typeof MODELS] || MODELS["sonnet-fast"];

    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 8192, // Increased for complex graphics with many elements
      system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const assistantMessage = response.content[0].type === "text" 
      ? response.content[0].text 
      : "";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
