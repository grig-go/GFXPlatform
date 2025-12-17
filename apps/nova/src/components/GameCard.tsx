import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Users, Clock, TrendingUp, TrendingDown, Minus, MoreVertical, User, Users as UsersIcon, Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { GameDetailsWithLineups } from "./GameDetailsWithLineups";
import { TeamStatsModal } from "./TeamStatsModal";
import { supabase } from "../utils/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface GameCardProps {
  game: {
    id: string;
    start_time: string;
    status: string;
    home_score?: number;
    away_score?: number;
    round?: string;
    venue_name?: string;
    venue_city?: string;
    attendance?: number;
    home_team: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      colors?: {
        primary?: string;
        secondary?: string;
      };
    };
    away_team: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      colors?: {
        primary?: string;
        secondary?: string;
      };
    };
    league?: {
      id: string;
      name: string;
      logo_url?: string;
    };
  };
  onClick?: () => void;
  showOdds?: boolean;
}

// Helper function to format date/time
const formatGameDateTime = (dateString: string): string => {
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

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'live' || statusLower === 'inprogress' || statusLower === 'in_progress') {
    return (
      <Badge className="bg-red-500 text-white border-0 animate-pulse">
        <span className="mr-1">🔴</span> LIVE
      </Badge>
    );
  }
  
  if (statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete') {
    return (
      <Badge variant="secondary">
        Full Time
      </Badge>
    );
  }
  
  if (statusLower === 'scheduled' || statusLower === 'not_started') {
    return (
      <Badge className="bg-blue-500 text-white border-0">
        Upcoming
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
};

// Helper function to get border color based on status
const getBorderColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'live' || statusLower === 'inprogress' || statusLower === 'in_progress') {
    return '#ef4444'; // red
  }
  
  if (statusLower === 'scheduled' || statusLower === 'not_started') {
    return '#3b82f6'; // blue
  }
  
  return '#e5e7eb'; // gray
};

// Helper function to check if game is ended
const isGameEnded = (status: string): boolean => {
  const statusLower = status.toLowerCase();
  return statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete';
};

