import { useState, useEffect } from 'react';
import { supabase } from './supabase/client';

interface SportsDataStats {
  totalTeams: number;
  totalPlayers: number;
  totalGames: number;
  totalVenues: number;
  totalTournaments: number;
  providers: number;
  lastUpdated: string;
  hasActiveProvider: boolean;
}

export function useSportsData() {
  const [stats, setStats] = useState<SportsDataStats>({
    totalTeams: 0,
    totalPlayers: 0,
    totalGames: 0,
    totalVenues: 0,
    totalTournaments: 0,
    providers: 0,
    lastUpdated: new Date().toISOString(),
    hasActiveProvider: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[useSportsData] Fetching sports statistics...');

      // Fetch counts from each table in parallel
      const [teamsResult, playersResult, gamesResult, venuesResult] = await Promise.all([
        supabase.from('sports_teams').select('id', { count: 'exact', head: true }),
        supabase.from('sports_players').select('id', { count: 'exact', head: true }),
        supabase.from('sports_events').select('id', { count: 'exact', head: true }),
        supabase.from('sports_venues').select('id', { count: 'exact', head: true }),
      ]);

      // Extract counts from results
      const teamsCount = teamsResult.count || 0;
      const playersCount = playersResult.count || 0;
      const gamesCount = gamesResult.count || 0;
      const venuesCount = venuesResult.count || 0;

      console.log('[useSportsData] Stats:', {
        teams: teamsCount,
        players: playersCount,
        games: gamesCount,
        venues: venuesCount
      });

      setStats({
        totalTeams: teamsCount,
        totalPlayers: playersCount,
        totalGames: gamesCount,
        totalVenues: venuesCount,
        totalTournaments: 0, // Not tracking tournaments yet
        providers: 0, // Not tracking providers in this version
        lastUpdated: new Date().toISOString(),
        hasActiveProvider: teamsCount > 0 || playersCount > 0 || gamesCount > 0,
      });
    } catch (err) {
      console.error('[useSportsData] Error fetching sports data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStats(prev => ({ ...prev, hasActiveProvider: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSportsData();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchSportsData,
  };
}