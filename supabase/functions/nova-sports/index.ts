// Nova Sports API - Direct endpoint for sports data with filtering
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid view types
type SportsView = 'teams' | 'standings' | 'players' | 'games' | 'venues' | 'tournaments' | 'betting';

// Valid game statuses (includes aliases for flexibility)
const VALID_STATUSES = ['all', 'scheduled', 'in_progress', 'inprogress', 'live', 'final', 'ended', 'closed', 'complete', 'postponed', 'cancelled'];

// Map status aliases to their database values
const STATUS_ALIASES: Record<string, string> = {
  'inprogress': 'in_progress',
  'live': 'in_progress',
  'ended': 'ended',
  'closed': 'ended',
  'complete': 'ended',
  'final': 'ended'
};

// Valid player positions (database stores MF, FW, DF but users may search with MID, FWD, DEF)
const ALL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DF', 'PG', 'SG', 'SF', 'PF', 'C', 'P', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'LW', 'RW', 'D', 'G', 'GK', 'MF', 'FW', 'MID', 'FWD', 'DEF'];

// Map old position names to database values (MID->MF, FWD->FW, DEF->DF)
const POSITION_TO_DB: Record<string, string> = {
  'MID': 'MF',
  'FWD': 'FW',
  'DEF': 'DF'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const viewParam = url.searchParams.get('view');
    const leagueParam = url.searchParams.get('league');
    const providerParam = url.searchParams.get('provider');
    const positionParam = url.searchParams.get('position');
    const statusParam = url.searchParams.get('status');
    const seasonParam = url.searchParams.get('season');

    console.log('Sports API Request:', {
      view: viewParam,
      league: leagueParam,
      provider: providerParam,
      position: positionParam,
      status: statusParam,
      season: seasonParam
    });

    const view = (viewParam || 'teams') as SportsView;
    const league = leagueParam || 'all';
    let provider = providerParam || 'all';
    const position = positionParam || 'all';
    const status = statusParam || 'all';
    const season = seasonParam || 'all';

    // If provider looks like a UUID, look up the provider type from data_providers
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (provider !== 'all' && uuidRegex.test(provider)) {
      const { data: providerData } = await supabase
        .from('data_providers')
        .select('type')
        .eq('id', provider)
        .single();

      if (providerData?.type) {
        console.log(`Resolved provider UUID ${provider} to type: ${providerData.type}`);
        provider = providerData.type.toLowerCase();
      }
    } else if (provider !== 'all') {
      // Normalize provider to lowercase for case-insensitive matching
      provider = provider.toLowerCase();
      console.log(`Normalized provider to: ${provider}`);
    }

    // Validate view parameter
    const validViews: SportsView[] = ['teams', 'standings', 'players', 'games', 'venues', 'tournaments', 'betting'];
    if (!validViews.includes(view)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid view parameter',
          details: `View must be one of: ${validViews.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let data: any[] = [];
    let totalCount = 0;

    switch (view) {
      case 'teams': {
        // First fetch teams with standings
        let query = supabase
          .from('sports_teams')
          .select(`
            id,
            sportradar_id,
            name,
            short_name,
            abbreviation,
            logo_url,
            colors,
            country,
            country_code,
            city,
            venue,
            api_source,
            created_at,
            updated_at,
            sports_standings (
              id,
              rank,
              played,
              win,
              draw,
              loss,
              goals_for,
              goals_against,
              goals_diff,
              points,
              form,
              season_id,
              sports_seasons (
                id,
                name,
                year,
                is_current
              )
            )
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        const { data: teamsData, error: teamsError } = await query;

        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
          throw teamsError;
        }

        // Fetch detailed stats for each team using the RPC function
        const teamStatsMap = new Map<string, any>();

        // Process teams in batches to get their stats via RPC
        for (const team of (teamsData || [])) {
          try {
            const { data: rpcStats, error: rpcError } = await supabase.rpc('get_team_stats', {
              p_team_id: team.id,
              p_season_id: null // Get current/latest season
            });

            if (!rpcError && rpcStats?.success && rpcStats?.data?.season_stats) {
              teamStatsMap.set(team.id, rpcStats.data.season_stats);
            }
          } catch (e) {
            console.error(`Error fetching stats for team ${team.id}:`, e);
          }
        }

        data = (teamsData || []).map(team => {
          // Get the most recent/current season stats from standings
          const standings = team.sports_standings || [];
          // Find current season stats or most recent
          const currentSeasonStats = standings.find((s: any) => s.sports_seasons?.is_current) || standings[0];

          // Get detailed stats from RPC call
          const rpcStats = teamStatsMap.get(team.id);

          // Calculate win percentage if we have data
          const played = rpcStats?.played ?? currentSeasonStats?.played;
          const wins = rpcStats?.wins ?? currentSeasonStats?.win;
          let winPercentage: number | null = null;
          if (played && played > 0 && wins !== undefined) {
            winPercentage = Math.round((wins / played) * 100);
          }

          // Get raw stats for calculations
          const goalsFor = rpcStats?.goals_for ?? currentSeasonStats?.goals_for;
          const goalsAgainst = rpcStats?.goals_against ?? currentSeasonStats?.goals_against;
          const yellowCards = rpcStats?.yellow_cards ?? null;
          const redCards = rpcStats?.red_cards ?? null;
          const cleanSheets = rpcStats?.clean_sheets ?? null;

          // Calculate per-game and percentage values
          const goalsForPerGame = (played && played > 0 && goalsFor != null)
            ? parseFloat((goalsFor / played).toFixed(1))
            : null;
          const goalsAgainstPerGame = (played && played > 0 && goalsAgainst != null)
            ? parseFloat((goalsAgainst / played).toFixed(1))
            : null;
          const yellowCardsPerGame = (played && played > 0 && yellowCards != null)
            ? parseFloat((yellowCards / played).toFixed(1))
            : null;
          const redCardsPerGame = (played && played > 0 && redCards != null)
            ? parseFloat((redCards / played).toFixed(2))
            : null;
          const cleanSheetsPercent = (played && played > 0 && cleanSheets != null)
            ? Math.round((cleanSheets / played) * 100)
            : null;

          return {
            id: team.id,
            sportradarId: team.sportradar_id,
            name: team.name,
            shortName: team.short_name,
            abbreviation: team.abbreviation,
            logoUrl: team.logo_url,
            colors: team.colors,
            country: team.country,
            countryCode: team.country_code,
            city: team.city,
            venue: team.venue,
            provider: team.api_source,
            createdAt: team.created_at,
            updatedAt: team.updated_at,
            // Season stats (match record, goals, discipline, performance)
            seasonStats: (currentSeasonStats || rpcStats) ? {
              seasonId: currentSeasonStats?.season_id,
              seasonName: currentSeasonStats?.sports_seasons?.name,
              seasonYear: currentSeasonStats?.sports_seasons?.year,
              isCurrent: currentSeasonStats?.sports_seasons?.is_current,
              // Points
              points: rpcStats?.points ?? currentSeasonStats?.points,
              rank: currentSeasonStats?.rank,
              // Match Record
              played: rpcStats?.played ?? currentSeasonStats?.played,
              wins: rpcStats?.wins ?? currentSeasonStats?.win,
              draws: rpcStats?.draws ?? currentSeasonStats?.draw,
              losses: rpcStats?.losses ?? currentSeasonStats?.loss,
              winPercentage: rpcStats?.win_percentage ?? winPercentage,
              // Goals (raw values)
              goalsFor,
              goalsAgainst,
              goalDifference: rpcStats?.goal_difference ?? currentSeasonStats?.goals_diff,
              // Goals (calculated display values)
              goalsForPerGame,
              goalsAgainstPerGame,
              // Form (recent results like "WWDLW")
              form: currentSeasonStats?.form,
              // Performance Metrics
              avgPossession: rpcStats?.avg_possession ?? null,
              passAccuracy: rpcStats?.pass_accuracy ?? null,
              shotsPerGame: rpcStats?.shots_per_game ?? null,
              shotsOnTargetPerGame: rpcStats?.shots_on_target_per_game ?? null,
              cleanSheets,
              cleanSheetsPercent,
              // Discipline (raw values)
              yellowCards,
              redCards,
              // Discipline (calculated display values)
              yellowCardsPerGame,
              redCardsPerGame
            } : null
          };
        });
        totalCount = data.length;
        break;
      }

      case 'players': {
        let query = supabase
          .from('sports_players')
          .select(`
            id,
            sportradar_id,
            name,
            first_name,
            last_name,
            nationality,
            nationality_code,
            date_of_birth,
            jersey_number,
            position,
            photo_url,
            team_id,
            created_at,
            updated_at,
            sports_teams (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors,
              api_source
            )
          `)
          .order('name');

        // Filter by position if specified
        if (position !== 'all') {
          // Map API position to database value if needed (e.g., MF -> MID, FW -> FWD, DF -> DEF)
          const dbPosition = POSITION_TO_DB[position] || position;
          query = query.eq('position', dbPosition);
        }

        const { data: playersData, error: playersError } = await query;

        if (playersError) {
          console.error('Error fetching players:', playersError);
          throw playersError;
        }

        // Filter by provider after fetch (via team's api_source since players table doesn't have it)
        let filteredPlayers = playersData || [];
        if (provider !== 'all') {
          filteredPlayers = filteredPlayers.filter(
            (player: any) => player.sports_teams?.api_source?.toLowerCase() === provider
          );
        }

        // Fetch stats for each player using the RPC function
        const playerStatsMap = new Map<string, any>();
        for (const player of filteredPlayers) {
          try {
            const { data: rpcStats, error: rpcError } = await supabase.rpc('get_player_stats', {
              p_player_id: player.id,
              p_season_id: null // Get current/latest season
            });

            if (!rpcError && rpcStats?.success && rpcStats?.data) {
              playerStatsMap.set(player.id, rpcStats.data);
            }
          } catch (e) {
            console.error(`Error fetching stats for player ${player.id}:`, e);
          }
        }

        // Helper function to calculate age from date of birth
        const calculateAge = (dateOfBirth: string | null): number | null => {
          if (!dateOfBirth) return null;
          // Parse date parts to avoid timezone issues
          const [year, month, day] = dateOfBirth.split('-').map(Number);
          const birthDate = new Date(year, month - 1, day);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };

        data = filteredPlayers.map((player: any) => {
          const dob = player.date_of_birth;
          const playerStats = playerStatsMap.get(player.id);
          const seasonStats = playerStats?.season_stats;
          const careerStats = playerStats?.career_stats;

          // Calculate derived stats for season
          const appearances = seasonStats?.appearances;
          const minutesPlayed = seasonStats?.minutes_played;
          const goals = seasonStats?.goals;
          const shots = seasonStats?.shots;
          const shotsOnTarget = seasonStats?.shots_on_target;

          const averageMinutesPlayed = (appearances && appearances > 0 && minutesPlayed != null)
            ? Math.round(minutesPlayed / appearances)
            : null;
          const shotsOnTargetAccuracy = (shots && shots > 0 && shotsOnTarget != null)
            ? Math.round((shotsOnTarget / shots) * 100)
            : null;
          const goalsPerGame = (appearances && appearances > 0 && goals != null)
            ? parseFloat((goals / appearances).toFixed(2))
            : null;

          // Calculate derived stats for career
          const totalAppearances = careerStats?.total_appearances;
          const totalGoals = careerStats?.total_goals;
          const careerGoalsPerGame = (totalAppearances && totalAppearances > 0 && totalGoals != null)
            ? parseFloat((totalGoals / totalAppearances).toFixed(2))
            : null;

          return {
            id: player.id,
            sportradarId: player.sportradar_id,
            name: player.name,
            firstName: player.first_name,
            lastName: player.last_name,
            nationality: player.nationality,
            nationalityCode: player.nationality_code,
            dateOfBirth: dob,
            age: calculateAge(dob),
            jerseyNumber: player.jersey_number,
            position: player.position,
            photoUrl: player.photo_url,
            provider: player.sports_teams?.api_source || null,
            team: player.sports_teams ? {
              id: player.sports_teams.id,
              name: player.sports_teams.name,
              shortName: player.sports_teams.short_name,
              abbreviation: player.sports_teams.abbreviation,
              logoUrl: player.sports_teams.logo_url,
              colors: player.sports_teams.colors
            } : null,
            // Season Stats
            seasonStats: seasonStats ? {
              appearances: seasonStats.appearances ?? null,
              starts: seasonStats.starts ?? null,
              minutesPlayed: seasonStats.minutes_played ?? null,
              averageMinutesPlayed,
              goals: seasonStats.goals ?? null,
              goalsPerGame,
              assists: seasonStats.assists ?? null,
              yellowCards: seasonStats.yellow_cards ?? null,
              redCards: seasonStats.red_cards ?? null,
              shots: seasonStats.shots ?? null,
              shotsOnTarget: seasonStats.shots_on_target ?? null,
              shotsOnTargetAccuracy,
              passes: seasonStats.passes ?? null,
              passAccuracy: seasonStats.pass_accuracy ?? null,
              tackles: seasonStats.tackles ?? null,
              interceptions: seasonStats.interceptions ?? null,
              saves: seasonStats.saves ?? null,
              cleanSheets: seasonStats.clean_sheets ?? null,
              rating: seasonStats.rating ?? null
            } : null,
            // Career Stats
            careerStats: careerStats ? {
              totalAppearances: careerStats.total_appearances ?? null,
              totalGoals: careerStats.total_goals ?? null,
              goalsPerGame: careerGoalsPerGame,
              totalAssists: careerStats.total_assists ?? null,
              totalMinutes: careerStats.total_minutes ?? null,
              seasonsPlayed: careerStats.seasons_played ?? null
            } : null,
            createdAt: player.created_at,
            updatedAt: player.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'games': {
        let query = supabase
          .from('sports_events')
          .select(`
            id,
            sportradar_id,
            start_time,
            start_time_confirmed,
            status,
            home_score,
            away_score,
            round,
            round_number,
            match_day,
            venue_name,
            venue_city,
            venue_capacity,
            attendance,
            referee,
            created_at,
            updated_at,
            home_team:sports_teams!sports_events_home_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors,
              api_source
            ),
            away_team:sports_teams!sports_events_away_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            ),
            sports_seasons (
              id,
              name,
              year,
              sports_leagues (
                id,
                name,
                logo_url
              )
            ),
            sports_match_odds (
              home_win_odds,
              draw_odds,
              away_win_odds,
              home_win_prob,
              draw_prob,
              away_win_prob,
              updated_at
            ),
            sports_lineups (
              id,
              team_id,
              lineup_type,
              sports_players (
                id,
                name,
                jersey_number,
                position,
                photo_url
              )
            )
          `)
          .order('start_time', { ascending: false });

        // Filter by status if specified
        if (status !== 'all') {
          if (!VALID_STATUSES.includes(status)) {
            // Invalid status, return empty result
            data = [];
            totalCount = 0;
            break;
          }
          // Map alias to database value if needed
          const dbStatus = STATUS_ALIASES[status] || status;
          query = query.eq('status', dbStatus);
        }

        // Filter by league if specified (through season)
        if (league !== 'all') {
          // We need to filter by league_id through the season
          const { data: seasonsInLeague, error: seasonsError } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', parseInt(league));

          console.log('Games league filter:', { league, seasonsInLeague, seasonsError });

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          } else {
            // No seasons found for this league, return empty result
            query = query.eq('season_id', -1); // Force no results
          }
        }

        // Filter by season if specified
        if (season !== 'all') {
          query = query.eq('season_id', season);
        }

        const { data: gamesData, error: gamesError } = await query;

        if (gamesError) {
          console.error('Error fetching games:', gamesError);
          throw gamesError;
        }

        // Filter by provider after fetch (via home_team's api_source since events table doesn't have it)
        let filteredGames = gamesData || [];
        if (provider !== 'all') {
          filteredGames = filteredGames.filter(
            (game: any) => game.home_team?.api_source?.toLowerCase() === provider
          );
        }

        // Fetch detailed event data and team stats for each game using RPC
        const gameDetailsMap = new Map<string, any>();
        const teamStatsMap = new Map<string, any>();

        for (const game of filteredGames) {
          // Fetch detailed event data (includes full lineup with goals, assists, cards)
          try {
            const { data: eventDetails, error: eventError } = await supabase
              .rpc('get_event_details', { p_event_id: game.id });

            if (!eventError && eventDetails && eventDetails.length > 0) {
              gameDetailsMap.set(game.id, eventDetails[0]?.event_data);
            }
          } catch (e) {
            console.error(`Error fetching event details for game ${game.id}:`, e);
          }

          // Fetch team stats for home and away teams
          if (game.home_team?.id && !teamStatsMap.has(game.home_team.id)) {
            try {
              const { data: homeStats, error: homeError } = await supabase.rpc('get_team_stats', {
                p_team_id: game.home_team.id,
                p_season_id: null
              });
              if (!homeError && homeStats?.success && homeStats?.data) {
                teamStatsMap.set(game.home_team.id, homeStats.data);
              }
            } catch (e) {
              console.error(`Error fetching stats for home team ${game.home_team.id}:`, e);
            }
          }

          if (game.away_team?.id && !teamStatsMap.has(game.away_team.id)) {
            try {
              const { data: awayStats, error: awayError } = await supabase.rpc('get_team_stats', {
                p_team_id: game.away_team.id,
                p_season_id: null
              });
              if (!awayError && awayStats?.success && awayStats?.data) {
                teamStatsMap.set(game.away_team.id, awayStats.data);
              }
            } catch (e) {
              console.error(`Error fetching stats for away team ${game.away_team.id}:`, e);
            }
          }
        }

        // Helper to format team stats
        const formatTeamStats = (stats: any) => {
          if (!stats?.season_stats) return null;
          const s = stats.season_stats;

          const played = s.played ?? null;
          const wins = s.wins ?? null;
          const goalsFor = s.goals_for ?? null;
          const goalsAgainst = s.goals_against ?? null;
          const cleanSheets = s.clean_sheets ?? null;
          const yellowCards = s.yellow_cards ?? null;
          const redCards = s.red_cards ?? null;

          // Calculate per-game and percentage values (same as view=teams)
          const winPercentage = (played && played > 0 && wins != null)
            ? Math.round((wins / played) * 100)
            : (s.win_percentage ?? null);
          const goalsForPerGame = (played && played > 0 && goalsFor != null)
            ? parseFloat((goalsFor / played).toFixed(1))
            : null;
          const goalsAgainstPerGame = (played && played > 0 && goalsAgainst != null)
            ? parseFloat((goalsAgainst / played).toFixed(1))
            : null;
          const cleanSheetsPercent = (played && played > 0 && cleanSheets != null)
            ? Math.round((cleanSheets / played) * 100)
            : null;
          const yellowCardsPerGame = (played && played > 0 && yellowCards != null)
            ? parseFloat((yellowCards / played).toFixed(1))
            : null;
          const redCardsPerGame = (played && played > 0 && redCards != null)
            ? parseFloat((redCards / played).toFixed(2))
            : null;

          return {
            played,
            wins,
            draws: s.draws ?? null,
            losses: s.losses ?? null,
            winPercentage,
            points: s.points ?? null,
            goalsFor,
            goalsAgainst,
            goalDifference: s.goal_difference ?? null,
            goalsForPerGame,
            goalsAgainstPerGame,
            avgPossession: s.avg_possession ?? null,
            passAccuracy: s.pass_accuracy ?? null,
            shotsPerGame: s.shots_per_game ?? null,
            shotsOnTargetPerGame: s.shots_on_target_per_game ?? null,
            cleanSheets,
            cleanSheetsPercent,
            yellowCards,
            redCards,
            yellowCardsPerGame,
            redCardsPerGame
          };
        };

        // Helper to format lineup from RPC data
        const formatLineup = (lineup: any[]) => {
          if (!lineup || lineup.length === 0) return null;

          const starting = lineup
            .filter((p: any) => p.lineup_type === 'starting')
            .map((p: any) => ({
              playerId: p.player_id,
              name: p.name,
              jerseyNumber: p.jersey_number,
              position: p.position,
              goals: p.goals ?? 0,
              assists: p.assists ?? 0,
              yellowCards: p.yellow_cards ?? 0,
              redCards: p.red_cards ?? 0
            }));

          const substitutes = lineup
            .filter((p: any) => p.lineup_type === 'substitute')
            .map((p: any) => ({
              playerId: p.player_id,
              name: p.name,
              jerseyNumber: p.jersey_number,
              position: p.position,
              goals: p.goals ?? 0,
              assists: p.assists ?? 0,
              yellowCards: p.yellow_cards ?? 0,
              redCards: p.red_cards ?? 0
            }));

          return {
            starting,
            substitutes
          };
        };

        data = filteredGames.map((game: any) => {
          // Get the most recent odds (sports_match_odds is an array)
          const oddsArray = game.sports_match_odds || [];
          const latestOdds = oddsArray.length > 0 ? oddsArray[0] : null;

          // Get detailed event data from RPC
          const eventData = gameDetailsMap.get(game.id);
          const homeTeamStats = teamStatsMap.get(game.home_team?.id);
          const awayTeamStats = teamStatsMap.get(game.away_team?.id);

          // Use RPC lineup data if available, otherwise check if basic lineup exists
          const hasLineup = eventData?.home_lineup?.length > 0 || eventData?.away_lineup?.length > 0 ||
                           (game.sports_lineups && game.sports_lineups.length > 0);

          return {
            id: game.id,
            sportradarId: game.sportradar_id,
            startTime: game.start_time,
            startTimeConfirmed: game.start_time_confirmed,
            status: game.status,
            homeScore: game.home_score,
            awayScore: game.away_score,
            round: game.round,
            roundNumber: game.round_number,
            matchDay: game.match_day,
            attendance: game.attendance,
            referee: game.referee,
            provider: game.home_team?.api_source || null,
            homeTeam: game.home_team ? {
              id: game.home_team.id,
              name: game.home_team.name,
              shortName: game.home_team.short_name,
              abbreviation: game.home_team.abbreviation,
              logoUrl: game.home_team.logo_url,
              colors: game.home_team.colors,
              seasonStats: formatTeamStats(homeTeamStats)
            } : null,
            awayTeam: game.away_team ? {
              id: game.away_team.id,
              name: game.away_team.name,
              shortName: game.away_team.short_name,
              abbreviation: game.away_team.abbreviation,
              logoUrl: game.away_team.logo_url,
              colors: game.away_team.colors,
              seasonStats: formatTeamStats(awayTeamStats)
            } : null,
            season: game.sports_seasons ? {
              id: game.sports_seasons.id,
              name: game.sports_seasons.name,
              year: game.sports_seasons.year
            } : null,
            league: game.sports_seasons?.sports_leagues ? {
              id: game.sports_seasons.sports_leagues.id,
              name: game.sports_seasons.sports_leagues.name,
              logoUrl: game.sports_seasons.sports_leagues.logo_url
            } : null,
            venue: {
              name: game.venue_name || null,
              city: game.venue_city || null,
              capacity: game.venue_capacity || null
            },
            odds: latestOdds ? {
              homeWinOdds: latestOdds.home_win_odds,
              drawOdds: latestOdds.draw_odds,
              awayWinOdds: latestOdds.away_win_odds,
              homeWinProb: latestOdds.home_win_prob,
              drawProb: latestOdds.draw_prob,
              awayWinProb: latestOdds.away_win_prob,
              updatedAt: latestOdds.updated_at
            } : null,
            hasLineup,
            homeLineup: formatLineup(eventData?.home_lineup),
            awayLineup: formatLineup(eventData?.away_lineup),
            createdAt: game.created_at,
            updatedAt: game.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'standings': {
        let query = supabase
          .from('sports_standings')
          .select(`
            id,
            rank,
            played,
            win,
            draw,
            loss,
            goals_for,
            goals_against,
            goals_diff,
            points,
            form,
            updated_at,
            sports_teams (
              id,
              name,
              short_name,
              abbreviation,
              logo_url,
              colors
            ),
            sports_seasons (
              id,
              name,
              year,
              is_current,
              sports_leagues (
                id,
                name,
                logo_url
              )
            )
          `)
          .order('rank');

        // Filter by league if specified
        if (league !== 'all') {
          const { data: seasonsInLeague } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', league);

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          }
        }

        // Filter by season if specified
        if (season !== 'all') {
          query = query.eq('season_id', season);
        }

        const { data: standingsData, error: standingsError } = await query;

        if (standingsError) {
          console.error('Error fetching standings:', standingsError);
          throw standingsError;
        }

        const totalTeams = standingsData?.length || 0;

        data = (standingsData || []).map(standing => {
          const rank = standing.rank;

          // Calculate trend based on position (up = promotion zone, down = relegation zone)
          let trend: 'up' | 'down' | 'unchanged' = 'unchanged';
          if (rank <= 4) {
            trend = 'up';
          } else if (rank > totalTeams - 3) {
            trend = 'down';
          }

          // Calculate position zone
          let position: string | null = null;
          if (rank <= 4) {
            position = 'Champions League';
          } else if (rank <= 6) {
            position = 'Europa League';
          } else if (rank > totalTeams - 3) {
            position = 'Relegation';
          }

          return {
            id: standing.id,
            rank,
            trend,
            position,
            played: standing.played,
            win: standing.win,
            draw: standing.draw,
            loss: standing.loss,
            goalsFor: standing.goals_for,
            goalsAgainst: standing.goals_against,
            goalsDiff: standing.goals_diff,
            points: standing.points,
            form: standing.form,
            team: standing.sports_teams ? {
              id: standing.sports_teams.id,
              name: standing.sports_teams.name,
              shortName: standing.sports_teams.short_name,
              abbreviation: standing.sports_teams.abbreviation,
              logoUrl: standing.sports_teams.logo_url,
              colors: standing.sports_teams.colors
            } : null,
            season: standing.sports_seasons ? {
              id: standing.sports_seasons.id,
              name: standing.sports_seasons.name,
              year: standing.sports_seasons.year,
              isCurrent: standing.sports_seasons.is_current
            } : null,
            league: standing.sports_seasons?.sports_leagues ? {
              id: standing.sports_seasons.sports_leagues.id,
              name: standing.sports_seasons.sports_leagues.name,
              logoUrl: standing.sports_seasons.sports_leagues.logo_url
            } : null,
            updatedAt: standing.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'venues': {
        // Use get_venues RPC (same as SportsDashboard) which includes image_url
        const { data: venuesData, error: venuesError } = await supabase
          .rpc('get_venues', { p_country: null, p_limit: 100 });

        if (venuesError) {
          console.error('Error fetching venues:', venuesError);
          throw venuesError;
        }

        // Fetch detailed venue data using RPC for each venue (for teams, description, etc.)
        const venueDetailsMap = new Map<string, any>();
        for (const venue of (venuesData || [])) {
          try {
            const { data: details, error: detailsError } = await supabase.rpc('get_venue_details', {
              p_venue_id: venue.id
            });
            if (!detailsError && details?.success && details?.data) {
              venueDetailsMap.set(venue.id, details.data);
            }
          } catch (e) {
            console.error(`Error fetching details for venue ${venue.id}:`, e);
          }
        }

        data = (venuesData || []).map((venue: any) => {
          const details = venueDetailsMap.get(venue.id);

          return {
            id: venue.id,
            sportradarId: venue.sportradar_id,
            name: venue.name,
            city: venue.city,
            country: venue.country,
            countryCode: venue.country_code,
            capacity: venue.capacity,
            surface: venue.surface,
            roofType: venue.roof_type,
            timezone: venue.timezone,
            latitude: venue.latitude,
            longitude: venue.longitude,
            // image_url from get_venues RPC, fallback to details
            imageUrl: venue.image_url || details?.image_url || null,
            description: details?.description || null,
            yearOpened: details?.year_opened || null,
            architect: details?.architect || null,
            teams: details?.teams ? details.teams.map((team: any) => ({
              id: team.id,
              name: team.name,
              logoUrl: team.logo_url,
              colors: team.colors
            })) : null,
            createdAt: venue.created_at,
            updatedAt: venue.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'tournaments': {
        let query = supabase
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
            sport,
            api_source,
            created_at,
            updated_at,
            sports_categories (
              id,
              name,
              country_code
            )
          `)
          .order('name');

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        const { data: leaguesData, error: leaguesError } = await query;

        if (leaguesError) {
          console.error('Error fetching tournaments/leagues:', leaguesError);
          throw leaguesError;
        }

        // For each league, get its current season and schedule
        const leagueScheduleMap = new Map<number, any>();
        const leagueSeasonMap = new Map<number, any>();

        for (const leagueItem of (leaguesData || [])) {
          try {
            // Get the current/latest season for this league
            const { data: seasonData, error: seasonError } = await supabase
              .from('sports_seasons')
              .select('id, name, year, start_date, end_date, is_current')
              .eq('league_id', leagueItem.id)
              .order('start_date', { ascending: false })
              .limit(1)
              .single();

            if (!seasonError && seasonData) {
              leagueSeasonMap.set(leagueItem.id, seasonData);

              // Get the schedule for this season
              const { data: scheduleData, error: scheduleError } = await supabase
                .rpc('get_season_schedule', { p_season_id: seasonData.id });

              if (!scheduleError && scheduleData) {
                leagueScheduleMap.set(leagueItem.id, scheduleData);
              }
            }
          } catch (e) {
            console.error(`Error fetching season/schedule for league ${leagueItem.id}:`, e);
          }
        }

        data = (leaguesData || []).map((leagueItem: any) => {
          const currentSeason = leagueSeasonMap.get(leagueItem.id);
          const schedule = leagueScheduleMap.get(leagueItem.id) || [];

          // Format matches from schedule
          const matches = schedule.map((match: any) => ({
            eventId: match.event_id,
            gameId: match.game_id,
            startTime: match.start_time,
            status: match.status,
            round: match.round,
            homeTeam: {
              name: match.home_team_name,
              logoUrl: match.home_team_logo,
              score: match.home_score
            },
            awayTeam: {
              name: match.away_team_name,
              logoUrl: match.away_team_logo,
              score: match.away_score
            },
            venueName: match.venue_name,
            attendance: match.attendance
          }));

          return {
            id: leagueItem.id,
            sportradarId: leagueItem.sportradar_id,
            name: leagueItem.name,
            alternativeName: leagueItem.alternative_name,
            type: leagueItem.type,
            gender: leagueItem.gender,
            logoUrl: leagueItem.logo_url,
            active: leagueItem.active,
            sport: leagueItem.sport,
            provider: leagueItem.api_source,
            category: leagueItem.sports_categories ? {
              id: leagueItem.sports_categories.id,
              name: leagueItem.sports_categories.name,
              countryCode: leagueItem.sports_categories.country_code
            } : null,
            currentSeason: currentSeason ? {
              id: currentSeason.id,
              name: currentSeason.name,
              year: currentSeason.year,
              startDate: currentSeason.start_date,
              endDate: currentSeason.end_date,
              isCurrent: currentSeason.is_current
            } : null,
            matches,
            matchCount: matches.length,
            createdAt: leagueItem.created_at,
            updatedAt: leagueItem.updated_at
          };
        });
        totalCount = data.length;
        break;
      }

      case 'betting': {
        // Fetch games with betting odds
        let query = supabase
          .from('sports_events')
          .select(`
            id,
            sportradar_id,
            title,
            start_time,
            status,
            home_score,
            away_score,
            api_source,
            created_at,
            updated_at,
            home_team:sports_teams!sports_events_home_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url
            ),
            away_team:sports_teams!sports_events_away_team_id_fkey (
              id,
              name,
              short_name,
              abbreviation,
              logo_url
            ),
            sports_seasons (
              id,
              name,
              sports_leagues (
                id,
                name,
                logo_url
              )
            ),
            sports_betting_odds (
              id,
              bookmaker,
              home_odds,
              away_odds,
              draw_odds,
              over_under_line,
              over_odds,
              under_odds,
              home_spread,
              away_spread,
              home_spread_odds,
              away_spread_odds,
              last_updated
            )
          `)
          .not('sports_betting_odds', 'is', null)
          .order('start_time', { ascending: false });

        // Filter by provider if specified
        if (provider !== 'all') {
          query = query.eq('api_source', provider);
        }

        // Filter by league if specified
        if (league !== 'all') {
          const { data: seasonsInLeague } = await supabase
            .from('sports_seasons')
            .select('id')
            .eq('league_id', league);

          if (seasonsInLeague && seasonsInLeague.length > 0) {
            query = query.in('season_id', seasonsInLeague.map(s => s.id));
          }
        }

        const { data: bettingData, error: bettingError } = await query;

        if (bettingError) {
          console.error('Error fetching betting data:', bettingError);
          throw bettingError;
        }

        data = (bettingData || []).filter(game => game.sports_betting_odds && game.sports_betting_odds.length > 0).map(game => ({
          id: game.id,
          sportradarId: game.sportradar_id,
          title: game.title,
          startTime: game.start_time,
          status: game.status,
          homeScore: game.home_score,
          awayScore: game.away_score,
          provider: game.api_source,
          homeTeam: game.home_team ? {
            id: game.home_team.id,
            name: game.home_team.name,
            shortName: game.home_team.short_name,
            abbreviation: game.home_team.abbreviation,
            logoUrl: game.home_team.logo_url
          } : null,
          awayTeam: game.away_team ? {
            id: game.away_team.id,
            name: game.away_team.name,
            shortName: game.away_team.short_name,
            abbreviation: game.away_team.abbreviation,
            logoUrl: game.away_team.logo_url
          } : null,
          league: game.sports_seasons?.sports_leagues ? {
            id: game.sports_seasons.sports_leagues.id,
            name: game.sports_seasons.sports_leagues.name,
            logoUrl: game.sports_seasons.sports_leagues.logo_url
          } : null,
          odds: game.sports_betting_odds.map((odd: any) => ({
            id: odd.id,
            bookmaker: odd.bookmaker,
            homeOdds: odd.home_odds,
            awayOdds: odd.away_odds,
            drawOdds: odd.draw_odds,
            overUnderLine: odd.over_under_line,
            overOdds: odd.over_odds,
            underOdds: odd.under_odds,
            homeSpread: odd.home_spread,
            awaySpread: odd.away_spread,
            homeSpreadOdds: odd.home_spread_odds,
            awaySpreadOdds: odd.away_spread_odds,
            lastUpdated: odd.last_updated
          })),
          createdAt: game.created_at,
          updatedAt: game.updated_at
        }));
        totalCount = data.length;
        break;
      }
    }

    // Build response
    const response = {
      view,
      league,
      provider,
      ...(view === 'players' && { position }),
      ...(view === 'games' && { status }),
      ...(view === 'standings' && { season }),
      lastUpdated: now,
      totalCount,
      data
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    let errorDetails: string;
    if (error instanceof Error) {
      errorDetails = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Supabase error objects
      errorDetails = (error as any).message || JSON.stringify(error);
    } else {
      errorDetails = String(error);
    }
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