export function GameCard({ game, onClick, showOdds = true }: GameCardProps) {
  const ended = isGameEnded(game.status);
  const borderColor = getBorderColor(game.status);
  
  const [showDetails, setShowDetails] = useState(false);
  const [showTeamStats, setShowTeamStats] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [hasLineup, setHasLineup] = useState(false);
  const [checkingLineup, setCheckingLineup] = useState(false);
  const [odds, setOdds] = useState<{
    home_win_odds?: number;
    draw_odds?: number;
    away_win_odds?: number;
    home_win_prob?: number;
    draw_prob?: number;
    away_win_prob?: number;
  } | null>(null);
  const [loadingOdds, setLoadingOdds] = useState(false);

  // Fetch odds when component mounts if showOdds is true
  useEffect(() => {
    if (showOdds && game.id) {
      fetchOdds();
    }
  }, [showOdds, game.id]);

  // Check if lineup exists
  useEffect(() => {
    if (game.id) {
      checkLineupExists();
    }
  }, [game.id]);

  const checkLineupExists = async () => {
    try {
      setCheckingLineup(true);
      const { data, error } = await supabase
        .from('sports_lineups')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', game.id)
        .limit(1);

      if (error) {
        console.error('[GameCard] Error checking lineup:', error);
        return;
      }

      setHasLineup(data !== null);
    } catch (err) {
      console.error('[GameCard] Exception checking lineup:', err);
    } finally {
      setCheckingLineup(false);
    }
  };

  const fetchOdds = async () => {
    try {
      setLoadingOdds(true);
      const { data, error } = await supabase
        .from('sports_match_odds')
        .select('home_win_odds, draw_odds, away_win_odds, home_win_prob, draw_prob, away_win_prob')
        .eq('event_id', game.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[GameCard] Error fetching odds:', error);
        return;
      }

      if (data) {
        setOdds(data);
      }
    } catch (err) {
      console.error('[GameCard] Exception fetching odds:', err);
    } finally {
      setLoadingOdds(false);
    }
  };

  const getProbabilityColor = (probability?: number): string => {
    if (!probability) return 'bg-muted/50';
    
    if (probability >= 50) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (probability >= 35) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const handleTeamClick = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();
    console.log('Team clicked:', teamId);
    setSelectedTeamId(teamId);
    setShowTeamStats(true);
  };

  const handleBackgroundClick = () => {
    console.log('Card background clicked');
    if (onClick) {
      onClick();
    } else {
      setShowDetails(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${ended ? 'bg-muted/30' : ''}`}
          style={{
            borderLeft: `4px solid ${borderColor}`
          }}
          onClick={handleBackgroundClick}
        >
          <CardContent className="p-4">
            {/* Header: League + Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {game.league?.logo_url && (
                  <img
                    src={game.league.logo_url}
                    alt={game.league.name}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="text-sm text-muted-foreground truncate">
                  {game.league?.name || 'League'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {game.round && (
                  <Badge variant="outline" className="text-xs">
                    {game.round}
                  </Badge>
                )}
                {getStatusBadge(game.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      disabled={!hasLineup}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasLineup) {
                          setShowDetails(true);
                        }
                      }}
                      className={!hasLineup ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <UsersIcon className="mr-2 h-4 w-4" />
                      Lineup {!hasLineup && <span className="ml-1 text-xs">Not Available</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeamId(game.home_team.id);
                        setShowTeamStats(true);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Home Team
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeamId(game.away_team.id);
                        setShowTeamStats(true);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Away Team
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement news functionality
                        console.log('News clicked for game:', game.id);
                      }}
                    >
                      <Newspaper className="mr-2 h-4 w-4" />
                      News
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Match Content */}
            <div className="space-y-3">
              {/* Home Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {game.home_team.logo_url ? (
                    <img
                      src={game.home_team.logo_url}
                      alt={game.home_team.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{game.home_team.short_name?.[0] || 'H'}</span>
                    </div>
                  )}
                  <span className="font-medium truncate">
                    {game.home_team.short_name || game.home_team.name}
                  </span>
                </div>
                {ended && (
                  <span className="text-2xl font-bold ml-3">
                    {game.home_score ?? 0}
                  </span>
                )}
              </div>

              {/* Divider / VS */}
              <div className="flex items-center justify-center py-1">
                {ended ? (
                  <div className="w-full h-px bg-border" />
                ) : (
                  <span className="text-sm text-muted-foreground">vs</span>
                )}
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {game.away_team.logo_url ? (
                    <img
                      src={game.away_team.logo_url}
                      alt={game.away_team.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{game.away_team.short_name?.[0] || 'A'}</span>
                    </div>
                  )}
                  <span className="font-medium truncate">
                    {game.away_team.short_name || game.away_team.name}
                  </span>
                </div>
                {ended && (
                  <span className="text-2xl font-bold ml-3">
                    {game.away_score ?? 0}
                  </span>
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {/* Date/Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <Badge variant="secondary">{formatGameDateTime(game.start_time)}</Badge>
              </div>

              {/* Venue */}
              {game.venue_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">
                    {game.venue_name}
                    {game.venue_city && `, ${game.venue_city}`}
                  </span>
                </div>
              )}

              {/* Attendance */}
              {game.attendance && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{game.attendance.toLocaleString()} attendance</span>
                </div>
              )}

              {/* Odds */}
              {showOdds && odds && !ended && (
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Home Odds */}
                    <div className={`px-2 py-1.5 rounded text-center ${getProbabilityColor(odds.home_win_prob)}`}>
                      <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">Home</div>
                      <div className="font-bold">{odds.home_win_odds?.toFixed(2) || '-'}</div>
                      {odds.home_win_prob && (
                        <div className="text-[10px] opacity-80">{odds.home_win_prob.toFixed(0)}%</div>
                      )}
                    </div>
                    {/* Draw Odds */}
                    <div className={`px-2 py-1.5 rounded text-center ${getProbabilityColor(odds.draw_prob)}`}>
                      <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">Draw</div>
                      <div className="font-bold">{odds.draw_odds?.toFixed(2) || '-'}</div>
                      {odds.draw_prob && (
                        <div className="text-[10px] opacity-80">{odds.draw_prob.toFixed(0)}%</div>
                      )}
                    </div>
                    {/* Away Odds */}
                    <div className={`px-2 py-1.5 rounded text-center ${getProbabilityColor(odds.away_win_prob)}`}>
                      <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">Away</div>
                      <div className="font-bold">{odds.away_win_odds?.toFixed(2) || '-'}</div>
                      {odds.away_win_prob && (
                        <div className="text-[10px] opacity-80">{odds.away_win_prob.toFixed(0)}%</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <GameDetailsWithLineups 
        gameId={game.id}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
      
      <TeamStatsModal 
        teamId={selectedTeamId}
        open={showTeamStats}
        onOpenChange={setShowTeamStats}
      />
    </>
  );
}