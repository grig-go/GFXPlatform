/**
 * TheSportsDB API Service
 * Free API for sports team logos and information
 * https://www.thesportsdb.com/api.php
 */

// TheSportsDB free API key (public)
const API_KEY = '3';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// Supported leagues with their names for search_all_teams.php API endpoint
export const SPORTS_LEAGUES = {
  // American Football
  NFL: { id: '4391', name: 'NFL', sport: 'American Football' },

  // Basketball
  NBA: { id: '4387', name: 'NBA', sport: 'Basketball' },
  WNBA: { id: '4389', name: 'WNBA', sport: 'Basketball' },

  // Baseball
  MLB: { id: '4424', name: 'MLB', sport: 'Baseball' },

  // Hockey
  NHL: { id: '4380', name: 'NHL', sport: 'Ice Hockey' },

  // Soccer - Major Leagues
  EPL: { id: '4328', name: 'English Premier League', sport: 'Soccer' },
  MLS: { id: '4346', name: 'American Major League Soccer', sport: 'Soccer' },
  LaLiga: { id: '4335', name: 'Spanish La Liga', sport: 'Soccer' },
  Bundesliga: { id: '4331', name: 'German Bundesliga', sport: 'Soccer' },
  SerieA: { id: '4332', name: 'Italian Serie A', sport: 'Soccer' },
  Ligue1: { id: '4334', name: 'French Ligue 1', sport: 'Soccer' },

  // College Sports
  NCAAF: { id: '4479', name: 'NCAA Division 1', sport: 'American Football' },
  NCAAB: { id: '4607', name: 'NCAA Division I Basketball Mens', sport: 'Basketball' },
} as const;

export type LeagueKey = keyof typeof SPORTS_LEAGUES;

export interface SportsTeam {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  logoBadge?: string;
  banner?: string;
  jersey?: string;
  stadium?: string;
  location?: string;
  league: string;
  sport: string;
  country?: string;
  description?: string;
}

interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort: string | null;
  strBadge: string | null;
  strLogo: string | null;
  strBanner: string | null;
  strJersey: string | null;
  strStadium: string | null;
  strLocation: string | null;
  strLeague: string | null;
  strSport: string | null;
  strCountry: string | null;
  strDescriptionEN: string | null;
}

interface TheSportsDBResponse {
  teams: TheSportsDBTeam[] | null;
}

function transformTeam(team: TheSportsDBTeam): SportsTeam {
  return {
    id: team.idTeam,
    name: team.strTeam,
    shortName: team.strTeamShort || team.strTeam,
    logo: team.strBadge || team.strLogo || '',
    logoBadge: team.strBadge || undefined,
    banner: team.strBanner || undefined,
    jersey: team.strJersey || undefined,
    stadium: team.strStadium || undefined,
    location: team.strLocation || undefined,
    league: team.strLeague || '',
    sport: team.strSport || '',
    country: team.strCountry || undefined,
    description: team.strDescriptionEN || undefined,
  };
}

/**
 * Search for teams by name
 */
export async function searchTeams(query: string): Promise<SportsTeam[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/searchteams.php?t=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: TheSportsDBResponse = await response.json();

    if (!data.teams) return [];

    return data.teams
      .filter(team => team.strBadge || team.strLogo)
      .map(transformTeam);
  } catch (error) {
    console.error('Failed to search teams:', error);
    return [];
  }
}

/**
 * Get all teams in a league
 */
export async function getTeamsByLeague(leagueKey: LeagueKey): Promise<SportsTeam[]> {
  const league = SPORTS_LEAGUES[leagueKey];
  if (!league) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/search_all_teams.php?l=${encodeURIComponent(league.name)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: TheSportsDBResponse = await response.json();

    if (!data.teams) return [];

    return data.teams
      .filter(team => team.strBadge || team.strLogo)
      .map(transformTeam)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`Failed to get teams for ${leagueKey}:`, error);
    return [];
  }
}

/**
 * Get league categories for UI grouping
 */
