---
sidebar_position: 2
---

# Finance Dashboard

The Finance Dashboard provides real-time stock and cryptocurrency monitoring with AI-powered market analysis.

## Overview

Monitor financial markets with:
- Real-time stock price tracking
- Cryptocurrency monitoring
- Historical price charts
- AI-powered market insights
- Custom watchlists

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Stocks | Crypto | Watchlist           Search | AI Insights │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │  AAPL           │  │  MSFT           │                 │
│   │  $178.52  ▲2.3% │  │  $412.78  ▲1.1% │                 │
│   │  ┌───────────┐  │  │  ┌───────────┐  │                 │
│   │  │  Chart    │  │  │  │  Chart    │  │                 │
│   │  └───────────┘  │  │  └───────────┘  │                 │
│   └─────────────────┘  └─────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Stock Tracking

#### Adding Securities
1. Click "Add Stock" button
2. Search by ticker symbol or company name
3. Select from search results
4. Stock appears in your watchlist

#### Stock Information
| Field | Description |
|-------|-------------|
| Symbol | Ticker symbol (e.g., AAPL) |
| Name | Company name |
| Price | Current price |
| Change | Daily price change |
| Change % | Percentage change |
| Volume | Trading volume |
| Market Cap | Market capitalization |

### Cryptocurrency Tracking

#### Supported Cryptocurrencies
- Bitcoin (BTC)
- Ethereum (ETH)
- Major altcoins
- Custom token support

#### Crypto Information
| Field | Description |
|-------|-------------|
| Symbol | Crypto symbol (e.g., BTC) |
| Price | Current USD price |
| 24h Change | 24-hour price change |
| Market Cap | Total market cap |
| Volume | 24-hour trading volume |

### Charts

Interactive price charts with:
- Multiple time ranges (1D, 1W, 1M, 3M, 1Y, ALL)
- Candlestick and line views
- Volume overlay
- Technical indicators

### Watchlists

Organize securities:
- Create custom watchlists
- Drag-and-drop reordering
- Quick add/remove
- Share watchlists

## AI Insights

### Market Analysis
- Trend identification
- Support/resistance levels
- Sector performance
- Correlation analysis

### Alerts
- Price target notifications
- Unusual volume alerts
- Technical signal alerts

### Summaries
- Daily market wrap-up
- Sector performance summaries
- Top movers analysis

## Data Sources

Financial data is aggregated from:
- Major market data providers
- Cryptocurrency exchanges
- Custom data feeds via Agents

### Update Frequency
| Data Type | Update Interval |
|-----------|-----------------|
| Stock Prices | 15-second delay (real-time available) |
| Crypto Prices | Real-time |
| Historical Data | End of day |
| News | As published |

## Field Overrides

Correct financial data when needed:
- Price corrections
- Split adjustments
- Dividend information
- Company name updates

## Best Practices

### Performance
- Limit watchlist to essential securities
- Use filtered views for large portfolios
- Schedule heavy analysis during off-hours

### Accuracy
- Verify unusual price movements
- Cross-reference multiple sources
- Check for data provider outages

## Integration

### Export Options
- CSV export for analysis
- API access for external systems
- Real-time websocket feeds

### Broadcast Integration
Use financial data in broadcast graphics:
1. Select securities to display
2. Configure refresh interval
3. Map data fields to graphics elements

## Next Steps

- [Sports Dashboard](/nova/sports) - Sports data tracking
- [AI Agents](/nova/agents) - Automated data collection
- [Data Sources](/nova/data-sources) - Configure providers
