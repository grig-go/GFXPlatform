import { FieldOverride } from './election';

// Core news article interfaces
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  full_content?: string;
  url: string;
  published_at: string;
  updated_at?: string;
  source: NewsSource;
  author?: string;
  taxonomy: NewsTaxonomy;
  flags: NewsFlags;
  metrics?: NewsMetrics;
  media?: NewsMedia[];
}

export interface NewsMedia {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
}

export interface NewsSource {
  id: string;
  name: string;
  publisher_domain: string;
  provider: 'ap_enps' | 'newsapi' | 'newsdata';
  credibility_score: number;
  country?: string;
  language: string;
}

export interface NewsTaxonomy {
  topics: string[];
  tags: string[];
  categories: string[];
  entities?: NewsEntity[];
}

export interface NewsEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'event';
  confidence: number;
}

export interface NewsFlags {
  is_breaking: boolean;
  is_live: boolean;
  is_opinion: boolean;
  is_sponsored: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface NewsMetrics {
  engagement_score: number;
  social_shares: number;
  click_through_rate: number;
  reading_time_minutes: number;
}

// Cluster and filtering interfaces
export interface NewsCluster {
  id: string;
  name: string;
  description: string;
  filters: NewsClusterFilters;
  scoring?: NewsClusterScoring;
  display: NewsClusterDisplay;
  articles: NewsArticleWithOverrides[];
  article_count: number;
  last_updated: string;
}

export interface NewsClusterFilters {
  must: string[];
  should?: string[];
  must_not?: string[];
  providers?: string[];
  countries?: string[];
  languages?: string[];
  time_window: { hours: number };
}

export interface NewsClusterScoring {
  boosts?: NewsScoreBoost[];
  demotions?: NewsScoreBoost[];
}

export interface NewsScoreBoost {
  field: string;
  value: string | boolean | number;
  weight: number;
}

export interface NewsClusterDisplay {
  layout: 'clustered' | 'grid' | 'list' | 'ticker' | 'hero+list';
  accent_color: string;
}

// UI and navigation interfaces
export interface NewsTab {
  id: string;
  title: string;
  default_feed_id: string;
  clusters: string[];
}

export interface NewsFilters {
  search: string;
  cluster: string;
  provider: 'all' | 'ap_enps' | 'newsapi' | 'newsdata';
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  timeRange: 'all' | 'last_hour' | 'last_6_hours' | 'last_24_hours' | 'last_week';
  showBreaking: boolean;
  showOverrides: boolean;
}

// Override tracking
export interface NewsArticleWithOverrides {
  article: NewsArticle;
  overrides: FieldOverride<NewsArticle>[];
  primaryProvider: string;
  alternativeProviders: string[];
  lastModified: string;
}

// Main data structure
export interface NewsData {
  clusters: NewsCluster[];
  tabs: NewsTab[];
  lastUpdated: string;
  providers: NewsSource[];
}

// View types
export type NewsView = 'clusters' | 'breaking' | 'trending' | 'sources';

// Feed configuration interface
export interface NewsFeedConfig {
  cluster_presets: NewsClusterPreset[];
  ui_tabs: NewsTab[];
}

export interface NewsClusterPreset {
  id: string;
  name: string;
  description: string;
  filters: NewsClusterFilters;
  routing?: {
    priority: string[];
  };
  scoring?: NewsClusterScoring;
  display: NewsClusterDisplay;
}