export function getLeagueCategories() {
  return [
    {
      category: 'American Football',
      leagues: [
        { key: 'NFL' as LeagueKey, ...SPORTS_LEAGUES.NFL, displayName: 'NFL' },
        { key: 'NCAAF' as LeagueKey, ...SPORTS_LEAGUES.NCAAF, displayName: 'NCAA Football' },
      ],
    },
    {
      category: 'Basketball',
      leagues: [
        { key: 'NBA' as LeagueKey, ...SPORTS_LEAGUES.NBA, displayName: 'NBA' },
        { key: 'WNBA' as LeagueKey, ...SPORTS_LEAGUES.WNBA, displayName: 'WNBA' },
        { key: 'NCAAB' as LeagueKey, ...SPORTS_LEAGUES.NCAAB, displayName: 'NCAA Basketball' },
      ],
    },
    {
      category: 'Baseball',
      leagues: [
        { key: 'MLB' as LeagueKey, ...SPORTS_LEAGUES.MLB, displayName: 'MLB' },
      ],
    },
    {
      category: 'Hockey',
      leagues: [
        { key: 'NHL' as LeagueKey, ...SPORTS_LEAGUES.NHL, displayName: 'NHL' },
      ],
    },
    {
      category: 'Soccer',
      leagues: [
        { key: 'MLS' as LeagueKey, ...SPORTS_LEAGUES.MLS, displayName: 'MLS' },
        { key: 'EPL' as LeagueKey, ...SPORTS_LEAGUES.EPL, displayName: 'Premier League' },
        { key: 'LaLiga' as LeagueKey, ...SPORTS_LEAGUES.LaLiga, displayName: 'La Liga' },
        { key: 'Bundesliga' as LeagueKey, ...SPORTS_LEAGUES.Bundesliga, displayName: 'Bundesliga' },
        { key: 'SerieA' as LeagueKey, ...SPORTS_LEAGUES.SerieA, displayName: 'Serie A' },
        { key: 'Ligue1' as LeagueKey, ...SPORTS_LEAGUES.Ligue1, displayName: 'Ligue 1' },
      ],
    },
  ];
}

// ============================================
// PLAYER / HEADSHOT SUPPORT
// ============================================

export interface SportsPlayer {
  id: string;
  name: string;
  team: string;
  teamId?: string;
  position?: string;
  number?: string;
  nationality?: string;
  birthDate?: string;
  height?: string;
  weight?: string;
  headshot: string;
  thumbnail?: string;
  banner?: string;
  sport?: string;
  description?: string;
}

interface TheSportsDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strTeam: string | null;
  idTeam: string | null;
  strPosition: string | null;
  strNumber: string | null;
  strNationality: string | null;
  dateBorn: string | null;
  strHeight: string | null;
  strWeight: string | null;
  strCutout: string | null;
  strThumb: string | null;
  strRender: string | null;
  strBanner: string | null;
  strSport: string | null;
  strDescriptionEN: string | null;
}

interface TheSportsDBPlayersResponse {
  player: TheSportsDBPlayer[] | null;
}

function transformPlayer(player: TheSportsDBPlayer): SportsPlayer {
  return {
    id: player.idPlayer,
    name: player.strPlayer,
    team: player.strTeam || '',
    teamId: player.idTeam || undefined,
    position: player.strPosition || undefined,
    number: player.strNumber || undefined,
    nationality: player.strNationality || undefined,
    birthDate: player.dateBorn || undefined,
    height: player.strHeight || undefined,
    weight: player.strWeight || undefined,
    headshot: player.strCutout || player.strThumb || player.strRender || '',
    thumbnail: player.strThumb || undefined,
    banner: player.strBanner || undefined,
    sport: player.strSport || undefined,
    description: player.strDescriptionEN || undefined,
  };
}

/**
 * Search for players by name
 */
export async function searchPlayers(query: string): Promise<SportsPlayer[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/searchplayers.php?p=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: TheSportsDBPlayersResponse = await response.json();

    if (!data.player) return [];

    return data.player
      .filter(player => player.strCutout || player.strThumb || player.strRender)
      .map(transformPlayer);
  } catch (error) {
    console.error('Failed to search players:', error);
    return [];
  }
}

/**
 * Get all players on a team by team name
 */
export async function getPlayersByTeam(teamName: string): Promise<SportsPlayer[]> {
  if (!teamName) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/searchplayers.php?t=${encodeURIComponent(teamName)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: TheSportsDBPlayersResponse = await response.json();

    if (!data.player) return [];

    return data.player
      .filter(player => player.strCutout || player.strThumb || player.strRender)
      .map(transformPlayer)
      .sort((a, b) => {
        if (a.number && b.number) {
          return parseInt(a.number) - parseInt(b.number);
        }
        return a.name.localeCompare(b.name);
      });
  } catch (error) {
    console.error(`Failed to get players for ${teamName}:`, error);
    return [];
  }
}
