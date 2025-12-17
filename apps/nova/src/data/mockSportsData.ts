import { SportsData, League, Team, Player, Game, Venue, Tournament, SportsEntityWithOverrides, Provider } from '../types/sports';

// Mock Leagues
const mockLeagues: League[] = [
  {
    id: 'league_nba',
    name: 'National Basketball Association',
    abbrev: 'NBA',
    country: 'USA',
    sport: 'basketball',
    brand: {
      primary_color: '#17408B',
      secondary_color: '#C9082A',
      logo: { role: 'logo_primary', url: 'https://cdn.nba.com/logos/nba-logo.svg' }
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:competition:123' },
      opta: { opta_competition_id: '8' }
    }
  },
  {
    id: 'league_nfl',
    name: 'National Football League',
    abbrev: 'NFL',
    country: 'USA',
    sport: 'american_football',
    brand: {
      primary_color: '#013369',
      secondary_color: '#D50A0A',
      logo: { role: 'logo_primary', url: 'https://cdn.nfl.com/logos/nfl-logo.svg' }
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:competition:456' },
      opta: { opta_competition_id: '16' }
    }
  },
  {
    id: 'league_mlb',
    name: 'Major League Baseball',
    abbrev: 'MLB',
    country: 'USA',
    sport: 'baseball',
    brand: {
      primary_color: '#002D72',
      secondary_color: '#BA0C2F',
      logo: { role: 'logo_primary', url: 'https://cdn.mlb.com/logos/mlb-logo.svg' }
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:competition:789' },
      opta: { opta_competition_id: '1' }
    }
  },
  {
    id: 'league_nhl',
    name: 'National Hockey League',
    abbrev: 'NHL',
    country: 'USA',
    sport: 'ice_hockey',
    brand: {
      primary_color: '#000000',
      secondary_color: '#FFFFFF',
      logo: { role: 'logo_primary', url: 'https://cdn.nhl.com/logos/nhl-logo.svg' }
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:competition:101' },
      opta: { opta_competition_id: '4' }
    }
  },
  {
    id: 'league_epl',
    name: 'English Premier League',
    abbrev: 'EPL',
    country: 'ENG',
    sport: 'soccer',
    brand: {
      primary_color: '#3D195B',
      secondary_color: '#00FF85',
      logo: { role: 'logo_primary', url: 'https://cdn.premierleague.com/logos/epl-logo.svg' }
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:competition:202' },
      opta: { opta_competition_id: '2' }
    }
  }
];

