const supabaseUrl = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';

export const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export const IMAGEN_MODELS = [
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001'
];

export const ASPECT_RATIOS = [
  '16:9',
  '4:3',
  '1:1'
];

export interface AISettings {
  gemini: {
    apiKey: string;
  };
  imagen: {
    apiKey: string;
  };
  virtualSet: {
    defaultAspectRatio: string;
    selectedGeminiModel: string;
    selectedImagenModel: string;
    boundSetVirtualSetFunction: string;
    boundSetBackdropFunction: string;
  };
}

const DEFAULT_SETTINGS: AISettings = {
  gemini: {
    apiKey: '',
  },
  imagen: {
    apiKey: '',
  },
  virtualSet: {
    defaultAspectRatio: '16:9',
    selectedGeminiModel: 'gemini-2.5-flash-lite',
    selectedImagenModel: 'imagen-3.0-generate-001',
    boundSetVirtualSetFunction: '',
    boundSetBackdropFunction: ''
  }
};

export const loadAIImageGenSettings = async (): Promise<AISettings> => {
  try {
    const stored = localStorage.getItem('ai_settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load AI settings', e);
  }
  return DEFAULT_SETTINGS;
};

export const saveAIImageGenSettings = async (settings: AISettings): Promise<void> => {
  try {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save AI settings', e);
  }
};

export const callGoogleAPIViaProxy = async (url: string, method: string, headers: any, body: any) => {
    // We will use the fetch proxy we are setting up in the server
    // But since we can't import supabase here easily to get the session token (circular dependency risk if we are not careful, 
    // though we can import from client.ts), we will leave the authentication to the caller or use a simple fetch.
    
    // Actually, VirtualSetPage.tsx implements the call to proxy manually in `generateBackgroundImage`.
    // `callGoogleAPIViaProxy` was used in `generateEnvironment`.
    
    // We'll implement a simple fetch here that mimics what VirtualSetPage does.
    
    // Import supabase dynamically to avoid potential issues? No, static is fine.
    const { supabase } = await import('./supabase/client');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('Not authenticated');
    }

    const proxyUrl = `${supabaseUrl}/functions/v1/make-server-58b4ce0e/fetch-proxy`;
    
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url,
            method,
            headers,
            body
        })
    });

    if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
    }

    const proxyResponse = await response.json();
    if (proxyResponse.status >= 400) {
         // If the proxied service returned an error
         throw new Error(`Service error: ${proxyResponse.status} ${JSON.stringify(proxyResponse.data)}`);
    }
    
    return proxyResponse.data;
};
