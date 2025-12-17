# Legacy TLS Proxy Server

A simple Node.js proxy server that handles connections to legacy servers with outdated TLS configurations.

## Why?

Deno Deploy (used by Supabase Edge Functions) has strict TLS requirements that don't allow connections to servers using old TLS versions. This proxy runs in a standard Node.js environment where we can configure legacy TLS support.

## Local Development

```bash
cd legacy-tls-proxy
npm install
npm start
```

Test it:
```bash
curl "http://localhost:3000/proxy?url=https://schoolclosing.cablevision.com/schools/closings.asmx/GetClosings?sOrganizationName=&sRegionId=60&sZoneId="
```

## Deployment Options

### Option 1: Railway.app (Recommended - Free Tier)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository and the `legacy-tls-proxy` folder
5. Railway will auto-detect Node.js and deploy
6. Get your public URL (e.g., `https://your-app.railway.app`)

### Option 2: Render.com (Free Tier)
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Root Directory**: `legacy-tls-proxy`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Deploy and get your URL

### Option 3: Vercel (Free Tier)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in the `legacy-tls-proxy` directory
3. Follow prompts to deploy

## Usage in Supabase Edge Function

Once deployed, update your edge function to use the proxy:

```typescript
const proxyUrl = 'https://your-proxy.railway.app';
const targetUrl = 'https://schoolclosing.cablevision.com/schools/closings.asmx/GetClosings?sOrganizationName=&sRegionId=60&sZoneId=';
const response = await fetch(`${proxyUrl}/proxy?url=${encodeURIComponent(targetUrl)}`);
const xmlText = await response.text();
```

## Environment Variables

None required for basic usage.

## Security Notes

- This proxy disables certificate validation (`rejectUnauthorized: false`)
- Only use this for accessing specific legacy servers you trust
- Consider adding authentication or IP whitelisting in production
