export type Provider = 'sportradar' | 'opta';

export type GameStatus = 'scheduled' | 'in_progress' | 'halftime' | 'delayed' | 'suspended' | 'postponed' | 'final' | 'final_ot' | 'final_so' | 'cancelled';

export type PeriodLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'OT' | '1H' | '2H' | 'ET' | 'P1' | 'P2' | 'P3' | 'SO' | 'Innings' | 'Set1' | 'Set2' | 'Set3' | 'Set4' | 'Set5';

export type Side = 'home' | 'away' | 'neutral';

export interface ProviderData {
  sportradar?: {
    sr_id?: string;
    sr_competition_id?: string;
    sr_team_id?: string;
    sr_player_id?: string;
    sr_venue_id?: string;
  };
  opta?: {
    opta_id?: string;
    opta_competition_id?: string;
    opta_team_id?: string;
    opta_player_id?: string;
    opta_venue_id?: string;
  };
}

export interface Brand {
  primary_color: string;
  secondary_color: string;
  logo?: {
    role: string;
    url: string;
  };
  logos?: Array<{
    role: string;
    url: string;
  }>;
}

export interface League {
  id: string;
  name: string;
  abbrev: string;
  country: string;
  sport: string;
  brand: Brand;
  providers: ProviderData;
}

export interface Team {
  id: string;
  league_id: string;
  name: string;
  abbrev: string;
  city: string;
  country?: string;
  country_code?: string;
  founded?: number;
  manager?: {
    name: string;
    nationality?: string;
    country_code?: string;
  };
  venue_id?: string;
  venue?: {
    id: string;
    name: string;
    capacity?: number;
    city?: string;
    country?: string;
  };
  brand: Brand;
  providers: ProviderData;
  latest_form?: {
    L5: string[];
  };
  splits?: {
    home_record: { wins: number; losses: number };
    away_record: { wins: number; losses: number };
    last10: { wins: number; losses: number };
  };
  stats: Record<string, any>;
  roster?: Player[];
}

export interface Player {
  id: string;
  team_id: string;
  league_id: string;
  name: {
    full: string;
    display: string;
  };
  bio: {
    birthdate?: string;
    nationality?: string;
    height_cm?: number;
    weight_kg?: number;
    position?: string;
    number?: number;
  };
  media?: {
    headshots?: Array<{
      role: string;
      url: string;
    }>;
    social?: {
      x?: string;
    };
  };
  providers: ProviderData;
  injury_status?: {
    status: string;
  };
  stats: Record<string, any>;
}

export interface Venue {
  id: string;
  name: string;
  address: {
    city: string;
    state?: string;
    country: string;
  };
  capacity?: number;
  geo?: {
    lat: number;
    lng: number;
  };
  indoor?: boolean;
  surface?: string;
  timezone?: string;
  media?: {
    photos?: Array<{
      role: string;
      url: string;
    }>;
  };
  providers: ProviderData;
}

export interface GamePeriod {
  label: PeriodLabel;
  home: number;
  away: number;
}

export interface GameTeam {
  team_id: string;
  score: number;
}

export interface Tournament {
  id: string;
  name: string;
  abbrev: string;
  league_id?: string;
  season: string;
  stage: 'group' | 'knockout' | 'regular_season' | 'playoffs' | 'final';
  start_date: string;
  end_date?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'league';
  brand: Brand;
  participating_teams: Array<{
    team_id: string;
    seed?: number;
    group?: string;
  }>;
  rounds?: Array<{
    name: string;
    games: string[]; // Game IDs
  }>;
  prizes?: {
    winner?: string;
    total_prize_pool?: number;
  };
  stats?: {
    total_games: number;
    completed_games: number;
    participating_teams_count: number;
  };
  providers: ProviderData;
}

export interface Game {
  id: string;
  league_id: string;
  tournament_id?: string;
  season_id?: string;
  competition_stage?: string;
  status: GameStatus;
  scheduled: string;
  venue_id?: string;
  officials?: Array<{
    name: string;
    role: string;
  }>;
  teams: {
    home: GameTeam;
    away: GameTeam;
  };
  periods?: GamePeriod[];
  providers: ProviderData;
  media?: {
    broadcasters?: string[];
    highlights?: string[];
    photos?: Array<{
      role: string;
      url: string;
    }>;
  };
  odds?: {
    home_ml?: number;
    away_ml?: number;
  };
}

export interface NewsArticle {
  id: string;
  title: string;
  published_at: string;
  authors: string[];
  source: string;
  language: string;
  url: string;
  tags: string[];
  entities: Array<{
    type: 'team' | 'player' | 'league' | 'game';
    id: string;
  }>;
  image?: {
    url: string;
    width: number;
    height: number;
  };
  summary: string;
  body?: string;
}

export interface FieldOverride {
  field: string;
  originalValue: any;
  overriddenValue: any;
  overriddenAt: string;
  overriddenBy: string;
  provider: Provider;
}

export interface SportsEntityWithOverrides {
  entity: Team | Player | Game | League | Venue | Tournament;
  overrides: FieldOverride[];
  lastUpdated: string;
  primaryProvider: Provider;
}

export interface SportsData {
  leagues: League[];
  teams: SportsEntityWithOverrides[];
  players: SportsEntityWithOverrides[];
  games: SportsEntityWithOverrides[];
  venues: SportsEntityWithOverrides[];
  tournaments: SportsEntityWithOverrides[];
  lastUpdated: string;
}

// UI Types
export type SportsView = 'teams' | 'players' | 'games' | 'venues' | 'tournaments' | 'standings' | 'betting';

export interface SportsFilters {
  search: string;
  league: string;
  status?: GameStatus;
  position?: string;
  provider: Provider | 'all';
  showOverrides: boolean;
}

// Betting & Odds Types
export interface BettingOdds {
  id: string;
  event_id: string;
  market_type: 'match_winner' | 'over_under' | 'btts' | 'correct_score' | 'asian_handicap';
  home_odds?: number;
  draw_odds?: number;
  away_odds?: number;
  over_odds?: number;
  under_odds?: number;
  line?: number; // For over/under and handicap
  yes_odds?: number; // For BTTS
  no_odds?: number; // For BTTS
  home_probability?: number;
  draw_probability?: number;
  away_probability?: number;
  bookmaker?: string;
  updated_at: string;
}

export interface GameWithOdds extends Game {
  betting_odds?: BettingOdds[];
}

// Standings Types
export interface StandingsRow {
  rank: number;
  team_id: string;
  team_name: string;
  abbrev: string | null;
  record: {
    wins: number;
    draws: number;
    losses: number;
    formatted: string;
  };
  points: number;
  gf: number;
  ga: number;
  gd: number;
  form: {
    L5: string[];
  };
  league_abbrev: string;
}

export interface StandingsGroup {
  id: string;
  name: string;
  rows: StandingsRow[];
}

export interface StandingsTable {
  id: string;
  league_id: string | null;
  season_id: string;
  scope: string;
  groups: StandingsGroup[];
  last_updated: string;
}