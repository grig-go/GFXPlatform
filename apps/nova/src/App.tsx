import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./components/ui/button";
import { Loader2, Vote, TrendingUp, Trophy, Cloud, Newspaper, Bot, ImageIcon, School } from "lucide-react";
import { ElectionDashboard } from "./components/ElectionDashboard";
import { FinanceDashboard } from "./components/FinanceDashboard";
import { SportsDashboard } from "./components/SportsDashboard";
import { WeatherDashboard } from "./components/WeatherDashboard";
import { NewsDashboard } from "./components/NewsDashboard";
import { FeedsDashboardWithSupabase } from "./components/FeedsDashboardWithSupabase";
import { AgentsDashboardWithSupabase } from "./components/AgentsDashboardWithSupabase";
import { MediaLibrary } from "./components/MediaLibrary";
import { ChannelsPage } from "./components/ChannelsPage";
import { DashboardConfigDialog } from "./components/DashboardConfigDialog";
import { DashboardCardRenderer, getDashboardCardsData } from "./components/DashboardCardRenderer";
import { UsersGroupsPage } from "./components/UsersGroupsPage";
import { AIConnectionsDashboard } from "./components/AIConnectionsDashboard";
import { TopMenuBar } from "./components/TopMenuBar";
import { ProtectedRoute } from "./components/auth";
import { useAuth } from "./contexts/AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import type { Race, CandidateProfile, Party } from "./types";
import type { FinanceSecurityWithSnapshot } from "./types/finance";
import type { SportsEntityWithOverrides, SportsView } from "./types/sports";
import type { WeatherLocationWithOverrides } from "./types/weather";
import type { NewsArticleWithOverrides } from "./types/news";
import type { Feed, FeedCategory } from "./types/feeds";
import type { Agent } from "./types/agents";
import {
  electionData as importedElectionData,
  isElectionDataLoading,
  initializeElectionData
} from "./data/electionData";
import {
  agentsData as importedAgentsData,
  initializeAgentsData,
  setOnDataChange
} from "./data/agentsData";
import { mockFinanceData } from "./data/mockFinanceData";
import { mockSportsData } from "./data/mockSportsData";
import { mockWeatherData } from "./data/mockWeatherData";
import { mockNewsData } from "./data/mockNewsData";
import { mockFeedsData } from "./data/mockFeedsData";
import { mockUsersData } from "./data/mockUsersData";
import { useWeatherData } from "./utils/useWeatherData";
import { useFinanceData } from "./utils/useFinanceData";
import { useSportsData } from "./utils/useSportsData";
import { useNewsFeed } from "./utils/useNewsFeed";
import { useNewsProviders } from "./utils/useNewsProviders";
import { useSchoolClosingsData } from "./utils/useSchoolClosingsData";
import { getEdgeFunctionUrl, getRestUrl, getSupabaseHeaders } from "./utils/supabase/config";
import SchoolClosingsDashboard from "./components/SchoolClosingsDashboard";
import { WeatherDataViewer } from "./components/WeatherDataViewer";
import { Toaster } from "./components/ui/sonner";

