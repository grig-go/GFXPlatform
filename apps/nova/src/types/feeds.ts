export type FeedType = 'REST API' | 'Database' | 'File' | 'Webhook';
export type FeedCategory = 'Elections' | 'Finance' | 'Sports' | 'Weather' | 'News';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type FileFormat = 'json' | 'csv' | 'xml';

// Configuration types for each feed type
export interface RestApiConfig {
  apiUrl: string;
  httpMethod: HttpMethod;
  dataPath: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface DatabaseConfig {
  host: string;
  port: string;
  databaseName: string;
  query: string;
}

export interface FileConfig {
  filePath: string;
  format: FileFormat;
}

export interface WebhookConfig {
  webhookUrl: string;
  secret: string;
}

export type FeedConfiguration = RestApiConfig | DatabaseConfig | FileConfig | WebhookConfig;

export interface Feed {
  id: string;
  name: string;
  type: FeedType;
  category: FeedCategory;
  active: boolean;
  configuration: FeedConfiguration;
  created: string;
  icon?: string;
}

export interface FeedsData {
  feeds: Feed[];
  lastUpdated: string;
}
