import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, RefreshCw } from "lucide-react";
import { BettingOddsModal } from "./BettingOddsModal";

interface GameWithOdds {
  id: string;
  sportradar_id: string;
  start_time: string;
  status: string;
  home_score?: number;
  away_score?: number;
  round?: string;
  venue_name?: string;
  home_team_name: string;
  home_team_logo?: string;
  home_team_short?: string;
  away_team_name: string;
  away_team_logo?: string;
  away_team_short?: string;
  league_name?: string;
  league_logo?: string;
  season_id?: string;
  home_win_odds?: number;
  draw_odds?: number;
  away_win_odds?: number;
  home_win_prob?: number;
  draw_prob?: number;
  away_win_prob?: number;
}

interface BettingViewProps {
  leagues: any[];
  filters: {
    league?: string;
    provider?: string;
  };
}

export function BettingView({ leagues, filters }: BettingViewProps) {
  const [games, setGames] = useState<GameWithOdds[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showOddsModal, setShowOddsModal] = useState(false);
  const [showingAllLeagues, setShowingAllLeagues] = useState(false);

  // Fetch seasons for the selected league
  useEffect(() => {
    if (filters.league) {
      setShowingAllLeagues(false);
      fetchSeasons(filters.league);
    } else {
      // "All Leagues" is selected
      setShowingAllLeagues(true);
      setSeasons([]);
      setSelectedSeasonId("");
      fetchAllGamesWithOdds();
    }
  }, [filters.league]);

  // Fetch games when season changes
  useEffect(() => {
    if (selectedSeasonId && filters.league) {
      fetchGamesWithOdds();
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('sports_seasons')
        .select('id, name, start_date, end_date')
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      setSeasons(data || []);
      if (data && data.length > 0) {
        setSelectedSeasonId(data[0].id);
      }
    } catch (err) {
      console.error('[BettingView] Error fetching seasons:', err);
      toast.error('Failed to load seasons');
    }
  };

  const fetchGamesWithOdds = async () => {
    try {
      setLoading(true);
      console.log('[BettingView] Fetching games with odds for season:', selectedSeasonId);

      // Call the RPC function to get upcoming games with odds
      const { data, error } = await supabase
        .rpc('get_upcoming_with_odds', {
          p_season_id: selectedSeasonId,
          p_limit: 20
        });

      if (error) {
        console.error('[BettingView] RPC error:', error);
        throw error;
      }

      console.log('[BettingView] Games with odds:', data);
      setGames(data || []);
    } catch (err) {
      console.error('[BettingView] Error fetching games with odds:', err);
      toast.error('Failed to load betting data');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGamesWithOdds = async () => {
    try {
      setLoading(true);
      console.log('[BettingView] Fetching all games with odds');

      // Fetch upcoming events directly with a join to betting odds
      const now = new Date().toISOString();
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('sports_events')
        .select(`
          id,
          sportradar_id,
          start_time,
          status,
          home_score,
          away_score,
          round,
          venue_id,
          home_team:sports_teams!sports_events_home_team_id_fkey(
            id,
            name,
            short_name,
            logo_url,
            colors
          ),
          away_team:sports_teams!sports_events_away_team_id_fkey(
            id,
            name,
            short_name,
            logo_url,
            colors
          ),
          season:sports_seasons(
            id,
            name,
            league:sports_leagues(
              id,
              name,
              logo_url
            )
          ),
          venue:sports_venues(name)
        `)
        .gte('start_time', now)
        .in('status', ['scheduled', 'not_started'])
        .order('start_time', { ascending: true })
        .limit(50);

      if (eventsError) {
        console.error('[BettingView] Events query error:', eventsError);
        throw eventsError;
      }

      console.log('[BettingView] Fetched events:', eventsData?.length);

      if (!eventsData || eventsData.length === 0) {
        setGames([]);
        return;
      }

      // Get event IDs to fetch odds
      const eventIds = eventsData.map(e => e.id);

      // Fetch odds for these events
      const { data: oddsData, error: oddsError } = await supabase
        .from('sports_betting_odds')
        .select('event_id, home_odds, draw_odds, away_odds, home_probability, draw_probability, away_probability')
        .in('event_id', eventIds)
        .eq('market_type', 'match_winner')
        .order('updated_at', { ascending: false });

      if (oddsError) {
        console.error('[BettingView] Odds query error:', oddsError);
      }

      // Map odds to events
      const oddsMap = new Map();
      oddsData?.forEach(odd => {
        if (!oddsMap.has(odd.event_id)) {
          oddsMap.set(odd.event_id, odd);
        }
      });

      // Combine events with odds and filter to only those with odds
      const gamesWithOdds: GameWithOdds[] = eventsData
        .map(event => {
          const odds = oddsMap.get(event.id);
          const homeTeam = Array.isArray(event.home_team) ? event.home_team[0] : event.home_team;
          const awayTeam = Array.isArray(event.away_team) ? event.away_team[0] : event.away_team;
          const season = Array.isArray(event.season) ? event.season[0] : event.season;
          const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
          const league = season?.league ? (Array.isArray(season.league) ? season.league[0] : season.league) : null;

          return {
            id: event.id,
            sportradar_id: event.sportradar_id || '',
            start_time: event.start_time,
            status: event.status,
            home_score: event.home_score,
            away_score: event.away_score,
            round: event.round,
            venue_name: venue?.name,
            home_team_name: homeTeam?.name || 'Unknown',
            home_team_logo: homeTeam?.logo_url,
            home_team_short: homeTeam?.short_name,
            away_team_name: awayTeam?.name || 'Unknown',
            away_team_logo: awayTeam?.logo_url,
            away_team_short: awayTeam?.short_name,
            league_name: league?.name,
            league_logo: league?.logo_url,
            season_id: season?.id,
            home_win_odds: odds?.home_odds,
            draw_odds: odds?.draw_odds,
            away_win_odds: odds?.away_odds,
            home_win_prob: odds?.home_probability,
            draw_prob: odds?.draw_probability,
            away_win_prob: odds?.away_probability,
          };
        })
        .filter(game => game.home_win_odds || game.draw_odds || game.away_win_odds) // Only include games with odds
        .slice(0, 20); // Limit to 20 games

      console.log('[BettingView] Games with odds:', gamesWithOdds.length);
      setGames(gamesWithOdds);
    } catch (err) {
      console.error('[BettingView] Error fetching games with odds:', err);
      toast.error('Failed to load betting data');
      setGames([]);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const gameDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let dayLabel = '';
    if (gameDate.getTime() === today.getTime()) {
      dayLabel = 'Today';
    } else if (gameDate.getTime() === tomorrow.getTime()) {
      dayLabel = 'Tomorrow';
    } else {
      dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    return `${dayLabel} • ${time}`;
  };

  const handleGameClick = (gameId: string) => {
    setSelectedGameId(gameId);
    setShowOddsModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading betting data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* All Leagues Refresh Button */}
        {showingAllLeagues && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Showing All Upcoming Games</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Displaying odds from all leagues with available betting markets
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllGamesWithOdds}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Season Selector */}
        {seasons.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm whitespace-nowrap">Season:</Label>
                <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchGamesWithOdds}
                  className="ml-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Games with Odds */}
        {games.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg mb-2">No Upcoming Games</h3>
              <p className="text-sm text-muted-foreground">
                There are no upcoming games with odds available for this season.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {games.map((game) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => handleGameClick(game.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {game.league_logo && (
                          <img
                            src={game.league_logo}
                            alt={game.league_name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {game.league_name || 'League'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(game.start_time)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Teams */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        {game.home_team_logo ? (
                          <img
                            src={game.home_team_logo}
                            alt={game.home_team_name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-xs">{game.home_team_short?.[0] || 'H'}</span>
                          </div>
                        )}
                        <span className="font-medium flex-1">
                          {game.home_team_short || game.home_team_name || 'Home Team'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {game.away_team_logo ? (
                          <img
                            src={game.away_team_logo}
                            alt={game.away_team_name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-xs">{game.away_team_short?.[0] || 'A'}</span>
                          </div>
                        )}
                        <span className="font-medium flex-1">
                          {game.away_team_short || game.away_team_name || 'Away Team'}
                        </span>
                      </div>
                    </div>

                    {/* Odds */}
                    {(game.home_win_odds || game.draw_odds || game.away_win_odds) ? (
                      <div className="grid grid-cols-3 gap-2">
                        {/* Home Win */}
                        <div className={`p-3 rounded-lg border-2 ${getProbabilityColor(game.home_win_prob)} transition-all`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Home</span>
                            {getProbabilityIcon(game.home_win_prob)}
                          </div>
                          <div className="text-lg font-bold">
                            {game.home_win_odds ? game.home_win_odds.toFixed(2) : '-'}
                          </div>
                          {game.home_win_prob && (
                            <div className="text-xs text-muted-foreground">
                              {game.home_win_prob.toFixed(0)}%
                            </div>
                          )}
                        </div>

                        {/* Draw */}
                        <div className={`p-3 rounded-lg border-2 ${getProbabilityColor(game.draw_prob)} transition-all`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Draw</span>
                            {getProbabilityIcon(game.draw_prob)}
                          </div>
                          <div className="text-lg font-bold">
                            {game.draw_odds ? game.draw_odds.toFixed(2) : '-'}
                          </div>
                          {game.draw_prob && (
                            <div className="text-xs text-muted-foreground">
                              {game.draw_prob.toFixed(0)}%
                            </div>
                          )}
                        </div>

                        {/* Away Win */}
                        <div className={`p-3 rounded-lg border-2 ${getProbabilityColor(game.away_win_prob)} transition-all`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Away</span>
                            {getProbabilityIcon(game.away_win_prob)}
                          </div>
                          <div className="text-lg font-bold">
                            {game.away_win_odds ? game.away_win_odds.toFixed(2) : '-'}
                          </div>
                          {game.away_win_prob && (
                            <div className="text-xs text-muted-foreground">
                              {game.away_win_prob.toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No odds available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Odds Modal */}
      <BettingOddsModal
        eventId={selectedGameId}
        open={showOddsModal}
        onOpenChange={setShowOddsModal}
      />
    </>
  );
}