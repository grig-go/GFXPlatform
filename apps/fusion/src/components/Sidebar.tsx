import { ChevronLeft, ChevronRight, Menu, X, Settings, Sparkles, AlertCircle, Key, CheckCircle, RefreshCw, Save, Loader2, ChevronDown, LayoutGrid, Search, Image } from 'lucide-react';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { MapSettings } from './MapSettings';
import { WeatherErrorDialog } from './WeatherErrorDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { ViewType, RaceType } from '../App';
import { supabase } from '../supabaseClient';
import React, { useState, useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { captureMapScreenshot } from '../utils/mapScreenshotNew';
import { captureDualMapScreenshot } from '../utils/dualMapScreenshot';
import { getAllAISettings, saveAISetting, type AIFeature } from '../utils/aiSettingsApi';
import { saveGlobalPrompt, loadGlobalPrompt } from '../utils/globalPromptApi';
import { toast } from 'sonner@2.0.3';
import AISettingsPanel from './AISettingsPanel';
import {
  loadAIProviderSettings,
  loadAIProviderSettingsSync,
  saveAIProviderSettings,
  getModelsForProvider,
  type AIProvider,
  type AIProviderSettings
} from '../utils/aiProviderSettings';
import { testOpenAIAPIKey } from '../utils/openaiApi';
import { testGeminiAPIKey } from '../utils/geminiApi';
import { fetchAndSaveModels, getSavedModels } from '../utils/aiModelsApi';
import { analyzeScreenshotWithAI, validateAIVisionSettings } from '../utils/aiVisionAnalysis';
import { loadLayerDescriptions, saveLayerDescriptions } from '../utils/layerDescriptionsApi';
import { getAvailableYears, type ElectionType } from './elections/data/electionData';
import { fetchSyntheticRaces, transformSyntheticRacesToElectionData } from '../utils/syntheticRacesApi';

interface SidebarProps {
  selectedView: ViewType;
  setSelectedView: (view: ViewType) => void;
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: (position: 'left' | 'right') => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedRace: RaceType;
  setSelectedRace: (race: RaceType) => void;
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
  setSelectedChambers: (chambers: any) => void;
  selectedDataOptions: {
    raceDetails: boolean;
    raceStatusBreakdown: boolean;
    autoRefresh: boolean;
    refreshData: boolean;
    weather: boolean;
    weatherRadar: boolean;
    stateInfo: boolean;
    aiInfra: boolean;
    population: boolean;
    elections: boolean;
    media: boolean;
    worldCup2026: boolean;
  };
  setSelectedDataOptions: (options: any) => void;
  telestratorEnabled: boolean;
  setTelestratorEnabled: (enabled: boolean) => void;
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  shapeDetectionEnabled: boolean;
  setShapeDetectionEnabled: (enabled: boolean) => void;
  mapStyle: 'light' | 'dark' | 'satellite';
  setMapStyle: (style: 'light' | 'dark' | 'satellite') => void;
  showMapLabels: boolean;
  setShowMapLabels: (show: boolean) => void;
  globeMode: boolean;
  setGlobeMode: (enabled: boolean) => void;
  atmosphereEnabled: boolean;
  setAtmosphereEnabled: (enabled: boolean) => void;
  projection: 'mercator' | 'albers' | 'equirectangular';
  setProjection: (projection: 'mercator' | 'albers' | 'equirectangular') => void;
  electionMapOpacity?: number;
  setElectionMapOpacity?: (opacity: number) => void;
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  electionMapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  setShowAIAnalysisPanel: (show: boolean) => void;
  setScreenshotImage: (image: string | null) => void;
  setAIAnalysis: (analysis: string | null) => void;
  setIsAnalyzingImage: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setCurrentAIFeature: (feature: 'summary' | 'outliers' | 'correlation' | 'sentiment') => void;
  aiProviderSettings: AIProviderSettings;
  setAIProviderSettings: (settings: AIProviderSettings) => void;
  onRegisterOpenAISettings: (callback: () => void) => void;
  defaultPositionUpdater?: ((position: { latitude: number; longitude: number; zoom: number }) => void) | null;
  syntheticRaceData: any[];
  setSyntheticRaceData: (data: any[]) => void;
}

export function Sidebar({
  selectedView,
  setSelectedView,
  sidebarPosition,
  setSidebarPosition,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  selectedYear,
  setSelectedYear,
  selectedRace,
  setSelectedRace,
  selectedChambers,
  setSelectedChambers,
  selectedDataOptions,
  setSelectedDataOptions,
  telestratorEnabled,
  setTelestratorEnabled,
  selectedColor,
  setSelectedColor,
  penSize,
  setPenSize,
  shapeDetectionEnabled,
  setShapeDetectionEnabled,
  mapStyle,
  setMapStyle,
  showMapLabels,
  setShowMapLabels,
  globeMode,
  setGlobeMode,
  atmosphereEnabled,
  setAtmosphereEnabled,
  projection,
  setProjection,
  electionMapOpacity,
  setElectionMapOpacity,
  mapRef,
  electionMapRef,
  setShowAIAnalysisPanel,
  setScreenshotImage,
  setAIAnalysis,
  setIsAnalyzingImage,
  setAnalysisError,
  setCurrentAIFeature,
  aiProviderSettings,
  setAIProviderSettings,
  onRegisterOpenAISettings,
  defaultPositionUpdater,
  syntheticRaceData,
  setSyntheticRaceData,
}: SidebarProps) {
  const [weatherError, setWeatherError] = useState<{ error: string | null; details?: any }>({ error: null });
  const [showWeatherError, setShowWeatherError] = useState(false);
  const [isScreenshotExpanded, setIsScreenshotExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Master override to prevent dialog opening on load
  const isMountedRef = useRef(false); // Ref to track mount state for callback
  const isInitialMapLoad = useRef(true); // Track if this is the first time loading map position
  const [showAISettingsLocal, setShowAISettingsLocal] = useState(() => {
    console.log('🔧 Initializing showAISettingsLocal to false');
    return false;
  });
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [aiSettings, setAISettings] = useState({
    outliers: { prompt_template: '', model: '', is_enabled: true },
    summary: { prompt_template: '', model: '', is_enabled: true },
    correlation: { prompt_template: '', model: '', is_enabled: true },
    sentiment: { prompt_template: '', model: '', is_enabled: true },
    fullscreen: { prompt_template: '', model: '', is_enabled: true }
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // AI Provider settings
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Array<{ value: string; label: string }> | null>(null);
  const [isLoadingProviderSettings, setIsLoadingProviderSettings] = useState(true);
  const [isAIProviderExpanded, setIsAIProviderExpanded] = useState(false);
  
  // Layer descriptions state
  const [layerDescriptions, setLayerDescriptions] = useState({
    elections: '',
    population: '',
    wxRadar: '',
    stateInfo: '',
    aiInfra: '',
    worldCup: ''
  });

  // Apps menu state
  const [apps, setApps] = useState<Array<{ 
    id: string; 
    name: string; 
    app_url: string; 
    sort_order: number;
    app_key: string;
  }>>([]);
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);

  // Media dialog state
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<Array<{
    id: string;
    name: string;
    file_url: string;
    thumbnail_url: string;
    media_type: string;
    latitude: number;
    longitude: number;
    created_at: string;
    tags: string[];
    on_map: boolean;
  }>>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [mediaSortBy, setMediaSortBy] = useState<'name' | 'date'>('date');

  // Loading state for synthetic races
  const [isLoadingSyntheticRaces, setIsLoadingSyntheticRaces] = useState(false);

  // Get available years based on selected race type
  const mapRaceToElectionType = React.useMemo(() => {
    return (race: RaceType): ElectionType => {
      if (race === 'president') return 'presidential';
      if (race === 'senate') return 'senate';
      if (race === 'house') return 'house';
      return 'presidential'; // Default for governor/ag
    };
  }, []);

  const availableYears = React.useMemo(() => {
    return getAvailableYears(mapRaceToElectionType(selectedRace));
  }, [mapRaceToElectionType, selectedRace]);

  // Ensure selected year is valid for the current race type
  useEffect(() => {
    // Skip validation if synthetic is selected
    if (selectedYear === 'synthetic') {
      return;
    }
    
    const currentYearNum = parseInt(selectedYear);
    const yearExists = availableYears.some(year => year === currentYearNum);
    if (!yearExists) {
      // If current year is not available for this race type, select the first available year
      const firstAvailableYear = availableYears[0];
      if (firstAvailableYear) {
        setSelectedYear(firstAvailableYear.toString());
      }
    }
  }, [selectedRace, availableYears, selectedYear, setSelectedYear]);

  // Fetch synthetic races when selected
  useEffect(() => {
    if (selectedYear !== 'synthetic') {
      return;
    }

    const loadSyntheticRaces = async () => {
      setIsLoadingSyntheticRaces(true);
      try {
        console.log('[Sidebar] Fetching synthetic races...');
        const races = await fetchSyntheticRaces();
        console.log('[Sidebar] ✅ Raw races fetched:', races.length);
        console.log('[Sidebar] Sample raw race:', races[0]);
        
        // Don't transform - pass raw data to ElectionDashboard
        // ElectionDashboard will do the transformation
        setSyntheticRaceData(races);
        toast.success(`Loaded ${races.length} synthetic race results`);
      } catch (error: any) {
        console.error('[Sidebar] ❌ Failed to load synthetic races:', error);
        toast.error(`Failed to load synthetic races: ${error.message}`);
        setSyntheticRaceData([]);
      } finally {
        setIsLoadingSyntheticRaces(false);
      }
    };

    loadSyntheticRaces();
  }, [selectedYear]);

  // Fetch apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data, error } = await supabase.rpc("list_active_applications");
        
        if (!error && data) {
          console.log("✅ Applications fetched from backend:", data);
          setApps(data);
        } else if (error) {
          console.error("❌ Failed to fetch applications:", error);
        }
      } catch (err) {
        console.error("❌ Error fetching applications:", err);
      }
    };
    
    fetchApps();
  }, []);

  // MASTER OVERRIDE: Prevent any dialog opening until component is fully mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      isMountedRef.current = true;
      console.log('✅ Component mounted - AI Settings dialog now allowed to open');
    }, 500); // 500ms delay to ensure clean initial render
    
    return () => clearTimeout(timer);
  }, []);

  // Register the callback to open AI settings from parent components
  useEffect(() => {
    onRegisterOpenAISettings(() => {
      console.log('🔧 AI Settings callback triggered, isMounted:', isMountedRef.current);
      if (isMountedRef.current) {
        console.log('✅ Opening AI Settings dialog');
        setShowAISettingsLocal(true);
      } else {
        console.log('⏳ Blocked: Component not yet mounted');
      }
    });
  }, [onRegisterOpenAISettings]);

  // Debug: Log when AI Settings dialog state changes
  useEffect(() => {
    console.log('🔍 AI Settings Dialog state changed:', showAISettingsLocal, '| Mounted:', isMounted);
  }, [showAISettingsLocal, isMounted]);

  // Load AI settings and provider information from the database on component mount
  useEffect(() => {
    const loadAISettingsAndProvider = async () => {
      setIsLoadingSettings(true);
      setIsLoadingProviderSettings(true);
      
      try {
        // Load AI settings
        const settings = await getAllAISettings();
        
        // Map the settings to our state structure
        const newSettings: any = {
          outliers: { prompt_template: '', model: '', is_enabled: true },
          summary: { prompt_template: '', model: '', is_enabled: true },
          correlation: { prompt_template: '', model: '', is_enabled: true },
          sentiment: { prompt_template: '', model: '', is_enabled: true },
          fullscreen: { prompt_template: '', model: '', is_enabled: true }
        };
        
        settings.forEach((setting) => {
          if (setting.feature in newSettings) {
            newSettings[setting.feature] = {
              prompt_template: setting.prompt_template || '',
              model: setting.model || '',
              is_enabled: setting.is_enabled
            };
          }
        });
        
        setAISettings(newSettings);
        console.log('✅ Loaded AI settings from database:', newSettings);
        
        // Load global prompt from KV store
        const prompt = await loadGlobalPrompt();
        setGlobalPrompt(prompt);
        console.log('✅ Loaded global prompt from KV store');
        
        // Load AI provider settings from backend
        const providerSettings = await loadAIProviderSettings();
        setAIProviderSettings(providerSettings);
        console.log('✅ Loaded AI provider settings from backend:', {
          provider: providerSettings.provider,
          model: providerSettings.model,
          hasOpenAIKey: !!providerSettings.openaiApiKey,
          hasGeminiKey: !!providerSettings.geminiApiKey,
          openaiKeyLength: providerSettings.openaiApiKey?.length,
          geminiKeyLength: providerSettings.geminiApiKey?.length
        });
        
        // Load layer descriptions
        const descriptions = await loadLayerDescriptions();
        setLayerDescriptions(descriptions);
        console.log('✅ Loaded layer descriptions from backend');
      } catch (error) {
        console.error('Error loading AI settings:', error);
        toast.error('Failed to load AI settings');
      } finally {
        setIsLoadingSettings(false);
        setIsLoadingProviderSettings(false);
      }
    };
    
    loadAISettingsAndProvider();
  }, []);
  
  // Load saved models from backend when AI settings dialog opens
  useEffect(() => {
    const loadSavedModels = async () => {
      if (showAISettingsLocal && !fetchedModels) {
        try {
          const savedModels = await getSavedModels(aiProviderSettings.provider);
          if (savedModels?.models) {
            setFetchedModels(savedModels.models);
            console.log(`✅ Loaded ${savedModels.models.length} saved models for ${aiProviderSettings.provider}`);
          }
        } catch (error) {
          console.error('Error loading saved models:', error);
        }
      }
    };
    
    loadSavedModels();
  }, [showAISettingsLocal, aiProviderSettings.provider, fetchedModels]);

  // Handler to fetch models from provider
  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    
    try {
      const apiKey = aiProviderSettings.provider === 'openai' 
        ? aiProviderSettings.openaiApiKey 
        : aiProviderSettings.geminiApiKey;
      
      console.log('[Sidebar] Fetching models for provider:', aiProviderSettings.provider);
      console.log('[Sidebar] API key present:', !!apiKey, 'Length:', apiKey?.length);
      
      if (!apiKey) {
        toast.error('Please enter an API key first');
        setIsFetchingModels(false);
        return;
      }
      
      const models = await fetchAndSaveModels(aiProviderSettings.provider, apiKey);
      setFetchedModels(models);
      toast.success(`Successfully fetched ${models.length} models from ${aiProviderSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'}`);
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.toLowerCase().includes('api key')) {
        toast.error(`Invalid API key. Please check your ${aiProviderSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key and try again.`);
      } else {
        toast.error(`Failed to fetch models: ${errorMessage}`);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Handler to test AI provider connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const apiKey = aiProviderSettings.provider === 'openai' 
        ? aiProviderSettings.openaiApiKey 
        : aiProviderSettings.geminiApiKey;
      
      if (!apiKey) {
        toast.error('Please enter an API key');
        setConnectionStatus('error');
        return;
      }
      
      if (!aiProviderSettings.model) {
        toast.error('Please select a model');
        setConnectionStatus('error');
        return;
      }
      
      console.log(`[Sidebar] Testing connection with model: ${aiProviderSettings.model}`);
      
      if (aiProviderSettings.provider === 'openai') {
        await testOpenAIAPIKey(apiKey, aiProviderSettings.model);
      } else {
        await testGeminiAPIKey(apiKey, aiProviderSettings.model);
      }
      
      setConnectionStatus('success');
      toast.success(`${aiProviderSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} connection successful with model ${aiProviderSettings.model}`);
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Handler to update AI provider settings
  const handleProviderChange = async (provider: AIProvider) => {
    const models = getModelsForProvider(provider);
    const newSettings = {
      ...aiProviderSettings,
      provider,
      model: models[0].value
    };
    setAIProviderSettings(newSettings);
    await saveAIProviderSettings(newSettings);
    setConnectionStatus('idle');
    setFetchedModels(null); // Clear fetched models when switching providers
  };
  
  // Handler to update AI model
  const handleModelChange = async (model: string) => {
    const newSettings = {
      ...aiProviderSettings,
      model
    };
    setAIProviderSettings(newSettings);
    await saveAIProviderSettings(newSettings);
  };
  
  // Handler to update API keys
  const handleAPIKeyChange = async (provider: AIProvider, apiKey: string) => {
    const newSettings = {
      ...aiProviderSettings,
      [provider === 'openai' ? 'openaiApiKey' : 'geminiApiKey']: apiKey
    };
    setAIProviderSettings(newSettings);
    
    try {
      await saveAIProviderSettings(newSettings);
      console.log('✅ API key saved to backend');
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key');
    }
    
    setConnectionStatus('idle');
  };

  // Handler to save AI settings
  const handleSaveAISettings = async () => {
    setIsSavingSettings(true);
    try {
      // Save global prompt to KV store
      const globalPromptSave = saveGlobalPrompt(globalPrompt);
      
      // Save all other settings to database
      const savePromises = Object.entries(aiSettings).map(([feature, settings]) => {
        return saveAISetting({
          feature: feature as AIFeature,
          prompt_template: settings.prompt_template,
          model: settings.model || null,
          is_enabled: settings.is_enabled,
          params: {},
          version: 1
        });
      });
      
      await Promise.all([globalPromptSave, ...savePromises]);
      
      console.log('✅ All AI settings saved successfully');
      toast.success('AI settings saved successfully');
      setShowAISettingsLocal(false);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handler to save provider settings (provider, model, API keys)
  const handleSaveProviderSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveAIProviderSettings(aiProviderSettings);
      console.log('✅ AI provider settings saved successfully');
      toast.success('AI provider settings saved successfully');
    } catch (error) {
      console.error('Error saving AI provider settings:', error);
      toast.error('Failed to save AI provider settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handler to toggle weather option (MapView will handle the actual fetching)
  const handleWeatherToggle = (checked: boolean) => {
    // Simply update the state - MapView's useEffect will handle fetching
    setSelectedDataOptions({ ...selectedDataOptions, weather: checked });
  };

  // Handler to fetch media assets with latitude/longitude
  const fetchMediaAssets = async () => {
    setIsLoadingMedia(true);
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const supabaseUrl = `https://${projectId}.supabase.co`;

      const response = await fetch(`${supabaseUrl}/functions/v1/media-library?limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch media assets');
      }

      const result = await response.json();
      
      // Filter for media with latitude and longitude (exclude nulls)
      const filteredMedia = (result.data || []).filter((asset: any) => 
        asset.latitude !== null && asset.longitude !== null
      );
      
      setMediaAssets(filteredMedia);
      
      // Initialize selectedMediaIds from on_map field
      const idsOnMap = new Set(
        filteredMedia
          .filter((asset: any) => asset.on_map === true)
          .map((asset: any) => asset.id)
      );
      setSelectedMediaIds(idsOnMap);
      
      console.log(`✅ Fetched ${filteredMedia.length} media assets with coordinates (${idsOnMap.size} on map)`);
    } catch (error) {
      console.error('Error fetching media assets:', error);
      toast.error('Failed to load media assets');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Handler to open media dialog
  const handleOpenMediaDialog = async () => {
    setIsMediaDialogOpen(true);
    await fetchMediaAssets();
  };

  // Handler to toggle media selection
  const handleToggleMediaSelection = async (mediaId: string) => {
    const isCurrentlySelected = selectedMediaIds.has(mediaId);
    const newOnMapValue = !isCurrentlySelected;
    
    // Optimistically update UI
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
    
    // Update backend
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const supabaseUrl = `https://${projectId}.supabase.co`;
      
      const formData = new FormData();
      formData.append('id', mediaId);
      formData.append('on_map', String(newOnMapValue));
      
      const response = await fetch(`${supabaseUrl}/functions/v1/media-library`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to update media on_map status');
      }
      
      // Update local state
      setMediaAssets((prev) =>
        prev.map((asset) =>
          asset.id === mediaId ? { ...asset, on_map: newOnMapValue } : asset
        )
      );
      
      console.log(`✅ Updated media ${mediaId} on_map to ${newOnMapValue}`);
    } catch (error) {
      console.error('Error updating media on_map status:', error);
      toast.error('Failed to update media status');
      
      // Revert optimistic update
      setSelectedMediaIds((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlySelected) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        return newSet;
      });
    }
  };

  // Handler to save selected media
  const handleSaveSelectedMedia = () => {
    const selectedMedia = mediaAssets.filter(asset => selectedMediaIds.has(asset.id));
    console.log('💾 Closing media dialog with selections:', selectedMedia);
    
    // Auto-enable Media checkbox if media is selected
    if (selectedMedia.length > 0 && !selectedDataOptions.media) {
      setSelectedDataOptions({ ...selectedDataOptions, media: true });
    }
    
    // Dispatch custom event to notify MediaMarkers component to refresh
    window.dispatchEvent(new CustomEvent('mediaMarkersUpdated'));
    
    toast.success(`${selectedMedia.length} media item(s) on map`);
    setIsMediaDialogOpen(false);
  };

  // Filter and sort media assets
  const getFilteredAndSortedMedia = () => {
    let filtered = [...mediaAssets];
    
    // Apply search filter
    if (mediaSearchQuery.trim()) {
      const query = mediaSearchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Apply type filter
    if (mediaFilterType !== 'all') {
      filtered = filtered.filter(asset => asset.media_type === mediaFilterType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (mediaSortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return filtered;
  };

  // Handler to capture map screenshot and analyze with AI
  const handleCaptureScreenshot = async (aiFeature: 'outliers' | 'summary' | 'correlation' | 'sentiment' | 'fullscreen' = 'outliers') => {
    console.log(`🎥 Screenshot capture initiated for ${aiFeature}...`);

    // Set the current AI feature for the panel title
    if (aiFeature !== 'fullscreen') {
      setCurrentAIFeature(aiFeature);
    }

    // Reset previous analysis
    setAIAnalysis(null);
    setAnalysisError(null);

    if (!mapRef || !mapRef.current) {
      console.warn('❌ Map reference not available');
      return;
    }

    let capturedImage: string | null = null;

    try {
      // Check if we have both maps available (MapView + MapContainer)
      const hasElectionMap = electionMapRef && electionMapRef.current;
      const mapViewMap = mapRef.current;

      if (hasElectionMap) {
        console.log('🎬 Starting dual-map capture (MapView + MapContainer)...');
        const imageBase64 = await captureDualMapScreenshot(
          mapViewMap,
          electionMapRef.current,
          {
            backdropSelector: '.modal-backdrop, .overlay-dim',
            excludeSelector: '.sidebar, .header, .mapboxgl-popup',
            maxWidth: 1024
          }
        );

        console.log('imageBase64444444444444444444')
        console.log(imageBase64)

        console.log('✅ Dual-map screenshot captured successfully');
        console.log('📦 Image size:', (imageBase64.length / 1024).toFixed(2), 'KB');

        capturedImage = imageBase64;
        setScreenshotImage(imageBase64);
        setShowAIAnalysisPanel(true);
        toast.success('Screenshot captured successfully!');
      } else {
        // Single map capture - capture everything except sidebar
        console.log('🎬 Starting screenshot capture (all content except sidebar)...');

        const imageBase64 = await captureMapScreenshot(mapViewMap, {
          backdropSelector: '.modal-backdrop, .overlay-dim',
          excludeSelector: '.sidebar, .header, #user-menu, .mapboxgl-popup',
          maxWidth: 1024
        });

        console.log('imageBase644444444444444444442')
        console.log(imageBase64)

        console.log('✅ Screenshot captured successfully');
        console.log('📦 Image size:', (imageBase64.length / 1024).toFixed(2), 'KB');

        capturedImage = imageBase64;
        setScreenshotImage(imageBase64);
        setShowAIAnalysisPanel(true);
        toast.success('Screenshot captured successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);

      // Fallback to simple WebGL canvas capture if composite capture fails
      try {
        console.log('🔄 Attempting fallback capture (WebGL canvas only)...');
        const map = mapRef.current;
        if (map) {
          const canvas = map.getCanvas();
          await new Promise(requestAnimationFrame);

          // Scale down if needed to keep under 1024px wide
          const maxWidth = 1024;
          const scale = Math.min(1, maxWidth / canvas.width);

          if (scale < 1) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.floor(canvas.width * scale);
            tempCanvas.height = Math.floor(canvas.height * scale);
            const ctx = tempCanvas.getContext('2d')!;
            ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            capturedImage = tempCanvas.toDataURL('image/png');
            setScreenshotImage(capturedImage);
          } else {
            capturedImage = canvas.toDataURL('image/png');
            setScreenshotImage(capturedImage);
          }

          console.log('✅ Fallback capture successful');
          setShowAIAnalysisPanel(true);
          toast.success('Screenshot captured successfully!');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback screenshot also failed:', fallbackError);
        toast.error('Failed to capture screenshot');
        return;
      }
    }

    // After screenshot is captured, analyze it with AI
    if (capturedImage) {
      console.log('🤖 Starting AI analysis...');
      
      // Validate AI settings first
      const validation = validateAIVisionSettings(aiProviderSettings);
      if (!validation.isValid) {
        console.warn('⚠️ AI settings not configured:', validation.error);
        setAnalysisError(validation.error || 'AI settings not configured. Please configure AI settings in the sidebar to enable analysis.');
        toast.error('Screenshot captured, but AI analysis requires configuration');
        // Don't return - keep the panel open with the screenshot visible
        setIsAnalyzingImage(false);
        return;
      }
      
      setIsAnalyzingImage(true);
      
      try {
        // Get the appropriate prompt for the selected AI feature
        const featurePrompt = aiSettings[aiFeature].prompt_template;
        console.log(`🔍 Using ${aiFeature} prompt:`, featurePrompt || '(default)');
        console.log('🌐 Using global prompt:', globalPrompt || '(none)');
        
        const analysis = await analyzeScreenshotWithAI(
          capturedImage, 
          aiProviderSettings, 
          globalPrompt,
          featurePrompt || undefined // Pass feature-specific prompt as custom prompt
        );
        console.log('✅ AI analysis completed');
        setAIAnalysis(analysis);
        toast.success('AI analysis completed');
      } catch (error: any) {
        console.error('❌ AI analysis failed:', error);
        const errorMessage = error?.message || 'Failed to analyze image with AI';
        setAnalysisError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsAnalyzingImage(false);
      }
    }
  };

  if (isSidebarCollapsed) {
    return (
      <div className="w-0 relative h-screen">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(false)}
          className={`h-8 w-8 p-0 absolute top-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 z-50 ${
            sidebarPosition === 'left' ? 'left-2' : 'right-2'
          }`}
        >
          {sidebarPosition === 'left' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-32 h-screen flex flex-col text-[10px] relative overflow-hidden">
      {/* Glassmorphism background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-md" />
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/20 via-gray-100/10 to-gray-50/20" />
      <div className={`absolute inset-y-0 w-[1px] bg-gradient-to-b from-transparent via-gray-300/50 to-transparent ${
        sidebarPosition === 'left' ? 'right-0' : 'left-0'
      }`} />
      
      {/* Content with relative positioning */}
      <div className="p-2 flex items-center justify-between border-b border-white/20 relative z-10">
        <Popover open={isAppsMenuOpen} onOpenChange={setIsAppsMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-5 h-5 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded flex items-center justify-center shadow-lg">
                <span className="text-white text-xs">F</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">Fusion</span>
            </button>
          </PopoverTrigger>
          {apps.length > 0 && (
            <PopoverContent 
              className="w-56 p-2 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl"
              align="start"
              side="right"
              sideOffset={8}
            >
              <div className="flex items-center gap-2 px-2 py-1.5 mb-2 border-b border-gray-200/50">
                <LayoutGrid className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-sm text-gray-900">Emergent Apps</span>
              </div>
              <div className="space-y-0.5">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      console.log('🚀 Opening app:', app.name, 'at:', app.app_url);
                      window.open(app.app_url, '_blank');
                      setIsAppsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm text-gray-700 hover:text-gray-900"
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(true)}
          className="h-6 w-6 p-0"
        >
          {sidebarPosition === 'left' ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-3 relative z-10">
        {/* Overview Section */}
        <div>
          <h3 className="text-gray-700 font-semibold mb-1.5 mt-2">VISUALIZATION</h3>
          <RadioGroup value={selectedView} onValueChange={(value) => setSelectedView(value as ViewType)} className="grid gap-0.5">
            <div className="flex items-center gap-1">
              <RadioGroupItem value="map" id="map" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="map" className="cursor-pointer text-gray-700 leading-none">Map</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="balanceOfPower" id="balance-of-power" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="balance-of-power" className="cursor-pointer text-gray-700 leading-none">Balance</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="ageBreakdown" id="age-breakdown" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="age-breakdown" className="cursor-pointer text-gray-700 leading-none">Age</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="raceDiversity" id="race-diversity" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="race-diversity" className="cursor-pointer text-gray-700 leading-none">Race</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="education" id="education" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="education" className="cursor-pointer text-gray-700 leading-none">Education</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="yearsInOffice" id="years-in-office" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="years-in-office" className="cursor-pointer text-gray-700 leading-none">Office</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="bg-white/30" />

        {/* Data Section */}
        <div>
          <h3 className="text-gray-700 font-semibold mb-1.5">DATA</h3>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-7 border-gray-400">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent className="z-[1100]">
              <SelectItem value="synthetic">Synthetic</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-white/30" />

        {/* Races Section */}
        <div>
          <h3 className="text-gray-700 font-semibold mb-1.5">RACES</h3>
          <RadioGroup value={selectedRace} onValueChange={(value) => setSelectedRace(value as RaceType)} className="grid gap-0.5">
            <div className="flex items-center gap-1">
              <RadioGroupItem value="president" id="president" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="president" className="cursor-pointer text-gray-700 leading-none">President</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="senate" id="senate-race" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="senate-race" className="cursor-pointer text-gray-700 leading-none">Senate</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="house" id="house-race" className="h-3 w-3 border-gray-600 text-gray-700" />
              <Label htmlFor="house-race" className="cursor-pointer text-gray-700 leading-none">House</Label>
            </div>
	            {/*<div className="flex items-center gap-1">
              <RadioGroupItem value="governor" id="governor" className="h-3 w-3 border-gray-400 text-gray-500" />
              <Label htmlFor="governor" className="cursor-pointer text-gray-500 leading-none">Governor</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="ag" id="ag" className="h-3 w-3 border-gray-400 text-gray-500" />
              <Label htmlFor="ag" className="cursor-pointer text-gray-500 leading-none">AG</Label>
            </div>*/}
          </RadioGroup>
        </div>

        <Separator className="bg-white/30" />

        {/* Chambers Section */}
        <div>
          <h3 className="text-gray-700 font-semibold mb-1.5">OPTIONS</h3>
          {selectedView === 'map' ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Checkbox
                  id="elections"
                  checked={selectedDataOptions.elections}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, elections: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="elections" className="cursor-pointer text-gray-700 leading-none">Elections</Label>
              </div>
              
              <div className="flex items-center gap-1">
                <Checkbox
                  id="population"
                  checked={selectedDataOptions.population}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, population: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="population" className="cursor-pointer text-gray-700 leading-none">Population</Label>
              </div>

              <div className="flex items-center gap-1">
                <Checkbox
                  id="weather"
                  checked={selectedDataOptions.weather}
                  onCheckedChange={(checked) => handleWeatherToggle(checked as boolean)}
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="weather" className="cursor-pointer text-gray-700 leading-none">Weather</Label>
              </div>

              <div className="flex items-center gap-1">
                <Checkbox
                  id="weatherRadar"
                  checked={selectedDataOptions.weatherRadar}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, weatherRadar: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="weatherRadar" className="cursor-pointer text-gray-700 leading-none">WX Radar</Label>
              </div>
              <div className="flex items-center gap-1">
                <Checkbox
                  id="state-info"
                  checked={selectedDataOptions.stateInfo}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, stateInfo: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="state-info" className="cursor-pointer text-gray-700 leading-none">State Info</Label>
              </div>
              <div className="flex items-center gap-1">
                <Checkbox
                  id="ai-infra"
                  checked={selectedDataOptions.aiInfra}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, aiInfra: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="ai-infra" className="cursor-pointer text-gray-700 leading-none">AI Infra</Label>
              </div>
              <div className="flex items-center gap-1">
                <Checkbox
                  id="world-cup-2026"
                  checked={selectedDataOptions.worldCup2026}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, worldCup2026: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="world-cup-2026" className="cursor-pointer text-gray-700 leading-none">World Cup</Label>
              </div>
              <div className="flex items-center gap-1">
                <Checkbox
                  id="media"
                  checked={selectedDataOptions.media}
                  onCheckedChange={(checked) =>
                    setSelectedDataOptions({ ...selectedDataOptions, media: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="media" className="cursor-pointer text-gray-700 leading-none">Media</Label>
              </div>
              <div className="flex items-center gap-1 opacity-50">
                <Checkbox
                  id="energy"
                  disabled
                  className="h-3 w-3 border-gray-400"
                />
                <Label htmlFor="energy" className="cursor-not-allowed text-gray-400 leading-none">Energy</Label>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Checkbox
                  id="house"
                  checked={selectedChambers.house}
                  onCheckedChange={(checked) =>
                    setSelectedChambers({ ...selectedChambers, house: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="house" className="cursor-pointer text-gray-700 leading-none">House</Label>
              </div>
              <div className="flex items-center gap-1">
                <Checkbox
                  id="senate"
                  checked={selectedChambers.senate}
                  onCheckedChange={(checked) =>
                    setSelectedChambers({ ...selectedChambers, senate: checked as boolean })
                  }
                  className="h-3 w-3 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                />
                <Label htmlFor="senate" className="cursor-pointer text-gray-700 leading-none">Senate</Label>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-white/30" />

        {/* Outliers & Anomalies Section */}
        <div>
          <h3 className="text-gray-700 font-semibold mb-1.5 text-left flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            OUTLIERS & ANOMALIES
          </h3>
          <div className="flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-7 border-gray-400 hover:bg-white/50 hover:text-gray-900 text-[11px] bg-white/30"
              onClick={() => handleCaptureScreenshot('summary')}
            >
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-7 border-gray-400 hover:bg-white/50 hover:text-gray-900 text-[11px] bg-white/30"
              onClick={() => handleCaptureScreenshot('outliers')}
            >
              Anomalies
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-7 border-gray-400 hover:bg-white/50 hover:text-gray-900 text-[11px] bg-white/30"
              onClick={() => handleCaptureScreenshot('correlation')}
            >
              Correlation Finder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-7 border-gray-400 hover:bg-white/50 hover:text-gray-900 text-[11px] bg-white/30"
              onClick={() => handleCaptureScreenshot('sentiment')}
            >
              Social Sentiment
            </Button>
          </div>
        </div>

        {/* Telestrator Section */}
        <div>
          <Separator className="mb-3 bg-white/30" />
          <h3 className="text-gray-700 font-semibold mb-1.5 text-left">TELESTRATOR</h3>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-gray-600 text-[10px]">OFF</span>
            <Switch
              checked={telestratorEnabled}
              onCheckedChange={setTelestratorEnabled}
              className="h-3.5 w-7 data-[state=checked]:bg-gray-600 border border-gray-500"
            />
            <span className="text-gray-600 text-[10px]">ON</span>
          </div>
          {telestratorEnabled && (
            <>
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setSelectedColor('#eab308')}
                  className={`w-4 h-4 rounded-sm bg-yellow-500 border ${
                    selectedColor === '#eab308' ? 'border-gray-800 border-2' : 'border-gray-300'
                  }`}
                  title="Yellow"
                />
                <button
                  onClick={() => setSelectedColor('#ef4444')}
                  className={`w-4 h-4 rounded-sm bg-red-500 border ${
                    selectedColor === '#ef4444' ? 'border-gray-800 border-2' : 'border-gray-300'
                  }`}
                  title="Red"
                />
                <button
                  onClick={() => setSelectedColor('#3b82f6')}
                  className={`w-4 h-4 rounded-sm bg-blue-500 border ${
                    selectedColor === '#3b82f6' ? 'border-gray-800 border-2' : 'border-gray-300'
                  }`}
                  title="Blue"
                />
                <button
                  onClick={() => setSelectedColor('#000000')}
                  className={`w-4 h-4 rounded-sm bg-black border ${
                    selectedColor === '#000000' ? 'border-gray-800 border-2' : 'border-gray-300'
                  }`}
                  title="Black"
                />
                <button
                  onClick={() => setSelectedColor(null)}
                  className="w-4 h-4 rounded-sm bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  title="Clear"
                >
                  <X className="h-2.5 w-2.5 text-gray-600" />
                </button>
              </div>
              <div className="flex gap-1 items-center justify-between">
                <button
                  onClick={() => setPenSize(2)}
                  className={`flex-1 flex items-center justify-center py-1.5 ${
                    penSize === 2 ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                  }`}
                  title="Small"
                >
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                </button>
                <button
                  onClick={() => setPenSize(4)}
                  className={`flex-1 flex items-center justify-center py-1.5 ${
                    penSize === 4 ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                  }`}
                  title="Medium"
                >
                  <div className="w-3 h-3 rounded-full bg-gray-800" />
                </button>
                <button
                  onClick={() => setPenSize(6)}
                  className={`flex-1 flex items-center justify-center py-1.5 ${
                    penSize === 6 ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                  }`}
                  title="Large"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-800" />
                </button>
                <button
                  onClick={() => setPenSize(8)}
                  className={`flex-1 flex items-center justify-center py-1.5 ${
                    penSize === 8 ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                  }`}
                  title="Extra Large"
                >
                  <div className="w-5 h-5 rounded-full bg-gray-800" />
                </button>
              </div>
              
              {/* Shape Detection Toggle */}
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700 text-xs">Shape Detection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 text-[10px]">OFF</span>
                  <Switch
                    checked={shapeDetectionEnabled}
                    onCheckedChange={setShapeDetectionEnabled}
                    className="h-3.5 w-7 data-[state=checked]:bg-gray-600 border border-gray-500"
                  />
                  <span className="text-gray-600 text-[10px]">ON</span>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Footer - Bottom aligned */}
      <div className="mt-auto p-2 border-t border-white/20 space-y-2 relative z-10">
        {/* Settings Row */}
        <div className="flex gap-2">
          {/* Map Settings */}
          {selectedView === 'map' && (
            <>
              <div className="flex-1">
                <div className="text-gray-700 mb-1 text-xs">
                  Map
                </div>
                <MapSettings
                  mapStyle={mapStyle}
                  showMapLabels={showMapLabels}
                  globeMode={globeMode}
                  atmosphereEnabled={atmosphereEnabled}
                  projection={projection}
                  electionMapOpacity={electionMapOpacity}
                  onMapStyleChange={setMapStyle}
                  onMapLabelsChange={setShowMapLabels}
                  onGlobeModeChange={setGlobeMode}
                  onAtmosphereChange={setAtmosphereEnabled}
                  onProjectionChange={setProjection}
                  onElectionMapOpacityChange={setElectionMapOpacity}
                  sidebarPosition={sidebarPosition}
                  currentLatitude={mapRef?.current ? mapRef.current.getCenter().lat : undefined}
                  currentLongitude={mapRef?.current ? mapRef.current.getCenter().lng : undefined}
                  currentZoom={mapRef?.current ? mapRef.current.getZoom() : undefined}
                  onFetchCurrentPosition={() => {
                    if (mapRef?.current) {
                      const center = mapRef.current.getCenter();
                      const zoom = mapRef.current.getZoom();
                      return {
                        latitude: center.lat,
                        longitude: center.lng,
                        zoom
                      };
                    }
                    return null;
                  }}
                  onSettingsLoaded={(settings) => {
                    console.log('Settings loaded with position:', settings);
                    if (settings.latitude && settings.longitude && settings.zoom) {
                      // Update MapView's default position
                      if (defaultPositionUpdater) {
                        defaultPositionUpdater({
                          latitude: settings.latitude,
                          longitude: settings.longitude,
                          zoom: settings.zoom
                        });
                      }
                      
                      // Fly map to the loaded position
                      if (mapRef?.current) {
                        mapRef.current.flyTo({
                          center: [settings.longitude, settings.latitude],
                          zoom: settings.zoom,
                          duration: isInitialMapLoad.current ? 0 : 1000
                        });
                      }
                      
                      // Only show toast if not initial load
                      if (!isInitialMapLoad.current) {
                        toast.success('Loaded saved map position');
                      }
                      isInitialMapLoad.current = false;
                    }
                  }}
                  onSavePosition={() => {
                    if (mapRef?.current) {
                      const center = mapRef.current.getCenter();
                      const zoom = mapRef.current.getZoom();
                      const pitch = mapRef.current.getPitch();
                      const bearing = mapRef.current.getBearing();
                      
                      const position = {
                        center: [center.lng, center.lat],
                        zoom,
                        pitch,
                        bearing
                      };
                      
                      localStorage.setItem('fusion-saved-map-position', JSON.stringify(position));
                      toast.success('Map position saved');
                    }
                  }}
                  onResetPosition={(position) => {
                    if (mapRef?.current) {
                      mapRef.current.flyTo({
                        center: [position.longitude, position.latitude],
                        zoom: position.zoom,
                        pitch: 0,
                        bearing: 0,
                        duration: 1000
                      });
                      toast.info('Reset to default position');
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="text-gray-700 mb-1 text-xs">
                  Media
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="bg-white hover:bg-gray-100 shadow-lg h-7 w-7"
                  onClick={handleOpenMediaDialog}
                >
                  <Image className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="text-gray-700 mb-1 text-xs">
                  AI
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="bg-white hover:bg-gray-100 shadow-lg h-7 w-7"
                  onClick={() => setShowAISettingsLocal(true)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
          
          {/* Database Viewer - Commented out */}
          {/* <div className="flex-1">
            <div className="text-gray-700 mb-1 text-xs">
              DB
            </div>
            <Button 
              variant="outline" 
              size="icon"
              className="bg-white hover:bg-gray-100 shadow-lg h-7 w-7"
              onClick={() => setSelectedView(selectedView === 'backendData' ? 'map' : 'backendData')}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </Button>
          </div> */}
        </div>
        
        {/* Position */}
        <div>
          <div className="text-gray-700 mb-1 text-xs">
            Position:
          </div>
          <div className="flex gap-1">
            <Button
              variant={sidebarPosition === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSidebarPosition('left')}
              className="flex-1 h-6 px-1"
            >
              L
            </Button>
            <Button
              variant={sidebarPosition === 'right' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSidebarPosition('right')}
              className="flex-1 h-6 px-1"
            >
              R
            </Button>
          </div>
        </div>
      </div>

      {/* Weather Error Dialog */}
      <WeatherErrorDialog
        open={showWeatherError}
        onOpenChange={setShowWeatherError}
        error={weatherError.error}
        details={weatherError.details}
      />

      {/* AI Settings Dialog - Master Override: Only allow opening after mount */}
      <Dialog open={isMounted && showAISettingsLocal} onOpenChange={(open) => {
        if (isMounted) {
          setShowAISettingsLocal(open);
        }
      }} modal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Settings
            </DialogTitle>
            <DialogDescription>
              Configure AI functionality for specific features in the app
            </DialogDescription>
          </DialogHeader>
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading settings...</div>
            </div>
          ) : (
            <>
            <ScrollArea className="h-[60vh] -mx-6 px-6">
              <div className="space-y-4 pr-4 pb-4">
              {/* AI Connection Settings */}
              <Collapsible open={isAIProviderExpanded} onOpenChange={setIsAIProviderExpanded}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-semibold cursor-pointer">AI Provider Connection</Label>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isAIProviderExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-b-lg border border-t-0">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="ai-provider" className="text-xs">Provider</Label>
                      <Select
                        value={aiProviderSettings.provider}
                        onValueChange={(value) => handleProviderChange(value as AIProvider)}
                      >
                        <SelectTrigger id="ai-provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Model Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ai-model" className="text-xs">Model</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFetchModels}
                          disabled={isFetchingModels}
                          className="h-6 text-xs px-2"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isFetchingModels ? 'animate-spin' : ''}`} />
                          {isFetchingModels ? 'Fetching...' : 'Fetch Models'}
                        </Button>
                      </div>
                      <Select
                        value={aiProviderSettings.model}
                        onValueChange={handleModelChange}
                      >
                        <SelectTrigger id="ai-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(fetchedModels || getModelsForProvider(aiProviderSettings.provider)).map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fetchedModels && (
                        <p className="text-xs text-gray-500">
                          Showing {fetchedModels.length} fetched models
                        </p>
                      )}
                    </div>
                    
                    {/* API Key Input */}
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-xs">
                        {aiProviderSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} API Key
                      </Label>
                      <Input
                        id="api-key"
                        type="password"
                        disabled={isLoadingProviderSettings}
                        value={
                          aiProviderSettings.provider === 'openai' 
                            ? aiProviderSettings.openaiApiKey || '' 
                            : aiProviderSettings.geminiApiKey || ''
                        }
                        onChange={(e) => handleAPIKeyChange(aiProviderSettings.provider, e.target.value)}
                        placeholder={isLoadingProviderSettings ? 'Loading...' : `Enter ${aiProviderSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key...`}
                      />
                    </div>
                    
                    {/* Test Connection Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="w-full"
                    >
                      {isTestingConnection ? (
                        <>Testing Connection...</>
                      ) : connectionStatus === 'success' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Connection Successful
                        </>
                      ) : connectionStatus === 'error' ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                          Connection Failed
                        </>
                      ) : (
                        <>Test Connection</>
                      )}
                    </Button>
                    
                    {/* Save Settings Button */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveProviderSettings}
                      disabled={isSavingSettings || isLoadingProviderSettings}
                      className="w-full"
                    >
                      {isSavingSettings ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {/* AI Provider Information */}
              <AISettingsPanel />
              
              <div className="space-y-2">
                <Label htmlFor="global-prompt">Global Prompt</Label>
                <Input
                  id="global-prompt"
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  placeholder="Enter global prompt to prepend to all AI requests..."
                />
                <p className="text-xs text-gray-500">
                  This prompt will be prepended to all AI analysis requests
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="outliers">Outliers</Label>
                <Input
                  id="outliers"
                  value={aiSettings.outliers.prompt_template}
                  onChange={(e) => setAISettings({ 
                    ...aiSettings, 
                    outliers: { ...aiSettings.outliers, prompt_template: e.target.value }
                  })}
                  placeholder="Enter outliers prompt template..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Input
                  id="summary"
                  value={aiSettings.summary.prompt_template}
                  onChange={(e) => setAISettings({ 
                    ...aiSettings, 
                    summary: { ...aiSettings.summary, prompt_template: e.target.value }
                  })}
                  placeholder="Enter summary prompt template..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="correlation">Correlation Finder</Label>
                <Input
                  id="correlation"
                  value={aiSettings.correlation.prompt_template}
                  onChange={(e) => setAISettings({ 
                    ...aiSettings, 
                    correlation: { ...aiSettings.correlation, prompt_template: e.target.value }
                  })}
                  placeholder="Enter correlation finder prompt template..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sentiment">Social Sentiment</Label>
                <Input
                  id="sentiment"
                  value={aiSettings.sentiment.prompt_template}
                  onChange={(e) => setAISettings({ 
                    ...aiSettings, 
                    sentiment: { ...aiSettings.sentiment, prompt_template: e.target.value }
                  })}
                  placeholder="Enter social sentiment prompt template..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullscreen">Full Screen Insights</Label>
                <Input
                  id="fullscreen"
                  value={aiSettings.fullscreen.prompt_template}
                  onChange={(e) => setAISettings({ 
                    ...aiSettings, 
                    fullscreen: { ...aiSettings.fullscreen, prompt_template: e.target.value }
                  })}
                  placeholder="Enter full screen insights prompt template..."
                />
              </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 -mx-6 px-6">
              <Button
                variant="outline"
                onClick={() => setShowAISettingsLocal(false)}
                disabled={isSavingSettings}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAISettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Library Dialog */}
      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
            <DialogDescription>
              Browse and select media assets with location coordinates
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingMedia ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="space-y-3 px-4 pt-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search media by name or tags..."
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Filter and Sort Row */}
                <div className="flex gap-2">
                  <Select value={mediaFilterType} onValueChange={(value: any) => setMediaFilterType(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={mediaSortBy} onValueChange={(value: any) => setMediaSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (Newest)</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex-1 text-right text-sm text-gray-500 flex items-center justify-end">
                    {selectedMediaIds.size} selected
                  </div>
                </div>
              </div>

              {/* Media Grid */}
              <ScrollArea className="h-[50vh]">
                <div className="grid grid-cols-3 gap-4 p-4">
                  {getFilteredAndSortedMedia().length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-gray-500">
                      No media assets found
                    </div>
                  ) : (
                    getFilteredAndSortedMedia().map((asset) => (
                      <div
                        key={asset.id}
                        className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedMediaIds.has(asset.id)
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => handleToggleMediaSelection(asset.id)}
                      >
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedMediaIds.has(asset.id)}
                            onCheckedChange={() => handleToggleMediaSelection(asset.id)}
                            className="bg-white/90 border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <img
                          src={asset.thumbnail_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-white text-xs font-medium truncate">
                              {asset.name}
                            </p>
                            <p className="text-white/80 text-xs">
                              {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                            </p>
                            {asset.tags && asset.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {asset.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="flex justify-between items-center px-4 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMediaIds(new Set());
                    setIsMediaDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSelectedMedia}
                  disabled={selectedMediaIds.size === 0}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Selected ({selectedMediaIds.size})
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
