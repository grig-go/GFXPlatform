import React from 'react';
import { Card, CardContent } from './ui/card';
import { LucideIcon, Vote, TrendingUp, Trophy, Cloud, Newspaper, Bot, School, ImageIcon, Loader2 } from 'lucide-react';

interface DashboardCardData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  stats: Array<{
    label: string;
    value: string | number | React.ReactNode;
    isComponent?: boolean;
  }>;
  onClick: () => void;
}

interface DashboardConfig {
  dashboard_id: string;
  visible: boolean;
  order_index: number;
}

interface DashboardCardRendererProps {
  dashboards: DashboardConfig[];
  cardDataMap: Record<string, DashboardCardData>;
}

// Helper function to generate card data map
export const getDashboardCardsData = ({
  handleNavigate,
  electionLoading,
  electionRacesCount,
  financeStats,
  sportsStats,
  weatherStats,
  newsStats,
  agentsCount,
  activeAgentsCount,
  mediaStats,
  schoolClosingsStats
}: {
  handleNavigate: (view: string) => void;
  electionLoading: boolean;
  electionRacesCount: number;
  financeStats: { securitiesCount: number; loading: boolean; error: string | null };
  sportsStats: { teamsCount: number; playersCount: number; gamesCount: number; loading: boolean; error: string | null };
  weatherStats: { locationsCount: number; loading: boolean; error: string | null };
  newsStats: { articlesCount: number; providersCount: number; loading: boolean; error: string | null };
  agentsCount: number;
  activeAgentsCount: number;
  mediaStats: { totalAssets: number; loading: boolean; error: string | null };
  schoolClosingsStats: { activeClosings: number; loading: boolean; error: string | null };
}): Record<string, DashboardCardData> => {
  return {
    election: {
      id: 'election',
      title: 'Elections',
      description: 'Monitor real-time election results, candidate profiles, and party data with advanced override capabilities.',
      icon: Vote,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      stats: [
        {
          label: 'races',
          value: electionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : electionRacesCount,
          isComponent: electionLoading
        }
      ],
      onClick: () => handleNavigate('election')
    },
    finance: {
      id: 'finance',
      title: 'Finance',
      description: 'Track stock prices, cryptocurrency values, and market trends with real-time data from Alpaca Markets.',
      icon: TrendingUp,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-600',
      stats: [
        {
          label: 'securities',
          value: financeStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : financeStats.securitiesCount,
          isComponent: financeStats.loading
        }
      ],
      onClick: () => handleNavigate('finance')
    },
    sports: {
      id: 'sports',
      title: 'Sports',
      description: 'Manage sports teams, players, games, venues, and tournaments with comprehensive tracking.',
      icon: Trophy,
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      stats: [
        {
          label: 'teams',
          value: sportsStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : sportsStats.teamsCount,
          isComponent: sportsStats.loading
        },
        {
          label: 'players',
          value: sportsStats.loading ? '' : sportsStats.playersCount,
          isComponent: false
        },
        {
          label: 'games',
          value: sportsStats.loading ? '' : sportsStats.gamesCount,
          isComponent: false
        }
      ],
      onClick: () => handleNavigate('sports')
    },
    weather: {
      id: 'weather',
      title: 'Weather',
      description: 'Track weather conditions, forecasts, and alerts for multiple locations with real-time updates.',
      icon: Cloud,
      bgColor: 'bg-sky-500/10',
      iconColor: 'text-sky-600',
      stats: [
        {
          label: 'locations',
          value: weatherStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : weatherStats.locationsCount,
          isComponent: weatherStats.loading
        }
      ],
      onClick: () => handleNavigate('weather')
    },
    news: {
      id: 'news',
      title: 'News',
      description: 'Aggregate and manage news articles from multiple sources with category filtering and search.',
      icon: Newspaper,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-600',
      stats: [
        {
          label: 'articles',
          value: newsStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : newsStats.articlesCount,
          isComponent: newsStats.loading
        },
        {
          label: 'providers',
          value: newsStats.loading ? '' : newsStats.providersCount,
          isComponent: false
        }
      ],
      onClick: () => handleNavigate('news')
    },
    agents: {
      id: 'agents',
      title: 'Agents',
      description: 'Configure and manage AI agents for data collection, transformation, and automation tasks.',
      icon: Bot,
      bgColor: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600',
      stats: [
        {
          label: 'total agents',
          value: agentsCount,
          isComponent: false
        },
        {
          label: 'active',
          value: activeAgentsCount,
          isComponent: false
        }
      ],
      onClick: () => handleNavigate('agents')
    },
    school_closings: {
      id: 'school-closings',
      title: 'School Closings',
      description: 'Monitor school closures and delays due to weather, emergencies, or other events.',
      icon: School,
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      stats: [
        {
          label: 'active closings',
          value: schoolClosingsStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : schoolClosingsStats.activeClosings,
          isComponent: schoolClosingsStats.loading
        }
      ],
      onClick: () => handleNavigate('school-closings')
    },
    media_library: {
      id: 'media',
      title: 'Media Library',
      description: 'Upload, organize, and manage images, videos, and audio files with tagging and search.',
      icon: ImageIcon,
      bgColor: 'bg-pink-500/10',
      iconColor: 'text-pink-600',
      stats: [
        {
          label: 'assets',
          value: mediaStats.loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : mediaStats.totalAssets,
          isComponent: mediaStats.loading
        }
      ],
      onClick: () => handleNavigate('media')
    }
  };
};

