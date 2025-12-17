import { FinanceDashboardData, FinanceSecurityWithSnapshot } from '../types/finance';

const createFieldOverride = <T,>(value: T) => ({
  value,
  original: value,
  isOverridden: false
});

// Major Indices
const majorIndices: FinanceSecurityWithSnapshot[] = [
  {
    security: {
      id: 'spx_1',
      type: 'INDEX',
      symbol: '^SPX',
      name: {
        value: 'S&P 500 Index',
        original: 'S&P 500',
        isOverridden: true
      },
      currency: 'USD',
      uniqueKey: 'SPX',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'SPX',
      securityId: 'spx_1',
      asof: '2024-10-07T16:00:00Z',
      last: {
        value: 5760.00,
        original: 5751.13,
        isOverridden: true
      },
      changeAbs: createFieldOverride(18.72),
      changePct: createFieldOverride(0.33),
      change1dPct: createFieldOverride(0.33),
      change1wPct: createFieldOverride(0.85),
      change1yPct: createFieldOverride(23.41),
      yearHigh: createFieldOverride(5878.46),
      yearLow: createFieldOverride(4103.78)
    }
  },
  {
    security: {
      id: 'ndx_1',
      type: 'INDEX',
      symbol: '^NDX',
      name: createFieldOverride('NASDAQ 100'),
      currency: 'USD',
      uniqueKey: 'NDX',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'NDX',
      securityId: 'ndx_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(19961.52),
      changeAbs: createFieldOverride(-89.23),
      changePct: createFieldOverride(-0.44),
      change1dPct: createFieldOverride(-0.44),
      change1wPct: createFieldOverride(-1.22),
      change1yPct: createFieldOverride(21.83),
      yearHigh: createFieldOverride(20690.97),
      yearLow: createFieldOverride(14139.76)
    }
  },
  {
    security: {
      id: 'dji_1',
      type: 'INDEX',
      symbol: '^DJI',
      name: createFieldOverride('Dow Jones Industrial Average'),
      currency: 'USD',
      uniqueKey: 'DJIA',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'DJIA',
      securityId: 'dji_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(42352.75),
      changeAbs: createFieldOverride(126.13),
      changePct: createFieldOverride(0.30),
      change1dPct: createFieldOverride(0.30),
      change1wPct: createFieldOverride(1.24),
      change1yPct: createFieldOverride(17.86),
      yearHigh: createFieldOverride(43297.03),
      yearLow: createFieldOverride(31371.73)
    }
  },
  {
    security: {
      id: 'rut_1',
      type: 'INDEX',
      symbol: '^RUT',
      name: createFieldOverride('Russell 2000'),
      currency: 'USD',
      uniqueKey: 'RUT',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'RUT',
      securityId: 'rut_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(2184.35),
      changeAbs: createFieldOverride(5.47),
      changePct: createFieldOverride(0.25),
      change1dPct: createFieldOverride(0.25),
      change1wPct: createFieldOverride(-0.33),
      change1yPct: createFieldOverride(10.89),
      yearHigh: createFieldOverride(2442.74),
      yearLow: createFieldOverride(1636.93)
    }
  }
];