// Mock Teams
const mockTeams: Team[] = [
  {
    id: 'team_lakers',
    league_id: 'league_nba',
    name: 'Los Angeles Lakers',
    abbrev: 'LAL',
    city: 'Los Angeles',
    country: 'United States',
    country_code: 'USA',
    founded: 1947,
    manager: {
      name: 'Darvin Ham',
      nationality: 'United States',
      country_code: 'USA'
    },
    venue_id: 'venue_crypto_arena',
    venue: {
      id: 'venue_crypto_arena',
      name: 'Crypto.com Arena',
      capacity: 18997,
      city: 'Los Angeles',
      country: 'United States'
    },
    brand: {
      primary_color: '#552583',
      secondary_color: '#FDB927',
      logos: [
        { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1682084037329-45a11d86cce7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwdGVhbSUyMGxvZ298ZW58MXx8fHwxNzU5ODY4NDE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_team_id: 'sr:team:12345' },
      opta: { opta_team_id: 't123' }
    },
    latest_form: {
      L5: ['W', 'W', 'L', 'W', 'L']
    },
    splits: {
      home_record: { wins: 20, losses: 10 },
      away_record: { wins: 15, losses: 15 },
      last10: { wins: 6, losses: 4 }
    },
    stats: {
      ppg: 112.5,
      opp_ppg: 108.2,
      record: { wins: 35, losses: 25 },
      wins: 35,
      losses: 25,
      points: 0, // Not applicable for basketball
      goals_for: 0,
      gf: 0,
      goals_against: 0,
      ga: 0
    },
    roster: [] // References mockPlayers
  },
  {
    id: 'team_warriors',
    league_id: 'league_nba',
    name: 'Golden State Warriors',
    abbrev: 'GSW',
    city: 'San Francisco',
    founded: 1946,
    venue_id: 'venue_chase_center',
    brand: {
      primary_color: '#1D428A',
      secondary_color: '#FFC72C',
      logos: [
        { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1682084037329-45a11d86cce7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwdGVhbSUyMGxvZ298ZW58MXx8fHwxNzU5ODY4NDE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_team_id: 'sr:team:12346' },
      opta: { opta_team_id: 't124' }
    },
    latest_form: {
      L5: ['W', 'L', 'W', 'W', 'W']
    },
    splits: {
      home_record: { wins: 22, losses: 8 },
      away_record: { wins: 18, losses: 12 },
      last10: { wins: 7, losses: 3 }
    },
    stats: {
      ppg: 118.3,
      opp_ppg: 112.1,
      record: { wins: 40, losses: 20 }
    }
  },
  {
    id: 'team_chiefs',
    league_id: 'league_nfl',
    name: 'Kansas City Chiefs',
    abbrev: 'KC',
    city: 'Kansas City',
    founded: 1960,
    venue_id: 'venue_arrowhead',
    brand: {
      primary_color: '#E31837',
      secondary_color: '#FFB81C',
      logos: [
        { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1599446740719-23f3414840ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHRlYW0lMjBsb2dvfGVufDF8fHx8MTc1OTg0OTc1OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_team_id: 'sr:team:22345' },
      opta: { opta_team_id: 'nfl123' }
    },
    latest_form: {
      L5: ['W', 'W', 'W', 'L', 'W']
    },
    splits: {
      home_record: { wins: 6, losses: 2 },
      away_record: { wins: 5, losses: 4 },
      last10: { wins: 8, losses: 2 }
    },
    stats: {
      ppg: 28.5,
      opp_ppg: 18.2,
      record: { wins: 11, losses: 6 }
    }
  },
  {
    id: 'team_arsenal',
    league_id: 'league_epl',
    name: 'Arsenal FC',
    abbrev: 'ARS',
    city: 'London',
    country: 'England',
    country_code: 'ENG',
    founded: 1886,
    manager: {
      name: 'Mikel Arteta',
      nationality: 'Spain',
      country_code: 'ESP'
    },
    venue_id: 'venue_emirates',
    venue: {
      id: 'venue_emirates',
      name: 'Emirates Stadium',
      capacity: 60704,
      city: 'London',
      country: 'England'
    },
    brand: {
      primary_color: '#EF0107',
      secondary_color: '#FFFFFF',
      logos: [
        { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1709873582570-4f17d43921d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjB0ZWFtJTIwbG9nb3xlbnwxfHx8fDE3NTk4Njg3NzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_team_id: 'sr:team:32345' },
      opta: { opta_team_id: 'epl123' }
    },
    latest_form: {
      L5: ['W', 'D', 'W', 'W', 'L']
    },
    splits: {
      home_record: { wins: 10, losses: 2 },
      away_record: { wins: 8, losses: 4 },
      last10: { wins: 7, losses: 2 }
    },
    stats: {
      played: 20,
      wins: 18,
      draws: 2,
      losses: 0,
      points: 56,
      goals_for: 45,
      gf: 45,
      goals_against: 22,
      ga: 22
    },
    roster: [] // Will be populated with player refs
  }
];

// Mock Players
const mockPlayers: Player[] = [
  {
    id: 'player_lebron',
    team_id: 'team_lakers',
    league_id: 'league_nba',
    name: {
      full: 'LeBron James',
      display: 'LeBron James'
    },
    bio: {
      birthdate: '1984-12-30',
      nationality: 'USA',
      height_cm: 206,
      weight_kg: 113,
      position: 'SF',
      number: 23
    },
    media: {
      headshots: [
        { role: 'headshot', url: 'https://images.unsplash.com/photo-1610479415766-bac1943ee8bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwaGVhZHNob3R8ZW58MXx8fHwxNzU5ODQxNzE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ],
      social: {
        x: '@KingJames'
      }
    },
    providers: {
      sportradar: { sr_player_id: 'sr:player:123456' },
      opta: { opta_player_id: 'p123' }
    },
    injury_status: {
      status: 'active'
    },
    stats: {
      ppg: 25.2,
      rpg: 7.8,
      apg: 6.9,
      fg_pct: 0.542
    }
  },
  {
    id: 'player_curry',
    team_id: 'team_warriors',
    league_id: 'league_nba',
    name: {
      full: 'Stephen Curry',
      display: 'Stephen Curry'
    },
    bio: {
      birthdate: '1988-03-14',
      nationality: 'USA',
      height_cm: 191,
      weight_kg: 84,
      position: 'PG',
      number: 30
    },
    media: {
      headshots: [
        { role: 'headshot', url: 'https://images.unsplash.com/photo-1612014207252-f7f2dcd00d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBhdGhsZXRlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU5NzgzMTA3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ],
      social: {
        x: '@StephenCurry30'
      }
    },
    providers: {
      sportradar: { sr_player_id: 'sr:player:123457' },
      opta: { opta_player_id: 'p124' }
    },
    injury_status: {
      status: 'active'
    },
    stats: {
      ppg: 28.4,
      rpg: 4.5,
      apg: 5.2,
      fg_pct: 0.463,
      tp_pct: 0.428
    }
  },
  {
    id: 'player_mahomes',
    team_id: 'team_chiefs',
    league_id: 'league_nfl',
    name: {
      full: 'Patrick Mahomes',
      display: 'Patrick Mahomes'
    },
    bio: {
      birthdate: '1995-09-17',
      nationality: 'USA',
      height_cm: 191,
      weight_kg: 104,
      position: 'QB',
      number: 15
    },
    media: {
      headshots: [
        { role: 'headshot', url: 'https://images.unsplash.com/photo-1632300873131-1dd749c83f97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHBsYXllciUyMHBvcnRyYWl0fGVufDF8fHx8MTc1OTgyMzY3OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ],
      social: {
        x: '@PatrickMahomes'
      }
    },
    providers: {
      sportradar: { sr_player_id: 'sr:player:223456' },
      opta: { opta_player_id: 'nflp123' }
    },
    injury_status: {
      status: 'active'
    },
    stats: {
      pass_yds: 3928,
      pass_tds: 27,
      interceptions: 14,
      qb_rating: 92.3
    }
  }
];

// Mock Venues
const mockVenues: Venue[] = [
  {
    id: 'venue_crypto_arena',
    name: 'Crypto.com Arena',
    address: {
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA'
    },
    capacity: 19068,
    geo: {
      lat: 34.043,
      lng: -118.267
    },
    indoor: true,
    surface: 'hardwood',
    timezone: 'America/Los_Angeles',
    media: {
      photos: [
        { role: 'exterior', url: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwYXJlbmF8ZW58MXx8fHwxNzU5NzYyNzA2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_venue_id: 'sr:venue:123' },
      opta: { opta_venue_id: 'v123' }
    }
  },
  {
    id: 'venue_chase_center',
    name: 'Chase Center',
    address: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA'
    },
    capacity: 18064,
    geo: {
      lat: 37.7681,
      lng: -122.3889
    },
    indoor: true,
    surface: 'hardwood',
    timezone: 'America/Los_Angeles',
    media: {
      photos: [
        { role: 'exterior', url: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwYXJlbmF8ZW58MXx8fHwxNzU5NzYyNzA2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_venue_id: 'sr:venue:124' },
      opta: { opta_venue_id: 'v124' }
    }
  },
  {
    id: 'venue_arrowhead',
    name: 'Arrowhead Stadium',
    address: {
      city: 'Kansas City',
      state: 'MO',
      country: 'USA'
    },
    capacity: 76416,
    geo: {
      lat: 39.0489,
      lng: -94.4839
    },
    indoor: false,
    surface: 'grass',
    timezone: 'America/Chicago',
    media: {
      photos: [
        { role: 'exterior', url: 'https://images.unsplash.com/photo-1758706552473-953769e10741?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHN0YWRpdW0lMjBleHRlcmlvcnxlbnwxfHx8fDE3NTk4Njg5Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_venue_id: 'sr:venue:225' },
      opta: { opta_venue_id: 'nflv123' }
    }
  },
  {
    id: 'venue_emirates',
    name: 'Emirates Stadium',
    address: {
      city: 'London',
      country: 'GBR'
    },
    capacity: 60704,
    geo: {
      lat: 51.5549,
      lng: -0.1084
    },
    indoor: false,
    surface: 'grass',
    timezone: 'Europe/London',
    media: {
      photos: [
        { role: 'exterior', url: 'https://images.unsplash.com/photo-1676189349801-fa37a5b7a769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBzdGFkaXVtJTIwZXh0ZXJpb3J8ZW58MXx8fHwxNzU5ODY4OTI3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    providers: {
      sportradar: { sr_venue_id: 'sr:venue:325' },
      opta: { opta_venue_id: 'eplv123' }
    }
  }
];

// Mock Tournaments
const mockTournaments: Tournament[] = [
  {
    id: 'tournament_march_madness',
    name: 'NCAA March Madness',
    abbrev: 'MM',
    season: '2025',
    stage: 'knockout',
    start_date: '2025-03-15T00:00:00Z',
    end_date: '2025-04-08T00:00:00Z',
    status: 'upcoming',
    format: 'single_elimination',
    brand: {
      primary_color: '#002776',
      secondary_color: '#FFFFFF',
      logo: { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1759200332516-b831e79acee1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100' }
    },
    participating_teams: [
      { team_id: 'team_duke', seed: 1, group: 'South' },
      { team_id: 'team_kansas', seed: 2, group: 'South' },
      { team_id: 'team_north_carolina', seed: 3, group: 'South' },
      { team_id: 'team_gonzaga', seed: 4, group: 'South' }
    ],
    rounds: [
      { name: 'First Four', games: [] },
      { name: 'First Round', games: [] },
      { name: 'Second Round', games: [] },
      { name: 'Sweet 16', games: [] },
      { name: 'Elite Eight', games: [] },
      { name: 'Final Four', games: [] },
      { name: 'Championship', games: [] }
    ],
    prizes: {
      winner: 'TBD',
      total_prize_pool: 1000000
    },
    stats: {
      total_games: 68,
      completed_games: 0,
      participating_teams_count: 68
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:tournament:march_madness_2025' },
      opta: { opta_competition_id: 'ncaa_tournament_2025' }
    }
  },
  {
    id: 'tournament_champions_league',
    name: 'UEFA Champions League',
    abbrev: 'UCL',
    league_id: 'league_champions',
    season: '2024-25',
    stage: 'knockout',
    start_date: '2024-09-17T00:00:00Z',
    end_date: '2025-06-10T00:00:00Z',
    status: 'active',
    format: 'round_robin',
    brand: {
      primary_color: '#00255C',
      secondary_color: '#FFFFFF',
      logo: { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1759200332516-b831e79acee1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100' }
    },
    participating_teams: [
      { team_id: 'team_real_madrid', seed: 1, group: 'A' },
      { team_id: 'team_barcelona', seed: 2, group: 'B' },
      { team_id: 'team_manchester_city', seed: 1, group: 'C' },
      { team_id: 'team_arsenal', seed: 2, group: 'D' }
    ],
    rounds: [
      { name: 'Group Stage', games: ['game_ucl_1', 'game_ucl_2'] },
      { name: 'Round of 16', games: [] },
      { name: 'Quarter Finals', games: [] },
      { name: 'Semi Finals', games: [] },
      { name: 'Final', games: [] }
    ],
    prizes: {
      winner: 'TBD',
      total_prize_pool: 2040000000
    },
    stats: {
      total_games: 125,
      completed_games: 48,
      participating_teams_count: 32
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:tournament:champions_league_2025' },
      opta: { opta_competition_id: 'uefa_cl_2024_25' }
    }
  },
  {
    id: 'tournament_nba_playoffs',
    name: 'NBA Playoffs',
    abbrev: 'PLAYOFFS',
    league_id: 'league_nba',
    season: '2025',
    stage: 'playoffs',
    start_date: '2025-04-12T00:00:00Z',
    end_date: '2025-06-20T00:00:00Z',
    status: 'upcoming',
    format: 'single_elimination',
    brand: {
      primary_color: '#17408B',
      secondary_color: '#C9082A',
      logo: { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1759200332516-b831e79acee1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100' }
    },
    participating_teams: [
      { team_id: 'team_lakers', seed: 7 },
      { team_id: 'team_warriors', seed: 6 },
      { team_id: 'team_celtics', seed: 1 },
      { team_id: 'team_heat', seed: 8 }
    ],
    rounds: [
      { name: 'Play-In Tournament', games: [] },
      { name: 'First Round', games: [] },
      { name: 'Conference Semifinals', games: [] },
      { name: 'Conference Finals', games: [] },
      { name: 'NBA Finals', games: [] }
    ],
    stats: {
      total_games: 87,
      completed_games: 0,
      participating_teams_count: 16
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:tournament:nba_playoffs_2025' },
      opta: { opta_competition_id: 'nba_playoffs_2025' }
    }
  },
  {
    id: 'tournament_world_cup',
    name: 'FIFA World Cup',
    abbrev: 'WC',
    season: '2026',
    stage: 'group',
    start_date: '2026-06-11T00:00:00Z',
    end_date: '2026-07-19T00:00:00Z',
    status: 'upcoming',
    format: 'round_robin',
    brand: {
      primary_color: '#326295',
      secondary_color: '#FFFFFF',
      logo: { role: 'logo_primary', url: 'https://images.unsplash.com/photo-1759200332516-b831e79acee1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100' }
    },
    participating_teams: [
      { team_id: 'team_usa', seed: 1, group: 'A' },
      { team_id: 'team_mexico', seed: 2, group: 'A' },
      { team_id: 'team_canada', seed: 3, group: 'A' },
      { team_id: 'team_brazil', seed: 1, group: 'B' }
    ],
    rounds: [
      { name: 'Group Stage', games: [] },
      { name: 'Round of 32', games: [] },
      { name: 'Round of 16', games: [] },
      { name: 'Quarter Finals', games: [] },
      { name: 'Semi Finals', games: [] },
      { name: 'Third Place', games: [] },
      { name: 'Final', games: [] }
    ],
    prizes: {
      winner: 'TBD',
      total_prize_pool: 440000000
    },
    stats: {
      total_games: 104,
      completed_games: 0,
      participating_teams_count: 48
    },
    providers: {
      sportradar: { sr_competition_id: 'sr:tournament:world_cup_2026' },
      opta: { opta_competition_id: 'fifa_wc_2026' }
    }
  }
];

// Mock Games
const mockGames: Game[] = [
  {
    id: 'game_lakers_warriors',
    league_id: 'league_nba',
    season_id: 'season_nba_2025',
    competition_stage: 'regular_season',
    status: 'final',
    scheduled: '2025-10-06T02:00:00Z',
    venue_id: 'venue_crypto_arena',
    officials: [
      { name: 'Tony Brothers', role: 'crew_chief' },
      { name: 'Scott Foster', role: 'referee' }
    ],
    teams: {
      home: { team_id: 'team_lakers', score: 110 },
      away: { team_id: 'team_warriors', score: 104 }
    },
    periods: [
      { label: 'Q1', home: 28, away: 25 },
      { label: 'Q2', home: 26, away: 27 },
      { label: 'Q3', home: 27, away: 23 },
      { label: 'Q4', home: 29, away: 29 }
    ],
    providers: {
      sportradar: { sr_id: 'sr:match:999999' },
      opta: { opta_id: 'opta_match_999' }
    },
    media: {
      broadcasters: ['ESPN'],
      highlights: [],
      photos: [
        { role: 'action', url: 'https://images.unsplash.com/photo-1506799699865-4c8d6491b32b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBtYXRjaCUyMGFjdGlvbnxlbnwxfHx8fDE3NTk4Njg0Mjl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    odds: {
      home_ml: -180,
      away_ml: 150
    }
  },
  {
    id: 'game_chiefs_upcoming',
    league_id: 'league_nfl',
    season_id: 'season_nfl_2025',
    competition_stage: 'regular_season',
    status: 'scheduled',
    scheduled: '2025-10-13T20:00:00Z',
    venue_id: 'venue_arrowhead',
    teams: {
      home: { team_id: 'team_chiefs', score: 0 },
      away: { team_id: 'team_bills', score: 0 }
    },
    providers: {
      sportradar: { sr_id: 'sr:match:888888' },
      opta: { opta_id: 'opta_match_888' }
    },
    media: {
      broadcasters: ['NBC'],
      highlights: [],
      photos: [
        { role: 'action', url: 'https://images.unsplash.com/photo-1506799699865-4c8d6491b32b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBtYXRjaCUyMGFjdGlvbnxlbnwxfHx8fDE3NTk4Njg0Mjl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' }
      ]
    },
    odds: {
      home_ml: -145,
      away_ml: 120
    }
  }
];

// Create entities with overrides
const createSportsEntityWithOverrides = (entity: any, provider: Provider = 'sportradar'): SportsEntityWithOverrides => ({
  entity,
  overrides: [],
  lastUpdated: new Date().toISOString(),
  primaryProvider: provider
});

export const mockSportsData: SportsData = {
  leagues: mockLeagues,
  teams: mockTeams.map(team => createSportsEntityWithOverrides(team)),
  players: mockPlayers.map(player => createSportsEntityWithOverrides(player)),
  games: mockGames.map(game => createSportsEntityWithOverrides(game)),
  venues: mockVenues.map(venue => createSportsEntityWithOverrides(venue)),
  tournaments: mockTournaments.map(tournament => createSportsEntityWithOverrides(tournament)),
  lastUpdated: new Date().toISOString()
};