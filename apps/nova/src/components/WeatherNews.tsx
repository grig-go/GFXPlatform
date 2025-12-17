import React, { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner@2.0.3";
import { Newspaper, ExternalLink, Clock, AlertTriangle, Sun, CloudRain, Snowflake, Zap } from "lucide-react";

interface WeatherNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  type: 'weather-alert' | 'climate' | 'forecast' | 'natural-disaster' | 'general';
  severity?: 'low' | 'moderate' | 'high' | 'extreme';
}

interface WeatherNewsProps {
  locationName: string;
  locationId: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Mock weather news API function
const mockWeatherNewsLookup = async (locationName: string): Promise<WeatherNewsItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const mockNews: Record<string, WeatherNewsItem[]> = {
    'Newark, NJ': [
      {
        id: '1',
        headline: 'Wind Advisory Issued for Northern New Jersey',
        summary: 'National Weather Service issues wind advisory for Newark and surrounding areas with sustained winds of 25-35 mph and gusts up to 50 mph expected through Thursday evening.',
        source: 'National Weather Service',
        publishedAt: '2024-02-07T14:30:00Z',
        url: '#',
        type: 'weather-alert',
        severity: 'moderate'
      },
      {
        id: '2',
        headline: 'Newark Sees Record High Temperatures for February',
        summary: 'Newark Metropolitan Airport recorded 68°F yesterday, breaking the previous February 6th record of 65°F set in 2008, part of an unusual warm spell affecting the Northeast.',
        source: 'NJ.com Weather',
        publishedAt: '2024-02-06T09:15:00Z',
        url: '#',
        type: 'climate',
        severity: 'low'
      },
      {
        id: '3',
        headline: 'Weekend Storm System to Bring Rain and Wind to Tri-State Area',
        summary: 'A powerful storm system approaching from the west is expected to bring heavy rain, gusty winds, and possible flooding to Newark and the greater New York metropolitan area this weekend.',
        source: 'Weather Underground',
        publishedAt: '2024-02-05T16:45:00Z',
        url: '#',
        type: 'forecast',
        severity: 'moderate'
      }
    ],
    'Miami, FL': [
      {
        id: '4',
        headline: 'Heat Index Expected to Reach 105°F This Week in Miami',
        summary: 'The combination of high temperatures and humidity will create dangerous heat index values, prompting health officials to open cooling centers throughout Miami-Dade County.',
        source: 'National Weather Service Miami',
        publishedAt: '2024-02-07T11:20:00Z',
        url: '#',
        type: 'weather-alert',
        severity: 'high'
      },
      {
        id: '5',
        headline: 'Atlantic Hurricane Season Outlook Updated for 2024',
        summary: 'NOAA releases updated predictions for the Atlantic hurricane season, with Miami remaining in the potential impact zone for several storm tracks.',
        source: 'Miami Herald Weather',
        publishedAt: '2024-02-06T13:30:00Z',
        url: '#',
        type: 'forecast',
        severity: 'moderate'
      },
      {
        id: '6',
        headline: 'Red Tide Advisory Issued for South Florida Beaches',
        summary: 'Environmental conditions favorable for red tide development have been detected off the Miami coast, potentially affecting air quality and beach conditions.',
        source: 'Florida Fish and Wildlife',
        publishedAt: '2024-02-05T10:00:00Z',
        url: '#',
        type: 'general',
        severity: 'moderate'
      }
    ],
    'Denver, CO': [
      {
        id: '7',
        headline: 'Blizzard Warning Issued for Denver Metro Area',
        summary: 'Heavy snow and blowing snow will create life-threatening travel conditions across the Denver metropolitan area, with 12-18 inches of snow expected by Friday morning.',
        source: 'National Weather Service Boulder',
        publishedAt: '2024-02-07T08:45:00Z',
        url: '#',
        type: 'weather-alert',
        severity: 'extreme'
      },
      {
        id: '8',
        headline: 'Denver Water Reservoir Levels Rise Following Heavy Mountain Snow',
        summary: 'Snowpack in the Colorado Rockies reaches 115% of normal for this time of year, providing optimistic outlook for Denver area water supplies.',
        source: 'Denver Water Department',
        publishedAt: '2024-02-06T15:20:00Z',
        url: '#',
        type: 'climate',
        severity: 'low'
      },
      {
        id: '9',
        headline: 'Air Quality Alert Due to Temperature Inversion Over Denver',
        summary: 'Cold air trapped near the surface is causing pollution to accumulate, leading to unhealthy air quality conditions for sensitive groups in the Denver metro area.',
        source: 'Colorado Department of Health',
        publishedAt: '2024-02-05T12:10:00Z',
        url: '#',
        type: 'general',
        severity: 'moderate'
      }
    ]
  };

