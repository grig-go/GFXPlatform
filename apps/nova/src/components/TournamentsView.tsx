import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Trophy, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { SeasonScheduleModal } from "./SeasonScheduleModal";
import { GameDetailsWithLineups } from "./GameDetailsWithLineups";

interface SportsCategory {
  name: string;
  country_code: string;
}

interface League {
  id: string;
  sportradar_id: string;
  name: string;
  alternative_name: string | null;
  type: string;
  gender: string;
  logo_url: string | null;
  active: boolean;
  sports_categories: SportsCategory;
}

export function TournamentsView() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [gameDetailModalOpen, setGameDetailModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      console.log('[TournamentsView] Starting to fetch leagues...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sports_leagues')
        .select(`
          id,
          sportradar_id,
          name,
          alternative_name,
          type,
          gender,
          logo_url,
          active,
          sports_categories (
            name,
            country_code
          )
        `)
        .eq('active', true)
        .order('name');

      console.log('[TournamentsView] Supabase response:', { data, error: fetchError });

      if (fetchError) {
        throw fetchError;
      }

      console.log('[TournamentsView] Leagues fetched:', data?.length || 0);
      setLeagues(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leagues';
      console.error('[TournamentsView] Error fetching leagues:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[TournamentsView] Component mounted, fetching leagues...');
    fetchLeagues();
  }, []);

  const handleLeagueClick = (league: League) => {
    console.log('[TournamentsView] League clicked:', league.name);
    setSelectedLeague(league);
    setScheduleModalOpen(true);
  };

  const handleMatchClick = (gameId: string) => {
    console.log('[TournamentsView] Match clicked:', gameId);
    setSelectedGameId(gameId);
    setScheduleModalOpen(false);
    setGameDetailModalOpen(true);
  };

  const handleGameDetailClose = () => {
    setGameDetailModalOpen(false);
    setSelectedGameId(null);
    // Reopen schedule modal if there's a selected league
    if (selectedLeague) {
      setScheduleModalOpen(true);
    }
  };

  // Get country flag emoji from country code
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading leagues...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Failed to Load Leagues</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
            </div>
            <Button onClick={fetchLeagues} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">No Leagues Found</h3>
              <p className="text-muted-foreground mb-4">
                Run the seed data migration to populate leagues.
              </p>
            </div>
            <Button onClick={fetchLeagues} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // League cards
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leagues.map((league) => (
          <Card 
            key={league.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleLeagueClick(league)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {league.logo_url ? (
                    <img
                      src={league.logo_url}
                      alt={league.name}
                      className="w-12 h-12 object-contain rounded"
                      onError={(e) => {
                        // Fallback to trophy icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${league.logo_url ? 'hidden' : ''} w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded flex items-center justify-center`}>
                    <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate mb-2">
                    {league.name}
                  </h3>
                  
                  {/* Country */}
                  {league.sports_categories && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <span className="text-lg">
                        {getCountryFlag(league.sports_categories.country_code)}
                      </span>
                      <span className="truncate">
                        {league.sports_categories.name}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {league.type}
                    </Badge>
                    {league.gender && league.gender !== 'men' && (
                      <Badge variant="outline" className="text-xs">
                        {league.gender}
                      </Badge>
                    )}
                  </div>

                  {/* Alternative name if exists */}
                  {league.alternative_name && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {league.alternative_name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Season Schedule Modal */}
      <SeasonScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        league={selectedLeague}
        onMatchClick={handleMatchClick}
      />

      {/* Game Detail Modal */}
      {selectedGameId && (
        <GameDetailsWithLineups
          gameId={selectedGameId}
          open={gameDetailModalOpen}
          onOpenChange={handleGameDetailClose}
        />
      )}
    </>
  );
}