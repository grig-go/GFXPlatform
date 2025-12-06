---
sidebar_position: 5
---

# AI Configuration

Configure the AI model and API keys for the Nova GFX AI Assistant. Multiple AI providers are supported with different model options.

## Accessing Settings

1. Click the **⚙️** settings icon in the AI chat panel header
2. Or access via **Settings → AI Configuration** in the menu

## Settings Dialog

```
┌─────────────────────────────────────────────────────┐
│  AI Model Settings                             ✕    │
├─────────────────────────────────────────────────────┤
│  Select AI Model                                    │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Google Gemini  │  │  Anthropic      │          │
│  │  ✓ Selected     │  │  Claude         │          │
│  └─────────────────┘  └─────────────────┘          │
├─────────────────────────────────────────────────────┤
│  Gemini Models                                      │
│  (●) gemini-2.5-flash (Recommended)                │
│  ( ) gemini-2.5-pro (Most Capable)                 │
│  ( ) gemini-2.0-flash (Default)                    │
├─────────────────────────────────────────────────────┤
│  API Configuration                                  │
│                                                     │
│  Gemini API Key                                     │
│  [••••••••••••••••••••••••••]  👁️                   │
│  ✓ Using environment variable                       │
│                                                     │
│  Claude API Key                                     │
│  [________________________]  👁️                     │
│  ⚠ Not configured                                  │
├─────────────────────────────────────────────────────┤
│  Status: ✓ Ready (Gemini gemini-2.5-flash)         │
├─────────────────────────────────────────────────────┤
│       [Reset to Defaults]            [Save Changes] │
└─────────────────────────────────────────────────────┘
```

## Supported Providers

### Google Gemini

| Model | Description | Best For |
|-------|-------------|----------|
| `gemini-2.5-flash` | Fast and capable | **Recommended** for most use |
| `gemini-2.5-pro` | Most capable | Complex creative tasks |
| `gemini-2.0-flash` | Standard model | Basic operations |

### Anthropic Claude

| Model | Description | Best For |
|-------|-------------|----------|
| `opus-advanced` | Most capable | Complex design reasoning |
| `haiku-instant` | Fastest | Quick edits, simple tasks |

## API Key Configuration

### Environment Variables

Set API keys in your `.env` file:

```env
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_CLAUDE_API_KEY=your-claude-api-key
```

Environment variables are the recommended approach for:
- Team deployments
- Consistent configuration
- Secure key management

### Local Override

Enter keys directly in the settings dialog:
- Keys stored in browser localStorage
- Override environment variables
- Persists per browser/device

### Key Priority

1. **Settings Dialog** (localStorage) - Highest priority
2. **Environment Variable** - Fallback
3. **Not Configured** - AI features disabled

## Getting API Keys

### Google Gemini

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key
5. Paste in Nova GFX settings or `.env`

### Anthropic Claude

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key
6. Paste in Nova GFX settings or `.env`

## Status Indicators

| Status | Indicator | Meaning |
|--------|-----------|---------|
| Ready | ✓ Green | API key configured, model active |
| Missing Key | ⚠ Amber | No API key for selected model |
| Using Env | ✓ Checkmark | Environment variable in use |
| Not Configured | - | No key entered |

## Model Selection

### Choosing a Model

Consider these factors:

| Factor | Gemini Flash | Gemini Pro | Claude Opus | Claude Haiku |
|--------|--------------|------------|-------------|--------------|
| Speed | Fast | Moderate | Moderate | Fastest |
| Capability | High | Highest | Highest | Good |
| Cost | Low | Higher | Higher | Lowest |
| Creative | Good | Excellent | Excellent | Good |

### Recommendations

| Use Case | Recommended Model |
|----------|-------------------|
| Daily design work | Gemini 2.5 Flash |
| Complex layouts | Gemini 2.5 Pro or Claude Opus |
| Quick edits | Claude Haiku |
| Production use | Gemini 2.5 Flash |

## Configuration Persistence

### Settings Storage

| Setting | Storage Location |
|---------|------------------|
| Selected Model | Application state |
| Gemini API Key | `localStorage: nova-gemini-api-key` |
| Claude API Key | `localStorage: nova-claude-api-key` |

### Reset to Defaults

Click **Reset to Defaults** to:
- Clear localStorage API keys
- Reset model to default selection
- Revert to environment variable keys (if set)

## Security Considerations

### API Key Safety

- **Never share** API keys publicly
- **Use environment variables** for team deployments
- **Rotate keys** periodically
- **Monitor usage** in provider dashboards

### Local Storage

When using localStorage:
- Keys stored in browser only
- Not synced across devices
- Cleared when browser data is cleared
- Accessible to browser extensions

### Best Practices

1. **Development**: Use localStorage for personal testing
2. **Production**: Use environment variables
3. **Team**: Configure at deployment level
4. **Security**: Never commit keys to version control

## Troubleshooting

### AI Not Responding

1. Check status indicator shows "Ready"
2. Verify API key is configured
3. Check browser console for errors
4. Try a different model

### Invalid API Key

1. Verify key is copied correctly
2. Check for extra spaces
3. Ensure key is active in provider dashboard
4. Try generating a new key

### Rate Limits

If hitting rate limits:
- Switch to a different model temporarily
- Wait a few minutes
- Consider upgrading API plan
- Reduce request frequency

### Model Not Available

If a model shows as unavailable:
- Check provider status page
- Model may have been deprecated
- Try selecting a different model
- Update application if needed

## Related Features

- [AI Assistant](/docs/features/ai-assistant) - Using the AI chat
- [Design Guidelines](/docs/features/design-guidelines) - AI context configuration
