import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Trophy, TrendingUp, TrendingDown, Users, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "../utils/supabase/client";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner@2.0.3";

interface Season {
  id: string;
  name: string;
  year: string;
  is_current: boolean;
  sports_leagues: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface StandingRow {
  rank: number;
  team_id: number;
  team_name: string;
  team_abbreviation: string;
  team_logo: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goals_for: number;
  goals_against: number;
  goals_diff: number;
  points: number;
  form: string;
}

interface StandingsTableProps {
  leagueId?: string;
  leagueName?: string;
}

export function StandingsTable({ leagueId, leagueName }: StandingsTableProps) {
  console.log('[StandingsTable] Component mounted/rendered', { leagueId, leagueName });
  
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available seasons on mount
  useEffect(() => {
    console.log('[StandingsTable] useEffect triggered - fetching seasons');
    fetchSeasons();
  }, []);

  // Fetch standings when season changes
  useEffect(() => {
    console.log('[StandingsTable] selectedSeasonId changed:', selectedSeasonId);
    if (selectedSeasonId) {
      fetchStandings(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      console.log('[StandingsTable] Fetching seasons...');
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('sports_seasons')
        .select(`
          id,
          name,
          year,
          is_current,
          sports_leagues (
            id,
            name,
            logo_url
          )
        `)
        .eq('is_current', true)
        .order('name');

      if (fetchError) {
        console.error('[StandingsTable] Error fetching seasons:', fetchError);
        throw fetchError;
      }

      console.log('[StandingsTable] Seasons fetched:', data?.length || 0);
      console.log('[StandingsTable] Seasons data:', data);
      setSeasons(data || []);
      
      // Auto-select first season
      if (data && data.length > 0) {
        console.log('[StandingsTable] Auto-selecting first season:', data[0].id);
        setSelectedSeasonId(data[0].id);
      } else {
        console.log('[StandingsTable] No seasons found to auto-select');
      }
    } catch (err) {
      console.error('Error fetching seasons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seasons');
      toast.error('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async (seasonId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[StandingsTable] Fetching standings for season:', seasonId);

      const { data, error: fetchError } = await supabase
        .rpc('get_season_standings', { p_season_id: seasonId });

      if (fetchError) {
        console.error('[StandingsTable] Error fetching standings:', fetchError);
        throw fetchError;
      }

      console.log('[StandingsTable] Standings fetched:', data?.length || 0);
      setStandings(data || []);
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load standings');
      toast.error('Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  // Get position indicator color
  const getPositionColor = (rank: number, totalTeams: number) => {
    if (rank <= 4) return 'border-l-4 border-l-green-500'; // Champions League
    if (rank <= 6) return 'border-l-4 border-l-orange-500'; // Europa League
    if (rank > totalTeams - 3) return 'border-l-4 border-l-red-500'; // Relegation
    return '';
  };

  // Parse form string into badges
  const renderForm = (form: string) => {
    if (!form) return null;
    
    const results = form.split('').slice(-5); // Last 5 results
    return (
      <div className="flex gap-1">
        {results.map((result, index) => {
          let bgColor = 'bg-gray-400';
          if (result === 'W') bgColor = 'bg-green-500';
          else if (result === 'D') bgColor = 'bg-yellow-500';
          else if (result === 'L') bgColor = 'bg-red-500';
          
          return (
            <div
              key={index}
              className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-white text-xs`}
              title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
            >
              {result}
            </div>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (loading && seasons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading standings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && seasons.length === 0) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            <button
              onClick={fetchSeasons}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no seasons
  if (seasons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">No Seasons Available</h3>
              <p className="text-muted-foreground">
                No current seasons found. Add seasons to view standings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedSeason?.sports_leagues?.logo_url && (
                <ImageWithFallback
                  src={selectedSeason.sports_leagues.logo_url}
                  alt={selectedSeason.sports_leagues.name}
                  className="w-10 h-10 object-contain"
                />
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  League Standings
                </CardTitle>
                {selectedSeason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedSeason.sports_leagues.name} - {selectedSeason.name}
                  </p>
                )}
              </div>
            </div>
            <Select value={selectedSeasonId || ''} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    <div className="flex items-center gap-2">
                      {season.sports_leagues.logo_url && (
                        <ImageWithFallback
                          src={season.sports_leagues.logo_url}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      <span>
                        {season.sports_leagues.name} - {season.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Standings Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading standings...</p>
            </div>
          </CardContent>
        </Card>
      ) : standings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Trophy className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No standings available for this season.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm">Pos</th>
                    <th className="text-left p-3 text-sm">Club</th>
                    <th className="text-center p-3 text-sm">P</th>
                    <th className="text-center p-3 text-sm">W</th>
                    <th className="text-center p-3 text-sm">D</th>
                    <th className="text-center p-3 text-sm">L</th>
                    <th className="text-center p-3 text-sm hidden md:table-cell">GF</th>
                    <th className="text-center p-3 text-sm hidden md:table-cell">GA</th>
                    <th className="text-center p-3 text-sm">GD</th>
                    <th className="text-center p-3 text-sm">Pts</th>
                    <th className="text-left p-3 text-sm hidden lg:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr
                      key={row.team_id}
                      className={`border-b hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      } ${getPositionColor(row.rank, standings.length)}`}
                    >
                      {/* Position */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{row.rank}</span>
                          {row.rank <= 4 && (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          )}
                          {row.rank > standings.length - 3 && (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      
                      {/* Club */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {row.team_logo ? (
                            <ImageWithFallback
                              src={row.team_logo}
                              alt={row.team_name}
                              className="w-6 h-6 object-contain flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate">
                              <span className="hidden md:inline">{row.team_name}</span>
                              <span className="md:hidden">{row.team_abbreviation || row.team_name}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Played */}
                      <td className="p-3 text-center">{row.played}</td>
                      
                      {/* Won */}
                      <td className="p-3 text-center">{row.win}</td>
                      
                      {/* Draw */}
                      <td className="p-3 text-center">{row.draw}</td>
                      
                      {/* Loss */}
                      <td className="p-3 text-center">{row.loss}</td>
                      
                      {/* Goals For (hidden on mobile) */}
                      <td className="p-3 text-center hidden md:table-cell">{row.goals_for}</td>
                      
                      {/* Goals Against (hidden on mobile) */}
                      <td className="p-3 text-center hidden md:table-cell">{row.goals_against}</td>
                      
                      {/* Goal Difference */}
                      <td className="p-3 text-center">
                        <span
                          className={
                            row.goals_diff > 0
                              ? 'text-green-600 dark:text-green-400'
                              : row.goals_diff < 0
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {row.goals_diff > 0 ? '+' : ''}
                          {row.goals_diff}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="p-3 text-center font-bold">{row.points}</td>
                      
                      {/* Form (hidden on mobile) */}
                      <td className="p-3 hidden lg:table-cell">
                        {renderForm(row.form)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {standings.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-l-4 border-l-green-500" />
                <span className="text-muted-foreground">Champions League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-l-4 border-l-orange-500" />
                <span className="text-muted-foreground">Europa League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-l-4 border-l-red-500" />
                <span className="text-muted-foreground">Relegation</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}