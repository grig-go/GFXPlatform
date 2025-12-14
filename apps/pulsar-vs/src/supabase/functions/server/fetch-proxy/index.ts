import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, method = 'GET', headers = {}, body } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Make the proxied request
    const proxyResponse = await fetch(url, {
      method,
      headers: {
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await proxyResponse.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return new Response(
      JSON.stringify({
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        data: parsedData,
        headers: Object.fromEntries(proxyResponse.headers.entries()),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

