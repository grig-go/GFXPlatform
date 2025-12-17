import React, { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner@2.0.3";
import { Newspaper, ExternalLink, Clock } from "lucide-react";

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SportsNewsProps {
  entityName: string;
  entityType: 'team' | 'player' | 'game' | 'venue' | 'tournament';
  isOpen: boolean;
  onClose: () => void;
}

// Mock news API function
const mockSportsNewsLookup = async (entityName: string, entityType: string): Promise<NewsItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const mockNews: Record<string, NewsItem[]> = {
    'Los Angeles Lakers': [
      {
        id: '1',
        headline: 'Lakers Extend Winning Streak to Five Games',
        summary: 'The Los Angeles Lakers defeated the Phoenix Suns 115-105, with Anthony Davis recording a double-double and showcasing dominant defensive play.',
        source: 'ESPN',
        publishedAt: '2024-02-07T22:30:00Z',
        url: '#',
        sentiment: 'positive'
      },
      {
        id: '2',
        headline: 'LeBron James Nearing Historic Milestone',
        summary: 'LeBron James is just 42 points away from reaching 40,000 career points, a milestone only he could achieve in NBA history.',
        source: 'The Athletic',
        publishedAt: '2024-02-07T14:15:00Z',
        url: '#',
        sentiment: 'positive'
      },
      {
        id: '3',
        headline: 'Lakers Eye Trade Deadline Moves for Playoff Push',
        summary: 'Front office reportedly exploring options to strengthen the bench rotation ahead of the February 8th trade deadline.',
        source: 'NBA.com',
        publishedAt: '2024-02-06T18:45:00Z',
        url: '#',
        sentiment: 'neutral'
      }
    ],
    'Golden State Warriors': [
      {
        id: '4',
        headline: 'Curry Returns to Form with 38-Point Performance',
        summary: 'Stephen Curry erupted for 38 points including 7 three-pointers as the Warriors secured a crucial road victory.',
        source: 'ESPN',
        publishedAt: '2024-02-07T21:00:00Z',
        url: '#',
        sentiment: 'positive'
      },
      {
        id: '5',
        headline: 'Warriors Struggles Continue on Defensive End',
        summary: 'Golden State ranks 23rd in defensive rating this season, a significant concern as the playoffs approach.',
        source: 'The Athletic',
        publishedAt: '2024-02-06T16:30:00Z',
        url: '#',
        sentiment: 'negative'
      }
    ],
    'LeBron James': [
      {
        id: '6',
        headline: 'LeBron James Named Western Conference Player of the Week',
        summary: 'The Lakers superstar averaged 28.5 points, 8.2 rebounds, and 7.8 assists in leading LA to a 4-0 week.',
        source: 'NBA.com',
        publishedAt: '2024-02-07T16:00:00Z',
        url: '#',
        sentiment: 'positive'
      },
      {
        id: '7',
        headline: 'James Discusses Legacy and Future Plans',
        summary: 'In an exclusive interview, LeBron opens up about playing alongside his son Bronny and potential retirement timeline.',
        source: 'The Athletic',
        publishedAt: '2024-02-06T12:20:00Z',
        url: '#',
        sentiment: 'neutral'
      }
    ]
  };

  // Default news for unknown entities
  const defaultNews: NewsItem[] = [
    {
      id: 'default1',
      headline: `${entityName} Shows Strong Performance in Recent ${entityType === 'game' ? 'Match' : 'Outing'}`,
      summary: `${entityName} continues to make headlines with impressive ${entityType === 'player' ? 'individual' : 'team'} performance and strategic plays.`,
      source: 'Sports News Network',
      publishedAt: '2024-02-07T12:00:00Z',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: 'default2',
      headline: `Analysts Weigh In on ${entityName}'s Season Outlook`,
      summary: 'Sports analysts and commentators provide their insights on recent developments and future prospects.',
      source: 'Sports Analysis Weekly',
      publishedAt: '2024-02-06T14:30:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: 'default3',
      headline: `${entityName} Generates Buzz in ${entityType === 'player' ? 'League' : 'Sports'} Community`,
      summary: 'Increased attention and discussion surrounding recent events and upcoming challenges.',
      source: 'Sports Wire',
      publishedAt: '2024-02-05T11:15:00Z',
      url: '#',
      sentiment: 'neutral'
    }
  ];

  return mockNews[entityName] || defaultNews;
};

export function SportsNews({ entityName, entityType, isOpen, onClose }: SportsNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchNews = async () => {
    if (hasLoaded) return; // Don't refetch if already loaded
    
    setIsLoading(true);
    try {
      const newsData = await mockSportsNewsLookup(entityName, entityType);
      setNews(newsData);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else if (!hasLoaded) {
      fetchNews();
    }
  };

  React.useEffect(() => {
    if (isOpen && !hasLoaded) {
      fetchNews();
    }
  }, [isOpen]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'team': return 'Team';
      case 'player': return 'Player';
      case 'game': return 'Game';
      case 'venue': return 'Venue';
      case 'tournament': return 'Tournament';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Latest News: {entityName}
          </DialogTitle>
          <DialogDescription>
            Recent headlines and sports news for {getEntityTypeLabel(entityType).toLowerCase()} {entityName}
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
                        <Badge variant="outline" className="text-xs">
                          {item.source}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getSentimentColor(item.sentiment)}`}
                        >
                          {item.sentiment}
                        </Badge>
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
              <p>No recent news available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
