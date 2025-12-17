import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BettingOddsModalProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OddsData {
  match_winner: Array<{
    home_odds?: number;
    draw_odds?: number;
    away_odds?: number;
    home_probability?: number;
    draw_probability?: number;
    away_probability?: number;
    bookmaker?: string;
    updated_at: string;
  }>;
  over_under: Array<{
    line: number;
    over_odds: number;
    under_odds: number;
    bookmaker?: string;
    updated_at: string;
  }>;
  btts: Array<{
    yes_odds: number;
    no_odds: number;
    bookmaker?: string;
    updated_at: string;
  }>;
  asian_handicap: Array<{
    line: number;
    home_odds: number;
    away_odds: number;
    bookmaker?: string;
    updated_at: string;
  }>;
}

export function BettingOddsModal({ eventId, open, onOpenChange }: BettingOddsModalProps) {
  const [loading, setLoading] = useState(false);
  const [oddsData, setOddsData] = useState<OddsData | null>(null);
  const [gameInfo, setGameInfo] = useState<any>(null);

  useEffect(() => {
    if (open && eventId) {
      fetchOddsData();
    }
  }, [open, eventId]);

  const fetchOddsData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      console.log('[BettingOddsModal] Fetching odds for event:', eventId);

      // Fetch game info
      const { data: gameData, error: gameError } = await supabase
        .from('sports_events')
        .select(`
          id,
          start_time,
          status,
          home_team:sports_teams!sports_events_home_team_id_fkey (
            id,
            name,
            short_name,
            logo_url
          ),
          away_team:sports_teams!sports_events_away_team_id_fkey (
            id,
            name,
            short_name,
            logo_url
          ),
          sports_seasons (
            sports_leagues (
              name,
              logo_url
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (gameError) throw gameError;
      setGameInfo(gameData);

      // Call RPC function to get match odds
      const { data, error } = await supabase
        .rpc('get_match_odds', {
          p_event_id: eventId
        });

      if (error) {
        console.error('[BettingOddsModal] RPC error:', error);
        throw error;
      }

      console.log('[BettingOddsModal] Odds data:', data);

      // Transform the data into organized structure
      const organized: OddsData = {
        match_winner: [],
        over_under: [],
        btts: [],
        asian_handicap: []
      };

      if (data && Array.isArray(data)) {
        data.forEach((odd: any) => {
          if (odd.market_type === 'match_winner') {
            organized.match_winner.push(odd);
          } else if (odd.market_type === 'over_under') {
            organized.over_under.push(odd);
          } else if (odd.market_type === 'btts') {
            organized.btts.push(odd);
          } else if (odd.market_type === 'asian_handicap') {
            organized.asian_handicap.push(odd);
          }
        });
      }

      setOddsData(organized);
    } catch (err) {
      console.error('[BettingOddsModal] Error fetching odds:', err);
      toast.error('Failed to load detailed odds');
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability?: number): string => {
    if (!probability) return 'bg-muted';
    
    if (probability >= 50) return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    if (probability >= 35) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
  };

  const getProbabilityIcon = (probability?: number) => {
    if (!probability) return <Minus className="w-4 h-4" />;
    
    if (probability >= 40) return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
    if (probability >= 30) return <Minus className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Betting Odds & Probabilities</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Game Info */}
            {gameInfo && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {gameInfo.home_team?.logo_url && (
                        <img
                          src={gameInfo.home_team.logo_url}
                          alt={gameInfo.home_team.name}
                          className="w-10 h-10 object-contain"
                        />
                      )}
                      <span className="font-medium">
                        {gameInfo.home_team?.short_name || gameInfo.home_team?.name || 'Home'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">vs</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {gameInfo.away_team?.short_name || gameInfo.away_team?.name || 'Away'}
                      </span>
                      {gameInfo.away_team?.logo_url && (
                        <img
                          src={gameInfo.away_team.logo_url}
                          alt={gameInfo.away_team.name}
                          className="w-10 h-10 object-contain"
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    {new Date(gameInfo.start_time).toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Odds Tabs */}
            <Tabs defaultValue="match_winner" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="match_winner">Match Winner</TabsTrigger>
                <TabsTrigger value="over_under">Over/Under</TabsTrigger>
                <TabsTrigger value="btts">BTTS</TabsTrigger>
                <TabsTrigger value="correct_score">Correct Score</TabsTrigger>
                <TabsTrigger value="asian_handicap">Handicap</TabsTrigger>
              </TabsList>

              {/* Match Winner (1X2) */}
              <TabsContent value="match_winner" className="space-y-4">
                {oddsData && oddsData.match_winner.length > 0 ? (
                  oddsData.match_winner.map((odd, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {odd.bookmaker || 'Bookmaker'}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {new Date(odd.updated_at).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                          {/* Home */}
                          <div className={`p-4 rounded-lg border-2 ${getProbabilityColor(odd.home_probability)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Home Win</span>
                              {getProbabilityIcon(odd.home_probability)}
                            </div>
                            <div className="text-2xl font-bold">
                              {odd.home_odds?.toFixed(2) || '-'}
                            </div>
                            {odd.home_probability && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {odd.home_probability.toFixed(1)}%
                              </div>
                            )}
                          </div>

                          {/* Draw */}
                          <div className={`p-4 rounded-lg border-2 ${getProbabilityColor(odd.draw_probability)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Draw</span>
                              {getProbabilityIcon(odd.draw_probability)}
                            </div>
                            <div className="text-2xl font-bold">
                              {odd.draw_odds?.toFixed(2) || '-'}
                            </div>
                            {odd.draw_probability && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {odd.draw_probability.toFixed(1)}%
                              </div>
                            )}
                          </div>

                          {/* Away */}
                          <div className={`p-4 rounded-lg border-2 ${getProbabilityColor(odd.away_probability)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Away Win</span>
                              {getProbabilityIcon(odd.away_probability)}
                            </div>
                            <div className="text-2xl font-bold">
                              {odd.away_odds?.toFixed(2) || '-'}
                            </div>
                            {odd.away_probability && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {odd.away_probability.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-sm text-muted-foreground">No match winner odds available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Over/Under Goals */}
              <TabsContent value="over_under" className="space-y-4">
                {oddsData && oddsData.over_under.length > 0 ? (
                  oddsData.over_under.map((odd, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {odd.bookmaker || 'Bookmaker'} - Line: {odd.line} goals
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {new Date(odd.updated_at).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">Over {odd.line}</span>
                            <div className="text-2xl font-bold mt-2">{odd.over_odds.toFixed(2)}</div>
                          </div>
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">Under {odd.line}</span>
                            <div className="text-2xl font-bold mt-2">{odd.under_odds.toFixed(2)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-sm text-muted-foreground">No over/under odds available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Both Teams to Score */}
              <TabsContent value="btts" className="space-y-4">
                {oddsData && oddsData.btts.length > 0 ? (
                  oddsData.btts.map((odd, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {odd.bookmaker || 'Bookmaker'}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {new Date(odd.updated_at).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">Yes</span>
                            <div className="text-2xl font-bold mt-2">{odd.yes_odds.toFixed(2)}</div>
                          </div>
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">No</span>
                            <div className="text-2xl font-bold mt-2">{odd.no_odds.toFixed(2)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-sm text-muted-foreground">No BTTS odds available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Correct Score */}
              <TabsContent value="correct_score">
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-sm text-muted-foreground">Correct score odds coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Asian Handicap */}
              <TabsContent value="asian_handicap" className="space-y-4">
                {oddsData && oddsData.asian_handicap.length > 0 ? (
                  oddsData.asian_handicap.map((odd, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {odd.bookmaker || 'Bookmaker'} - Handicap: {odd.line > 0 ? '+' : ''}{odd.line}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {new Date(odd.updated_at).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">Home ({odd.line > 0 ? '+' : ''}{odd.line})</span>
                            <div className="text-2xl font-bold mt-2">{odd.home_odds.toFixed(2)}</div>
                          </div>
                          <div className="p-4 rounded-lg border-2 bg-muted">
                            <span className="text-sm text-muted-foreground">Away ({odd.line < 0 ? '+' : ''}{-odd.line})</span>
                            <div className="text-2xl font-bold mt-2">{odd.away_odds.toFixed(2)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-sm text-muted-foreground">No handicap odds available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}