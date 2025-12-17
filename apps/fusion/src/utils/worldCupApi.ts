const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const SERVER_URL = `${supabaseUrl}/functions/v1/map_data`;

export interface WorldCupStadium {
  name: string;
  fifa_name: string;
  city: string;
  country: string;
  capacity: number;
  address: string;
  coordinates: [number, number];
  images: {
    file?: string;
    gallery?: string;
  };
  sources: string[];
  match_numbers: number[];
  stage_summary: {
    Group?: number;
    'Round of 32'?: number;
    'Round of 16'?: number;
    Quarterfinal?: number;
    Semifinal?: number;
    'Third place'?: number;
    Final?: number;
  };
  matches: Array<{
    number: number;
    date: string;
    stage: string;
    local_time: string | null;
    utc_time: string | null;
    time_confirmed: boolean;
  }>;
  has_group: boolean;
  has_round_of_32: boolean;
  has_round_of_16: boolean;
  has_quarterfinal: boolean;
  has_semifinal: boolean;
  has_third_place: boolean;
  has_final: boolean;
  timezone: string;
}

export async function initializeWorldCupData(): Promise<WorldCupStadium[] | null> {
  try {
    const response = await fetch(`${SERVER_URL}/worldcup/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to initialize World Cup data:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('World Cup data initialized:', data.count, 'stadiums');
    return data.stadiums;
  } catch (error) {
    console.error('Error initializing World Cup data:', error);
    return null;
  }
}

export async function fetchWorldCupData(): Promise<WorldCupStadium[] | null> {
  try {
    const response = await fetch(`${SERVER_URL}/worldcup`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch World Cup data:', errorText);
      return null;
    }

    const data = await response.json();
    return data.stadiums;
  } catch (error) {
    console.error('Error fetching World Cup data:', error);
    return null;
  }
}