type AppView = 'home' | 'election' | 'finance' | 'sports' | 'weather' | 'weather-data' | 'news' | 'feeds' | 'agents' | 'users-groups' | 'ai-connections' | 'media' | 'channels' | 'school-closings';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [initialFeedCategory, setInitialFeedCategory] = useState<FeedCategory | undefined>(undefined);
  const [initialProviderCategory, setInitialProviderCategory] = useState<"weather" | "sports" | "news" | "finance" | "school_closings" | undefined>(undefined);
  const [electionData, setElectionData] = useState(importedElectionData);
  const [electionLoading, setElectionLoading] = useState(isElectionDataLoading);
  const [financeData, setFinanceData] = useState(mockFinanceData);
  const [sportsData, setSportsData] = useState(mockSportsData);
  const [weatherData, setWeatherData] = useState(mockWeatherData);
  const [feedsData, setFeedsData] = useState(mockFeedsData);
  const [agentsData, setAgentsData] = useState(importedAgentsData);
  const [usersData, setUsersData] = useState(mockUsersData);
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState<any[]>([]);
  const [dashboardConfigLoading, setDashboardConfigLoading] = useState(true);

  // Keyboard shortcut listener for dashboard config (CTRL + SHIFT + G + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if CTRL + SHIFT + G + M are all pressed
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
        // Wait for M key
        const handleMKey = (ev: KeyboardEvent) => {
          if (ev.key.toLowerCase() === 'm' && e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            ev.preventDefault();
            setShowDashboardConfig(true);
            window.removeEventListener('keydown', handleMKey);
          }
        };
        window.addEventListener('keydown', handleMKey);
        setTimeout(() => window.removeEventListener('keydown', handleMKey), 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debug dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      console.log('🌙 Dark mode status:', isDark);
      console.log('📦 HTML classes:', document.documentElement.className);
      
      // Get computed styles
      const styles = getComputedStyle(document.documentElement);
      console.log('🎨 CSS Variables:');
      console.log('  --background:', styles.getPropertyValue('--background'));
      console.log('  --foreground:', styles.getPropertyValue('--foreground'));
      console.log('  --border:', styles.getPropertyValue('--border'));
    };
    
    checkDarkMode();
    
    // Set up mutation observer to watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Load election data asynchronously
  useEffect(() => {
    let mounted = true;

    initializeElectionData().then(data => {
      if (mounted) {
        setElectionData(data);
        setElectionLoading(false);
      }
    }).catch(error => {
      console.error('Failed to load election data:', error);
      if (mounted) {
        setElectionLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Load agents data from Supabase
  useEffect(() => {
    let mounted = true;

    // Set callback to update state when data changes
    setOnDataChange((data) => {
      if (mounted) {
        setAgentsData(data);
      }
    });

    initializeAgentsData().then(data => {
      if (mounted) {
        setAgentsData(data);
      }
    }).catch(error => {
      console.error('Failed to load agents data:', error);
    });

    return () => {
      mounted = false;
      setOnDataChange(null as any); // Clear callback on unmount
    };
  }, []);

  // Fetch real weather, finance, and sports data from Supabase
  const { stats: weatherStats } = useWeatherData();
  const { stats: financeStats } = useFinanceData();
  const { stats: sportsStats, loading: sportsLoading, error: sportsError } = useSportsData();
  const { stats: schoolClosingsStats } = useSchoolClosingsData();
  
  // Fetch news data (stored articles from database)
  const [newsStats, setNewsStats] = useState({ articlesCount: 0, providersCount: 0, loading: true, error: null as string | null });
  
  // Fetch media library stats
  const [mediaStats, setMediaStats] = useState({ totalAssets: 0, loading: true, error: null as string | null });
  
  useEffect(() => {
    let mounted = true;
    
    const fetchNewsStats = async () => {
      try {
        // Fetch stored articles count
        const articlesResponse = await fetch(
          getEdgeFunctionUrl('news_dashboard/news-articles/stored?limit=1000'),
          {
            headers: getSupabaseHeaders()
          }
        );
        
        // Fetch active providers count
        const providersResponse = await fetch(
          getRestUrl('data_providers_public?select=id,is_active&category=eq.news&is_active=eq.true'),
          {
            headers: getSupabaseHeaders()
          }
        );
        
        if (!mounted) return;
        
        let articlesCount = 0;
        let providersCount = 0;
        
        if (articlesResponse.ok) {
          const articlesData = await articlesResponse.json();
          articlesCount = articlesData.articles?.length || 0;
        }
        
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          providersCount = providersData.length || 0;
        }
        
        setNewsStats({ articlesCount, providersCount, loading: false, error: null });
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching news stats:', err);
        setNewsStats({ articlesCount: 0, providersCount: 0, loading: false, error: String(err) });
      }
    };
    
    const fetchMediaStats = async () => {
      try {
        const response = await fetch(
          getRestUrl('media_assets?select=id'),
          {
            headers: getSupabaseHeaders()
          }
        );
        
        if (!mounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setMediaStats({ totalAssets: data.length, loading: false, error: null });
        } else {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || `Failed to fetch media stats: ${response.statusText}`);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching media stats:', err);
        setMediaStats({ totalAssets: 0, loading: false, error: String(err) });
      }
    };
    
    fetchNewsStats();
    fetchMediaStats();
    return () => { mounted = false; };
  }, []);

  // Fetch dashboard configuration for home page
  useEffect(() => {
    const fetchDashboardConfig = async () => {
      try {
        setDashboardConfigLoading(true);
        const response = await fetch(
          getEdgeFunctionUrl('dashboard_config?page=home'),
          {
            headers: getSupabaseHeaders()
          }
        );

        const data = await response.json();
        console.log("📊 Fetched dashboard config for home:", data);
        console.log("📊 Dashboard config OK:", data.ok);
        console.log("📊 Dashboard config dashboards:", data.dashboards);
        console.log("📊 Dashboard config dashboards length:", data.dashboards?.length);

        if (data.ok && data.dashboards && data.dashboards.length > 0) {
          setDashboardConfig(data.dashboards);
        } else {
          // No config or error - set empty array to trigger fallback
          setDashboardConfig([]);
        }
      } catch (error) {
        console.error("Error fetching dashboard config:", error);
        setDashboardConfig([]); // Fallback to showing all dashboards
      } finally {
        setDashboardConfigLoading(false);
      }
    };

    fetchDashboardConfig();

    // Listen for dashboard config updates (when user saves in config modal)
    const handleConfigUpdate = () => {
      console.log("📊 Dashboard config updated, reloading...");
      fetchDashboardConfig();
    };

    window.addEventListener('dashboardConfigUpdated', handleConfigUpdate);

    return () => {
      window.removeEventListener('dashboardConfigUpdated', handleConfigUpdate);
    };
  }, []);

  const handleUpdateRace = (updatedRace: Race) => {
    setElectionData(prev => ({
      ...prev,
      races: prev.races.map(race => 
        race.id === updatedRace.id ? updatedRace : race
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateCandidate = (updatedCandidate: CandidateProfile) => {
    setElectionData(prev => ({
      ...prev,
      candidates: prev.candidates?.map(candidate => 
        candidate.id === updatedCandidate.id ? updatedCandidate : candidate
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateParty = (updatedParty: Party) => {
    setElectionData(prev => ({
      ...prev,
      parties: prev.parties?.map(party =>
        party.id === updatedParty.id ? updatedParty : party
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleUpdateSecurity = (updatedSecurity: FinanceSecurityWithSnapshot) => {
    setFinanceData(prev => ({
      ...prev,
      securities: prev.securities.map(security => 
        security?.security?.id === updatedSecurity?.security?.id ? updatedSecurity : security
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleAddSecurity = (newSecurity: FinanceSecurityWithSnapshot) => {
    setFinanceData(prev => ({
      ...prev,
      securities: [...prev.securities, newSecurity],
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleDeleteSecurity = async (securityId: string) => {
    try {
      console.log(`🗑️ Deleting security: ${securityId}`);
      
      // Determine if this is a crypto or stock based on ID format
      const isCrypto = securityId.startsWith('crypto:');
      const path = isCrypto 
        ? `finance_dashboard/crypto/${securityId.replace('crypto:', '')}`
        : `finance_dashboard/stocks/${securityId}`;
      
      // Call backend to delete from database
      const response = await fetch(getEdgeFunctionUrl(path), {
        method: 'DELETE',
        headers: getSupabaseHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to delete: ${response.statusText}`);
      }
      
      console.log(`✅ Successfully deleted ${securityId} from backend`);
      
      // Update local state only after successful backend deletion
      setFinanceData(prev => ({
        ...prev,
        securities: prev.securities.filter(security => 
          security?.security?.id !== securityId
        ),
        lastUpdated: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Error deleting security:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete security';
      // Show error toast (you may need to import toast from sonner)
      alert(`Error: ${errorMessage}`);
    }
  };


  // Agent handlers removed - AgentsDashboardWithSupabase manages its own state

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    // Reset the initial feed category when navigating away from feeds
    if (view !== 'feeds') {
      setInitialFeedCategory(undefined);
      setInitialProviderCategory(undefined);
    }
  };

  const handleNavigateToProvidersFromSchoolClosings = () => {
    setInitialProviderCategory("school_closings");
    setCurrentView('feeds');
  };

  const handleNavigateToProvidersFromWeather = () => {
    setInitialProviderCategory("weather");
    setCurrentView('feeds');
  };

  const handleNavigateToProvidersFromSports = () => {
    setInitialProviderCategory("sports");
    setCurrentView('feeds');
  };

  const handleNavigateToProvidersFromNews = () => {
    setInitialProviderCategory("news");
    setCurrentView('feeds');
  };

  const handleNavigateToProvidersFromFinance = () => {
    setInitialProviderCategory("finance");
    setCurrentView('feeds');
  };

  const renderNavigation = () => {
    // Get active dashboards from config
    const defaultDashboards = [
      { dashboard_id: "election", visible: true, order_index: 0 },
      { dashboard_id: "finance", visible: true, order_index: 1 },
      { dashboard_id: "sports", visible: true, order_index: 2 },
      { dashboard_id: "weather", visible: true, order_index: 3 },
      { dashboard_id: "news", visible: true, order_index: 4 },
      { dashboard_id: "agents", visible: true, order_index: 5 },
      { dashboard_id: "school_closings", visible: true, order_index: 6 },
      { dashboard_id: "media_library", visible: true, order_index: 7 }
    ];
    
    const activeDashboards = dashboardConfig.length > 0 ? dashboardConfig : defaultDashboards;
    
    // Filter visible dashboards and sort by order_index
    const visibleDashboards = activeDashboards
      .filter(d => d.visible)
      .sort((a, b) => a.order_index - b.order_index);
    
    // Map dashboard IDs to their button data
    const dashboardButtons: Record<string, { view: AppView; icon: any; label: string }> = {
      election: { view: 'election', icon: Vote, label: 'Elections' },
      finance: { view: 'finance', icon: TrendingUp, label: 'Finance' },
      sports: { view: 'sports', icon: Trophy, label: 'Sports' },
      weather: { view: 'weather', icon: Cloud, label: 'Weather' },
      news: { view: 'news', icon: Newspaper, label: 'News' },
      school_closings: { view: 'school-closings', icon: School, label: 'School Closings' },
      agents: { view: 'agents', icon: Bot, label: 'Agents' },
      media_library: { view: 'media', icon: ImageIcon, label: 'Media' },
    };
    
    return (
      <div className="flex items-center gap-2 mb-8">
        {visibleDashboards.map(dashboard => {
          const buttonData = dashboardButtons[dashboard.dashboard_id];
          if (!buttonData) return null;
          
          const Icon = buttonData.icon;
          
          return (
            <Button
              key={dashboard.dashboard_id}
              variant={currentView === buttonData.view ? 'default' : 'outline'}
              onClick={() => handleNavigate(buttonData.view)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {buttonData.label}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderHome = () => {
    // Calculate visible dashboard count for dynamic grid layout
    const defaultDashboards = [
      { dashboard_id: "election", visible: true, order_index: 0 },
      { dashboard_id: "finance", visible: true, order_index: 1 },
      { dashboard_id: "sports", visible: true, order_index: 2 },
      { dashboard_id: "weather", visible: true, order_index: 3 },
      { dashboard_id: "news", visible: true, order_index: 4 },
      { dashboard_id: "agents", visible: true, order_index: 5 },
      { dashboard_id: "school_closings", visible: true, order_index: 6 },
      { dashboard_id: "media_library", visible: true, order_index: 7 }
    ];
    
    const activeDashboards = dashboardConfig.length > 0 ? dashboardConfig : defaultDashboards;
    const visibleCount = activeDashboards.filter(d => d.visible).length;
    
    // Dynamic grid layout based on card count
    const getGridClass = () => {
      if (visibleCount === 1) return 'grid grid-cols-1 gap-6 max-w-2xl mx-auto';
      if (visibleCount === 2) return 'grid grid-cols-1 md:grid-cols-6 gap-6 max-w-6xl mx-auto';
      if (visibleCount === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto';
      if (visibleCount === 4) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto';
      if (visibleCount === 5) return 'grid grid-cols-1 md:grid-cols-6 gap-6 max-w-6xl mx-auto';
      if (visibleCount === 6) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto';
      if (visibleCount === 7) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-6 max-w-7xl mx-auto';
      if (visibleCount === 8) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto';
      return 'grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto';
    };
    
    // Transform hook stats to match expected interface
    const transformedFinanceStats = {
      securitiesCount: financeStats.totalSecurities,
      loading: financeStats.loading,
      error: financeStats.error
    };
    
    const transformedWeatherStats = {
      locationsCount: weatherStats.totalLocations,
      loading: weatherStats.loading,
      error: weatherStats.error
    };
    
    const transformedSportsStats = {
      teamsCount: sportsStats.totalTeams,
      playersCount: sportsStats.totalPlayers,
      gamesCount: sportsStats.totalGames,
      venuesCount: sportsStats.totalVenues,
      loading: sportsLoading,
      error: sportsError
    };
    
    return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <motion.div 
            className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
            animate={{ 
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.05, 1.05, 1.05, 1]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
          >
            <span className="text-white font-semibold">N</span>
          </motion.div>
          <h1 className="text-3xl font-semibold font-bold">Nova Dashboard</h1>
        </div>
        <motion.p 
          className="text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Comprehensive data management and analysis tools for elections, financial markets, and sports. 
          Features real-time editing, override tracking, and advanced filtering capabilities.
        </motion.p>
      </div>
      
      <div className={getGridClass()}>
        {dashboardConfigLoading ? (
          // Show loading state
          <div className="col-span-full text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">Loading dashboards...</p>
          </div>
        ) : dashboardConfig.length === 0 ? (
          // No config found - show all dashboards in default order
          <DashboardCardRenderer
            dashboards={defaultDashboards}
            cardDataMap={getDashboardCardsData({
              handleNavigate,
              electionLoading,
              electionRacesCount: electionData.races.length,
              financeStats: transformedFinanceStats,
              sportsStats: transformedSportsStats,
              weatherStats: transformedWeatherStats,
              newsStats,
              agentsCount: agentsData.totalCount,
              activeAgentsCount: agentsData.activeCount,
              mediaStats,
              schoolClosingsStats
            })}
          />
        ) : (
          // Use dynamic dashboard renderer based on backend config
          <DashboardCardRenderer
            dashboards={dashboardConfig}
            cardDataMap={getDashboardCardsData({
              handleNavigate,
              electionLoading,
              electionRacesCount: electionData.races.length,
              financeStats: transformedFinanceStats,
              sportsStats: transformedSportsStats,
              weatherStats: transformedWeatherStats,
              newsStats,
              agentsCount: agentsData.totalCount,
              activeAgentsCount: agentsData.activeCount,
              mediaStats,
              schoolClosingsStats
            })}
          />
        )}
      </div>
    </div>
  );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'election':
        return (
          <ElectionDashboard
            races={electionData.races}
            candidates={electionData.candidates}
            parties={electionData.parties}
            onUpdateRace={handleUpdateRace}
            //onUpdateCandidate={handleUpdateCandidate}
            //onUpdateParty={handleUpdateParty}
            lastUpdated={electionData.lastUpdated}
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Elections');
              setCurrentView('feeds');
            }}
          />
        );
      case 'finance':
        return (
          <FinanceDashboard
            securities={financeData.securities}
            onUpdateSecurity={handleUpdateSecurity}
            onAddSecurity={handleAddSecurity}
            onDeleteSecurity={handleDeleteSecurity}
            lastUpdated={financeData.lastUpdated}
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Finance');
              setCurrentView('feeds');
            }}
            onNavigateToProviders={handleNavigateToProvidersFromFinance}
          />
        );
      case 'sports':
        return (
          <SportsDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Sports');
              setCurrentView('feeds');
            }}
            onNavigateToProviders={handleNavigateToProvidersFromSports}
          />
        );
      case 'weather':
        return (
          <WeatherDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('Weather');
              setCurrentView('feeds');
            }}
            onNavigateToProviders={handleNavigateToProvidersFromWeather}
          />
        );
      case 'weather-data':
        return <WeatherDataViewer />;
      case 'news':
        return (
          <NewsDashboard
            onNavigateToFeeds={() => {
              setInitialFeedCategory('News');
              setCurrentView('feeds');
            }}
            onNavigateToProviders={handleNavigateToProvidersFromNews}
          />
        );
      case 'feeds':
        return (
          <FeedsDashboardWithSupabase
            initialCategory={initialFeedCategory || initialProviderCategory}
            onNavigate={(view) => {
              // Map DashboardView to AppView
              const viewMap: Record<string, AppView> = {
                'election': 'election',
                'finance': 'finance',
                'sports': 'sports',
                'weather': 'weather',
                'news': 'news',
                'school-closings': 'school-closings',
                'agents': 'agents',
                'media': 'media'
              };
              handleNavigate(viewMap[view] || view as AppView);
            }}
            dashboardConfig={dashboardConfig}
          />
        );
      case 'agents':
        return (
          <AgentsDashboardWithSupabase
            feeds={[]} // Feeds are now loaded from Supabase in the feeds dashboard
          />
        );
      case 'users-groups':
        return (
          <UsersGroupsPage />
        );
      case 'ai-connections':
        return (
          <AIConnectionsDashboard
            onNavigate={handleNavigate}
            dashboardConfig={dashboardConfig}
          />
        );
      case 'media':
        return (
          <MediaLibrary
            onNavigate={(view) => console.log('Navigate to:', view)}
          />
        );
      case 'channels':
        return (
          <ChannelsPage />
        );
      case 'school-closings':
        return (
          <SchoolClosingsDashboard 
            onNavigateToProviders={handleNavigateToProvidersFromSchoolClosings}
          />
        );
      default:
        return renderHome();
    }
  };

  const handleUpdateUser = (updatedUser: Partial<any>) => {
    setUsersData(prev => ({
      ...prev,
      users: prev.users.map(user => 
        user.id === prev.users[0].id 
          ? { ...user, ...updatedUser }
          : user
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  return (
    <ProtectedRoute appName="Nova">
      <div className="min-h-screen bg-background">
        <TopMenuBar
          onNavigate={(view) => handleNavigate(view as AppView)}
          currentUser={usersData.users[0]}
          roles={usersData.roles}
          permissions={usersData.permissions}
          onUpdateUser={handleUpdateUser}
          dashboardConfig={dashboardConfig}
        />
        <div className="container mx-auto px-4 py-8">
          {currentView !== 'home' && currentView !== 'users-groups' && currentView !== 'feeds' && currentView !== 'ai-connections' && renderNavigation()}
          {renderContent()}
        </div>
        <DashboardConfigDialog
          open={showDashboardConfig}
          onOpenChange={setShowDashboardConfig}
        />
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}
