import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

export default defineConfig(({ mode }) => {
  // Load env from both current dir and monorepo root
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), '');
  const localEnv = loadEnv(mode, process.cwd(), '');
  // Merge environments (local takes precedence)
  const env = { ...rootEnv, ...localEnv };

  // Extract Supabase info from environment (app-specific with fallback)
  const supabaseUrl = env.VITE_NOVA_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const publicAnonKey = env.VITE_NOVA_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  // Separate URL for edge functions (allows local edge functions with remote Supabase)
  const edgeFunctionsUrl = env.VITE_NOVA_EDGE_FUNCTIONS_URL || supabaseUrl;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
            // Handle /nova/election endpoint
            if (req.url?.startsWith('/nova/election')) {
              const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

              console.log('Proxying nova election request');
              console.log('Query string:', queryString);

              try {
                // Create headers object
                const headers: Record<string, string> = {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Accept': req.headers.accept || '*/*',
                };

                // Construct the full URL (use edgeFunctionsUrl for proxy)
                const targetUrl = `${edgeFunctionsUrl}/functions/v1/nova-election${queryString ? '?' + queryString : ''}`;
                console.log('Target URL:', targetUrl);

                // Make request to Edge Function
                const response = await fetch(targetUrl, {
                  method: req.method || 'GET',
                  headers,
                });

                console.log('Response status:', response.status);

                // Get response as ArrayBuffer
                const responseBuffer = await response.arrayBuffer();
                const responseData = Buffer.from(responseBuffer);

                // Forward response headers
                const responseHeaders: Record<string, string> = {};
                let hasContentLength = false;

                response.headers.forEach((value, key) => {
                  const lowerKey = key.toLowerCase();

                  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                    return;
                  }

                  if (lowerKey === 'content-length') {
                    hasContentLength = true;
                    responseHeaders[key] = responseData.length.toString();
                  } else {
                    responseHeaders[key] = value;
                  }
                });

                if (!hasContentLength) {
                  responseHeaders['Content-Length'] = responseData.length.toString();
                }

                // Write response
                res.writeHead(response.status, responseHeaders);
                res.end(responseData);

              } catch (error) {
                console.error('Proxy error:', error);

                const errorResponse = JSON.stringify({
                  error: 'Proxy error',
                  details: error instanceof Error ? error.message : String(error),
                });

                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(errorResponse).toString(),
                });
                res.end(errorResponse);
              }
            } else if (req.url?.startsWith('/nova/weather')) {
              // Handle /nova/weather endpoint
              const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

              console.log('Proxying nova weather request');
              console.log('Query string:', queryString);

              try {
                // Create headers object
                const headers: Record<string, string> = {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Accept': req.headers.accept || '*/*',
                };

                // Construct the full URL (use edgeFunctionsUrl for proxy)
                const targetUrl = `${edgeFunctionsUrl}/functions/v1/weather_dashboard${queryString ? '?' + queryString : ''}`;
                console.log('Target URL:', targetUrl);

                // Make request to Edge Function
                const response = await fetch(targetUrl, {
                  method: req.method || 'GET',
                  headers,
                });

                console.log('Response status:', response.status);

                // Get response as ArrayBuffer
                const responseBuffer = await response.arrayBuffer();
                const responseData = Buffer.from(responseBuffer);

                // Forward response headers
                const responseHeaders: Record<string, string> = {};
                let hasContentLength = false;

                response.headers.forEach((value, key) => {
                  const lowerKey = key.toLowerCase();

                  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                    return;
                  }

                  if (lowerKey === 'content-length') {
                    hasContentLength = true;
                    responseHeaders[key] = responseData.length.toString();
                  } else {
                    responseHeaders[key] = value;
                  }
                });

                if (!hasContentLength) {
                  responseHeaders['Content-Length'] = responseData.length.toString();
                }

                // Write response
                res.writeHead(response.status, responseHeaders);
                res.end(responseData);

              } catch (error) {
                console.error('Proxy error:', error);

                const errorResponse = JSON.stringify({
                  error: 'Proxy error',
                  details: error instanceof Error ? error.message : String(error),
                });

                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(errorResponse).toString(),
                });
                res.end(errorResponse);
              }
            } else if (req.url?.startsWith('/nova/finance')) {
              // Handle /nova/finance endpoint
              // Query params: type (all|stocks|crypto), change (all|up|down), symbol (symbol name or all)
              const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

              console.log('Proxying nova finance request');
              console.log('Query string:', queryString);

              try {
                // Use Supabase credentials from info file
                // supabaseUrl is already defined at the top level

                // Create headers object
                const headers: Record<string, string> = {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Accept': req.headers.accept || '*/*',
                };

                // Construct the full URL (use edgeFunctionsUrl for proxy)
                const targetUrl = `${edgeFunctionsUrl}/functions/v1/nova-finance${queryString ? '?' + queryString : ''}`;
                console.log('Target URL:', targetUrl);

                // Make request to Edge Function
                const response = await fetch(targetUrl, {
                  method: req.method || 'GET',
                  headers,
                });

                console.log('Response status:', response.status);

                // Get response as ArrayBuffer
                const responseBuffer = await response.arrayBuffer();
                const responseData = Buffer.from(responseBuffer);

                // Forward response headers
                const responseHeaders: Record<string, string> = {};
                let hasContentLength = false;

                response.headers.forEach((value, key) => {
                  const lowerKey = key.toLowerCase();

                  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                    return;
                  }

                  if (lowerKey === 'content-length') {
                    hasContentLength = true;
                    responseHeaders[key] = responseData.length.toString();
                  } else {
                    responseHeaders[key] = value;
                  }
                });

                if (!hasContentLength) {
                  responseHeaders['Content-Length'] = responseData.length.toString();
                }

                // Write response
                res.writeHead(response.status, responseHeaders);
                res.end(responseData);

              } catch (error) {
                console.error('Proxy error:', error);

                const errorResponse = JSON.stringify({
                  error: 'Proxy error',
                  details: error instanceof Error ? error.message : String(error),
                });

                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(errorResponse).toString(),
                });
                res.end(errorResponse);
              }
            } else if (req.url?.startsWith('/nova/sports')) {
              // Handle /nova/sports endpoint
              // Query params: view (teams|standings|players|games|venues|tournaments|betting), league, provider, position (for players), status (for games), season (for standings)
              const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

              console.log('Proxying nova sports request');
              console.log('Query string:', queryString);

              try {
                // Use Supabase credentials from info file
                // supabaseUrl is already defined at the top level

                // Create headers object
                const headers: Record<string, string> = {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Accept': req.headers.accept || '*/*',
                };

                // Construct the full URL (use edgeFunctionsUrl for proxy)
                const targetUrl = `${edgeFunctionsUrl}/functions/v1/nova-sports${queryString ? '?' + queryString : ''}`;
                console.log('Target URL:', targetUrl);

                // Make request to Edge Function
                const response = await fetch(targetUrl, {
                  method: req.method || 'GET',
                  headers,
                });

                console.log('Response status:', response.status);

                // Get response as ArrayBuffer
                const responseBuffer = await response.arrayBuffer();
                const responseData = Buffer.from(responseBuffer);

                // Forward response headers
                const responseHeaders: Record<string, string> = {};
                let hasContentLength = false;

                response.headers.forEach((value, key) => {
                  const lowerKey = key.toLowerCase();

                  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                    return;
                  }

                  if (lowerKey === 'content-length') {
                    hasContentLength = true;
                    responseHeaders[key] = responseData.length.toString();
                  } else {
                    responseHeaders[key] = value;
                  }
                });

                if (!hasContentLength) {
                  responseHeaders['Content-Length'] = responseData.length.toString();
                }

                // Write response
                res.writeHead(response.status, responseHeaders);
                res.end(responseData);

              } catch (error) {
                console.error('Proxy error:', error);

                const errorResponse = JSON.stringify({
                  error: 'Proxy error',
                  details: error instanceof Error ? error.message : String(error),
                });

                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(errorResponse).toString(),
                });
                res.end(errorResponse);
              }
            } else if (req.url?.startsWith('/api/')) {
              const slug = req.url.replace('/api/', '').split('?')[0];
              const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

              console.log('Proxying request to:', slug);
              console.log('Query string:', queryString);

              try {
                // Use Supabase credentials from info file
                // supabaseUrl is already defined at the top level

                // Create headers object
                const headers: Record<string, string> = {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Accept': req.headers.accept || '*/*',
                };

                // Forward custom headers
                const headersToSkip = ['host', 'connection', 'content-length', 'transfer-encoding'];
                Object.entries(req.headers).forEach(([key, value]) => {
                  if (!headersToSkip.includes(key.toLowerCase()) && typeof value === 'string') {
                    headers[key] = value;
                  }
                });

                // Read body if present
                let body: Buffer | undefined = undefined;
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                  body = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => chunks.push(chunk));
                    req.on('end', () => resolve(Buffer.concat(chunks)));
                    req.on('error', reject);
                  });

                  if (body && body.length > 0) {
                    headers['Content-Length'] = body.length.toString();
                    if (!headers['Content-Type'] && !headers['content-type']) {
                      headers['Content-Type'] = 'application/json';
                    }
                  }
                }

                // Construct the full URL (use edgeFunctionsUrl for proxy)
                const targetUrl = `${edgeFunctionsUrl}/functions/v1/api-endpoints/${slug}${queryString ? '?' + queryString : ''}`;
                console.log('Target URL:', targetUrl);

                // Make request to Edge Function
                const response = await fetch(targetUrl, {
                  method: req.method || 'GET',
                  headers,
                  body: body as any || undefined,
                });

                console.log('Response status:', response.status);

                // Get response as ArrayBuffer
                const responseBuffer = await response.arrayBuffer();
                const responseData = Buffer.from(responseBuffer);

                // Forward response headers
                const responseHeaders: Record<string, string> = {};
                let hasContentLength = false;

                response.headers.forEach((value, key) => {
                  const lowerKey = key.toLowerCase();

                  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                    return;
                  }

                  if (lowerKey === 'content-length') {
                    hasContentLength = true;
                    responseHeaders[key] = responseData.length.toString();
                  } else {
                    responseHeaders[key] = value;
                  }
                });

                if (!hasContentLength) {
                  responseHeaders['Content-Length'] = responseData.length.toString();
                }

                // Write response
                res.writeHead(response.status, responseHeaders);
                res.end(responseData);

              } catch (error) {
                console.error('Proxy error:', error);

                const errorResponse = JSON.stringify({
                  error: 'Proxy error',
                  details: error instanceof Error ? error.message : String(error),
                });

                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(errorResponse).toString(),
                });
                res.end(errorResponse);
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'hono@4': 'hono',
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@jsr/supabase__supabase-js@2.49.8': '@jsr/supabase__supabase-js',
        '@jsr/supabase__supabase-js@2': '@jsr/supabase__supabase-js',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_NOVA_PORT || env.VITE_PORT || '5173'),
      open: true,
      watch: {
        ignored: ['**/logs/**'],
      },
    },
	 envDir: '../../', // Load .env from root
  };
});
