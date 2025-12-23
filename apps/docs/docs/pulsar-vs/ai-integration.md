---
sidebar_position: 4
---

# AI Integration

Pulsar VS includes AI-powered features to enhance your virtual production workflow.

## Overview

AI integration in Pulsar VS provides:
- Intelligent scene suggestions
- Automated content generation
- Natural language control
- Smart scheduling recommendations

## AI Providers

### Supported Providers

Configure AI providers in **Settings > AI Providers**:

| Provider | Models | Features |
|----------|--------|----------|
| **OpenAI** | GPT-4, GPT-4 Turbo | Text generation, analysis |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | Text generation, reasoning |
| **Google** | Gemini Pro | Text generation, multimodal |

### Configuration

1. Navigate to **Settings > AI Providers**
2. Select a provider
3. Enter your API key
4. Test the connection
5. Set as default (optional)

```yaml
Provider: OpenAI
API Key: sk-...
Model: gpt-4-turbo
Temperature: 0.7
Max Tokens: 2000
```

## AI Chat Assistant

### Accessing the Assistant

The AI chat interface is available throughout the application:
- Click the AI icon in the toolbar
- Use keyboard shortcut `Ctrl+Shift+A`
- Access from the Help menu

### Capabilities

| Feature | Description |
|---------|-------------|
| **Scene Suggestions** | Recommend virtual set configurations |
| **Content Ideas** | Generate content for graphics |
| **Troubleshooting** | Help diagnose issues |
| **Workflow Tips** | Optimize your production process |

### Example Prompts

```
"Suggest a virtual set for a morning news show"

"What's the best camera angle for an interview setup?"

"Help me create a playlist for election night coverage"

"How do I schedule items to play only on weekdays?"
```

## AI Prompt Settings

### Custom Prompts

Configure AI behavior with custom system prompts:

1. Go to **Settings > AI Prompt Settings**
2. Edit system prompts for different contexts
3. Save your configurations

### Context-Aware Assistance

The AI adapts based on your current context:
- **Virtual Set** - Suggestions for environment configuration
- **Playlist** - Help with scheduling and organization
- **Content** - Assistance with text and media

### Prompt Templates

Create reusable prompt templates:

```markdown
# Morning Show Setup
You are helping configure a morning news virtual set.
Consider: bright lighting, energetic colors, news desk layout.
Suggest appropriate floor, wall, and decoration options.
```

## Smart Suggestions

### Virtual Set Recommendations

AI analyzes your needs and suggests:
- Environment configurations
- Lighting setups
- Camera positions
- Color schemes

### Scheduling Optimization

Get intelligent scheduling suggestions:
- Optimal time slots based on content type
- Conflict detection and resolution
- Priority recommendations

### Content Enhancement

AI can help with:
- Improving text content
- Suggesting alternative wording
- Checking for consistency

## Integration with Nova

### Data-Driven Suggestions

Connect with Nova dashboards for intelligent recommendations:

| Dashboard | AI Capability |
|-----------|---------------|
| **Weather** | Suggest environment based on conditions |
| **Sports** | Recommend set themes for games |
| **Elections** | Configure for coverage type |
| **News** | Adapt set for story tone |

### Example Workflow

1. Weather data shows sunny day
2. AI suggests outdoor virtual environment
3. Lighting automatically adjusts
4. Graphics update with weather data

## API Integration

### Edge Function Support

AI features are powered by Supabase Edge Functions:

```typescript
// AI chat request
const response = await fetch('/functions/v1/ai-chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Suggest a virtual set for sports coverage',
    context: { type: 'virtual-set', project: projectId }
  })
});
```

### Rate Limiting

API calls are rate-limited per organization:
- Standard: 100 requests/minute
- Premium: 500 requests/minute

## Privacy & Security

### Data Handling

- Prompts sent to AI providers as configured
- Responses cached for performance
- No personal data stored by AI providers
- Organization-level API key management

### API Key Security

- Keys stored encrypted in database
- Server-side proxy for all AI calls
- Keys never exposed to client
- Audit logging of AI usage

## Best Practices

### Effective Prompts

- Be specific about your needs
- Provide context about your show
- Ask for multiple options
- Request explanations

### AI-Assisted Workflow

1. Start with AI suggestions
2. Customize based on your needs
3. Save successful configurations
4. Build a library of presets

### Cost Management

- Monitor API usage in settings
- Set usage alerts
- Use caching effectively
- Choose appropriate models for tasks

## Troubleshooting

### AI Not Responding

1. Verify API key is configured
2. Check provider status
3. Test connection in settings
4. Review error messages

### Poor Suggestions

1. Provide more context in prompts
2. Try different providers/models
3. Adjust temperature setting
4. Review custom prompt configuration

### High Latency

1. Use streaming responses
2. Choose faster models
3. Reduce max tokens
4. Check network connectivity