// Crypto
const crypto: FinanceSecurityWithSnapshot[] = [
  {
    security: {
      id: 'btc_1',
      type: 'CRYPTO',
      cgId: 'bitcoin',
      name: createFieldOverride('Bitcoin'),
      currency: 'USD',
      uniqueKey: 'bitcoin',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'BTC-USD',
      securityId: 'btc_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(62847.33),
      changeAbs: createFieldOverride(1247.83),
      changePct: {
        value: 2.50,
        original: 2.03,
        isOverridden: true
      },
      change1dPct: createFieldOverride(2.03),
      change1wPct: createFieldOverride(3.41),
      change1yPct: createFieldOverride(147.52),
      yearHigh: createFieldOverride(73737.94),
      yearLow: createFieldOverride(24797.11)
    },
    cryptoProfile: {
      securityId: 'btc_1',
      cgSymbol: 'btc',
      cgRank: 1,
      cgImage: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      cgCategories: ['cryptocurrency', 'store-of-value']
    }
  },
  {
    security: {
      id: 'eth_1',
      type: 'CRYPTO',
      cgId: 'ethereum',
      name: createFieldOverride('Ethereum'),
      currency: 'USD',
      uniqueKey: 'ethereum',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'ETH-USD',
      securityId: 'eth_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(2431.75),
      changeAbs: createFieldOverride(23.41),
      changePct: createFieldOverride(0.97),
      change1dPct: createFieldOverride(0.97),
      change1wPct: createFieldOverride(-0.82),
      change1yPct: createFieldOverride(8.73),
      yearHigh: createFieldOverride(4091.77),
      yearLow: createFieldOverride(1523.24)
    },
    cryptoProfile: {
      securityId: 'eth_1',
      cgSymbol: 'eth',
      cgRank: 2,
      cgImage: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      cgCategories: ['cryptocurrency', 'smart-contracts']
    }
  },
  {
    security: {
      id: 'sol_1',
      type: 'CRYPTO',
      cgId: 'solana',
      name: createFieldOverride('Solana'),
      currency: 'USD',
      uniqueKey: 'solana',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'SOL-USD',
      securityId: 'sol_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(147.32),
      changeAbs: createFieldOverride(2.15),
      changePct: createFieldOverride(1.48),
      change1dPct: createFieldOverride(1.48),
      change1wPct: createFieldOverride(4.87),
      change1yPct: createFieldOverride(634.71),
      yearHigh: createFieldOverride(263.83),
      yearLow: createFieldOverride(15.36)
    },
    cryptoProfile: {
      securityId: 'sol_1',
      cgSymbol: 'sol',
      cgRank: 5,
      cgImage: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      cgCategories: ['cryptocurrency', 'layer-1']
    }
  },
  {
    security: {
      id: 'xrp_1',
      type: 'CRYPTO',
      cgId: 'ripple',
      name: createFieldOverride('XRP'),
      currency: 'USD',
      uniqueKey: 'ripple',
      status: createFieldOverride('inactive' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'XRP-USD',
      securityId: 'xrp_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(0.5247),
      changeAbs: createFieldOverride(0.0041),
      changePct: createFieldOverride(0.79),
      change1dPct: createFieldOverride(0.79),
      change1wPct: createFieldOverride(-2.31),
      change1yPct: createFieldOverride(-3.84),
      yearHigh: createFieldOverride(0.7411),
      yearLow: createFieldOverride(0.3804)
    },
    cryptoProfile: {
      securityId: 'xrp_1',
      cgSymbol: 'xrp',
      cgRank: 6,
      cgImage: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
      cgCategories: ['cryptocurrency', 'payments']
    }
  }
];

// Dow Jones 30 Components (abbreviated for brevity)
const dowComponents: FinanceSecurityWithSnapshot[] = [
  {
    security: {
      id: 'aapl_1',
      type: 'EQUITY',
      symbol: 'AAPL',
      name: createFieldOverride('Apple Inc.'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'AAPL',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'AAPL',
      securityId: 'aapl_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(220.70),
      changeAbs: createFieldOverride(2.25),
      changePct: createFieldOverride(1.03),
      change1dPct: createFieldOverride(1.03),
      change1wPct: createFieldOverride(0.91),
      change1yPct: createFieldOverride(14.85),
      yearHigh: createFieldOverride(237.23),
      yearLow: createFieldOverride(164.08)
    },
    analystRating: {
      id: 'aapl_rating_1',
      securityId: 'aapl_1',
      source: 'Consensus',
      rating: createFieldOverride('Buy'),
      score: createFieldOverride(2.3),
      ratingCount: 42,
      targetPrice: createFieldOverride(245.50),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  },
  {
    security: {
      id: 'msft_1',
      type: 'EQUITY',
      symbol: 'MSFT',
      name: createFieldOverride('Microsoft Corporation'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'MSFT',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'MSFT',
      securityId: 'msft_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(416.42),
      changeAbs: createFieldOverride(-1.88),
      changePct: createFieldOverride(-0.45),
      change1dPct: createFieldOverride(-0.45),
      change1wPct: createFieldOverride(-0.23),
      change1yPct: createFieldOverride(10.71),
      yearHigh: createFieldOverride(468.35),
      yearLow: createFieldOverride(309.45)
    },
    analystRating: {
      id: 'msft_rating_1',
      securityId: 'msft_1',
      source: 'Consensus',
      rating: createFieldOverride('Buy'),
      score: createFieldOverride(2.1),
      ratingCount: 38,
      targetPrice: createFieldOverride(475.00),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  },
  {
    security: {
      id: 'nvda_1',
      type: 'EQUITY',
      symbol: 'NVDA',
      name: createFieldOverride('NVIDIA Corporation'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'NVDA',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'NVDA',
      securityId: 'nvda_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(118.11),
      changeAbs: createFieldOverride(-2.67),
      changePct: createFieldOverride(-2.21),
      change1dPct: createFieldOverride(-2.21),
      change1wPct: createFieldOverride(-3.45),
      change1yPct: createFieldOverride(173.85),
      yearHigh: createFieldOverride(140.76),
      yearLow: createFieldOverride(39.23)
    },
    analystRating: {
      id: 'nvda_rating_1',
      securityId: 'nvda_1',
      source: 'Consensus',
      rating: createFieldOverride('Strong Buy'),
      score: createFieldOverride(1.8),
      ratingCount: 51,
      targetPrice: createFieldOverride(155.00),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  },
  {
    security: {
      id: 'googl_1',
      type: 'EQUITY',
      symbol: 'GOOGL',
      name: createFieldOverride('Alphabet Inc.'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'GOOGL',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'GOOGL',
      securityId: 'googl_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(162.28),
      changeAbs: createFieldOverride(0.73),
      changePct: createFieldOverride(0.45),
      change1dPct: createFieldOverride(0.45),
      change1wPct: createFieldOverride(-1.12),
      change1yPct: createFieldOverride(21.47),
      yearHigh: createFieldOverride(191.75),
      yearLow: createFieldOverride(129.40)
    },
    analystRating: {
      id: 'googl_rating_1',
      securityId: 'googl_1',
      source: 'Consensus',
      rating: createFieldOverride('Buy'),
      score: createFieldOverride(2.0),
      ratingCount: 44,
      targetPrice: createFieldOverride(190.00),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  },
  {
    security: {
      id: 'amzn_1',
      type: 'EQUITY',
      symbol: 'AMZN',
      name: createFieldOverride('Amazon.com Inc.'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'AMZN',
      status: createFieldOverride('active' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'AMZN',
      securityId: 'amzn_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(178.25),
      changeAbs: createFieldOverride(1.23),
      changePct: createFieldOverride(0.70),
      change1dPct: createFieldOverride(0.70),
      change1wPct: createFieldOverride(2.15),
      change1yPct: createFieldOverride(30.42),
      yearHigh: createFieldOverride(201.20),
      yearLow: createFieldOverride(118.35)
    },
    analystRating: {
      id: 'amzn_rating_1',
      securityId: 'amzn_1',
      source: 'Consensus',
      rating: createFieldOverride('Buy'),
      score: createFieldOverride(2.2),
      ratingCount: 47,
      targetPrice: createFieldOverride(210.00),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  },
  {
    security: {
      id: 'tsla_1',
      type: 'EQUITY',
      symbol: 'TSLA',
      name: createFieldOverride('Tesla Inc.'),
      exchangeId: 2,
      currency: 'USD',
      uniqueKey: 'TSLA',
      status: createFieldOverride('inactive' as const),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    snapshot: {
      key: 'TSLA',
      securityId: 'tsla_1',
      asof: '2024-10-07T16:00:00Z',
      last: createFieldOverride(240.83),
      changeAbs: createFieldOverride(-2.44),
      changePct: createFieldOverride(-1.00),
      change1dPct: createFieldOverride(-1.00),
      change1wPct: createFieldOverride(-3.12),
      change1yPct: createFieldOverride(-14.73),
      yearHigh: createFieldOverride(271.00),
      yearLow: createFieldOverride(138.80)
    },
    analystRating: {
      id: 'tsla_rating_1',
      securityId: 'tsla_1',
      source: 'Consensus',
      rating: createFieldOverride('Hold'),
      score: createFieldOverride(2.8),
      ratingCount: 35,
      targetPrice: createFieldOverride(220.00),
      lastUpdated: '2024-10-07T09:00:00Z'
    }
  }
];

export const mockFinanceData: FinanceDashboardData = {
  securities: [...majorIndices, ...crypto, ...dowComponents],
  watchlists: [
    {
      id: 'default_watchlist',
      userId: 'user_1',
      name: createFieldOverride('My Watchlist'),
      createdAt: '2024-01-01T00:00:00Z'
    }
  ],
  lastUpdated: new Date().toISOString()
};