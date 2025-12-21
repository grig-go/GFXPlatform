/**
 * AI Provider Types
 * 
 * Defines types for AI API providers used in Nova Dashboard
 * Supports both text and image generation APIs
 */

export type AIProviderType = 'text' | 'image' | 'video' | 'multimodal';

export type AIProviderName = 
  | 'claude' 
  | 'openai' 
  | 'gemini' 
  | 'mistral' 
  | 'cohere'
  | 'stability'
  | 'midjourney'
  | 'dalle'
  | 'runway'
  | 'pika'
  | 'custom';

export type DashboardType = 'elections' | 'finance' | 'sports' | 'weather' | 'news' | 'agents' | 'nova' | 'pulsar-mcr' | 'pulsar-gfx' | 'pulsar-vs' | 'fusion' | 'feeds' | 'ai-connections' | 'media-library' | 'school-closings' | 'nova-gfx';

// Dashboards that support AI provider assignments
export type AssignableDashboardType = 'elections' | 'finance' | 'sports' | 'weather' | 'news' | 'agents' | 'pulsar-mcr' | 'pulsar-gfx' | 'pulsar-vs' | 'fusion' | 'media-library' | 'school-closings' | 'nova-gfx';

export interface DashboardAssignment {
  dashboard: AssignableDashboardType;
  textProvider?: boolean;
  imageProvider?: boolean;
  videoProvider?: boolean;
  imageEditProvider?: boolean;  // For image editing functions (e.g., Pulsar VS)
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  capabilities?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  providerName: AIProviderName;
  type: AIProviderType;
  description: string;
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  model?: string;
  availableModels?: AIModel[];
  enabled: boolean;
  rateLimitPerMinute?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  dashboardAssignments?: DashboardAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderConfig {
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  model?: string;
  rateLimitPerMinute?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface AIProviderWithMaskedKey extends Omit<AIProvider, 'apiKey' | 'apiSecret'> {
  apiKeyMasked: string;
  apiSecretMasked?: string;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
}

export interface AIProvidersData {
  providers: AIProvider[];
  lastUpdated: string;
}

export const AI_PROVIDER_METADATA: Record<AIProviderName, {
  displayName: string;
  defaultEndpoint?: string;
  supportsText: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
  defaultModel?: string;
  requiresSecret?: boolean;
  supportsDynamicModels?: boolean; // Can fetch models via API
}> = {
  claude: {
    displayName: 'Anthropic Claude',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    supportsText: true,
    supportsImage: false,
    supportsVideo: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
    requiresSecret: false,
    supportsDynamicModels: true,
  },
  openai: {
    displayName: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    supportsText: true,
    supportsImage: true,
    supportsVideo: false,
    defaultModel: 'gpt-4o',
    requiresSecret: false,
    supportsDynamicModels: true,
  },
  gemini: {
    displayName: 'Google Gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    defaultModel: 'gemini-2.0-flash-exp',
    requiresSecret: false,
    supportsDynamicModels: true,
  },
  mistral: {
    displayName: 'Mistral AI',
    defaultEndpoint: 'https://api.mistral.ai/v1',
    supportsText: true,
    supportsImage: false,
    supportsVideo: false,
    defaultModel: 'mistral-large-latest',
    requiresSecret: false,
    supportsDynamicModels: true,
  },
  cohere: {
    displayName: 'Cohere',
    defaultEndpoint: 'https://api.cohere.ai/v1',
    supportsText: true,
    supportsImage: false,
    supportsVideo: false,
    defaultModel: 'command-r-plus',
    requiresSecret: false,
    supportsDynamicModels: true,
  },
  stability: {
    displayName: 'Stability AI',
    defaultEndpoint: 'https://api.stability.ai/v1',
    supportsText: false,
    supportsImage: true,
    supportsVideo: false,
    defaultModel: 'stable-diffusion-xl-1024-v1-0',
    requiresSecret: false,
    supportsDynamicModels: false,
  },
  midjourney: {
    displayName: 'Midjourney',
    supportsText: false,
    supportsImage: true,
    supportsVideo: false,
    requiresSecret: false,
    supportsDynamicModels: false,
  },
  dalle: {
    displayName: 'DALL-E',
    defaultEndpoint: 'https://api.openai.com/v1/images/generations',
    supportsText: false,
    supportsImage: true,
    supportsVideo: false,
    defaultModel: 'dall-e-3',
    requiresSecret: false,
    supportsDynamicModels: false,
  },
  runway: {
    displayName: 'Runway',
    defaultEndpoint: 'https://api.runwayml.com/v1',
    supportsText: false,
    supportsImage: false,
    supportsVideo: true,
    defaultModel: 'gen-3',
    requiresSecret: false,
    supportsDynamicModels: false,
  },
  pika: {
    displayName: 'Pika',
    supportsText: false,
    supportsImage: false,
    supportsVideo: true,
    requiresSecret: false,
    supportsDynamicModels: false,
  },
  custom: {
    displayName: 'Custom Provider',
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    requiresSecret: false,
    supportsDynamicModels: false,
  },
};

export const DASHBOARD_LABELS: Record<DashboardType, string> = {
  elections: 'Elections',
  finance: 'Finance',
  sports: 'Sports',
  weather: 'Weather',
  news: 'News',
  agents: 'Agents',
  nova: 'Nova',
  'nova-gfx': 'Nova GFX',
  'pulsar-mcr': 'Pulsar MCR',
  'pulsar-gfx': 'Pulsar GFX',
  'pulsar-vs': 'Pulsar VS',
  fusion: 'Fusion',
  feeds: 'Data Feeds',
  'ai-connections': 'AI Connections',
  'media-library': 'Media Library',
  'school-closings': 'School Closings',
};

// Labels for dashboards that support AI assignments
export const ASSIGNABLE_DASHBOARD_LABELS: Record<AssignableDashboardType, string> = {
  elections: 'Elections',
  finance: 'Finance',
  sports: 'Sports',
  weather: 'Weather',
  news: 'News',
  agents: 'Agents',
  'nova-gfx': 'Nova GFX',
  'pulsar-mcr': 'Pulsar MCR',
  'pulsar-gfx': 'Pulsar GFX',
  'pulsar-vs': 'Pulsar VS',
  fusion: 'Fusion',
  'media-library': 'Media Library',
  'school-closings': 'School Closings',
};

// Hardcoded model lists for image providers without API endpoints
export const DALLE_MODELS: AIModel[] = [
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'Latest image generation model with improved quality',
    capabilities: ['image'],
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: 'Previous generation image model',
    capabilities: ['image'],
  },
];

export const STABILITY_MODELS: AIModel[] = [
  {
    id: 'stable-diffusion-xl-1024-v1-0',
    name: 'Stable Diffusion XL',
    description: 'High quality 1024x1024 images',
    capabilities: ['image'],
  },
  {
    id: 'stable-diffusion-v1-6',
    name: 'Stable Diffusion v1.6',
    description: 'Standard quality image generation',
    capabilities: ['image'],
  },
];

// Helper to get all providers that support dynamic model fetching
export const getProvidersWithDynamicModels = (): AIProviderName[] => {
  return Object.entries(AI_PROVIDER_METADATA)
    .filter(([_, metadata]) => metadata.supportsDynamicModels === true)
    .map(([name, _]) => name as AIProviderName);
};