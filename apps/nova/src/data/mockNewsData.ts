import { NewsData, NewsArticleWithOverrides, NewsCluster } from '../types/news';

// Mock news articles with realistic data
const mockArticles: NewsArticleWithOverrides[] = [
  // Articles from user payload - properly transformed
  {
    article: {
      id: "ap_20251007_001",
      title: "Apple and MLS Renew Exclusive Broadcast Deal Through 2033",
      summary: "Apple has renewed its $2.5B deal with MLS, securing exclusive streaming rights through 2033. The deal includes expanded behind-the-scenes content and a new multilingual highlights hub.",
      full_content: "Apple Inc. and Major League Soccer have announced the renewal of their groundbreaking streaming partnership, extending the exclusive rights agreement through the 2033 season. The expanded $2.5 billion deal represents one of the largest media rights agreements in MLS history and solidifies Apple TV as the home for soccer fans worldwide.\n\nThe renewed partnership introduces several significant enhancements to the viewing experience. Apple will launch a new multilingual highlights hub, featuring content in Spanish, French, and Portuguese to serve MLS's diverse global fanbase. Additionally, the deal includes unprecedented behind-the-scenes access, with Apple producing original documentary content following select teams throughout the season.\n\n'This partnership has transformed how fans experience MLS,' said Eddy Cue, Apple's senior vice president of Services. 'The renewal allows us to continue innovating and bring even more immersive content to soccer fans around the world.'\n\nThe agreement also expands Apple's commitment to youth soccer development, with the company pledging $50 million toward grassroots programs and academy partnerships across North America. These initiatives will be featured in a new documentary series highlighting the next generation of soccer talent.\n\nTechnical enhancements include expanded 4K coverage for all matches, new camera angles powered by machine learning, and real-time statistics integration. The platform will also introduce interactive features allowing fans to customize their viewing experience with multiple audio tracks and statistical overlays.\n\nMLS Commissioner Don Garber emphasized the partnership's impact on the league's growth: 'Apple's investment in MLS has been transformational. This extension ensures we can continue building soccer's future in North America while reaching new audiences globally.'\n\nThe deal begins with the 2026 season and includes streaming rights for all regular season matches, playoffs, and MLS Cup. International distribution will expand to over 100 countries, with localized content and commentary in multiple languages.",
      url: "https://apnews.com/article/apple-mls-renewal-deal-2033",
      published_at: "2025-10-07T10:15:00Z",
      author: "Rachel Adler",
      media: [
        {
          id: "media_001",
          type: "image",
          url: "https://images.unsplash.com/photo-1539297991909-a76b23f3936c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwdGVjaG5vbG9neSUyMGxlZHxlbnwxfHx8fDE3NTk4ODUzNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          caption: "MLS stadium technology showcases the future of sports broadcasting",
          alt_text: "Modern soccer stadium with LED displays",
          width: 1080,
          height: 720
        }
      ],
      source: {
        id: "ap-sports",
        name: "Associated Press",
        publisher_domain: "apnews.com",
        provider: "ap_enps",
        credibility_score: 95,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["sports", "business", "broadcast-rights"],
        tags: ["MLS", "Apple", "streaming", "rights"],
        categories: ["sports business"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 73,
        social_shares: 950,
        click_through_rate: 7.4,
        reading_time_minutes: 4
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi"],
    lastModified: "2025-10-07T10:15:00Z"
  },
  {
    article: {
      id: "newsapi_20251007_002",
      title: "Vizrt Unveils AI-Driven Virtual Production Suite for Unreal Engine 5.5",
      summary: "Vizrt's new AI module integrates directly into Unreal Engine, enabling predictive camera automation and real-time data visualization for live events.",
      full_content: "Norwegian broadcast technology company Vizrt has announced the launch of its most ambitious product yet: an AI-driven virtual production suite designed specifically for Unreal Engine 5.5. The new system promises to revolutionize live event broadcasting by incorporating machine learning algorithms that can predict optimal camera movements and automatically generate real-time data visualizations.\n\nThe suite, dubbed 'Vizrt AI Director,' represents a significant leap forward in virtual production technology. By integrating directly with Epic Games' Unreal Engine, the system can analyze live event data in real-time and make autonomous decisions about camera positioning, lighting adjustments, and graphic overlays without human intervention.\n\n'This isn't just automation – it's intelligent production assistance,' explained Vizrt CTO Michael Hallén. 'Our AI can learn from thousands of previous broadcasts to understand what makes compelling television, then apply those insights to live events as they unfold.'\n\nKey features include predictive camera automation that anticipates action before it happens, dynamic lighting systems that adjust to match the mood and intensity of live events, and real-time data visualization that can instantly convert statistics into compelling graphics. The system also includes advanced object tracking capabilities, allowing virtual elements to seamlessly interact with real-world performers and objects.\n\nEarly adopters from major broadcasting networks report significant improvements in production efficiency. Sports broadcaster ESPN tested the system during recent NFL coverage, noting a 40% reduction in manual camera operations while maintaining broadcast quality standards.\n\nThe technology leverages Unreal Engine's advanced rendering capabilities while adding Vizrt's decades of broadcast experience. The AI models have been trained on over 10,000 hours of live broadcast footage, learning to identify optimal shot compositions, timing, and audience engagement patterns.\n\nVizrt plans to demonstrate the full capabilities of the AI Director suite at the upcoming NAB Show, where they will showcase live virtual production scenarios ranging from sports broadcasting to corporate events. The system is expected to be commercially available by Q2 2026.",
      url: "https://broadcasttechdaily.com/vizrt-ai-unreal",
      published_at: "2025-10-07T11:45:00Z",
      author: "James Howell",
      media: [
        {
          id: "media_002",
          type: "image",
          url: "https://images.unsplash.com/photo-1722684768315-11fc753354f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXdzcGFwZXIlMjBhcnRpY2xlJTIwbWVkaWElMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc1OTg4NTM0MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          caption: "Advanced broadcast technology transforms media production workflows",
          alt_text: "Technology and media equipment in broadcasting studio",
          width: 1080,
          height: 720
        }
      ],
      source: {
        id: "broadcast-tech",
        name: "Broadcast Tech Daily",
        publisher_domain: "broadcasttechdaily.com",
        provider: "newsapi",
        credibility_score: 88,
        country: "NO",
        language: "en"
      },
      taxonomy: {
        topics: ["media", "technology", "ai"],
        tags: ["Vizrt", "Unreal Engine", "AI", "graphics"],
        categories: ["virtual production", "broadcast"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 69,
        social_shares: 695,
        click_through_rate: 6.9,
        reading_time_minutes: 3
      }
    },
    overrides: [],
    primaryProvider: "newsapi",
    alternativeProviders: [],
    lastModified: "2025-10-07T11:45:00Z"
  },
  {
    article: {
      id: "newsdata_20251007_003",
      title: "Montclair Approves Redevelopment Plan for Walnut Street District",
      summary: "Montclair council voted 5-2 in favor of a redevelopment proposal expected to add 200 residential units and 15,000 sq. ft. of retail near the Walnut Street train station.",
      url: "https://montclairlocal.news/redevelopment-walnut-street",
      published_at: "2025-10-07T08:30:00Z",
      author: "Sarah Kim",
      source: {
        id: "montclair-local",
        name: "Montclair Local",
        publisher_domain: "montclairlocal.news",
        provider: "newsdata",
        credibility_score: 81,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["local", "development"],
        tags: ["Montclair", "redevelopment", "housing"],
        categories: ["New Jersey"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "low"
      },
      metrics: {
        engagement_score: 56,
        social_shares: 180,
        click_through_rate: 3.2,
        reading_time_minutes: 3
      }
    },
    overrides: [],
    primaryProvider: "newsdata",
    alternativeProviders: [],
    lastModified: "2025-10-07T08:30:00Z"
  },
  {
    article: {
      id: "ap_20251007_004",
      title: "Ceasefire Talks Resume Amid Border Escalations in Eastern Europe",
      summary: "A fragile ceasefire between neighboring states appears at risk as new shelling incidents occurred overnight, prompting renewed talks under UN supervision.",
      full_content: "GENEVA - International mediators convened emergency ceasefire talks this morning following reports of renewed artillery exchanges along the disputed border region in Eastern Europe. The overnight incidents mark the most significant violation of the three-month-old ceasefire agreement and have raised serious concerns about the stability of the peace process.\n\nUN Special Envoy Maria Volkov called the situation 'deeply concerning' and urged all parties to exercise maximum restraint. 'These incidents threaten to unravel months of careful diplomatic progress,' Volkov stated during an emergency briefing. 'We are working around the clock to prevent further escalation.'\n\nAccording to international monitors, artillery fire was exchanged across the border at approximately 2:30 AM local time, with both sides reporting damage to civilian infrastructure. No casualties have been confirmed, but evacuation orders have been issued for several border communities.\n\nThe ceasefire, originally brokered in July under UN auspices, had been holding despite sporadic minor incidents. Both governments had committed to a comprehensive peace process including prisoner exchanges, humanitarian corridor establishment, and gradual military withdrawal from contested areas.\n\nDiplomatic sources suggest the latest escalation may be linked to domestic political pressures in both countries, where hardline factions have criticized the peace process as too conciliatory. Parliamentary elections scheduled for next month in one of the affected nations have intensified political rhetoric around the conflict.\n\n'The international community remains committed to supporting peace efforts,' said European Union foreign policy chief Josep Borrell. 'However, we call on all parties to respect their commitments and prioritize civilian safety over political gains.'\n\nThe talks in Geneva are expected to continue through the week, with participation from regional powers and international organizations. Both sides have agreed to an immediate communication protocol to prevent further incidents while negotiations proceed.",
      url: "https://apnews.com/article/eastern-europe-ceasefire-geneva",
      published_at: "2025-10-07T12:10:00Z",
      author: "John Leicester",
      media: [
        {
          id: "media_004",
          type: "image",
          url: "https://images.unsplash.com/photo-1590345213370-caf4f5515bc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmVha2luZyUyMG5ld3MlMjBicm9hZGNhc3R8ZW58MXx8fHwxNzU5ODg1MzQ3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          caption: "International diplomatic efforts continue to address regional tensions",
          alt_text: "Breaking news broadcast covering international diplomacy",
          width: 1080,
          height: 720
        }
      ],
      source: {
        id: "ap-world",
        name: "Associated Press",
        publisher_domain: "apnews.com",
        provider: "ap_enps",
        credibility_score: 94,
        country: "CH",
        language: "en"
      },
      taxonomy: {
        topics: ["world", "conflict", "geopolitics"],
        tags: ["ceasefire", "UN", "Geneva"],
        categories: ["breaking"]
      },
      flags: {
        is_breaking: true,
        is_live: true,
        is_opinion: false,
        is_sponsored: false,
        severity: "critical"
      },
      metrics: {
        engagement_score: 65,
        social_shares: 2850,
        click_through_rate: 12.7,
        reading_time_minutes: 2
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi", "newsdata"],
    lastModified: "2025-10-07T13:05:00Z"
  },
  {
    article: {
      id: "newsapi_20251007_005",
      title: "SoFi Stadium Adds 8K LED Halo for 2026 World Cup",
      summary: "SoFi Stadium in Los Angeles will feature a massive 8K HDR LED halo screen, expanding immersive visuals for fans and enhancing broadcast integration ahead of the 2026 World Cup.",
      url: "https://sportsvenuetech.com/sofi-stadium-8k-led",
      published_at: "2025-10-07T09:00:00Z",
      author: "Kevin Duarte",
      source: {
        id: "sports-venue-tech",
        name: "Sports Venue Tech",
        publisher_domain: "sportsvenuetech.com",
        provider: "newsapi",
        credibility_score: 89,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["technology", "sports", "venue"],
        tags: ["SoFi Stadium", "LED", "World Cup", "broadcast integration"],
        categories: ["stadium upgrades"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 78,
        social_shares: 780,
        click_through_rate: 7.8,
        reading_time_minutes: 3
      }
    },
    overrides: [],
    primaryProvider: "newsapi",
    alternativeProviders: [],
    lastModified: "2025-10-07T09:00:00Z"
  },
  {
    article: {
      id: "news-1",
      title: "ESPN Renews NFL Media Rights Deal Through 2033",
      summary: "Disney's ESPN secures long-term broadcasting rights for Monday Night Football, including enhanced streaming provisions and international distribution.",
      url: "https://example.com/espn-nfl-rights-2033",
      published_at: "2024-10-07T14:30:00Z",
      source: {
        id: "ap-sports",
        name: "Associated Press Sports",
        publisher_domain: "apnews.com",
        provider: "ap_enps",
        credibility_score: 95,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["sports", "media", "business"],
        tags: ["NFL", "ESPN", "media rights", "streaming"],
        categories: ["Sports Business", "Broadcasting"]
      },
      flags: {
        is_breaking: true,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "high"
      },
      metrics: {
        engagement_score: 92,
        social_shares: 1850,
        click_through_rate: 8.5,
        reading_time_minutes: 4
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi"],
    lastModified: "2024-10-07T14:30:00Z"
  },
  {
    article: {
      id: "news-2",
      title: "Amazon Prime Video Secures Premier League Rights for 2025-2028",
      summary: "Amazon expands sports streaming portfolio with exclusive Thursday night Premier League matches and enhanced 4K coverage.",
      url: "https://example.com/amazon-premier-league-rights",
      published_at: "2024-10-07T13:15:00Z",
      source: {
        id: "reuters-media",
        name: "Reuters Media",
        publisher_domain: "reuters.com",
        provider: "newsapi",
        credibility_score: 88,
        country: "UK",
        language: "en"
      },
      taxonomy: {
        topics: ["sports", "streaming", "technology"],
        tags: ["Amazon", "Premier League", "streaming rights", "4K"],
        categories: ["Media Tech", "Sports Business"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 76,
        social_shares: 920,
        click_through_rate: 6.2,
        reading_time_minutes: 3
      }
    },
    overrides: [
      {
        field: "title",
        originalValue: "Amazon Prime Video Secures Premier League Rights for 2025-2028",
        overriddenValue: "Amazon Prime Video Secures Premier League Rights for 2025-2028",
        timestamp: "2024-10-07T13:20:00Z",
        user: "editor_smith"
      }
    ],
    primaryProvider: "newsapi",
    alternativeProviders: ["ap_enps"],
    lastModified: "2024-10-07T13:20:00Z"
  },
  {
    article: {
      id: "news-3",
      title: "SoFi Stadium Completes $50M LED Display Upgrade",
      summary: "Los Angeles venue installs next-generation 4K LED videoboards and immersive fan experience technology throughout the facility.",
      url: "https://example.com/sofi-stadium-led-upgrade",
      published_at: "2024-10-07T11:45:00Z",
      source: {
        id: "sports-tech",
        name: "Sports Technology Weekly",
        publisher_domain: "sportstechweekly.com",
        provider: "newsdata",
        credibility_score: 72,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["technology", "sports", "venues"],
        tags: ["LED", "stadium", "SoFi", "upgrade", "4K"],
        categories: ["Venue Tech", "Sports Infrastructure"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "low"
      },
      metrics: {
        engagement_score: 58,
        social_shares: 340,
        click_through_rate: 4.1,
        reading_time_minutes: 2
      }
    },
    overrides: [],
    primaryProvider: "newsdata",
    alternativeProviders: [],
    lastModified: "2024-10-07T11:45:00Z"
  },
  {
    article: {
      id: "news-4",
      title: "Phoenix Suns Valued at $4.2B in Minority Stake Sale",
      summary: "Private equity group acquires 15% stake in NBA franchise, setting new valuation benchmark for basketball teams.",
      url: "https://example.com/suns-valuation-4-2-billion",
      published_at: "2024-10-07T10:20:00Z",
      source: {
        id: "forbes-sports",
        name: "Forbes Sports",
        publisher_domain: "forbes.com",
        provider: "ap_enps",
        credibility_score: 90,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["business", "sports", "finance"],
        tags: ["NBA", "Phoenix Suns", "valuation", "private equity"],
        categories: ["Team Sales", "Sports Business"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 82,
        social_shares: 1240,
        click_through_rate: 7.3,
        reading_time_minutes: 5
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi"],
    lastModified: "2024-10-07T10:20:00Z"
  },
  {
    article: {
      id: "news-5",
      title: "CNN Deploys AI-Powered News Automation Platform",
      summary: "Network implements generative AI tools for breaking news alerts, social media content, and real-time fact-checking workflows.",
      url: "https://example.com/cnn-ai-automation-platform",
      published_at: "2024-10-07T09:30:00Z",
      source: {
        id: "tech-crunch",
        name: "TechCrunch Media",
        publisher_domain: "techcrunch.com",
        provider: "newsapi",
        credibility_score: 78,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["technology", "media", "ai"],
        tags: ["CNN", "AI", "automation", "newsroom", "generative AI"],
        categories: ["AI in Newsrooms", "Media Tech"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "medium"
      },
      metrics: {
        engagement_score: 68,
        social_shares: 580,
        click_through_rate: 5.4,
        reading_time_minutes: 4
      }
    },
    overrides: [],
    primaryProvider: "newsapi",
    alternativeProviders: ["newsdata"],
    lastModified: "2024-10-07T09:30:00Z"
  },
  {
    article: {
      id: "news-6",
      title: "Montclair School District Approves $85M Budget Referendum",
      summary: "Essex County voters will decide on increased education funding for technology upgrades and teacher retention programs.",
      url: "https://example.com/montclair-school-budget-referendum",
      published_at: "2024-10-07T08:15:00Z",
      source: {
        id: "nj-local",
        name: "NJ Local News Network",
        publisher_domain: "njlocalnews.com",
        provider: "newsdata",
        credibility_score: 65,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["education", "local government", "finance"],
        tags: ["Montclair", "school budget", "referendum", "Essex County"],
        categories: ["Local NJ", "Education"]
      },
      flags: {
        is_breaking: false,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "low"
      },
      metrics: {
        engagement_score: 42,
        social_shares: 180,
        click_through_rate: 3.2,
        reading_time_minutes: 3
      }
    },
    overrides: [],
    primaryProvider: "newsdata",
    alternativeProviders: [],
    lastModified: "2024-10-07T08:15:00Z"
  },
  {
    article: {
      id: "news-7",
      title: "BREAKING: 7.2 Earthquake Strikes Northern California",
      summary: "Major seismic event reported near San Francisco Bay Area. Emergency services responding. Tsunami warning issued for coastal regions.",
      url: "https://example.com/california-earthquake-7-2",
      published_at: "2024-10-07T16:45:00Z",
      source: {
        id: "usgs-alerts",
        name: "USGS Earthquake Alerts",
        publisher_domain: "earthquake.usgs.gov",
        provider: "ap_enps",
        credibility_score: 98,
        country: "US",
        language: "en"
      },
      taxonomy: {
        topics: ["breaking news", "natural disasters", "emergency"],
        tags: ["earthquake", "California", "tsunami warning", "emergency"],
        categories: ["Breaking News", "Natural Disasters"]
      },
      flags: {
        is_breaking: true,
        is_live: true,
        is_opinion: false,
        is_sponsored: false,
        severity: "critical"
      },
      metrics: {
        engagement_score: 98,
        social_shares: 5420,
        click_through_rate: 15.8,
        reading_time_minutes: 2
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi", "newsdata"],
    lastModified: "2024-10-07T16:45:00Z"
  },
  {
    article: {
      id: "news-8",
      title: "NATO Announces New Cybersecurity Initiative",
      summary: "Alliance members commit to enhanced digital defense capabilities amid rising cyber threats from state actors.",
      url: "https://example.com/nato-cybersecurity-initiative",
      published_at: "2024-10-07T15:20:00Z",
      source: {
        id: "reuters-world",
        name: "Reuters World News",
        publisher_domain: "reuters.com",
        provider: "ap_enps",
        credibility_score: 92,
        country: "UK",
        language: "en"
      },
      taxonomy: {
        topics: ["geopolitics", "technology", "security"],
        tags: ["NATO", "cybersecurity", "cyber threats", "defense"],
        categories: ["Geopolitics", "International"]
      },
      flags: {
        is_breaking: true,
        is_live: false,
        is_opinion: false,
        is_sponsored: false,
        severity: "high"
      },
      metrics: {
        engagement_score: 85,
        social_shares: 2150,
        click_through_rate: 9.1,
        reading_time_minutes: 6
      }
    },
    overrides: [],
    primaryProvider: "ap_enps",
    alternativeProviders: ["newsapi"],
    lastModified: "2024-10-07T15:20:00Z"
  }
];

// Create clusters based on the schema
const mockClusters: NewsCluster[] = [
  {
    id: "cluster_media_rights_deals",
    name: "Media Rights Deals",
    description: "Rights renewals, carriage, league/platform deals, blackout disputes.",
    filters: {
      must: ["(\"media rights\" OR \"broadcast rights\" OR carriage OR distribution OR sublicens* OR blackout OR \"licensing deal\" OR \"rights deal\")"],
      should: [
        "ESPN OR Fox OR NBC OR CBS OR Amazon OR Apple OR DAZN OR YouTube OR Netflix OR Peacock OR Paramount+",
        "F1 OR NFL OR NBA OR MLB OR NHL OR Premier League OR LaLiga OR UEFA OR FIFA OR ICC OR NCAA"
      ],
      must_not: ["job posting", "opinion OR editorial"],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 720 }
    },
    scoring: {
      boosts: [
        { field: "Article.taxonomy.topics", value: "sports", weight: 0.15 },
        { field: "Article.title", value: "rights", weight: 0.2 },
        { field: "Article.source.publisher_domain", value: "apnews.com", weight: 0.1 }
      ],
      demotions: [
        { field: "Article.flags.is_opinion", value: true, weight: -0.3 }
      ]
    },
    display: { layout: "clustered", accent_color: "#004E92" },
    articles: mockArticles.filter(a => 
      a.article.title.includes("Rights") || 
      a.article.summary.includes("rights") ||
      a.article.taxonomy.tags.some(tag => tag.includes("rights")) ||
      a.article.title.includes("Apple and MLS") ||
      a.article.id === "ap_20251007_001"
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_venue_tech_upgrades",
    name: "Venue Tech Upgrades", 
    description: "LED, AR, tracking, connectivity, ticketing & security upgrades in stadiums/arenas.",
    filters: {
      must: ["(stadium OR arena OR venue) AND (\"LED\" OR \"scoreboard\" OR \"videoboard\" OR \"computer vision\" OR tracking OR lidar OR Wi-Fi OR 5G OR turnstile OR ticketing OR access control OR biometrics)"],
      should: [
        "installation OR upgrade OR retrofit OR capex OR renovation",
        "Unreal Engine OR Disguise OR Vizrt OR Ross OR EVS OR Daktronics OR Absen OR ROE Visual"
      ],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 1440 }
    },
    scoring: {
      boosts: [
        { field: "Article.taxonomy.topics", value: "technology", weight: 0.2 },
        { field: "Article.summary", value: "installation", weight: 0.1 }
      ]
    },
    display: { layout: "grid", accent_color: "#0E7C86" },
    articles: mockArticles.filter(a => 
      a.article.title.includes("Stadium") || 
      a.article.title.includes("LED") ||
      a.article.taxonomy.tags.includes("LED") ||
      a.article.title.includes("SoFi Stadium") ||
      a.article.title.includes("Vizrt") ||
      a.article.id === "newsapi_20251007_005"
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_team_sales_valuations",
    name: "Team Sales & Valuations",
    description: "Franchise sales, minority stakes, valuations, private equity activity.",
    filters: {
      must: ["(acquisition OR sale OR \"minority stake\" OR valuation OR \"private equity\") AND (team OR club OR franchise)"],
      should: ["Forbes valuation OR investment group OR owner group OR LP stake"],
      must_not: [],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 2160 }
    },
    scoring: {
      boosts: [
        { field: "Article.title", value: "acquisition", weight: 0.15 },
        { field: "Article.title", value: "valuation", weight: 0.15 }
      ]
    },
    display: { layout: "list", accent_color: "#005B41" },
    articles: mockArticles.filter(a => 
      a.article.title.includes("Valued") || 
      a.article.summary.includes("valuation") ||
      a.article.taxonomy.tags.includes("valuation")
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_ai_in_newsrooms",
    name: "AI in Newsrooms",
    description: "GenAI tools, automation, assistive workflows for media creation and ops.",
    filters: {
      must: ["(AI OR artificial intelligence OR \"generative AI\" OR automation) AND (newsroom OR broadcaster OR publisher OR production)"],
      should: ["workflow OR template OR \"assistive\" OR automation OR synthetic"],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 1440 }
    },
    scoring: {
      boosts: [
        { field: "Article.taxonomy.topics", value: "ai", weight: 0.25 }
      ]
    },
    display: { layout: "hero+list", accent_color: "#7A00F5" },
    articles: mockArticles.filter(a => 
      a.article.title.includes("AI") || 
      a.article.summary.includes("AI") ||
      a.article.taxonomy.tags.includes("AI") ||
      a.article.title.includes("Vizrt") ||
      a.article.id === "newsapi_20251007_002"
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_local_nj_education_taxes",
    name: "Local NJ: Schools & Taxes",
    description: "Montclair/Essex County school budgets, BOE, tax changes, referendums.",
    filters: {
      must: ["(\"New Jersey\" OR Montclair OR \"Essex County\" OR Newark OR Hoboken OR \"Jersey City\") AND (schools OR \"board of education\" OR budget OR taxes OR referendum OR levy)"],
      providers: ["ap_enps", "newsapi", "newsdata"],
      countries: ["us"],
      languages: ["en"],
      time_window: { hours: 2160 }
    },
    display: { layout: "list", accent_color: "#0F62FE" },
    articles: mockArticles.filter(a => 
      a.article.title.includes("Montclair") ||
      a.article.taxonomy.tags.includes("Montclair") ||
      a.article.title.includes("Walnut Street") ||
      a.article.id === "newsdata_20251007_003"
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_breaking_natural_disasters", 
    name: "Breaking: Natural Disasters",
    description: "Quakes, hurricanes, wildfires, floods; prioritize AP and live updates.",
    filters: {
      must: [
        "(earthquake OR hurricane OR wildfire OR flood OR \"tropical storm\" OR tornado OR tsunami)",
        "(breaking OR alert OR advisory OR \"state of emergency\" OR evacuation)"
      ],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 72 }
    },
    scoring: {
      boosts: [
        { field: "Article.flags.is_live", value: true, weight: 0.3 }
      ]
    },
    display: { layout: "ticker", accent_color: "#DA1E28" },
    articles: mockArticles.filter(a => 
      a.article.flags.is_breaking && 
      a.article.taxonomy.topics.includes("natural disasters")
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  },
  {
    id: "cluster_breaking_geopolitics",
    name: "Breaking: Geopolitics",
    description: "Urgent diplomatic, conflict, sanctions, cyber incidents.",
    filters: {
      must: [
        "(breaking OR \"developing story\" OR alert)",
        "(sanctions OR ceasefire OR mobilization OR incursion OR strike OR cyberattack OR treaty)"
      ],
      providers: ["ap_enps", "newsapi", "newsdata"],
      languages: ["en"],
      time_window: { hours: 96 }
    },
    display: { layout: "ticker", accent_color: "#B00020" },
    articles: mockArticles.filter(a => 
      a.article.flags.is_breaking && 
      (a.article.taxonomy.topics.includes("geopolitics") ||
       a.article.title.includes("Ceasefire")) ||
      a.article.id === "ap_20251007_004"
    ),
    article_count: 1,
    last_updated: "2024-10-07T16:45:00Z"
  }
];

export const mockNewsData: NewsData = {
  clusters: mockClusters,
  tabs: [
    {
      id: "tab_sports_business",
      title: "Sports Business",
      default_feed_id: "sports_business_global",
      clusters: [
        "cluster_media_rights_deals",
        "cluster_team_sales_valuations",
        "cluster_venue_tech_upgrades"
      ]
    },
    {
      id: "tab_media_tech",
      title: "Media Tech",
      default_feed_id: "media_tech_innovation",
      clusters: [
        "cluster_ai_in_newsrooms",
        "cluster_venue_tech_upgrades"
      ]
    },
    {
      id: "tab_local_nj",
      title: "Local NJ",
      default_feed_id: "local_nj_news",
      clusters: [
        "cluster_local_nj_education_taxes"
      ]
    },
    {
      id: "tab_breaking",
      title: "World Breaking",
      default_feed_id: "breaking_world_feed",
      clusters: [
        "cluster_breaking_natural_disasters",
        "cluster_breaking_geopolitics"
      ]
    }
  ],
  lastUpdated: "2025-10-07T13:05:00Z",
  providers: [
    {
      id: "ap-sports",
      name: "Associated Press Sports",
      publisher_domain: "apnews.com",
      provider: "ap_enps",
      credibility_score: 95,
      country: "US",
      language: "en"
    },
    {
      id: "reuters-media",
      name: "Reuters Media",
      publisher_domain: "reuters.com",
      provider: "newsapi",
      credibility_score: 88,
      country: "UK",
      language: "en"
    },
    {
      id: "sports-tech",
      name: "Sports Technology Weekly",
      publisher_domain: "sportstechweekly.com",
      provider: "newsdata",
      credibility_score: 72,
      country: "US",
      language: "en"
    }
  ]
};