  // Generate default weather news for unknown locations
  const generateDefaultNews = (location: string): WeatherNewsItem[] => [
    {
      id: 'default1',
      headline: `${location} Weather Update: Seasonal Conditions Continue`,
      summary: `Current weather patterns in ${location} remain typical for this time of year, with meteorologists monitoring developing systems that could affect the region in the coming days.`,
      source: 'Local Weather Service',
      publishedAt: '2024-02-07T12:00:00Z',
      url: '#',
      type: 'general',
      severity: 'low'
    },
    {
      id: 'default2',
      headline: `Extended Forecast for ${location} Shows Variable Conditions`,
      summary: `The 7-day outlook for ${location} indicates changing weather patterns with temperature fluctuations and possible precipitation events requiring continued monitoring.`,
      source: 'Regional Weather Center',
      publishedAt: '2024-02-06T14:30:00Z',
      url: '#',
      type: 'forecast',
      severity: 'low'
    },
    {
      id: 'default3',
      headline: `Climate Data Shows ${location} Temperature Trends`,
      summary: `Recent climate analysis reveals temperature patterns in ${location} align with seasonal expectations, though long-term trends continue to be monitored by meteorologists.`,
      source: 'Weather Analytics',
      publishedAt: '2024-02-05T11:15:00Z',
      url: '#',
      type: 'climate',
      severity: 'low'
    }
  ];

  return mockNews[locationName] || generateDefaultNews(locationName);
};

// Component for rendering weather news content without dialog wrapper
export function WeatherNewsContent({ locationName, locationId }: WeatherNewsProps) {
  const [news, setNews] = useState<WeatherNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const newsData = await mockWeatherNewsLookup(locationName);
      setNews(newsData);
    } catch (error) {
      console.error('Failed to fetch weather news:', error);
      toast.error('Failed to load weather news');
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNews();
  }, [locationName]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weather-alert': return <AlertTriangle className="w-3 h-3" />;
      case 'forecast': return <Sun className="w-3 h-3" />;
      case 'natural-disaster': return <Zap className="w-3 h-3" />;
      case 'climate': return <CloudRain className="w-3 h-3" />;
      default: return <Newspaper className="w-3 h-3" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weather-alert': return 'bg-red-50 text-red-700 border-red-200';
      case 'natural-disaster': return 'bg-red-50 text-red-700 border-red-200';
      case 'forecast': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'climate': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {isLoading ? (
        // Loading skeletons
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        // News items
        news.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs flex items-center gap-1 ${getTypeColor(item.type)}`}
                    >
                      {getTypeIcon(item.type)}
                      {item.source}
                    </Badge>
                    {item.severity && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getSeverityColor(item.severity)}`}
                      >
                        {item.severity}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.publishedAt)}
                  </div>
                </div>
                
                <h3 className="font-semibold leading-tight">
                  {item.headline}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
                
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 h-7 px-2 text-xs"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Read More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      {!isLoading && news.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No recent weather news available</p>
        </div>
      )}
    </div>
  );
}

export function WeatherNews({ locationName, locationId, isOpen: externalIsOpen, onOpenChange: externalOnOpenChange }: WeatherNewsProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;
  const [news, setNews] = useState<WeatherNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchNews = async () => {
    if (hasLoaded) return; // Don't refetch if already loaded
    
    setIsLoading(true);
    try {
      const newsData = await mockWeatherNewsLookup(locationName);
      setNews(newsData);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to fetch weather news:', error);
      toast.error('Failed to load weather news');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasLoaded) {
      fetchNews();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weather-alert': return <AlertTriangle className="w-3 h-3" />;
      case 'forecast': return <Sun className="w-3 h-3" />;
      case 'natural-disaster': return <Zap className="w-3 h-3" />;
      case 'climate': return <CloudRain className="w-3 h-3" />;
      default: return <Newspaper className="w-3 h-3" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weather-alert': return 'bg-red-50 text-red-700 border-red-200';
      case 'natural-disaster': return 'bg-red-50 text-red-700 border-red-200';
      case 'forecast': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'climate': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 h-7 px-2 text-xs"
        >
          <Newspaper className="w-3 h-3" />
          News
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Weather News: {locationName}
          </DialogTitle>
          <DialogDescription>
            Recent weather news, alerts, and forecasts for {locationName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // News items
            news.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs flex items-center gap-1 ${getTypeColor(item.type)}`}
                        >
                          {getTypeIcon(item.type)}
                          {item.source}
                        </Badge>
                        {item.severity && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSeverityColor(item.severity)}`}
                          >
                            {item.severity}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.publishedAt)}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold leading-tight">
                      {item.headline}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 h-7 px-2 text-xs"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Read More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {!isLoading && news.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent weather news available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}