export const DashboardCardRenderer: React.FC<DashboardCardRendererProps> = ({
  dashboards,
  cardDataMap,
}) => {
  // Filter visible dashboards and sort by order_index
  const visibleDashboards = dashboards
    .filter(d => d.visible)
    .sort((a, b) => a.order_index - b.order_index)
    .map(d => cardDataMap[d.dashboard_id])
    .filter(Boolean); // Remove any undefined entries

  // Calculate dynamic card height based on number of cards
  const cardCount = visibleDashboards.length;
  const getCardHeight = () => {
    if (cardCount === 1) return 'min-h-[507px]'; // 60% larger
    if (cardCount >= 2 && cardCount <= 3) return 'min-h-[476px]'; // 50% larger
    return 'min-h-[317px]'; // default size for 4+ cards
  };

  // Get column start position for centering incomplete rows
  const getColStartClass = (index: number) => {
    // For 2 cards: grid is 6 columns, each card spans 2
    // Card 0: starts at column 2 (offset by 1 card width to center 2 cards)
    if (cardCount === 2) {
      if (index === 0) return 'md:col-start-2 md:col-span-2';
      return 'md:col-span-2';
    }
    
    // For 5 cards (3 top, 2 bottom): grid is 6 columns, each card spans 2
    // Cards 0-2 (first row): col-span-2 each
    // Card 3 (first of second row): should start at column 2 (offset by 1 card width to center 2 cards)
    if (cardCount === 5 && index === 3) {
      return 'md:col-start-2 md:col-span-2';
    }
    if (cardCount === 5) {
      return 'md:col-span-2';
    }
    
    // For 7 cards (4 top, 3 bottom): grid is 8 columns, ALL cards span 2
    // Cards 0-3 (first row): each card spans 2 columns = 8 total (perfect fit)
    // Cards 4-6 (second row): each card spans 2 columns = 6 total (need to center in 8 columns)
    // Card 4 (first of second row): start at column 2 to center 3 cards (2+2+2 = 6 columns, with 1 column padding on each side)
    if (cardCount === 7) {
      if (index === 4) return 'lg:col-start-2 lg:col-span-2';
      return 'lg:col-span-2';
    }
    
    return '';
  };

  return (
    <>
      {visibleDashboards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${getCardHeight()} ${getColStartClass(index)}`}
            onClick={card.onClick}
          >
            <CardContent className="p-6 h-full flex flex-col">
              {/* Icon and Title Section */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <h3 className="font-semibold text-[20px]">{card.title}</h3>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow">
                {card.description}
              </p>

              {/* Separator Line */}
              <div className="border-t mb-4 mt-auto"></div>

              {/* Stats Section - All on one line */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="flex items-baseline gap-1.5">
                    {stat.isComponent ? (
                      stat.value
                    ) : (
                      <>
                        <span className="font-medium text-foreground">{stat.value}</span>
                        {stat.label && (
                          <span className="text-muted-foreground whitespace-nowrap">
                            {stat.label}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};