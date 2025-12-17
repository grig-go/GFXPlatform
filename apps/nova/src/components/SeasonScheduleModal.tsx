import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, X, Trophy, MapPin, Users } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";

interface League {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ScheduleMatch {
  event_id: number;
  game_id: string;
  start_time: string;
  status: 'scheduled' | 'live' | 'ended';
  round: number;
  home_team_name: string;
  home_team_logo: string;
  home_score: number | null;
  away_team_name: string;
  away_team_logo: string;
  away_score: number | null;
  venue_name: string;
  attendance: number | null;
}

interface SeasonScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: League | null;
  onMatchClick?: (gameId: string) => void;
}

type FilterType = 'all' | 'upcoming' | 'completed';

export function SeasonScheduleModal({
  open,
  onOpenChange,
  league,
  onMatchClick,
}: SeasonScheduleModalProps) {
  const [schedule, setSchedule] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');

  useEffect(() => {
    if (open && league) {
      fetchSeasonSchedule();
    }
  }, [open, league]);

  const fetchSeasonSchedule = async () => {
    if (!league) return;

    try {
      setLoading(true);
      console.log('[SeasonScheduleModal] Fetching schedule for league:', league.id);

      // First, get the current season for this league
      const { data: seasonData, error: seasonError } = await supabase
        .from('sports_seasons')
        .select('id')
        .eq('league_id', league.id)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (seasonError) {
        console.error('[SeasonScheduleModal] Error fetching season:', seasonError);
        toast.error('No active season found for this league');
        return;
      }

      console.log('[SeasonScheduleModal] Found season:', seasonData.id);

      // Now fetch the schedule using RPC
      const { data, error } = await supabase.rpc('get_season_schedule', {
        p_season_id: seasonData.id,
      });

      if (error) {
        console.error('[SeasonScheduleModal] Error fetching schedule:', error);
        throw error;
      }

      console.log('[SeasonScheduleModal] Schedule fetched:', data?.length || 0, 'matches');
      setSchedule(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load schedule';
      console.error('[SeasonScheduleModal] Error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Upcoming
          </Badge>
        );
      case 'live':
        return (
          <Badge variant="destructive" className="animate-pulse">
            LIVE
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Final
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filter matches based on selected filter
  const filteredMatches = schedule.filter((match) => {
    if (filter === 'upcoming' && match.status !== 'scheduled') return false;
    if (filter === 'completed' && match.status !== 'ended') return false;
    if (selectedRound !== 'all' && match.round.toString() !== selectedRound) return false;
    return true;
  });

  // Group matches by round
  const matchesByRound = filteredMatches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<number, ScheduleMatch[]>);

  // Get unique rounds for the dropdown
  const rounds = Array.from(new Set(schedule.map(m => m.round))).sort((a, b) => a - b);

  const handleMatchClick = (match: ScheduleMatch) => {
    if (onMatchClick) {
      onMatchClick(match.game_id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {league?.logo_url ? (
              <img
                src={league.logo_url}
                alt={league.name}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            )}
            <DialogTitle>{league?.name} - Season Schedule</DialogTitle>
          </div>
          <DialogDescription>
            View the schedule for the current season of {league?.name}.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-4 border-b">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Matches
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
          </div>

          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select round" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rounds</SelectItem>
              {rounds.map((round) => (
                <SelectItem key={round} value={round.toString()}>
                  Round {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Display */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading schedule...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No matches found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(matchesByRound)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([round, matches]) => (
                <div key={round} className="space-y-3">
                  {/* Round Header */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="font-semibold">ROUND {round}</h3>
                    <Badge variant="outline" className="text-xs">
                      {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                    </Badge>
                  </div>

                  {/* Matches in this round */}
                  {matches.map((match) => (
                    <div
                      key={match.event_id}
                      onClick={() => handleMatchClick(match)}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {/* Date and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(match.start_time), 'MMM dd, yyyy • h:mm a')}
                        </div>
                        {getStatusBadge(match.status)}
                      </div>

                      {/* Teams and Score */}
                      <div className="flex items-center justify-between gap-4 mb-3">
                        {/* Home Team */}
                        <div className="flex items-center gap-3 flex-1">
                          {match.home_team_logo ? (
                            <img
                              src={match.home_team_logo}
                              alt={match.home_team_name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{match.home_team_name}</span>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-2 px-4">
                          <span className="text-2xl font-semibold">
                            {match.home_score ?? '-'}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-2xl font-semibold">
                            {match.away_score ?? '-'}
                          </span>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="font-medium">{match.away_team_name}</span>
                          {match.away_team_logo ? (
                            <img
                              src={match.away_team_logo}
                              alt={match.away_team_name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Venue and Attendance */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{match.venue_name}</span>
                        </div>
                        {match.attendance && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{match.attendance.toLocaleString()}</span>
                          </div>
                        )}
                        {!match.attendance && match.status === 'scheduled' && (
                          <span className="italic">Not played yet</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}