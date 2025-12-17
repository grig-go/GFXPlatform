/**
 * TheSportsDB API Service
 * Free API for sports team logos and information
 * https://www.thesportsdb.com/api.php
 */

// TheSportsDB free API key (public)
const API_KEY = '3';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// Supported leagues with their names for search_all_teams.php API endpoint
// Note: The 'name' field must match exactly what TheSportsDB uses
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

  // Soccer - Major Leagues (names must match TheSportsDB exactly)
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

// Common team nickname mappings for better search
const TEAM_NICKNAME_MAP: Record<string, string> = {
  // NFL
  'lakers': 'Los Angeles Lakers',
  'celtics': 'Boston Celtics',
  'warriors': 'Golden State Warriors',
  'bulls': 'Chicago Bulls',
  'heat': 'Miami Heat',
  'knicks': 'New York Knicks',
  'nets': 'Brooklyn Nets',
  'sixers': 'Philadelphia 76ers',
  '76ers': 'Philadelphia 76ers',
  'mavericks': 'Dallas Mavericks',
  'mavs': 'Dallas Mavericks',
  'spurs': 'San Antonio Spurs',
  'rockets': 'Houston Rockets',
  'suns': 'Phoenix Suns',
  'clippers': 'Los Angeles Clippers',
  'nuggets': 'Denver Nuggets',
  'jazz': 'Utah Jazz',
  'blazers': 'Portland Trail Blazers',
  'trailblazers': 'Portland Trail Blazers',
  'thunder': 'Oklahoma City Thunder',
  'bucks': 'Milwaukee Bucks',
  'pistons': 'Detroit Pistons',
  'pacers': 'Indiana Pacers',
  'hawks': 'Atlanta Hawks',
  'hornets': 'Charlotte Hornets',
  'magic': 'Orlando Magic',
  'wizards': 'Washington Wizards',
  'cavaliers': 'Cleveland Cavaliers',
  'cavs': 'Cleveland Cavaliers',
  'raptors': 'Toronto Raptors',
  'timberwolves': 'Minnesota Timberwolves',
  'wolves': 'Minnesota Timberwolves',
  'grizzlies': 'Memphis Grizzlies',
  'pelicans': 'New Orleans Pelicans',
  'kings': 'Sacramento Kings',
  // NFL
  'patriots': 'New England Patriots',
  'pats': 'New England Patriots',
  'cowboys': 'Dallas Cowboys',
  'packers': 'Green Bay Packers',
  'steelers': 'Pittsburgh Steelers',
  'chiefs': 'Kansas City Chiefs',
  '49ers': 'San Francisco 49ers',
  'niners': 'San Francisco 49ers',
  'raiders': 'Las Vegas Raiders',
  'broncos': 'Denver Broncos',
  'seahawks': 'Seattle Seahawks',
  'eagles': 'Philadelphia Eagles',
  'giants': 'New York Giants',
  'jets': 'New York Jets',
  'dolphins': 'Miami Dolphins',
  'bills': 'Buffalo Bills',
  'ravens': 'Baltimore Ravens',
  'bengals': 'Cincinnati Bengals',
  'browns': 'Cleveland Browns',
  'colts': 'Indianapolis Colts',
  'texans': 'Houston Texans',
  'jaguars': 'Jacksonville Jaguars',
  'jags': 'Jacksonville Jaguars',
  'titans': 'Tennessee Titans',
  'saints': 'New Orleans Saints',
  'falcons': 'Atlanta Falcons',
  'panthers': 'Carolina Panthers',
  'buccaneers': 'Tampa Bay Buccaneers',
  'bucs': 'Tampa Bay Buccaneers',
  'cardinals': 'Arizona Cardinals',
  'rams': 'Los Angeles Rams',
  'chargers': 'Los Angeles Chargers',
  'bears': 'Chicago Bears',
  'lions': 'Detroit Lions',
  'vikings': 'Minnesota Vikings',
  'commanders': 'Washington Commanders',
  // MLB
  'yankees': 'New York Yankees',
  'red sox': 'Boston Red Sox',
  'redsox': 'Boston Red Sox',
  'dodgers': 'Los Angeles Dodgers',
  'cubs': 'Chicago Cubs',
  'white sox': 'Chicago White Sox',
  'whitesox': 'Chicago White Sox',
  'mets': 'New York Mets',
  'phillies': 'Philadelphia Phillies',
  'braves': 'Atlanta Braves',
  'astros': 'Houston Astros',
  'rangers': 'Texas Rangers',
  'angels': 'Los Angeles Angels',
  'padres': 'San Diego Padres',
  'mariners': 'Seattle Mariners',
  'twins': 'Minnesota Twins',
  'guardians': 'Cleveland Guardians',
  'tigers': 'Detroit Tigers',
  'royals': 'Kansas City Royals',
  'athletics': 'Oakland Athletics',
  'orioles': 'Baltimore Orioles',
  'blue jays': 'Toronto Blue Jays',
  'bluejays': 'Toronto Blue Jays',
  'rays': 'Tampa Bay Rays',
  'marlins': 'Miami Marlins',
  'nationals': 'Washington Nationals',
  'nats': 'Washington Nationals',
  'reds': 'Cincinnati Reds',
  'brewers': 'Milwaukee Brewers',
  'pirates': 'Pittsburgh Pirates',
  'rockies': 'Colorado Rockies',
  'diamondbacks': 'Arizona Diamondbacks',
  'dbacks': 'Arizona Diamondbacks',
  // NHL
  'bruins': 'Boston Bruins',
  'blackhawks': 'Chicago Blackhawks',
  'red wings': 'Detroit Red Wings',
  'redwings': 'Detroit Red Wings',
  'penguins': 'Pittsburgh Penguins',
  'pens': 'Pittsburgh Penguins',
  'flyers': 'Philadelphia Flyers',
  'maple leafs': 'Toronto Maple Leafs',
  'leafs': 'Toronto Maple Leafs',
  'canadiens': 'Montreal Canadiens',
  'habs': 'Montreal Canadiens',
  'oilers': 'Edmonton Oilers',
  'flames': 'Calgary Flames',
  'canucks': 'Vancouver Canucks',
  'avalanche': 'Colorado Avalanche',
  'avs': 'Colorado Avalanche',
  'lightning': 'Tampa Bay Lightning',
  'bolts': 'Tampa Bay Lightning',
  'golden knights': 'Vegas Golden Knights',
  'knights': 'Vegas Golden Knights',
  'kraken': 'Seattle Kraken',
  'wild': 'Minnesota Wild',
  'predators': 'Nashville Predators',
  'preds': 'Nashville Predators',
  'blues': 'St. Louis Blues',
  'stars': 'Dallas Stars',
  'coyotes': 'Arizona Coyotes',
  'ducks': 'Anaheim Ducks',
  'sharks': 'San Jose Sharks',
  'islanders': 'New York Islanders',
  'isles': 'New York Islanders',
  'capitals': 'Washington Capitals',
  'caps': 'Washington Capitals',
  'hurricanes': 'Carolina Hurricanes',
  'canes': 'Carolina Hurricanes',
  'blue jackets': 'Columbus Blue Jackets',
  'jackets': 'Columbus Blue Jackets',
  'sabres': 'Buffalo Sabres',
  'devils': 'New Jersey Devils',
  'senators': 'Ottawa Senators',
  'sens': 'Ottawa Senators',
  'winnipeg jets': 'Winnipeg Jets',
  // Soccer - Premier League
  'man united': 'Manchester United',
  'man utd': 'Manchester United',
  'united': 'Manchester United',
  'man city': 'Manchester City',
  'city': 'Manchester City',
  'chelsea': 'Chelsea',
  'arsenal': 'Arsenal',
  'gunners': 'Arsenal',
  'liverpool': 'Liverpool',
  'pool': 'Liverpool',
  'tottenham': 'Tottenham Hotspur',
  'hotspur': 'Tottenham Hotspur',
  'everton': 'Everton',
  'toffees': 'Everton',
  'west ham': 'West Ham United',
  'hammers': 'West Ham United',
  'newcastle': 'Newcastle United',
  'magpies': 'Newcastle United',
  'villa': 'Aston Villa',
  'wolverhampton': 'Wolverhampton Wanderers',
  'wanderers': 'Wolverhampton Wanderers',
  // Soccer - La Liga
  'barca': 'Barcelona',
  'real': 'Real Madrid',
  'atletico': 'Atletico Madrid',
  'atleti': 'Atletico Madrid',
  'sevilla': 'Sevilla',
  'valencia': 'Valencia',
  // Soccer - Other
  'bayern': 'Bayern Munich',
  'dortmund': 'Borussia Dortmund',
  'bvb': 'Borussia Dortmund',
  'juventus': 'Juventus',
  'juve': 'Juventus',
  'inter': 'Inter Milan',
  'ac milan': 'AC Milan',
  'milan': 'AC Milan',
  'psg': 'Paris Saint-Germain',
  'paris': 'Paris Saint-Germain',
};

