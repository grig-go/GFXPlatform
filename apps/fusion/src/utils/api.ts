const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const BASE_URL = `${supabaseUrl}/functions/v1/map_data`;

export async function fetchAgeData(chamber: 'house' | 'senate') {
  const response = await fetch(`${BASE_URL}/demographics/age/${chamber}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch age data for ${chamber}:`, await response.text());
    throw new Error(`Failed to fetch age data for ${chamber}`);
  }
  
  return response.json();
}

export async function fetchDemographics(chamber: "house" | "senate") {
  const response = await fetch(
    `${BASE_URL}/demographics/age/${chamber}`,
    {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );
  
  if (!response.ok) {
    console.error(`Failed to fetch age data for ${chamber}:`, await response.text());
    throw new Error(`Failed to fetch age data for ${chamber}`);
  }
  
  return response.json();
}

export async function saveAgeData(chamber: 'house' | 'senate', data: any) {
  const response = await fetch(`${BASE_URL}/demographics/age/${chamber}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    console.error(`Failed to save age data for ${chamber}:`, await response.text());
    throw new Error(`Failed to save age data for ${chamber}`);
  }
  
  return response.json();
}

export async function fetchRaceData(chamber: 'house' | 'senate') {
  const response = await fetch(`${BASE_URL}/demographics/race/${chamber}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch race data for ${chamber}:`, await response.text());
    throw new Error(`Failed to fetch race data for ${chamber}`);
  }
  
  return response.json();
}

export async function saveRaceData(chamber: 'house' | 'senate', data: any) {
  const response = await fetch(`${BASE_URL}/demographics/race/${chamber}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    console.error(`Failed to save race data for ${chamber}:`, await response.text());
    throw new Error(`Failed to save race data for ${chamber}`);
  }
  
  return response.json();
}

export async function fetchEducationData(chamber: 'house' | 'senate') {
  const response = await fetch(`${BASE_URL}/demographics/education/${chamber}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch education data for ${chamber}:`, await response.text());
    throw new Error(`Failed to fetch education data for ${chamber}`);
  }
  
  return response.json();
}

export async function saveEducationData(chamber: 'house' | 'senate', data: any) {
  const response = await fetch(`${BASE_URL}/demographics/education/${chamber}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    console.error(`Failed to save education data for ${chamber}:`, await response.text());
    throw new Error(`Failed to save education data for ${chamber}`);
  }
  
  return response.json();
}

export async function fetchOfficeData() {
  const response = await fetch(`${BASE_URL}/demographics/office`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });
  
  if (!response.ok) {
    console.error('Failed to fetch office data:', await response.text());
    throw new Error('Failed to fetch office data');
  }
  
  return response.json();
}

export async function saveOfficeData(data: any) {
  const response = await fetch(`${BASE_URL}/demographics/office`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    console.error('Failed to save office data:', await response.text());
    throw new Error('Failed to save office data');
  }
  
  return response.json();
}

export async function initializeDemographicData(data: any) {
  const response = await fetch(`${BASE_URL}/demographics/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to initialize data:', errorText);
    console.error('Request URL:', `${BASE_URL}/demographics/initialize`);
    console.error('Response status:', response.status);
    throw new Error(`Failed to initialize data: ${response.status} ${errorText}`);
  }
  
  return response.json();
}
