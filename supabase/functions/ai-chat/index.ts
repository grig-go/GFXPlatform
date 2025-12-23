/**
 * AI Chat Edge Function
 *
 * Unified AI proxy that supports both Gemini and Claude providers.
 * This replaces the Netlify function with a Supabase Edge Function for:
 * - More reliable connections (no cold starts after idle)
 * - Consistent behavior in local and production
 * - Better integration with Supabase infrastructure
 *
 * Endpoints:
 * - POST /ai-chat - Send messages to AI (Gemini or Claude)
 * - OPTIONS /ai-chat - CORS preflight
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface AIRequest {
  provider: 'gemini' | 'claude';
  model: string;
  messages: any[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

console.log("[ai-chat] Edge Function started");

serve(async (req) => {
  console.log(`[ai-chat] Incoming request: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const request: AIRequest = await req.json();
    const { provider, model, messages, systemPrompt, maxTokens = 8192, temperature = 0.7 } = request;

    if (!provider || !model || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provider, model, messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-chat] Provider: ${provider}, Model: ${model}, Messages: ${messages.length}`);

    let response;

    if (provider === "gemini") {
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiApiKey) {
        console.error("[ai-chat] Missing GEMINI_API_KEY environment variable");
        return new Response(
          JSON.stringify({ error: "Gemini API key not configured on server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[ai-chat] Calling Gemini API with model: ${model}`);
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        }
      );

    } else if (provider === "claude") {
      const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
      if (!claudeApiKey) {
        console.error("[ai-chat] Missing CLAUDE_API_KEY environment variable");
        return new Response(
          JSON.stringify({ error: "Claude API key not configured on server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[ai-chat] Calling Claude API with model: ${model}`);
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        }),
      });

    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[ai-chat] API error (${response.status}):`, errorData);
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || `API request failed: ${response.status}`,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`[ai-chat] Success - response received`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