/**
 * Search for teams by name
 */
export async function searchTeams(query: string): Promise<SportsTeam[]> {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const mappedName = TEAM_NICKNAME_MAP[normalizedQuery];
  const searchQuery = mappedName || query;

  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/searchteams.php?t=${encodeURIComponent(searchQuery)}`
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
 * Get team details by ID
 */
export async function getTeamById(teamId: string): Promise<SportsTeam | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/lookupteam.php?id=${teamId}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: TheSportsDBResponse = await response.json();

    if (!data.teams || data.teams.length === 0) return null;

    return transformTeam(data.teams[0]);
  } catch (error) {
    console.error(`Failed to get team ${teamId}:`, error);
    return null;
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

/**
 * Quick lookup: Get team logo URL by team name
 */
export async function getTeamLogoUrl(teamName: string): Promise<string | null> {
  const teams = await searchTeams(teamName);
  if (teams.length > 0 && teams[0].logo) {
    return teams[0].logo;
  }
  return null;
}

// Player types and functions
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

/**
 * Get player details by ID
 */
export async function getPlayerById(playerId: string): Promise<SportsPlayer | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/${API_KEY}/lookupplayer.php?id=${playerId}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.players || data.players.length === 0) return null;

    return transformPlayer(data.players[0]);
  } catch (error) {
    console.error(`Failed to get player ${playerId}:`, error);
    return null;
  }
}

/**
 * Quick lookup: Get player headshot URL by player name
 */
export async function getPlayerHeadshotUrl(playerName: string): Promise<string | null> {
  const players = await searchPlayers(playerName);
  if (players.length > 0 && players[0].headshot) {
    return players[0].headshot;
  }
  return null;
}
