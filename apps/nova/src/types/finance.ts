// Finance Types based on the PostgreSQL schema

export type SecurityType = 'EQUITY' | 'ETF' | 'INDEX' | 'CRYPTO';
export type BarTimeframe = '1Min' | '5Min' | '15Min' | '1Hour' | '1Day';

// Field Override Pattern (same as election)
export interface FieldOverride<T> {
  value: T;
  original: T;
  isOverridden: boolean;
}

// Core Security
export interface Security {
  id: string;
  type: SecurityType;
  symbol?: string;                 // equities/etfs: AAPL; indexes might be ^DJI or NULL
  cgId?: string;                  // CoinGecko coin id for crypto, e.g., "bitcoin"
  name: FieldOverride<string>;
  exchangeId?: number;
  currency: string;
  uniqueKey: string;              // canonical key
  status: FieldOverride<'active' | 'inactive'>;
  createdAt: string;
  updatedAt: string;
}

// Market Data Snapshot
export interface MarketSnapshot {
  key: string;                    // e.g., 'DJIA','SPX','NDX','CRYPTO_TOP'
  securityId: string;
  asof: string;
  last: FieldOverride<number>;
  changeAbs: FieldOverride<number>;
  changePct: FieldOverride<number>;
  change1dPct?: FieldOverride<number>;
  change1wPct?: FieldOverride<number>;
  change1yPct?: FieldOverride<number>;
  yearHigh?: FieldOverride<number>;
  yearLow?: FieldOverride<number>;
  meta?: Record<string, any>;
}

// Analyst Rating
export interface AnalystRating {
  id: string;
  securityId: string;
  source: string;                 // e.g., "Finnhub","Yahoo","TipRanks"
  rating: FieldOverride<string>;  // "Buy","Hold","Sell"
  score: FieldOverride<number>;   // e.g., 1.0–5.0 consensus
  ratingCount: number;
  targetPrice: FieldOverride<number>;
  lastUpdated: string;
}

// Crypto Profile
export interface CryptoProfile {
  securityId: string;
  cgSymbol: string;               // e.g., "btc"
  cgRank: number;
  cgImage: string;                // url
  cgCategories: string[];
}

// Watchlist
export interface Watchlist {
  id: string;
  userId: string;
  name: FieldOverride<string>;
  createdAt: string;
}

// Watchlist Item
export interface WatchlistItem {
  watchlistId: string;
  securityId: string;
  position?: number;              // display order
  addedAt: string;
}

// Combined Security with Snapshot and Optional Related Data
export interface FinanceSecurityWithSnapshot {
  security: Security;
  snapshot: MarketSnapshot;
  analystRating?: AnalystRating;
  cryptoProfile?: CryptoProfile;
}

// Dashboard Data Structure
export interface FinanceDashboardData {
  securities: FinanceSecurityWithSnapshot[];
  watchlists: Watchlist[];
  lastUpdated: string;
}

// Market Summary Stats
export interface MarketSummary {
  totalSecurities: number;
  gainers: number;
  losers: number;
  unchanged: number;
  cryptoCount: number;
  etfCount: number;
  stocksAndIndicesCount: number;
  indexCount?: number;
  equityCount?: number;
  securitiesWithOverrides?: number;
  totalOverriddenFields?: number;
}

// Helper functions for working with overrides
export function isFieldOverridden<T>(field: T | FieldOverride<T>): field is FieldOverride<T> {
  return typeof field === 'object' && field !== null && 'isOverridden' in field;
}

export function getFieldValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.isOverridden ? field.value : field.original;
  }
  return field;
}

export function getOriginalValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.original;
  }
  return field;
}

export function createOverride<T>(originalValue: T, overriddenValue: T): FieldOverride<T> {
  return {
    value: overriddenValue,
    original: originalValue,
    isOverridden: true
  };
}

export function revertOverride<T>(field: FieldOverride<T>): T {
  return field.original;
}