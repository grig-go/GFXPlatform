import { 
  Vote, 
  TrendingUp, 
  Trophy, 
  Cloud, 
  Newspaper, 
  Bot, 
  ImageIcon, 
  School,
  Loader2 
} from "lucide-react";

export interface DashboardCardData {
  id: string;
  title: string;
  description: string;
  icon: any;
  bgColor: string;
  iconColor: string;
  stats: { label: string; value: string | number | JSX.Element; isComponent?: boolean }[];
  onClick: () => void;
}

export function getDashboardCardsData(props: {
  handleNavigate: (view: any) => void;
  electionLoading: boolean;
  electionRacesCount: number;
  financeStats: any;
  sportsStats: any;
  weatherStats: any;
  newsStats: any;
  agentStats: any;
  mediaStats: any;
}): Record<string, DashboardCardData> {
  const {
    handleNavigate,
    electionLoading,
    electionRacesCount,
    financeStats,
    sportsStats,
    weatherStats,
    newsStats,
    agentStats,
    mediaStats
  } = props;

  return {
    "election": {
      id: "election",
      title: "Election Dashboard",
      description: "View and edit AP Election data with comprehensive race tracking, candidate management, and real-time status updates.",
      icon: Vote,
      bgColor: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      stats: [
        {
          label: "races",
          value: electionLoading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : electionRacesCount,
          isComponent: electionLoading
        },
        { label: "", value: "Real-time editing" },
        { label: "", value: "Override tracking" }
      ],
      onClick: () => handleNavigate('election')
    },
    "finance": {
      id: "finance",
      title: "Finance Dashboard",
      description: "Track market data across indices, stocks, and cryptocurrency with advanced analytics and portfolio management tools.",
      icon: TrendingUp,
      bgColor: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      stats: [
        { label: "securities", value: financeStats.totalSecurities },
        { label: "", value: financeStats.loading ? "..." : `${financeStats.stockCount} stocks` },
        { label: "", value: financeStats.loading ? "..." : `${financeStats.etfCount} ETFs` },
        { label: "", value: financeStats.loading ? "..." : `${financeStats.cryptoCount} crypto` }
      ],
      onClick: () => handleNavigate('finance')
    },
    "sports": {
      id: "sports",
      title: "Sports Dashboard",
      description: "Manage comprehensive sports data across multiple leagues with team, player, game, and venue tracking from multiple providers.",
      icon: Trophy,
      bgColor: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      stats: [
        { label: "teams", value: sportsStats.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : sportsStats.teamsCount, isComponent: sportsStats.loading },
        { label: "players", value: sportsStats.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : sportsStats.playersCount, isComponent: sportsStats.loading },
        { label: "games", value: sportsStats.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : sportsStats.gamesCount, isComponent: sportsStats.loading },
        { label: "venues", value: sportsStats.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : sportsStats.venuesCount, isComponent: sportsStats.loading }
      ],
      onClick: () => handleNavigate('sports')
    },
    "weather": {
      id: "weather",
      title: "Weather Dashboard",
      description: "Monitor comprehensive weather data with current conditions, forecasts, alerts, and specialized data including tropical systems and air quality.",
      icon: Cloud,
      bgColor: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      stats: [
        { label: "locations", value: weatherStats.totalLocations },
        { label: "alerts", value: weatherStats.activeAlerts },
        { label: "", value: weatherStats.loading ? "Loading..." : weatherStats.error ? "Error" : "Real-time data" }
      ],
      onClick: () => handleNavigate('weather')
    },
    "news": {
      id: "news",
      title: "News Dashboard",
      description: "Monitor breaking news across multiple news providers including NewsAPI and NewsData.",
      icon: Newspaper,
      bgColor: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-orange-600 dark:text-orange-400",
      stats: [
        {
          label: newsStats.loading ? "Loading..." : newsStats.error ? "Error" : "articles",
          value: newsStats.loading ? (
            <span className="text-2xl font-semibold"><Loader2 className="w-5 h-5 animate-spin" /></span>
          ) : newsStats.error ? (
            <span className="text-2xl font-semibold text-orange-500">!</span>
          ) : newsStats.articlesCount,
          isComponent: newsStats.loading || newsStats.error
        },
        {
          label: newsStats.loading ? "Loading..." : newsStats.error ? "Error" : "providers",
          value: newsStats.loading ? (
            <span className="text-2xl font-semibold"><Loader2 className="w-5 h-5 animate-spin" /></span>
          ) : newsStats.error ? (
            <span className="text-2xl font-semibold text-orange-500">!</span>
          ) : newsStats.providersCount,
          isComponent: newsStats.loading || newsStats.error
        },
        { label: "", value: newsStats.loading ? "Loading..." : newsStats.error ? "Error" : "Stored" }
      ],
      onClick: () => handleNavigate('news')
    },
    "agents": {
      id: "agents",
      title: "Agents",
      description: "AI-powered content curation and automated data feeds that intelligently aggregate and prioritize information based on your preferences and workflows.",
      icon: Bot,
      bgColor: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      stats: [
        {
          label: "agents",
          value: agentStats.loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : agentStats.totalAgents,
          isComponent: agentStats.loading
        },
        {
          label: "active",
          value: agentStats.loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : agentStats.activeAgents,
          isComponent: agentStats.loading
        },
        { label: "", value: agentStats.loading ? "Loading..." : agentStats.error ? "Error" : "AI curation" }
      ],
      onClick: () => handleNavigate('agents')
    },
    // Backend uses "school_closings" with underscore
    "school_closings": {
      id: "school_closings",
      title: "School Closings",
      description: "Monitor school closings, delays, and early dismissals across multiple districts with real-time status updates and location tracking.",
      icon: School,
      bgColor: "bg-red-100 dark:bg-red-900",
      iconColor: "text-red-600 dark:text-red-400",
      stats: [
        { label: "closings", value: 6 },
        { label: "delays", value: 2 },
        { label: "", value: "Multi-county" }
      ],
      onClick: () => handleNavigate('school-closings')
    },
    // Backend uses "media_library" with underscore
    "media_library": {
      id: "media_library",
      title: "Media Library",
      description: "Manage and organize your media assets including images, videos, and audio files with advanced search and bulk operations.",
      icon: ImageIcon,
      bgColor: "bg-indigo-100 dark:bg-indigo-900",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      stats: [
        { label: "assets", value: mediaStats.totalAssets },
        { label: "uploads", value: 0 },
        { label: "", value: "Cloud storage" }
      ],
      onClick: () => handleNavigate('media')
    }
  };
}