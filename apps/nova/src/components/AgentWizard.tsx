import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Agent,
  AgentFormat,
  AgentStatus,
  AgentDataType,
  AgentDataSource,
  AgentDataRelationship,
  AgentFieldMapping,
  AgentTransform
} from "../types/agents";
import { ChevronLeft, ChevronRight, Check, Plus, X, Vote, TrendingUp, Trophy, Cloud, Newspaper, Link2, Database, AlertCircle, Trash2, ChevronsUpDown } from "lucide-react";
import { Switch } from "./ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import * as agentWizardApi from "../utils/agentWizardApi";

const supabaseUrl = import.meta.env.VITE_NOVA_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_NOVA_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// Nova API base URL points to Supabase edge functions
const novaApiBaseUrl = `${supabaseUrl}/functions/v1`;
import OutputFormatStep from "./OutputFormatStep";
import TransformationStep from "./TransformationStep";
import SecurityStep, { SecurityStepRef } from "./SecurityStep";
import TestStep from "./TestStep";
import { useFetchProxy } from "../hooks/useFetchProxy";
import { isDevelopment, SKIP_AUTH_IN_DEV, DEV_USER_ID, currentElectionYear } from '../utils/constants';

interface AgentWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: Agent, closeDialog?: boolean) => Promise<void>;
  editAgent?: Agent;
  availableFeeds?: Array<{ id: string; name: string; category: string }>;
}

type WizardStep = 'basic' | 'dataType' | 'dataSources' | 'configureNewSources' | 'relationships' | 'outputFormat' | 'transformations' | 'security' | 'test' | 'review';

const dataTypeCategories: AgentDataType[] = ['Nova Election', 'Nova Finance', 'Nova Weather', 'Nova Sports', 'Elections', 'Finance', 'Sports', 'Weather', 'News'];

const dataTypeIcons: Record<AgentDataType, any> = {
  'Elections': Vote,
  'Finance': TrendingUp,
  'Sports': Trophy,
  'Weather': Cloud,
  'News': Newspaper,
  'Nova Weather': Cloud,
  'Nova Election': Vote,
  'Nova Finance': TrendingUp,
  'Nova Sports': Trophy
};

export function AgentWizard({ open, onClose, onSave, editAgent, availableFeeds = [] }: AgentWizardProps) {
  const { fetchViaProxy } = useFetchProxy();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [visitedSteps, setVisitedSteps] = useState<Set<WizardStep>>(() => {
    // In edit mode, all steps are considered visited
    if (editAgent) {
      return new Set<WizardStep>([
        'basic', 'dataType', 'dataSources', 'configureNewSources',
        'relationships', 'outputFormat', 'transformations', 'security', 'review'
      ]);
    }
    // In create mode, only the first step is visited
    return new Set(['basic']);
  });
  const [formData, setFormData] = useState<Partial<Agent>>(editAgent || {
    name: '',
    description: '',
    icon: '🤖',
    slug: '',
    environment: 'production' as 'production' | 'staging' | 'development',
    autoStart: true,
    generateDocs: true,
    dataType: [],
    dataSources: [],
    relationships: [],
    format: 'JSON',
    formatOptions: {},
    itemPath: '',
    fieldMappings: [],
    fixedFields: {},
    transforms: [],
    auth: 'none',
    requiresAuth: false,
    status: 'ACTIVE',
    cache: '15M'
  });

  // Ref to SecurityStep to sync auth data before saving
  const securityStepRef = useRef<SecurityStepRef>(null);

  // Ref to DialogContent for scroll position preservation
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  const isRestoringScroll = useRef<boolean>(false);

  // Save scroll position before state updates that might cause re-render
  const saveScrollPosition = () => {
    if (dialogContentRef.current && !isRestoringScroll.current) {
      savedScrollPosition.current = dialogContentRef.current.scrollTop;
    }
  };

  // Restore scroll position after re-render - uses multiple frames to ensure DOM is updated
  const restoreScrollPosition = () => {
    if (dialogContentRef.current && savedScrollPosition.current > 0) {
      isRestoringScroll.current = true;

      // Immediate restore
      dialogContentRef.current.scrollTop = savedScrollPosition.current;

      // Also restore on next frame in case React re-renders
      requestAnimationFrame(() => {
        if (dialogContentRef.current) {
          dialogContentRef.current.scrollTop = savedScrollPosition.current;
        }
        // And one more frame for good measure
        requestAnimationFrame(() => {
          if (dialogContentRef.current) {
            dialogContentRef.current.scrollTop = savedScrollPosition.current;
          }
          isRestoringScroll.current = false;
        });
      });
    }
  };

  // Use useLayoutEffect for synchronous scroll restoration before paint
  useLayoutEffect(() => {
    restoreScrollPosition();
  }, [formData]);

  // Also restore on any formData.formatOptions change
  useLayoutEffect(() => {
    restoreScrollPosition();
  }, [formData.formatOptions]);

  // State for adding new items in various steps
  const [newRelationship, setNewRelationship] = useState<Partial<AgentDataRelationship>>({});
  const [newMapping, setNewMapping] = useState<Partial<AgentFieldMapping>>({});
  const [newFixedField, setNewFixedField] = useState({ key: '', value: '' });

  // State for fetching data sources from Supabase
  const [availableDataSources, setAvailableDataSources] = useState<Array<{ id: string; name: string; type: string; category: string }>>([]);
  const [loadingDataSources, setLoadingDataSources] = useState(false);

  // State for new data sources to be created
  const [newDataSources, setNewDataSources] = useState<any[]>([]);
  const [isSavingDataSources, setIsSavingDataSources] = useState(false);

  // State for slug validation
  const [slugExists, setSlugExists] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugCheckIdRef = useRef<number>(0);

  // State for final save operation
  const [isSaving, setIsSaving] = useState(false);

  // Reset saving states on mount/hot-reload to prevent stuck UI
  useEffect(() => {
    setIsSaving(false);
    setIsSavingDataSources(false);
  }, []);

  // State for test connection results
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [testLoading, setTestLoading] = useState<Record<number, boolean>>({});
  const [testParams, setTestParams] = useState<Record<number, Record<string, string>>>({});

  // State for sample data from data sources
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  // State for Nova Weather dynamic options
  const [novaWeatherProviders, setNovaWeatherProviders] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [novaWeatherChannels, setNovaWeatherChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [novaWeatherStates, setNovaWeatherStates] = useState<string[]>([]);

  // State for Nova Finance dynamic options
  const [novaFinanceSymbols, setNovaFinanceSymbols] = useState<Array<{ symbol: string; name: string; custom_name?: string; type: string }>>([]);

  // State for Nova Sports dynamic options
  const [novaSportsLeagues, setNovaSportsLeagues] = useState<Array<{ id: string; name: string; abbrev?: string }>>([]);
  const [novaSportsProviders, setNovaSportsProviders] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [novaSportsSeasons, setNovaSportsSeasons] = useState<Array<{ id: string; name: string; year: string; league_id: string }>>([]);

  // State names mapping for Nova Election
  const stateNames: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  const electionStateCodes = Object.keys(stateNames);

  // Load Nova Weather options when needed
  useEffect(() => {
    const hasNovaWeather = newDataSources.some(ds => ds.category === 'Nova Weather');
    if (!hasNovaWeather) return;

    const loadNovaWeatherOptions = async () => {
      try {
        // Load providers
        const providersResponse = await fetch(
          `${supabaseUrl}/functions/v1/weather_dashboard/providers`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setNovaWeatherProviders(providersData.providers || []);
        }

        // Load weather data first to get states and channel IDs
        const weatherResponse = await fetch(
          `${supabaseUrl}/functions/v1/weather_dashboard/weather-data`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        let channelIdsInUse: string[] = [];

        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json();
          if (weatherData.ok && weatherData.data) {
            // Get unique states from locations
            const uniqueStates = Array.from(
              new Set(
                weatherData.data
                  .map((loc: any) => loc.location.admin1)
                  .filter(Boolean)
              )
            ).sort();
            setNovaWeatherStates(uniqueStates as string[]);

            // Get unique channel IDs from locations
            channelIdsInUse = Array.from(
              new Set(
                weatherData.data
                  .map((loc: any) => loc.location.channel_id)
                  .filter(Boolean)
              )
            );
          }
        }

        // Load channels and filter to only those with locations assigned
        const channelsResponse = await fetch(
          `${supabaseUrl}/functions/v1/weather_dashboard/channels`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          const allChannels = channelsData.channels || [];

          // Filter to only channels that have locations assigned
          const assignedChannels = allChannels.filter((ch: { id: string; name: string }) =>
            channelIdsInUse.includes(ch.id)
          );

          // Sort by name
          assignedChannels.sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name)
          );

          setNovaWeatherChannels(assignedChannels);
        }
      } catch (error) {
        console.error('Error loading Nova Weather options:', error);
      }
    };

    loadNovaWeatherOptions();
  }, [newDataSources]);

  // Load Nova Finance options when needed
  useEffect(() => {
    const hasNovaFinance = newDataSources.some(ds => ds.category === 'Nova Finance');
    if (!hasNovaFinance) return;

    const loadNovaFinanceOptions = async () => {
      try {
        // Load stocks/crypto from finance dashboard
        const stocksResponse = await fetch(
          `${supabaseUrl}/functions/v1/finance_dashboard/stocks`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          if (stocksData.ok && stocksData.stocks) {
            // Map to format with display name
            const symbols = stocksData.stocks.map((stock: any) => ({
              symbol: stock.symbol,
              name: stock.name,
              custom_name: stock.custom_name,
              type: stock.type
            }));
            // Sort by symbol
            symbols.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));
            setNovaFinanceSymbols(symbols);
          }
        }
      } catch (error) {
        console.error('Error loading Nova Finance options:', error);
      }
    };

    loadNovaFinanceOptions();
  }, [newDataSources]);

  // Load Nova Sports options when needed - uses edge function API
  useEffect(() => {
    const hasNovaSports = newDataSources.some(ds => ds.category === 'Nova Sports');
    if (!hasNovaSports) return;

    const loadNovaSportsOptions = async () => {
      try {
        // Load leagues via edge function
        const leaguesResult = await agentWizardApi.listLeagues();
        if (!leaguesResult.error && leaguesResult.data) {
          setNovaSportsLeagues(leaguesResult.data.map((l: any) => ({
            id: l.id,
            name: l.name,
            abbrev: l.alternative_name || l.name
          })));
        }

        // Load providers from data_providers_public view (category = sports)
        // This still uses fetch since it's a public view with no auth issues
        const providersResponse = await fetch(
          `${supabaseUrl}/rest/v1/data_providers_public?select=id,name,type,category,is_active&category=eq.sports`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              apikey: publicAnonKey,
            },
          }
        );
        if (providersResponse.ok) {
          const providersList = await providersResponse.json();
          setNovaSportsProviders(providersList.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.type
          })));
        }

        // Load current seasons via edge function
        const seasonsResult = await agentWizardApi.listCurrentSeasons();
        if (!seasonsResult.error && seasonsResult.data) {
          setNovaSportsSeasons(seasonsResult.data);
        }
      } catch (error) {
        console.error('Error loading Nova Sports options:', error);
      }
    };

    loadNovaSportsOptions();
  }, [newDataSources]);

  // Check if slug already exists - uses edge function API
  const checkSlugExists = async (slug: string, checkId: number) => {
    if (!slug || slug.trim() === '') {
      setSlugExists(false);
      return;
    }

    // Skip check if editing and slug hasn't changed
    if (editAgent && editAgent.slug === slug) {
      setSlugExists(false);
      return;
    }

    setCheckingSlug(true);
    console.log('[Slug Check] Starting check for:', slug, 'checkId:', checkId);

    try {
      // Use edge function API instead of direct Supabase client
      const result = await agentWizardApi.checkSlugExists(
        slug,
        editAgent?.id // Exclude current agent when editing
      );

      // Check if this check is still the current one (slug hasn't changed)
      if (slugCheckIdRef.current !== checkId) {
        console.log('[Slug Check] Stale check, ignoring result. Current:', slugCheckIdRef.current, 'This:', checkId);
        return;
      }

      if (result.error) {
        console.error('[Slug Check] API error:', result.error);
        throw new Error(result.error);
      }

      console.log('[Slug Check] Result:', result.exists);
      setSlugExists(result.exists);
    } catch (error: any) {
      console.error('[Slug Check] Error:', error?.message || error);
      // On error, allow the user to proceed (assume slug is available)
      setSlugExists(false);
    } finally {
      // Only update state if this check is still current
      if (slugCheckIdRef.current === checkId) {
        console.log('[Slug Check] Complete, setting checkingSlug to false');
        setCheckingSlug(false);
      }
    }
  };

  // Debounced slug check with proper cleanup
  useEffect(() => {
    // If slug is empty, reset states immediately
    if (!formData.slug || formData.slug.trim() === '') {
      setSlugExists(false);
      setCheckingSlug(false);
      // Increment check ID to invalidate any in-flight requests
      slugCheckIdRef.current++;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (formData.slug) {
        // Increment check ID to invalidate any previous in-flight requests
        slugCheckIdRef.current++;
        const currentCheckId = slugCheckIdRef.current;
        checkSlugExists(formData.slug, currentCheckId);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(timeoutId);
    };
  }, [formData.slug, editAgent]);

  // Helper function to extract JSON fields
  const extractJsonFields = (data: any, prefix: string = ''): string[] => {
    const fields: string[] = [];

    if (data === null || data === undefined) return fields;

    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        return extractJsonFields(data[0], prefix);
      }
      return fields;
    }

    if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.push(fullPath);

        // Don't recurse too deep - just one level for now
        if (!prefix && data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
          const nestedFields = extractJsonFields(data[key], fullPath);
          fields.push(...nestedFields);
        }
      });
    }

    return [...new Set(fields)];
  };

  // Test API connection
  const testAPIConnection = async (index: number) => {
    const source = newDataSources[index];
    console.log('Testing API connection for source:', source);

    if (!source.api_config?.url) {
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: 'No URL configured'
        }
      }));
      return;
    }

    // Check for required parameters
    const paramMappings = source.api_config.parameter_mappings || [];
    const requiredMappings = paramMappings.filter((m: any) => m.required);
    const currentTestParams = testParams[index] || {};

    // Validate required parameters
    for (const mapping of requiredMappings) {
      if (!currentTestParams[mapping.queryParam]) {
        setTestResults(prev => ({
          ...prev,
          [index]: {
            success: false,
            error: `⚠️ Required test parameter '${mapping.queryParam}' is missing. Please provide a value above.`
          }
        }));
        return;
      }
    }

    setTestLoading(prev => ({ ...prev, [index]: true }));

    try {
      // Substitute parameters in URL
      let testUrl = source.api_config.url;
      for (const mapping of paramMappings) {
        const paramValue = currentTestParams[mapping.queryParam];
        if (paramValue) {
          testUrl = testUrl.replace(`{${mapping.urlPlaceholder}}`, paramValue);
        }
      }

      console.log('Testing URL:', testUrl);

      // Build headers including authentication
      const headers: Record<string, string> = { ...(source.api_config.headers || {}) };

      // Add authentication headers if configured
      if (source.api_config.auth_type === 'bearer' && source.api_config.bearer_token) {
        headers['Authorization'] = `Bearer ${source.api_config.bearer_token}`;
      } else if (source.api_config.auth_type === 'api_key_header' && source.api_config.api_key_header && source.api_config.api_key_value) {
        headers[source.api_config.api_key_header] = source.api_config.api_key_value;
      }

      // Try to fetch directly, fallback to using a proxy if CORS fails
      let response;
      let result;

      try {
        response = await fetch(testUrl, {
          method: source.api_config.method || 'GET',
          headers,
          mode: 'cors'
        });
        result = { data: await response.json(), status: response.status };
      } catch (corsError) {
        console.log('CORS failed, trying without CORS mode');
        // If CORS fails, try without mode specification
        try {
          response = await fetch(testUrl, {
            method: source.api_config.method || 'GET',
            headers
          });
          result = { data: await response.json(), status: response.status };
        } catch (fetchError) {
          throw new Error('Failed to connect. Please check the URL and ensure CORS is enabled on the API.');
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error ${response?.status || 'unknown'}`);
      }

      // Extract fields from the response
      let extractedFields: string[] = [];
      let dataToAnalyze = result.data;

      // If there's a data_path, navigate to it
      if (source.api_config.data_path) {
        const pathParts = source.api_config.data_path.split('.');
        let current = result.data;

        for (const part of pathParts) {
          if (current && typeof current === 'object') {
            current = current[part];
          }
        }

        if (current) {
          dataToAnalyze = current;
        }
      }

      extractedFields = extractJsonFields(dataToAnalyze);

      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          message: 'Connection successful!',
          status: result.status,
          fields: extractedFields,
          testedUrl: testUrl
        }
      }));

      // Store fields for later use
      const updated = [...newDataSources];
      updated[index] = {
        ...updated[index],
        fields: extractedFields,
        sample_data: Array.isArray(dataToAnalyze) ? dataToAnalyze.slice(0, 5) : [dataToAnalyze]
      };
      setNewDataSources(updated);

    } catch (error) {
      console.error('Test connection error:', error);
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Test RSS feed
  const testRSSFeed = async (index: number) => {
    const source = newDataSources[index];
    if (!source.rss_config?.url) {
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: 'No RSS URL configured'
        }
      }));
      return;
    }

    setTestLoading(prev => ({ ...prev, [index]: true }));

    try {
      // Try to fetch RSS feed
      let response;
      let result;

      try {
        response = await fetch(source.rss_config.url, {
          method: 'GET',
          mode: 'cors'
        });
        const text = await response.text();
        result = { data: text, status: response.status };
      } catch (corsError) {
        console.log('CORS failed, trying without CORS mode');
        try {
          response = await fetch(source.rss_config.url, {
            method: 'GET'
          });
          const text = await response.text();
          result = { data: text, status: response.status };
        } catch (fetchError) {
          throw new Error('Failed to load RSS feed. Please check the URL and ensure CORS is enabled.');
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error ${response?.status || 'unknown'}`);
      }

      // Standard RSS fields
      const extractedFields = ['title', 'description', 'link', 'pubDate', 'guid', 'author', 'category'];

      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: true,
          message: 'RSS feed validated!',
          status: result.status,
          fields: extractedFields
        }
      }));

      // Store fields for later use
      const updated = [...newDataSources];
      updated[index] = {
        ...updated[index],
        fields: extractedFields
      };
      setNewDataSources(updated);

    } catch (error) {
      console.error('RSS test error:', error);
      setTestResults(prev => ({
        ...prev,
        [index]: {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load RSS feed'
        }
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Fetch data sources from Supabase when dialog opens or dataType changes
  useEffect(() => {
    const categories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    if (open && categories.length > 0) {
      const fetchDataSources = async () => {
        setLoadingDataSources(true);
        console.log('Fetching data sources for categories:', categories);
        try {
          // Use edge function API instead of direct Supabase client
          const result = await agentWizardApi.listDataSources(categories);

          console.log('Data sources query result:', { data: result.data, error: result.error, count: result.data?.length });

          if (result.error) throw new Error(result.error);
          setAvailableDataSources(result.data || []);
        } catch (error) {
          console.error('Error fetching data sources:', error);
          setAvailableDataSources([]);
        } finally {
          setLoadingDataSources(false);
        }
      };

      fetchDataSources();
    } else if (open) {
      // Clear data sources if no categories selected
      setAvailableDataSources([]);
    }
  }, [open, formData.dataType]);

  // Combine existing selected sources and newly saved sources
  const allDataSources = React.useMemo(() => {
    const selectedExisting = (formData.dataSources || []).filter((ds: AgentDataSource) =>
      !newDataSources.some((newDs: any) => newDs.id === ds.id)
    );
    const validNew = newDataSources.filter((ds: any) => ds.id && ds.name && ds.type).map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      category: ds.category,
      feedId: ds.id  // Use database UUID as feedId for junction table
    }));

    return [...selectedExisting, ...validNew];
  }, [formData.dataSources, newDataSources]);

  // Update formData.dataSources whenever allDataSources changes
  useEffect(() => {
    if (allDataSources.length > 0 && JSON.stringify(formData.dataSources) !== JSON.stringify(allDataSources)) {
      setFormData((prev: Partial<Agent>) => ({ ...prev, dataSources: allDataSources }));
    }
  }, [allDataSources]);

  // Update formData when editAgent changes
  useEffect(() => {
    if (editAgent && open) {
      setFormData(editAgent);
      // When editing, start at the review step (Step 8) like nova-old
      setCurrentStep('review');
      // In edit mode, mark all steps as visited
      setVisitedSteps(new Set<WizardStep>([
        'basic', 'dataType', 'dataSources', 'configureNewSources',
        'relationships', 'outputFormat', 'transformations', 'security', 'review'
      ]));

      // Load existing Nova Weather or Nova Election data sources into newDataSources for editing
      const novaSources = (editAgent.dataSources || []).filter(
        (ds: AgentDataSource) => ds.category === 'Nova Weather' || ds.category === 'Nova Election' || ds.category === 'Nova Finance' || ds.category === 'Nova Sports'
      );

      if (novaSources.length > 0) {
        // Convert AgentDataSource to the format expected by newDataSources
        const convertedSources = novaSources.map((ds: AgentDataSource) => {
          // Parse Nova Weather or Nova Election filters from URL if not already present
          let api_config = ds.api_config;
          try {
            if (ds.category === 'Nova Weather' && api_config?.url && !api_config.novaWeatherFilters) {
              const url = new URL(api_config.url);
              const params = new URLSearchParams(url.search);
              api_config = {
                ...api_config,
                novaWeatherFilters: {
                  type: params.get('type') || 'current',
                  channel: params.get('channel') || 'all',
                  dataProvider: params.get('dataProvider') || 'all',
                  state: params.get('state') || 'all'
                }
              };
            } else if (ds.category === 'Nova Election' && api_config?.url && !api_config.novaElectionFilters) {
              const url = new URL(api_config.url);
              const params = new URLSearchParams(url.search);
              api_config = {
                ...api_config,
                novaElectionFilters: {
                  year: params.get('year') || currentElectionYear.toString(),
                  raceType: params.get('raceType') || 'presidential',
                  level: params.get('level') || 'state',
                  state: params.get('state') || 'all'
                }
              };
            } else if (ds.category === 'Nova Finance' && api_config?.url && !api_config.novaFinanceFilters) {
              const url = new URL(api_config.url);
              const params = new URLSearchParams(url.search);
              api_config = {
                ...api_config,
                novaFinanceFilters: {
                  type: params.get('type') || 'all',
                  change: params.get('change') || 'all',
                  symbol: params.get('symbol') || 'all'
                }
              };
            } else if (ds.category === 'Nova Sports' && api_config?.url && !api_config.novaSportsFilters) {
              const url = new URL(api_config.url);
              const params = new URLSearchParams(url.search);
              api_config = {
                ...api_config,
                novaSportsFilters: {
                  view: params.get('view') || 'teams',
                  league: params.get('league') || 'all',
                  provider: params.get('provider') || 'all',
                  position: params.get('position') || 'all',
                  status: params.get('status') || 'all',
                  season: params.get('season') || 'all'
                }
              };
            }
          } catch (e) {
            console.warn('Failed to parse URL for data source:', ds.name, e);
          }

          return {
            id: ds.id,
            feedId: ds.feedId,
            name: ds.name,
            type: ds.type,
            category: ds.category,
            api_config,
            rss_config: ds.rss_config,
            database_config: ds.database_config,
            file_config: ds.file_config,
            isExisting: true // Flag to indicate this is an existing source
          };
        });
        console.log('Loaded Nova sources for editing:', convertedSources);
        setNewDataSources(convertedSources);
      }
    } else if (!editAgent && open) {
      // Reset to default when creating a new agent
      setFormData({
        name: '',
        description: '',
        icon: '🤖',
        slug: '',
        environment: 'production' as 'production' | 'staging' | 'development',
        autoStart: true,
        generateDocs: true,
        dataType: [],
        dataSources: [],
        relationships: [],
        format: 'JSON',
        itemPath: '',
        fieldMappings: [],
        fixedFields: {},
        transforms: [],
        auth: 'none',
        requiresAuth: false,
        status: 'ACTIVE',
        cache: '15M'
      });
      setCurrentStep('basic');
      // In create mode, reset visited steps to only 'basic'
      setVisitedSteps(new Set<WizardStep>(['basic']));
      // Clear newDataSources in create mode
      setNewDataSources([]);
    }
  }, [editAgent, open]);

  // Check if Nova Weather, Nova Election, Nova Finance, or Nova Sports is selected
  const selectedDataTypes = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);
  const hasNovaWeatherSelected = selectedDataTypes.includes('Nova Weather');
  const hasNovaElectionSelected = selectedDataTypes.includes('Nova Election');
  const hasNovaFinanceSelected = selectedDataTypes.includes('Nova Finance');
  const hasNovaSportsSelected = selectedDataTypes.includes('Nova Sports');
  const hasNovaSourceSelected = hasNovaWeatherSelected || hasNovaElectionSelected || hasNovaFinanceSelected || hasNovaSportsSelected;

  // Dynamic steps - exclude dataSources when Nova Weather/Election is selected, include configureNewSources for Nova sources
  const steps: WizardStep[] = [
    'basic',
    'dataType',
    // Skip dataSources step if Nova Weather/Election is selected
    ...(hasNovaSourceSelected ? [] : ['dataSources' as WizardStep]),
    // Show configureNewSources if there are new sources OR if editing Nova Weather/Election agent
    ...((newDataSources.filter(ds => ds.name && ds.type).length > 0 || (hasNovaSourceSelected && editAgent)) ? ['configureNewSources' as WizardStep] : []),
    'relationships',
    'outputFormat',
    'transformations',
    'security',
    'test',
    'review'
  ];
  const currentStepIndex = steps.indexOf(currentStep);

  // Save all new data sources using edge function API
  const saveAllNewDataSources = async (): Promise<boolean> => {
    console.log('[SaveDataSources] Starting saveAllNewDataSources...');
    const startTime = Date.now();

    // Process both new (without ID) and existing (with isExisting flag) sources
    const sourcesToSave = newDataSources.filter((ds: any) => ds.name && ds.type);
    console.log('[SaveDataSources] Sources to save:', sourcesToSave.length);

    if (sourcesToSave.length === 0) {
      console.log('[SaveDataSources] Nothing to save, returning true');
      return true; // Nothing to save
    }

    setIsSavingDataSources(true);

    try {
      // Save all data sources (insert new, update existing) via edge function API
      for (let i = 0; i < newDataSources.length; i++) {
        const source = newDataSources[i];

        // Skip if incomplete
        if (!source.name || !source.type) {
          continue;
        }

        // Skip if already saved and not marked as existing (for update)
        // We want to process: new sources (!id) OR existing sources that need updating (isExisting)
        if (source.id && !source.isExisting) {
          // This source has been saved before but isn't marked for update, skip it
          continue;
        }

        // Validate based on type
        if (source.type === 'api' && !source.api_config?.url) {
          alert(`Data source "${source.name}" is missing required API URL`);
          setIsSavingDataSources(false);
          return false;
        }

        if (source.type === 'rss' && !source.rss_config?.url) {
          alert(`Data source "${source.name}" is missing required RSS feed URL`);
          setIsSavingDataSources(false);
          return false;
        }

        if (source.type === 'file' && !source.file_config?.url) {
          alert(`Data source "${source.name}" is missing required file URL`);
          setIsSavingDataSources(false);
          return false;
        }

        // Use edge function API to save data source
        console.log('[SaveDataSources] Saving data source via API:', source.name);
        const queryStart = Date.now();

        const result = await agentWizardApi.saveDataSource({
          id: source.isExisting ? source.id : undefined,
          isExisting: source.isExisting,
          name: source.name,
          type: source.type,
          category: source.category || '',
          active: true,
          api_config: source.type === 'api' ? source.api_config : null,
          database_config: source.type === 'database' ? source.database_config : null,
          file_config: source.type === 'file' ? source.file_config : null,
          rss_config: source.type === 'rss' ? source.rss_config : null
        });

        console.log('[SaveDataSources] API call took:', Date.now() - queryStart, 'ms');

        if (result.error) {
          throw new Error(`Failed to save ${source.name}: ${result.error}`);
        }

        const data = result.data;
        console.log('[SaveDataSources] Save result:', { data: !!data });

        // Update the data source with the saved ID
        setNewDataSources((prev: any) => prev.map((ds: any, idx: number) =>
          idx === i ? { ...ds, id: data.id, isNew: false, isExisting: false } : ds
        ));

        // Update formData.dataSources
        const updatedAgentSource: AgentDataSource = {
          id: data.id,
          name: source.name,
          feedId: data.id,
          category: source.category as AgentDataType,
          type: source.type,
          api_config: source.api_config,
          rss_config: source.rss_config,
          database_config: source.database_config,
          file_config: source.file_config
        };

        if (source.isExisting) {
          // Update existing source in formData
          setFormData((prev: Partial<Agent>) => ({
            ...prev,
            dataSources: (prev.dataSources || []).map(ds =>
              ds.id === source.id ? updatedAgentSource : ds
            )
          }));
        } else {
          // Add new source to formData
          setFormData((prev: Partial<Agent>) => ({
            ...prev,
            dataSources: [...(prev.dataSources || []), updatedAgentSource]
          }));
        }
      }

      console.log(`[SaveDataSources] Successfully saved ${sourcesToSave.length} data source(s) in`, Date.now() - startTime, 'ms');
      setIsSavingDataSources(false);
      return true;

    } catch (error: any) {
      console.error('[SaveDataSources] Error saving data sources:', error);
      console.error('[SaveDataSources] Total time before error:', Date.now() - startTime, 'ms');
      alert(`Failed to save data sources: ${error.message}`);
      setIsSavingDataSources(false);
      return false;
    }
  };

  const handleNext = async () => {
    // Special handling when leaving dataType step with Nova Weather or Nova Election selected
    if (currentStep === 'dataType') {
      const selectedDataTypes = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

      if (selectedDataTypes.includes('Nova Weather')) {
        // Check if Nova Weather source already exists
        const existingNovaWeather = newDataSources.find(ds => ds.category === 'Nova Weather');
        if (!existingNovaWeather) {
          // Generate unique ID for Nova Weather
          const uniqueId = Date.now().toString();

          // Create a Nova Weather data source with default filters
          const novaWeatherSource = {
            name: `Nova Weather ${uniqueId}`,
            type: 'api',
            category: 'Nova Weather',
            api_config: {
              url: `${novaApiBaseUrl}/nova-weather?type=current&channel=all&dataProvider=all&state=all`,
              method: 'GET',
              headers: { 'Authorization': `Bearer ${publicAnonKey}` },
              data_path: 'locations',  // Use data_path for the actual field
              dataPath: 'locations',    // Keep both for compatibility
              dynamicUrlParams: [],
              // Store Nova Weather filter settings
              novaWeatherFilters: {
                type: 'current',
                channel: 'all',
                dataProvider: 'all',
                state: 'all'
              }
            }
          };

          // Set the new data source and skip to configureNewSources
          setNewDataSources([novaWeatherSource]);
        }
        setCurrentStep('configureNewSources');
        setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, 'dataSources', 'configureNewSources']));
        return;
      }

      if (selectedDataTypes.includes('Nova Election')) {
        // Check if Nova Election source already exists
        const existingNovaElection = newDataSources.find(ds => ds.category === 'Nova Election');
        if (!existingNovaElection) {
          // Generate unique ID for Nova Election
          const uniqueId = Date.now().toString();

          // Create a Nova Election data source with default filters
          const novaElectionSource = {
            name: `Nova Election ${uniqueId}`,
            type: 'api',
            category: 'Nova Election',
            api_config: {
              url: `${novaApiBaseUrl}/nova-election?year=${currentElectionYear}&raceType=presidential&level=state&state=all`,
              method: 'GET',
              headers: { 'Authorization': `Bearer ${publicAnonKey}` },
              data_path: 'races',  // Use data_path for the actual field
              dataPath: 'races',    // Keep both for compatibility
              dynamicUrlParams: [],
              // Store Nova Election filter settings
              novaElectionFilters: {
                year: currentElectionYear.toString(),
                raceType: 'presidential',
                level: 'state',
                state: 'all'
              }
            }
          };

          // Set the new data source and skip to configureNewSources
          setNewDataSources([novaElectionSource]);
        }
        setCurrentStep('configureNewSources');
        setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, 'dataSources', 'configureNewSources']));
        return;
      }

      if (selectedDataTypes.includes('Nova Finance')) {
        // Check if Nova Finance source already exists
        const existingNovaFinance = newDataSources.find(ds => ds.category === 'Nova Finance');
        if (!existingNovaFinance) {
          // Generate unique ID for Nova Finance
          const uniqueId = Date.now().toString();

          // Create a Nova Finance data source with default filters
          const novaFinanceSource = {
            name: `Nova Finance ${uniqueId}`,
            type: 'api',
            category: 'Nova Finance',
            api_config: {
              url: `${novaApiBaseUrl}/nova-finance?type=all&change=all&symbol=all`,
              method: 'GET',
              headers: { 'Authorization': `Bearer ${publicAnonKey}` },
              data_path: 'securities',  // Use data_path for the actual field
              dataPath: 'securities',    // Keep both for compatibility
              dynamicUrlParams: [],
              // Store Nova Finance filter settings
              novaFinanceFilters: {
                type: 'all',
                change: 'all',
                symbol: 'all'
              }
            }
          };

          // Set the new data source and skip to configureNewSources
          setNewDataSources([novaFinanceSource]);
        }
        setCurrentStep('configureNewSources');
        setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, 'dataSources', 'configureNewSources']));
        return;
      }

      if (selectedDataTypes.includes('Nova Sports')) {
        // Check if Nova Sports source already exists
        const existingNovaSports = newDataSources.find(ds => ds.category === 'Nova Sports');
        if (!existingNovaSports) {
          // Generate unique ID for Nova Sports
          const uniqueId = Date.now().toString();

          // Create a Nova Sports data source with default filters
          const novaSportsSource = {
            name: `Nova Sports ${uniqueId}`,
            type: 'api',
            category: 'Nova Sports',
            api_config: {
              url: `${novaApiBaseUrl}/nova-sports?view=teams&league=all&provider=all`,
              method: 'GET',
              headers: { 'Authorization': `Bearer ${publicAnonKey}` },
              data_path: 'data',  // Use data_path for the actual field
              dataPath: 'data',    // Keep both for compatibility
              dynamicUrlParams: [],
              // Store Nova Sports filter settings
              novaSportsFilters: {
                view: 'teams',
                league: 'all',
                provider: 'all',
                position: 'all',
                status: 'all',
                season: 'all'
              }
            }
          };

          // Set the new data source and skip to configureNewSources
          setNewDataSources([novaSportsSource]);
        }
        setCurrentStep('configureNewSources');
        setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, 'dataSources', 'configureNewSources']));
        return;
      }
    }

    // Check if we're leaving the "configureNewSources" step
    if (currentStep === 'configureNewSources') {
      // Check if there are unsaved data sources OR existing sources that need updating
      const hasDataSourcesToSave = newDataSources.some((ds: any) =>
        ds.name && ds.type && (!ds.id || ds.isExisting)
      );

      if (hasDataSourcesToSave) {
        // Save all data sources before proceeding (both new and existing)
        const saveSuccess = await saveAllNewDataSources();

        if (!saveSuccess) {
          // Stay on current step if save failed
          return;
        }
      }
    }

    // Check if we're leaving the "security" step - sync auth data including any pending credentials
    if (currentStep === 'security') {
      securityStepRef.current?.syncAuthToFormData();
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      setCurrentStep(nextStep);
      setVisitedSteps((prev: Set<WizardStep>) => new Set([...prev, nextStep]));
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const parseCacheDuration = (cache: string): number => {
    switch (cache) {
      case '5M': return 300;
      case '15M': return 900;
      case '30M': return 1800;
      case '1H': return 3600;
      default: return 0;
    }
  };

  const handleSaveTest = async (testAgentData: Partial<Agent>): Promise<{ success: boolean; agentId?: string; error?: string }> => {
    // This function saves a temporary test agent and returns its ID
    try {
      // Sync auth settings before saving
      const authData = securityStepRef.current?.syncAuthToFormData();

      // Save new data sources first if needed - uses edge function API
      const savedDataSourceIds: string[] = [];
      const unsavedSources = newDataSources.filter(ds => !ds.id && ds.name && ds.type);

      if (unsavedSources.length > 0) {
        for (const newSource of unsavedSources) {
          const result = await agentWizardApi.saveDataSource({
            name: newSource.name,
            type: newSource.type,
            category: newSource.category || '',
            api_config: newSource.api_config || null,
            rss_config: newSource.rss_config || null,
            file_config: newSource.file_config || null,
            database_config: newSource.database_config || null
          });

          if (result.error) throw new Error(result.error);
          if (result.data) {
            savedDataSourceIds.push(result.data.id);

            // Update newDataSources with the saved ID so cleanup can work
            setNewDataSources((prev) => prev.map(ds =>
              ds.name === newSource.name && ds.type === newSource.type && !ds.id
                ? { ...ds, id: result.data.id }
                : ds
            ));
          }
        }
      }

      // Prepare data source IDs (existing + newly saved)
      const allDataSourceIds = [
        ...(testAgentData.dataSources?.map(ds => ds.id || ds.feedId) || []),
        ...savedDataSourceIds
      ].filter(Boolean) as string[];

      // Save agent via edge function API
      const agentResult = await agentWizardApi.saveAgent({
        name: testAgentData.name || '',
        slug: testAgentData.slug || '',
        description: testAgentData.description,
        format: testAgentData.format || 'JSON',
        formatOptions: testAgentData.formatOptions,
        environment: testAgentData.environment,
        autoStart: testAgentData.autoStart,
        generateDocs: testAgentData.generateDocs,
        transforms: testAgentData.transforms,
        relationships: testAgentData.relationships,
        cache: testAgentData.cache,
        auth: authData?.auth || testAgentData.auth,
        requiresAuth: authData?.requiresAuth ?? testAgentData.requiresAuth,
        authConfig: authData?.authConfig || testAgentData.authConfig,
        status: testAgentData.status,
        dataSourceIds: allDataSourceIds
      });

      if (agentResult.error) throw new Error(agentResult.error);
      if (!agentResult.data) throw new Error('Failed to create test endpoint');

      return {
        success: true,
        agentId: agentResult.data.id
      };
    } catch (error: any) {
      console.error('Failed to save test agent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create test endpoint'
      };
    }
  };

  const handleSave = async (closeDialog: boolean = true) => {
    console.log('[HandleSave] Starting save, closeDialog:', closeDialog);
    const saveStartTime = Date.now();

    // Prevent double-clicks
    if (isSaving) {
      console.log('[HandleSave] Save already in progress, ignoring');
      return;
    }

    setIsSaving(true);
    console.log('[HandleSave] Set isSaving to true');

    try {
      // Sync auth settings from SecurityStep before saving and get the auth data synchronously
      console.log('[HandleSave] Syncing auth data from SecurityStep...');
      const authData = securityStepRef.current?.syncAuthToFormData();
      console.log('[HandleSave] Auth data synced:', authData ? 'has data' : 'no data');

      // First, save/update Nova Weather, Nova Election, Nova Finance, or Nova Sports data sources if needed
      const hasNovaSources = newDataSources.some(ds =>
        (ds.category === 'Nova Weather' || ds.category === 'Nova Election' || ds.category === 'Nova Finance' || ds.category === 'Nova Sports') && ds.name && ds.type && (ds.isExisting || !ds.id)
      );
      console.log('[HandleSave] Has Nova sources to save:', hasNovaSources);

      if (hasNovaSources) {
        console.log('[HandleSave] Saving Nova data sources before final save...');
        const novaStartTime = Date.now();
        const saveSuccess = await saveAllNewDataSources();
        console.log('[HandleSave] saveAllNewDataSources took:', Date.now() - novaStartTime, 'ms, success:', saveSuccess);
        if (!saveSuccess) {
          console.error('[HandleSave] Failed to save Nova data sources');
          setIsSaving(false);
          return; // Don't proceed if data source save failed
        }
      }

      // Now save any other new data sources (non-Nova Weather/Election/Finance/Sports)
      console.log('[HandleSave] Checking for unsaved non-Nova data sources...');
      const savedDataSourceIds: string[] = [];
      const newlySavedSources: AgentDataSource[] = [];

      // Only save data sources that don't have an ID yet (haven't been saved) and aren't Nova Weather/Election/Finance/Sports
      const unsavedSources = newDataSources.filter(ds =>
        !ds.id && ds.name && ds.type && ds.category !== 'Nova Weather' && ds.category !== 'Nova Election' && ds.category !== 'Nova Finance' && ds.category !== 'Nova Sports'
      );
      console.log('[HandleSave] Found', unsavedSources.length, 'unsaved non-Nova data sources');

      if (unsavedSources.length > 0) {
        console.log('[HandleSave] Saving new data sources to database...');

        for (const newSource of unsavedSources) {
          try {
            console.log('[HandleSave] Inserting data source:', newSource.name);
            const insertStart = Date.now();
            // Use edge function API instead of direct Supabase client
            const result = await agentWizardApi.saveDataSource({
              name: newSource.name,
              type: newSource.type,
              category: newSource.category || '',
              api_config: newSource.api_config || null,
              rss_config: newSource.rss_config || null,
              file_config: newSource.file_config || null,
              database_config: newSource.database_config || null
            });
            console.log('[HandleSave] Insert took:', Date.now() - insertStart, 'ms');

            if (result.error) {
              console.error('[HandleSave] Error saving data source:', result.error);
              throw new Error(result.error);
            }

            if (result.data) {
              console.log('[HandleSave] Saved data source:', result.data.id);
              savedDataSourceIds.push(result.data.id);

              // Track newly saved source with full configuration for testing
              const newAgentSource: AgentDataSource = {
                id: result.data.id, // Use database UUID directly, no temporary ID
                name: result.data.name,
                feedId: result.data.id,
                category: result.data.category as AgentDataType,
                // Include configuration fields so test function can access them
                type: result.data.type,
                api_config: result.data.api_config,
                rss_config: result.data.rss_config,
                database_config: result.data.database_config,
                file_config: result.data.file_config
              };

              newlySavedSources.push(newAgentSource);

              setFormData(prev => ({
                ...prev,
                dataSources: [...(prev.dataSources || []), newAgentSource]
              }));

              // Update newDataSources with the saved ID so cleanup can work
              setNewDataSources((prev) => prev.map(ds =>
                ds.name === newSource.name && ds.type === newSource.type && !ds.id
                  ? { ...ds, id: result.data.id }
                  : ds
              ));
            }
          } catch (error) {
            console.error('[HandleSave] Failed to save new data source:', error);
            // Continue with other sources even if one fails
          }
        }

        console.log(`[HandleSave] Saved ${savedDataSourceIds.length} new data sources`);
      }

      // Combine existing and newly saved sources
      console.log('[HandleSave] Combining data sources...');
      const allDataSources = [...(formData.dataSources || []), ...newlySavedSources];
      console.log('[HandleSave] Total data sources:', allDataSources.length);

      // No need to update sourceMappings - they already use database UUIDs directly
      console.log('[HandleSave] Building agent object...');
      const newAgent: Agent = {
        id: editAgent?.id || `agent-${Date.now()}`,
        name: formData.name || 'Unnamed Agent',
        description: formData.description,
        icon: formData.icon,
        slug: formData.slug,
        environment: formData.environment,
        autoStart: formData.autoStart,
        generateDocs: formData.generateDocs,
        dataType: formData.dataType,
        dataSources: allDataSources,
        relationships: formData.relationships || [],
        format: formData.format || 'JSON',
        formatOptions: formData.formatOptions || {},
        itemPath: formData.itemPath,
        fieldMappings: formData.fieldMappings || [],
        fixedFields: formData.fixedFields || {},
        transforms: formData.transforms || [],
        auth: authData?.auth || formData.auth || 'none',
        apiKey: formData.apiKey,
        requiresAuth: authData?.requiresAuth ?? formData.requiresAuth,
        authConfig: authData?.authConfig || formData.authConfig, // Use synchronously returned auth data
        status: formData.status || 'ACTIVE',
        cache: formData.cache || '15M',
        url: `${novaApiBaseUrl}/api/${formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}`,
        created: editAgent?.created || new Date().toISOString(),
        lastRun: editAgent?.lastRun,
        runCount: editAgent?.runCount || 0,
        targetApps: formData.targetApps || []
      };

      // Pass closeDialog parameter to parent and await the result
      console.log('[HandleSave] Calling onSave with agent:', newAgent.name, 'targetApps:', newAgent.targetApps);
      const onSaveStart = Date.now();
      await onSave(newAgent, closeDialog);
      console.log('[HandleSave] onSave completed in:', Date.now() - onSaveStart, 'ms');

      // Only close dialog locally if requested AND save succeeded
      if (closeDialog) {
        console.log('[HandleSave] Closing dialog after successful save');
        handleClose(true); // Pass true to indicate successful save
      }
      console.log('[HandleSave] Total save time:', Date.now() - saveStartTime, 'ms');
    } catch (error) {
      // Don't close dialog on error - user can see the error toast and fix it
      console.error('[HandleSave] Save failed, keeping dialog open:', error);
      console.error('[HandleSave] Time before error:', Date.now() - saveStartTime, 'ms');
    } finally {
      console.log('[HandleSave] Setting isSaving to false');
      setIsSaving(false);
    }
  };

  const handleClose = async (agentSavedSuccessfully: boolean = false) => {
    console.log('[HandleClose] Starting, agentSavedSuccessfully:', agentSavedSuccessfully);
    const closeStartTime = Date.now();

    // Clean up any Nova Weather, Nova Election, Nova Finance, or Nova Sports data sources that were saved but not associated with an agent
    // Only clean up if the agent was NOT successfully saved (i.e., user cancelled without completing)
    // AND only in create mode, not edit mode (in edit mode, sources already belong to an agent)
    if (!agentSavedSuccessfully && !editAgent) {
      const novaSources = newDataSources.filter(
        ds => (ds.category === 'Nova Weather' || ds.category === 'Nova Election' || ds.category === 'Nova Finance' || ds.category === 'Nova Sports') && ds.id && !ds.isExisting
      );
      console.log('[HandleClose] Nova sources to clean up:', novaSources.length);

      if (novaSources.length > 0) {
        console.log('[HandleClose] Cleaning up unused Nova data sources...');
        for (const source of novaSources) {
          try {
            console.log('[HandleClose] Deleting source:', source.id);
            const deleteStart = Date.now();
            // Use edge function API instead of direct Supabase client
            const result = await agentWizardApi.deleteDataSource(source.id!);
            console.log('[HandleClose] Delete took:', Date.now() - deleteStart, 'ms');

            if (result.error) {
              console.error('[HandleClose] Error deleting unused Nova source:', result.error);
            } else {
              console.log('[HandleClose] Deleted unused Nova source:', source.id);
            }
          } catch (error) {
            console.error('[HandleClose] Failed to delete unused Nova source:', error);
          }
        }
      }
    }

    console.log('[HandleClose] Resetting state...');
    setCurrentStep('basic');
    setVisitedSteps(new Set<WizardStep>(['basic'])); // Reset visited steps
    setFormData({
      name: '',
      description: '',
      icon: '🤖',
      slug: '',
      environment: 'production' as 'production' | 'staging' | 'development',
      autoStart: true,
      generateDocs: true,
      dataType: [],
      dataSources: [],
      relationships: [],
      format: 'JSON',
      itemPath: '',
      fieldMappings: [],
      fixedFields: {},
      transforms: [],
      auth: 'none',
      requiresAuth: false,
      status: 'ACTIVE',
      cache: '15M'
    });
    setNewDataSources([]); // Clear new data sources
    setTestResults({}); // Clear test connection results
    setTestLoading({}); // Clear test loading states
    setTestParams({}); // Clear test parameters
    // Reset slug validation states
    setSlugExists(false);
    setCheckingSlug(false);
    // Invalidate any pending slug checks
    slugCheckIdRef.current++;
    // Reset saving states
    setIsSaving(false);
    setIsSavingDataSources(false);
    console.log('[HandleClose] Total close time:', Date.now() - closeStartTime, 'ms');
    console.log('[HandleClose] Calling onClose()');
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name && formData.name.trim().length > 0 &&
               formData.slug && formData.slug.trim().length > 0 &&
               !slugExists && !checkingSlug;
      case 'dataType':
        return Array.isArray(formData.dataType) ? formData.dataType.length > 0 : formData.dataType !== undefined;
      case 'dataSources':
        // Valid if there are existing selected sources OR new sources to create
        return (formData.dataSources && formData.dataSources.length > 0) ||
               newDataSources.filter(ds => ds.name && ds.type).length > 0;
      case 'configureNewSources':
        // All new data sources must have required fields based on their type
        return newDataSources.filter(ds => ds.name && ds.type).every(ds => {
          if (ds.type === 'api') {
            return ds.api_config?.url;
          } else if (ds.type === 'rss') {
            return ds.rss_config?.url;
          } else if (ds.type === 'file') {
            // File source validation depends on source type
            if (ds.file_config?.source === 'url') {
              return ds.file_config?.url;
            }
            // For upload and path, we just need the source field
            return ds.file_config?.source;
          } else if (ds.type === 'database') {
            // Database just needs dbType selected
            return ds.database_config?.dbType;
          }
          return false;
        });
      case 'relationships':
        return true; // Optional step
      case 'outputFormat':
        return formData.format !== undefined;
      case 'transformations':
        return true; // Optional step
      case 'security':
        return true; // Optional step
      case 'test':
        return true; // Optional step - testing before deploying
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const stepLabels: Record<WizardStep, string> = {
    basic: 'Info',
    dataType: 'Type',
    dataSources: 'Sources',
    configureNewSources: 'Configure',
    relationships: 'Relations',
    outputFormat: 'Format',
    transformations: 'Transform',
    security: 'Security',
    test: 'Test',
    review: 'Review'
  };

  const renderStepIndicator = () => {
    return (
      <div className="space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          {editAgent ? 'Click on any step to navigate' : 'Click on visited steps to navigate'}
        </p>
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isClickable = editAgent || visitedSteps.has(step);
            return (
              <div key={step} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => isClickable && setCurrentStep(step)}
                    disabled={!isClickable}
                    title={
                      isClickable
                        ? `Go to step ${index + 1}`
                        : `Complete previous steps first`
                    }
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all group relative ${
                      isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-not-allowed opacity-50'
                    } ${
                      index < currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : index === currentStepIndex
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    {index < currentStepIndex ? (
                      <>
                        <Check className="w-4 h-4 group-hover:hidden" />
                        <span className="hidden group-hover:block text-xs font-semibold">{index + 1}</span>
                      </>
                    ) : (
                      index + 1
                    )}
                  </button>
                  <span className={`text-[10px] mt-1 ${
                    index === currentStepIndex
                      ? 'text-blue-600 font-medium'
                      : 'text-muted-foreground'
                  }`}>
                    {stepLabels[step]}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mb-5 ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const generateSlugFromName = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            // Auto-generate slug if it's empty or matches the previous auto-generated slug
            if (!formData.slug || formData.slug === generateSlugFromName(formData.name || '')) {
              setFormData(prev => ({ ...prev, slug: generateSlugFromName(e.target.value) }));
            }
          }}
          placeholder="e.g., Breaking News Feed"
        />
      </div>

      <div>
        <Label htmlFor="slug">URL Slug *</Label>
        <div className="space-y-2">
          <Input
            id="slug"
            value={formData.slug || ''}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="my-api-endpoint"
            className={slugExists ? 'border-red-500' : ''}
          />
          {checkingSlug && (
            <div className="text-sm text-muted-foreground">
              Checking availability...
            </div>
          )}
          {slugExists && !checkingSlug && (
            <div className="text-sm text-red-500">
              This slug is already in use. Please choose a different one.
            </div>
          )}
          {formData.slug && !slugExists && !checkingSlug && (
            <div className="bg-muted p-2 rounded text-sm">
              <span className="text-muted-foreground">Your API will be available at:</span>{' '}
              <code className="text-foreground">/api/{formData.slug}</code>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of what this agent does"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="icon">Icon (Emoji)</Label>
        <Input
          id="icon"
          value={formData.icon || ''}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="🤖"
          maxLength={2}
        />
      </div>
    </div>
  );

  const renderDataType = () => {
    const selectedCategories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    // Check which Nova sources already exist in newDataSources
    const existingNovaCategories = newDataSources
      .filter(ds => ds.category?.startsWith('Nova '))
      .map(ds => ds.category);

    const isNovaCategory = (category: AgentDataType) =>
      category === 'Nova Weather' || category === 'Nova Election' || category === 'Nova Finance' || category === 'Nova Sports';

    const toggleCategory = (category: AgentDataType) => {
      // Don't allow selecting a Nova category if it already has a data source
      if (isNovaCategory(category) && existingNovaCategories.includes(category) && !selectedCategories.includes(category)) {
        return; // Already exists, don't allow adding again
      }

      const isSelected = selectedCategories.includes(category);
      let newCategories: AgentDataType[];

      if (isSelected) {
        // Remove category
        newCategories = selectedCategories.filter(c => c !== category);
      } else {
        // Special handling for Nova sources - each Nova type is exclusive (only one of each)
        if (isNovaCategory(category)) {
          // Add this Nova category, keeping other non-duplicate selections
          newCategories = [...selectedCategories.filter(c => c !== category), category];
        } else {
          // Normal addition for other categories
          newCategories = [...selectedCategories, category];
        }
      }

      setFormData({ ...formData, dataType: newCategories });
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select one or more data categories (click to toggle)
        </p>
        <div className="grid grid-cols-2 gap-4">
          {dataTypeCategories.map((category) => {
            const IconComponent = dataTypeIcons[category];
            const isSelected = selectedCategories.includes(category);
            // Check if this Nova category already has a data source (and is not currently selected)
            const isNovaAlreadyAdded = isNovaCategory(category) &&
              existingNovaCategories.includes(category) &&
              !isSelected;

            return (
              <Card
                key={category}
                className={`transition-all ${
                  isNovaAlreadyAdded
                    ? 'opacity-50 cursor-not-allowed border-green-500 bg-green-50 dark:bg-green-950'
                    : isSelected
                      ? 'cursor-pointer border-blue-600 bg-blue-50 dark:bg-blue-950'
                      : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleCategory(category)}
              >
                <CardContent className="p-6 flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    isNovaAlreadyAdded
                      ? 'bg-green-600 text-white'
                      : isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category}</h3>
                      {isNovaCategory(category) && (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                          Nova
                        </Badge>
                      )}
                      {isNovaAlreadyAdded && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Added
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                  {isNovaAlreadyAdded && <Check className="w-5 h-5 text-green-600" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Selected {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}: {selectedCategories.join(', ')}
          </p>
        )}
      </div>
    );
  };

  const renderDataSources = () => {
    const selectedCategories = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);

    const addDataSource = (sourceId: string, sourceName: string, sourceCategory: string, sourceType: string) => {
      const newSource: AgentDataSource = {
        id: sourceId, // Use database UUID directly, no temporary ID
        name: sourceName,
        feedId: sourceId,
        category: sourceCategory as AgentDataType,
        type: sourceType
      };
      setFormData({
        ...formData,
        dataSources: [...(formData.dataSources || []), newSource]
      });
    };

    const removeDataSource = (sourceId: string) => {
      setFormData({
        ...formData,
        dataSources: formData.dataSources?.filter(s => s.id !== sourceId)
      });
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {selectedCategories.length > 0
            ? `Select one or more data sources from: ${selectedCategories.join(', ')}`
            : 'Please select at least one category in the previous step'}
        </p>

        {/* Selected Sources */}
        {formData.dataSources && formData.dataSources.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Sources ({formData.dataSources.length})</Label>
            <div className="space-y-2">
              {formData.dataSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{source.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {source.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDataSource(source.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Data Sources from Supabase */}
        <div className="space-y-2">
          <Label>Available Sources</Label>
          {loadingDataSources ? (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
              Loading data sources...
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {availableDataSources.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
                  {selectedCategories.length === 0
                    ? 'Please select at least one category in step 2'
                    : `No data sources available for ${selectedCategories.join(', ')}`}
                </div>
              ) : (
                availableDataSources.map((source) => {
                  const isAdded = formData.dataSources?.some(s => s.feedId === source.id);
                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{source.name}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {source.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {source.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        onClick={() => isAdded ? null : addDataSource(source.id, source.name, source.category, source.type)}
                        disabled={isAdded}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create New Data Sources */}
        <div className="space-y-2 mt-6">
          <div className="flex items-center justify-between">
            <Label>Create New Data Sources</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newIndex = newDataSources.length;
                setNewDataSources([...newDataSources, { name: '', type: '', category: selectedCategories[0] || '' }]);
                // Clear test results for the new source index
                setTestResults(prev => {
                  const updated = { ...prev };
                  delete updated[newIndex];
                  return updated;
                });
                setTestLoading(prev => {
                  const updated = { ...prev };
                  delete updated[newIndex];
                  return updated;
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Source
            </Button>
          </div>

          {newDataSources.length > 0 ? (
            <div className="space-y-3">
              {newDataSources.map((source, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Name <span className="text-red-500">*</span></Label>
                            <Input
                              value={source.name}
                              onChange={(e) => {
                                const updated = [...newDataSources];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setNewDataSources(updated);
                              }}
                              placeholder="e.g., My Custom API"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type <span className="text-red-500">*</span></Label>
                            <Select
                              value={source.type}
                              onValueChange={(value) => {
                                const updated = [...newDataSources];
                                const typeConfig: any = { type: value };
                                if (value === 'api') {
                                  typeConfig.api_config = { method: 'GET', auth_type: 'none', headers: {} };
                                } else if (value === 'database') {
                                  typeConfig.database_config = { connections: {} };
                                } else if (value === 'file') {
                                  typeConfig.file_config = { source: 'url', format: 'csv' };
                                } else if (value === 'rss') {
                                  typeConfig.rss_config = {};
                                }
                                updated[index] = { ...updated[index], ...typeConfig };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="api">REST API</SelectItem>
                                <SelectItem value="database">Database</SelectItem>
                                <SelectItem value="file">File</SelectItem>
                                <SelectItem value="rss">RSS Feed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={source.category}
                            onValueChange={(value) => {
                              const updated = [...newDataSources];
                              updated[index] = { ...updated[index], category: value };
                              setNewDataSources(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dataTypeCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {source.type && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              You'll configure the details of this {source.type} source in the next step.
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewDataSources(newDataSources.filter((_, i) => i !== index));
                        }}
                        className="ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
              No new data sources. Click "Add New Source" to create one.
            </div>
          )}
        </div>

        {/* Summary */}
        {(formData.dataSources && formData.dataSources.length > 0) || newDataSources.filter(ds => ds.name && ds.type).length > 0 ? (
          <Card className="p-4 bg-muted mt-4">
            <div className="flex items-center gap-3 text-sm">
              <Database className="w-4 h-4" />
              <strong>Summary:</strong>
              <Badge variant="default">
                {formData.dataSources?.length || 0} existing selected
              </Badge>
              <Badge variant="secondary">
                {newDataSources.filter(ds => ds.name && ds.type).length} new configured
              </Badge>
              <Badge variant="outline">
                {(formData.dataSources?.length || 0) + newDataSources.filter(ds => ds.name && ds.type).length} total sources
              </Badge>
            </div>
          </Card>
        ) : null}
      </div>
    );
  };

  const renderConfigureNewSources = () => {
    const validNewSources = newDataSources.filter(ds => ds.name && ds.type);

    if (validNewSources.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No new data sources to configure.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure the connection details for each new data source. These sources will be saved to your database.
        </p>

        {validNewSources.map((source, index) => {
          const actualIndex = newDataSources.indexOf(source);

          return (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <h3 className="font-semibold">{source.name}</h3>
                    <Badge variant="outline">{source.type}</Badge>
                    {source.category && <Badge variant="secondary">{source.category}</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      const updated = newDataSources.filter((_, i) => i !== actualIndex);
                      setNewDataSources(updated);
                      // Also remove from formData.dataSources and update dataType if this was a Nova source
                      const currentDataTypes = Array.isArray(formData.dataType) ? formData.dataType : [];
                      const currentDataSources = formData.dataSources || [];
                      setFormData(prev => ({
                        ...prev,
                        // Remove source from dataSources by matching id or feedId
                        dataSources: currentDataSources.filter(ds =>
                          ds.id !== source.id && ds.feedId !== source.id && ds.feedId !== source.feedId
                        ),
                        // Remove the data type selection if this was a Nova source
                        dataType: source.category?.startsWith('Nova ')
                          ? currentDataTypes.filter(dt => dt !== source.category)
                          : currentDataTypes
                      }));
                    }}
                    title="Delete data source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* API Configuration */}
                {source.type === 'api' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>API URL <span className="text-red-500">*</span></Label>
                      <Input
                        value={source.api_config?.url || ''}
                        onChange={(e) => {
                          // Don't allow editing Nova URL
                          if (source.category.substr(0, 4) !== 'Nova') {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, url: e.target.value }
                            };
                            setNewDataSources(updated);
                          }
                        }}
                        placeholder="https://api.example.com/v1/data"
                        disabled={source.category.substr(0, 4) === 'Nova'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>HTTP Method</Label>
                        <Select
                          value={source.api_config?.method || 'GET'}
                          onValueChange={(value) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, method: value }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Authentication Type</Label>
                        <Select
                          value={source.api_config?.auth_type || 'none'}
                          onValueChange={(value) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, auth_type: value }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Authentication</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="api_key_header">API Key (Header)</SelectItem>
                            <SelectItem value="api_key_query">API Key (Query)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {source.api_config?.auth_type === 'bearer' && (
                      <div className="space-y-2">
                        <Label>Bearer Token</Label>
                        <Input
                          type="password"
                          value={source.api_config?.bearer_token || ''}
                          onChange={(e) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: { ...updated[actualIndex].api_config, bearer_token: e.target.value }
                            };
                            setNewDataSources(updated);
                          }}
                          placeholder="Your bearer token"
                        />
                      </div>
                    )}

                    {source.api_config?.auth_type === 'api_key_header' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>API Key Header Name</Label>
                          <Input
                            value={source.api_config?.api_key_header || 'X-API-Key'}
                            onChange={(e) => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, api_key_header: e.target.value }
                              };
                              setNewDataSources(updated);
                            }}
                            placeholder="X-API-Key"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Key Value</Label>
                          <Input
                            type="password"
                            value={source.api_config?.api_key_value || ''}
                            onChange={(e) => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, api_key_value: e.target.value }
                              };
                              setNewDataSources(updated);
                            }}
                            placeholder="Your API key"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Data Path (optional)</Label>
                      <Input
                        value={source.api_config?.data_path || source.api_config?.dataPath || ''}
                        onChange={(e) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            api_config: {
                              ...updated[actualIndex].api_config,
                              data_path: e.target.value,
                              dataPath: e.target.value // Store both for compatibility
                            }
                          };
                          setNewDataSources(updated);
                        }}
                        placeholder={source.category === 'Nova Weather' ? "locations" : source.category === 'Nova Election' ? "races" : source.category === 'Nova Finance' ? "securities" : source.category === 'Nova Sports' ? "data" : "data.items"}
                      />
                      <p className="text-xs text-muted-foreground">
                        JSON path to the array of items (e.g., 'data.items' or 'results')
                      </p>
                    </div>

                    {/* Nova Weather Filter Options */}
                    {source.category === 'Nova Weather' && (
                      <div className="space-y-3">
                        <div>
                          <Label>Filter Options</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure query parameters for the Nova Weather API
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Type</Label>
                            <Select
                              value={source.api_config?.novaWeatherFilters?.type || 'current'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaWeatherFilters || {};
                                filters.type = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'current',
                                  channel: filters.channel || 'all',
                                  dataProvider: filters.dataProvider || 'all',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaWeatherFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="current">Current</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="alerts">Alerts</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Channel</Label>
                            <Select
                              value={source.api_config?.novaWeatherFilters?.channel || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaWeatherFilters || {};
                                filters.channel = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'current',
                                  channel: filters.channel || 'all',
                                  dataProvider: filters.dataProvider || 'all',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaWeatherFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select channel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Data Channels</SelectItem>
                                <SelectItem value="assigned">Assigned Channels</SelectItem>
                                {novaWeatherChannels.map((channel) => (
                                  <SelectItem key={channel.id} value={channel.id}>
                                    {channel.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Data Provider</Label>
                            <Select
                              value={source.api_config?.novaWeatherFilters?.dataProvider || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaWeatherFilters || {};
                                filters.dataProvider = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'current',
                                  channel: filters.channel || 'all',
                                  dataProvider: filters.dataProvider || 'all',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaWeatherFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Data Providers</SelectItem>
                                {novaWeatherProviders.map((provider) => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    {provider.name} ({provider.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">State</Label>
                            <Select
                              value={source.api_config?.novaWeatherFilters?.state || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaWeatherFilters || {};
                                filters.state = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'current',
                                  channel: filters.channel || 'all',
                                  dataProvider: filters.dataProvider || 'all',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaWeatherFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All States</SelectItem>
                                {novaWeatherStates.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show current URL preview */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                            {source.api_config?.url || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Nova Election Filter Options */}
                    {source.category === 'Nova Election' && (
                      <div className="space-y-3">
                        <div>
                          <Label>Filter Options</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure query parameters for the Nova Election API
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Year</Label>
                            <Select
                              value={source.api_config?.novaElectionFilters?.year || currentElectionYear.toString()}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaElectionFilters || {};
                                filters.year = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  year: filters.year || currentElectionYear.toString(),
                                  raceType: filters.raceType || 'presidential',
                                  level: filters.level || 'state',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaElectionFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2022">2022</SelectItem>
                                <SelectItem value="2020">2020</SelectItem>
                                <SelectItem value="2018">2018</SelectItem>
                                <SelectItem value="2016">2016</SelectItem>
                                <SelectItem value="2014">2014</SelectItem>
                                <SelectItem value="2012">2012</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Race Type</Label>
                            <Select
                              value={source.api_config?.novaElectionFilters?.raceType || 'presidential'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaElectionFilters || {};
                                filters.raceType = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  year: filters.year || currentElectionYear.toString(),
                                  raceType: filters.raceType || 'presidential',
                                  level: filters.level || 'state',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaElectionFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select race type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="presidential">Presidential</SelectItem>
                                <SelectItem value="senate">Senate</SelectItem>
                                <SelectItem value="house">House</SelectItem>
                                <SelectItem value="governor">Governor</SelectItem>
                                <SelectItem value="local">Local</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Level</Label>
                            <Select
                              value={source.api_config?.novaElectionFilters?.level || 'state'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaElectionFilters || {};
                                filters.level = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  year: filters.year || currentElectionYear.toString(),
                                  raceType: filters.raceType || 'presidential',
                                  level: filters.level || 'state',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaElectionFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="national">National</SelectItem>
                                <SelectItem value="state">State</SelectItem>
                                <SelectItem value="district">District</SelectItem>
                                <SelectItem value="county">County</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">State</Label>
                            <Select
                              value={source.api_config?.novaElectionFilters?.state || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaElectionFilters || {};
                                filters.state = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  year: filters.year || currentElectionYear.toString(),
                                  raceType: filters.raceType || 'presidential',
                                  level: filters.level || 'state',
                                  state: filters.state || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaElectionFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All States</SelectItem>
                                {electionStateCodes.map((stateCode) => (
                                  <SelectItem key={stateCode} value={stateCode}>
                                    {stateNames[stateCode]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show current URL preview */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                            {source.api_config?.url || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Nova Finance Filter Options */}
                    {source.category === 'Nova Finance' && (
                      <div className="space-y-3">
                        <div>
                          <Label>Filter Options</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure query parameters for the Nova Finance API
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Type</Label>
                            <Select
                              value={source.api_config?.novaFinanceFilters?.type || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaFinanceFilters || {};
                                filters.type = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'all',
                                  change: filters.change || 'all',
                                  symbol: filters.symbol || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaFinanceFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="stocks">Stocks</SelectItem>
                                <SelectItem value="crypto">Crypto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Change</Label>
                            <Select
                              value={source.api_config?.novaFinanceFilters?.change || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaFinanceFilters || {};
                                filters.change = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'all',
                                  change: filters.change || 'all',
                                  symbol: filters.symbol || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaFinanceFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select change" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="up">Up</SelectItem>
                                <SelectItem value="down">Down</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Symbol</Label>
                            <Select
                              value={source.api_config?.novaFinanceFilters?.symbol || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaFinanceFilters || {};
                                filters.symbol = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  type: filters.type || 'all',
                                  change: filters.change || 'all',
                                  symbol: filters.symbol || 'all'
                                });

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting, // Explicitly preserve the flag
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaFinanceFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select symbol" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Symbols</SelectItem>
                                {novaFinanceSymbols.map((stock) => (
                                  <SelectItem key={stock.symbol} value={stock.symbol}>
                                    {stock.custom_name || stock.name} ({stock.symbol})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show current URL preview */}
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-700 dark:text-green-300 font-mono break-all">
                            {source.api_config?.url || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Nova Sports Filter Options */}
                    {source.category === 'Nova Sports' && (
                      <div className="space-y-3">
                        <div>
                          <Label>Filter Options</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure query parameters for the Nova Sports API
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">View</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.view || 'teams'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.view = value;
                                // Reset view-specific filters when view changes
                                if (value !== 'players') filters.position = 'all';
                                if (value !== 'games') filters.status = 'all';
                                if (value !== 'standings') filters.season = 'all';

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                // Add view-specific params
                                if (filters.view === 'players' && filters.position !== 'all') {
                                  params.set('position', filters.position);
                                }
                                if (filters.view === 'games' && filters.status !== 'all') {
                                  params.set('status', filters.status);
                                }
                                if (filters.view === 'standings' && filters.season !== 'all') {
                                  params.set('season', filters.season);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select view" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="teams">Teams</SelectItem>
                                <SelectItem value="standings">Standings</SelectItem>
                                <SelectItem value="players">Players</SelectItem>
                                <SelectItem value="games">Games</SelectItem>
                                <SelectItem value="venues">Venues</SelectItem>
                                <SelectItem value="tournaments">Tournaments</SelectItem>
                                <SelectItem value="betting">Betting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">League</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.league || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.league = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                if (filters.view === 'players' && filters.position !== 'all') {
                                  params.set('position', filters.position);
                                }
                                if (filters.view === 'games' && filters.status !== 'all') {
                                  params.set('status', filters.status);
                                }
                                if (filters.view === 'standings' && filters.season !== 'all') {
                                  params.set('season', filters.season);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select league" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Leagues</SelectItem>
                                {novaSportsLeagues.map((league) => (
                                  <SelectItem key={league.id} value={league.id}>
                                    {league.abbrev || league.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Provider</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.provider || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.provider = value;

                                // Update the URL with new query parameters
                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                if (filters.view === 'players' && filters.position !== 'all') {
                                  params.set('position', filters.position);
                                }
                                if (filters.view === 'games' && filters.status !== 'all') {
                                  params.set('status', filters.status);
                                }
                                if (filters.view === 'standings' && filters.season !== 'all') {
                                  params.set('season', filters.season);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Providers</SelectItem>
                                {novaSportsProviders.map((provider) => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Conditional filters based on view */}
                        {source.api_config?.novaSportsFilters?.view === 'players' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Position</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.position || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.position = value;

                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                if (filters.position !== 'all') {
                                  params.set('position', filters.position);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Positions</SelectItem>
                                {[
                                  { value: 'QB', label: 'QB' },
                                  { value: 'RB', label: 'RB' },
                                  { value: 'WR', label: 'WR' },
                                  { value: 'TE', label: 'TE' },
                                  { value: 'K', label: 'K' },
                                  { value: 'DF', label: 'DF (DEF)' },
                                  { value: 'PG', label: 'PG' },
                                  { value: 'SG', label: 'SG' },
                                  { value: 'SF', label: 'SF' },
                                  { value: 'PF', label: 'PF' },
                                  { value: 'C', label: 'C' },
                                  { value: 'P', label: 'P' },
                                  { value: '1B', label: '1B' },
                                  { value: '2B', label: '2B' },
                                  { value: '3B', label: '3B' },
                                  { value: 'SS', label: 'SS' },
                                  { value: 'OF', label: 'OF' },
                                  { value: 'SP', label: 'SP' },
                                  { value: 'RP', label: 'RP' },
                                  { value: 'LW', label: 'LW' },
                                  { value: 'RW', label: 'RW' },
                                  { value: 'D', label: 'D' },
                                  { value: 'G', label: 'G' },
                                  { value: 'GK', label: 'GK' },
                                  { value: 'MF', label: 'MF (MID)' },
                                  { value: 'FW', label: 'FW (FWD)' }
                                ].map((pos) => (
                                  <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {source.api_config?.novaSportsFilters?.view === 'games' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Status</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.status || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.status = value;

                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                if (filters.status !== 'all') {
                                  params.set('status', filters.status);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="final">Final</SelectItem>
                                <SelectItem value="postponed">Postponed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {source.api_config?.novaSportsFilters?.view === 'standings' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Season</Label>
                            <Select
                              value={source.api_config?.novaSportsFilters?.season || 'all'}
                              onValueChange={(value: any) => {
                                const updated = [...newDataSources];
                                const filters = updated[actualIndex].api_config.novaSportsFilters || {};
                                filters.season = value;

                                const baseUrl = updated[actualIndex].api_config.url.split('?')[0];
                                const params = new URLSearchParams({
                                  view: filters.view || 'teams',
                                  league: filters.league || 'all',
                                  provider: filters.provider || 'all'
                                });
                                if (filters.season !== 'all') {
                                  params.set('season', filters.season);
                                }

                                updated[actualIndex] = {
                                  ...updated[actualIndex],
                                  isExisting: updated[actualIndex].isExisting,
                                  api_config: {
                                    ...updated[actualIndex].api_config,
                                    url: `${baseUrl}?${params.toString()}`,
                                    novaSportsFilters: filters
                                  }
                                };
                                setNewDataSources(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select season" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Seasons</SelectItem>
                                {novaSportsSeasons
                                  .filter(s => source.api_config?.novaSportsFilters?.league === 'all' || s.league_id === source.api_config?.novaSportsFilters?.league)
                                  .map((season) => (
                                    <SelectItem key={season.id} value={season.id}>
                                      {season.name} ({season.year})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Show current URL preview */}
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-orange-700 dark:text-orange-300 font-mono break-all">
                            {source.api_config?.url || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dynamic URL Parameters Section - Hidden for Nova Weather, Nova Election, Nova Finance, and Nova Sports */}
                    {source.category !== 'Nova Weather' && source.category !== 'Nova Election' && source.category !== 'Nova Finance' && source.category !== 'Nova Sports' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Dynamic URL Parameters</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Map query parameters from your endpoint URL to placeholders in this data source URL
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                            const updated = [...newDataSources];
                            const newMapping = { queryParam: '', urlPlaceholder: '', required: false };
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              api_config: {
                                ...updated[actualIndex].api_config,
                                parameter_mappings: [...(updated[actualIndex].api_config?.parameter_mappings || []), newMapping]
                              }
                            };
                            setNewDataSources(updated);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Parameter
                        </Button>
                      </div>

                      {source.api_config?.parameter_mappings?.length > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            <strong>Example:</strong> If your URL is <code>http://api.com/races/{'{raceId}'}</code>,
                            add a mapping where placeholder is "raceId" and query param is "id".
                            Then calling <code>/api/your-endpoint?id=ND_393</code> will fetch from <code>http://api.com/races/ND_393</code>
                          </p>
                        </div>
                      )}

                      {source.api_config?.parameter_mappings?.map((mapping: any, mappingIndex: number) => (
                        <Card key={mappingIndex} className="p-3 relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...newDataSources];
                              const newMappings = updated[actualIndex].api_config.parameter_mappings.filter((_: any, i: number) => i !== mappingIndex);
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                              };
                              setNewDataSources(updated);
                            }}
                            className="absolute top-2 right-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="grid grid-cols-3 gap-2 pr-8">
                            <div className="space-y-2">
                              <Label className="text-xs">Query Parameter</Label>
                              <Input
                                value={mapping.queryParam || ''}
                                onChange={(e) => {
                                  const updated = [...newDataSources];
                                  const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                  newMappings[mappingIndex] = { ...mapping, queryParam: e.target.value };
                                  updated[actualIndex] = {
                                    ...updated[actualIndex],
                                    api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                  };
                                  setNewDataSources(updated);
                                }}
                                placeholder="id"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">URL Placeholder</Label>
                              <Input
                                value={mapping.urlPlaceholder || ''}
                                onChange={(e) => {
                                  const updated = [...newDataSources];
                                  const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                  newMappings[mappingIndex] = { ...mapping, urlPlaceholder: e.target.value };
                                  updated[actualIndex] = {
                                    ...updated[actualIndex],
                                    api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                  };
                                  setNewDataSources(updated);
                                }}
                                placeholder="raceId"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Required?</Label>
                              <div className="flex items-center h-9">
                                <input
                                  type="checkbox"
                                  checked={mapping.required || false}
                                  onChange={(e) => {
                                    const updated = [...newDataSources];
                                    const newMappings = [...(updated[actualIndex].api_config.parameter_mappings || [])];
                                    newMappings[mappingIndex] = { ...mapping, required: e.target.checked };
                                    updated[actualIndex] = {
                                      ...updated[actualIndex],
                                      api_config: { ...updated[actualIndex].api_config, parameter_mappings: newMappings }
                                    };
                                    setNewDataSources(updated);
                                  }}
                                  className="w-4 h-4"
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                      </div>
                    )}

                    {/* Test Parameters Section for APIs with dynamic parameters */}
                    {source.api_config?.parameter_mappings && source.api_config.parameter_mappings.length > 0 && source.category !== 'Nova Weather' && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <Label>Test Parameters</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Provide values for parameters to test the connection
                          </p>
                        </div>

                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            This data source uses dynamic parameters. Provide test values below to discover fields.
                          </p>
                        </div>

                        {source.api_config.parameter_mappings.map((mapping: any, mappingIdx: number) => (
                          <div key={mappingIdx} className="space-y-2">
                            <Label className="text-sm">
                              {mapping.queryParam}
                              {mapping.required && <span className="text-red-500 ml-1">*</span>}
                              {mapping.required && <span className="text-xs text-muted-foreground ml-2">(required)</span>}
                            </Label>
                            <Input
                              value={testParams[actualIndex]?.[mapping.queryParam] || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setTestParams((prev: Record<number, Record<string, string>>) => ({
                                  ...prev,
                                  [actualIndex]: {
                                    ...prev[actualIndex],
                                    [mapping.queryParam]: e.target.value
                                  }
                                }));
                              }}
                              placeholder={`e.g., value for {${mapping.urlPlaceholder}}`}
                              className={mapping.required && !testParams[actualIndex]?.[mapping.queryParam] ? 'border-red-500' : ''}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Test Connection Button for API */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        onClick={() => testAPIConnection(actualIndex)}
                        disabled={!source.api_config?.url || testLoading[actualIndex]}
                      >
                        {testLoading[actualIndex] ? 'Testing...' : 'Test Connection'}
                      </Button>

                      {testResults[actualIndex] && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          testResults[actualIndex].success
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            testResults[actualIndex].success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {testResults[actualIndex].success ? '✓' : '✗'}
                            {' '}
                            {testResults[actualIndex].success ? testResults[actualIndex].message : (testResults[actualIndex].error || testResults[actualIndex].message)}
                          </p>
                          {testResults[actualIndex].fields && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Found {testResults[actualIndex].fields.length} fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {testResults[actualIndex].fields.map((field: string) => (
                                  <Badge key={field} variant="secondary" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RSS Configuration */}
                {source.type === 'rss' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>RSS Feed URL <span className="text-red-500">*</span></Label>
                      <Input
                        value={source.rss_config?.url || ''}
                        onChange={(e) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            rss_config: { ...updated[actualIndex].rss_config, url: e.target.value }
                          };
                          setNewDataSources(updated);
                        }}
                        placeholder="https://example.com/feed.xml"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Update Frequency</Label>
                      <Select
                        value={source.rss_config?.update_frequency || '15min'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            rss_config: { ...updated[actualIndex].rss_config, update_frequency: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5min">Every 5 minutes</SelectItem>
                          <SelectItem value="15min">Every 15 minutes</SelectItem>
                          <SelectItem value="30min">Every 30 minutes</SelectItem>
                          <SelectItem value="1hour">Every hour</SelectItem>
                          <SelectItem value="6hours">Every 6 hours</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Test RSS Feed Button */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        onClick={() => testRSSFeed(actualIndex)}
                        disabled={!source.rss_config?.url || testLoading[actualIndex]}
                      >
                        {testLoading[actualIndex] ? 'Testing...' : 'Test RSS Feed'}
                      </Button>

                      {testResults[actualIndex] && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          testResults[actualIndex].success
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            testResults[actualIndex].success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {testResults[actualIndex].success ? '✓' : '✗'}
                            {' '}
                            {testResults[actualIndex].success ? testResults[actualIndex].message : (testResults[actualIndex].error || testResults[actualIndex].message)}
                          </p>
                          {testResults[actualIndex].fields && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available RSS fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {testResults[actualIndex].fields.map((field: string) => (
                                  <Badge key={field} variant="secondary" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Configuration */}
                {source.type === 'file' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>File Source</Label>
                      <Select
                        value={source.file_config?.source || 'url'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            file_config: { ...updated[actualIndex].file_config, source: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                          <SelectItem value="path">Server Path</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {source.file_config?.source === 'url' && (
                      <div className="space-y-2">
                        <Label>File URL <span className="text-red-500">*</span></Label>
                        <Input
                          value={source.file_config?.url || ''}
                          onChange={(e) => {
                            const updated = [...newDataSources];
                            updated[actualIndex] = {
                              ...updated[actualIndex],
                              file_config: { ...updated[actualIndex].file_config, url: e.target.value }
                            };
                            setNewDataSources(updated);
                          }}
                          placeholder="https://example.com/data.csv"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>File Format</Label>
                      <Select
                        value={source.file_config?.format || 'csv'}
                        onValueChange={(value) => {
                          const updated = [...newDataSources];
                          updated[actualIndex] = {
                            ...updated[actualIndex],
                            file_config: { ...updated[actualIndex].file_config, format: value }
                          };
                          setNewDataSources(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="excel">Excel (XLSX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Database Configuration */}
                {source.type === 'database' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Database Type</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {['mysql', 'postgresql', 'mssql'].map(dbType => (
                          <Card
                            key={dbType}
                            className={`p-4 cursor-pointer transition-colors ${
                              source.database_config?.dbType === dbType
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => {
                              const updated = [...newDataSources];
                              updated[actualIndex] = {
                                ...updated[actualIndex],
                                database_config: { ...updated[actualIndex].database_config, dbType }
                              };
                              setNewDataSources(updated);
                            }}
                          >
                            <div className="text-center">
                              <Database className="w-6 h-6 mx-auto mb-2" />
                              <div className="text-sm font-medium">
                                {dbType.toUpperCase()}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {source.database_config?.dbType && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Database connections and queries will be configured in a later step after saving this data source.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            These data sources will be saved to your database when you complete the wizard.
          </p>
        </div>
      </div>
    );
  };

  const renderRelationships = () => {
    const addRelationship = () => {
      if (newRelationship.sourceId && newRelationship.targetId && newRelationship.joinField) {
        setFormData({
          ...formData,
          relationships: [
            ...(formData.relationships || []),
            {
              sourceId: newRelationship.sourceId,
              targetId: newRelationship.targetId,
              joinType: newRelationship.joinType || 'inner',
              joinField: newRelationship.joinField
            }
          ]
        });
        setNewRelationship({});
      }
    };

    const removeRelationship = (index: number) => {
      setFormData({
        ...formData,
        relationships: formData.relationships?.filter((_, i) => i !== index)
      });
    };

    const sources = formData.dataSources || [];

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Define how data sources should be joined together (optional for single source agents)
        </p>

        {/* Existing Relationships */}
        {formData.relationships && formData.relationships.length > 0 && (
          <div className="space-y-2">
            {formData.relationships.map((rel, index) => {
              const sourceSource = sources.find(s => s.id === rel.sourceId);
              const targetSource = sources.find(s => s.id === rel.targetId);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                >
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">
                    <span className="font-medium">{sourceSource?.name}</span>
                    {' '}→{' '}
                    <span className="font-medium">{targetSource?.name}</span>
                    {' '}on{' '}
                    <code className="bg-background px-1 rounded">{rel.joinField}</code>
                    {' '}({rel.joinType})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRelationship(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Relationship */}
        {sources.length >= 2 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label>Add New Relationship</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rel-source" className="text-xs">Source</Label>
                  <Select
                    value={newRelationship.sourceId}
                    onValueChange={(value) => setNewRelationship({ ...newRelationship, sourceId: value })}
                  >
                    <SelectTrigger id="rel-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-target" className="text-xs">Target</Label>
                  <Select
                    value={newRelationship.targetId}
                    onValueChange={(value) => setNewRelationship({ ...newRelationship, targetId: value })}
                  >
                    <SelectTrigger id="rel-target">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-join-type" className="text-xs">Join Type</Label>
                  <Select
                    value={newRelationship.joinType}
                    onValueChange={(value: 'inner' | 'left' | 'right') => setNewRelationship({ ...newRelationship, joinType: value })}
                  >
                    <SelectTrigger id="rel-join-type">
                      <SelectValue placeholder="Inner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inner">Inner Join</SelectItem>
                      <SelectItem value="left">Left Join</SelectItem>
                      <SelectItem value="right">Right Join</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rel-field" className="text-xs">Join Field</Label>
                  <Input
                    id="rel-field"
                    value={newRelationship.joinField || ''}
                    onChange={(e) => setNewRelationship({ ...newRelationship, joinField: e.target.value })}
                    placeholder="e.g., id"
                  />
                </div>
              </div>
              <Button onClick={addRelationship} size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            </CardContent>
          </Card>
        )}

        {sources.length < 2 && (
          <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
            Add at least 2 data sources to create relationships
          </div>
        )}
      </div>
    );
  };

  // Handler for testing data sources in OutputFormat step
  const handleTestDataSource = async (source: any) => {
    try {
      let fields: string[] = [];
      let responseData: any = null;

      // First, fetch the full data source from the database if we only have a reference
      // Uses edge function API instead of direct Supabase client
      let fullSource = source;
      const sourceDbId = source.feedId || source.id;
      if (sourceDbId && !source.config && !source.api_config && !source.rss_config) {
        const result = await agentWizardApi.getDataSource(sourceDbId);

        if (result.error) {
          throw new Error(`Failed to fetch data source: ${result.error}`);
        }

        if (result.data) {
          const ds = result.data;
          fullSource = {
            ...source,
            type: ds.type,
            config: ds.api_config || ds.rss_config || ds.file_config || ds.database_config,
            api_config: ds.api_config,
            rss_config: ds.rss_config,
            file_config: ds.file_config,
            database_config: ds.database_config
          };
        }
      }

      // Handle different possible structures for API config (matching nova-old)
      let apiConfig: any = null;

      // For API sources, make real API calls
      if (fullSource.type === 'api') {
        // Check different possible locations for API configuration
        if (fullSource.config && typeof fullSource.config === 'object') {
          // If config is an object, it might be the API config directly
          if ('url' in fullSource.config) {
            apiConfig = fullSource.config;
          }
          // Or it might be nested under api_config
          else if ('api_config' in fullSource.config && fullSource.config.api_config) {
            apiConfig = fullSource.config.api_config;
          }
        }
        // Check if api_config is at root level
        else if (fullSource.api_config) {
          apiConfig = fullSource.api_config;
        }
        // Check if URL is at root level (legacy structure)
        else if ('url' in fullSource) {
          apiConfig = {
            url: fullSource.url,
            method: fullSource.method || 'GET',
            headers: fullSource.headers || {}
          };
        }

        if (!apiConfig || !apiConfig.url) {
          throw new Error(`API URL not found for ${fullSource.name}. Please check the data source configuration.`);
        }

        // Build headers including authentication
        const headers: Record<string, string> = { ...(apiConfig.headers || {}) };

        // Add authentication headers if configured
        if (apiConfig.auth_type === 'bearer' && apiConfig.bearer_token) {
          headers['Authorization'] = `Bearer ${apiConfig.bearer_token}`;
        } else if (apiConfig.auth_type === 'api_key_header' && apiConfig.api_key_header && apiConfig.api_key_value) {
          headers[apiConfig.api_key_header] = apiConfig.api_key_value;
        }

        // Build the test URL with params
        let testUrl = apiConfig.url;
        if (apiConfig.params && Object.keys(apiConfig.params).length > 0) {
          const params = new URLSearchParams(apiConfig.params);
          testUrl += (testUrl.includes('?') ? '&' : '?') + params.toString();
        }

        // Use fetchViaProxy for the API request
        const result = await fetchViaProxy(testUrl, {
          method: apiConfig.method || 'GET',
          headers,
          body: apiConfig.body
        });

        // The data from fetchViaProxy is in result.data
        let data = result.data;

        // Parse JSON if it's a string
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('Response is not JSON:', e);
            throw new Error('API returned non-JSON response');
          }
        }

        // Store the full response data
        responseData = data;

        // Navigate to the data path if specified
        let targetData = data;
        const dataPath = apiConfig.data_path || apiConfig.dataPath;
        if (dataPath) {
          const pathParts = dataPath.split('.');
          for (const part of pathParts) {
            if (targetData && typeof targetData === 'object' && part in targetData) {
              targetData = targetData[part];
            } else {
              console.warn(`Data path "${dataPath}" not found in response`);
              break;
            }
          }
        }

        // Helper function to recursively extract all field paths
        const extractAllFields = (obj: any, prefix = ''): string[] => {
          const fieldsList: string[] = [];

          if (!obj || typeof obj !== 'object') return fieldsList;

          Object.keys(obj).forEach(key => {
            // Skip private fields
            if (key.startsWith('_') || key.startsWith('$')) return;

            const fieldPath = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            // Always add the field itself
            fieldsList.push(fieldPath);

            // If it's an object (but not array), recurse to get nested fields
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              fieldsList.push(...extractAllFields(value, fieldPath));
            }
            // If it's an array with objects, extract fields from first item
            else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
              fieldsList.push(...extractAllFields(value[0], fieldPath));
            }
          });

          return fieldsList;
        };

        // Extract fields from the response
        if (Array.isArray(targetData) && targetData.length > 0) {
          const firstItem = targetData[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            fields = extractAllFields(firstItem);
          }
        } else if (typeof targetData === 'object' && targetData !== null) {
          fields = extractAllFields(targetData);
        }
      } else if (fullSource.type === 'rss') {
        // RSS feeds have standard fields
        fields = ['title', 'description', 'link', 'pubDate', 'guid', 'author', 'category', 'content'];
        responseData = {
          items: [
            {
              title: 'RSS Item 1',
              description: 'RSS Description 1',
              link: 'https://example.com/rss/1',
              pubDate: new Date().toISOString(),
              guid: 'rss-1',
              author: 'RSS Author',
              category: 'RSS Category'
            },
            {
              title: 'RSS Item 2',
              description: 'RSS Description 2',
              link: 'https://example.com/rss/2',
              pubDate: new Date().toISOString(),
              guid: 'rss-2',
              author: 'RSS Author 2',
              category: 'News'
            }
          ]
        };
      } else if (fullSource.type === 'database') {
        // Database sources need to be synced first
        throw new Error('Database field discovery requires the data source to be synced first');
      } else {
        // If we got here, the source type is not recognized or not supported for testing
        throw new Error(`Unable to test data source "${fullSource.name}". Source type "${fullSource.type || 'unknown'}" is not supported or API configuration is missing.`);
      }

      // Store sample data (full response object with nested arrays)
      setSampleData((prev: Record<string, any>) => ({
        ...prev,
        [source.id]: responseData
      }));

      // Update the source with discovered fields
      setFormData((prev: Partial<Agent>) => ({
        ...prev,
        dataSources: prev.dataSources?.map((ds: AgentDataSource) =>
          String(ds.id) === String(source.id)
            ? { ...ds, fields }
            : ds
        )
      }));

      return { fields, data: responseData };
    } catch (error) {
      console.error('Failed to test data source:', error);
      throw error;
    }
  };

  // Auto-fetch sample data for existing data sources when editing an agent
  // This ensures the field mapping step has data to display
  // Must be placed after handleTestDataSource is defined
  useEffect(() => {
    const fetchSampleDataForExistingSources = async () => {
      if (!editAgent || !open) return;

      const dataSources = editAgent.dataSources || [];
      if (dataSources.length === 0) return;

      // Check if we already have sample data for all sources
      const missingSampleData = dataSources.filter((ds: AgentDataSource) => !sampleData[ds.id]);
      if (missingSampleData.length === 0) {
        console.log('[EditMode] Sample data already exists for all sources');
        return;
      }

      console.log('[EditMode] Auto-fetching sample data for', missingSampleData.length, 'data sources');

      // Fetch sample data for each data source that's missing
      for (const source of missingSampleData) {
        try {
          console.log('[EditMode] Fetching sample data for:', source.name);
          await handleTestDataSource(source);
          console.log('[EditMode] Successfully fetched sample data for:', source.name);
        } catch (error) {
          console.warn('[EditMode] Failed to fetch sample data for:', source.name, error);
          // Don't fail completely - the user can manually test the connection
        }
      }
    };

    // Small delay to let formData be fully populated first
    const timeoutId = setTimeout(fetchSampleDataForExistingSources, 500);
    return () => clearTimeout(timeoutId);
  }, [editAgent, open, sampleData]);

  const renderOutputFormat = () => {
    return (
      <OutputFormatStep
        formData={formData}
        setFormData={setFormData}
        sampleData={sampleData}
        onTestDataSource={handleTestDataSource}
        isCreateMode={!editAgent}
      />
    );
  };

  const renderTransformations = () => {
    return (
      <TransformationStep
        formData={formData}
        setFormData={setFormData}
        sampleData={sampleData}
      />
    );
  };


  const renderReview = () => {
    const IconComponent = formData.dataType ? dataTypeIcons[formData.dataType] : null;

    return (
      <div className="space-y-4">
        {/* Deployment Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Deployment Settings</h3>

          <div>
            <Label htmlFor="review-name">Agent Name *</Label>
            <Input
              id="review-name"
              value={formData.name || ''}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                // Auto-generate slug if it's empty or matches the previous auto-generated slug
                if (!formData.slug || formData.slug === generateSlugFromName(formData.name || '')) {
                  setFormData(prev => ({ ...prev, slug: generateSlugFromName(e.target.value) }));
                }
              }}
              placeholder="e.g., Breaking News Feed"
            />
          </div>

          <div>
            <Label htmlFor="review-slug">URL Slug *</Label>
            <div className="space-y-2">
              <Input
                id="review-slug"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="my-api-endpoint"
                className={slugExists ? 'border-red-500' : ''}
              />
              {checkingSlug && (
                <div className="text-sm text-muted-foreground">
                  Checking availability...
                </div>
              )}
              {slugExists && !checkingSlug && (
                <div className="text-sm text-red-500">
                  This slug is already in use. Please choose a different one.
                </div>
              )}
              {formData.slug && !slugExists && !checkingSlug && (
                <div className="bg-muted p-2 rounded text-sm">
                  <span className="text-muted-foreground">Your API will be available at:</span>{' '}
                  <code className="text-foreground">/api/{formData.slug}</code>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="review-environment">Environment</Label>
            <Select
              value={formData.environment || 'production'}
              onValueChange={(value) => setFormData({ ...formData, environment: value as 'production' | 'staging' | 'development' })}
            >
              <SelectTrigger id="review-environment">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Apps (optional)</Label>
            <p className="text-sm text-muted-foreground mb-2">Select which apps this endpoint is built for</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(formData.targetApps || []).length > 0 ? (
                      (formData.targetApps || []).map(appId => {
                        const appLabels: Record<string, string> = {
                          'nova-gfx': 'Nova GFX',
                          'pulsar-vs': 'Pulsar VS',
                          'fusion': 'Fusion',
                          'pulsar-mcr': 'Pulsar MCR'
                        };
                        return (
                          <Badge key={appId} variant="secondary" className="text-xs">
                            {appLabels[appId] || appId}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">Select target apps...</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                {[
                  { id: 'nova-gfx', label: 'Nova GFX' },
                  { id: 'pulsar-vs', label: 'Pulsar VS' },
                  { id: 'fusion', label: 'Fusion' },
                  { id: 'pulsar-mcr', label: 'Pulsar MCR' }
                ].map(app => (
                  <DropdownMenuCheckboxItem
                    key={app.id}
                    checked={(formData.targetApps || []).includes(app.id)}
                    onCheckedChange={(checked) => {
                      const current = formData.targetApps || [];
                      const updated = checked
                        ? [...current, app.id]
                        : current.filter(id => id !== app.id);
                      setFormData({ ...formData, targetApps: updated });
                    }}
                  >
                    {app.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="review-auto-start"
                checked={formData.autoStart !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, autoStart: checked })}
              />
              <Label htmlFor="review-auto-start" className="cursor-pointer">
                Auto-start endpoint after deployment
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="review-generate-docs"
                checked={formData.generateDocs !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, generateDocs: checked })}
              />
              <Label htmlFor="review-generate-docs" className="cursor-pointer">
                Generate API documentation
              </Label>
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Configuration Summary
            </h4>

            {/* Basic Info */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Agent Name</p>
              <p className="font-medium">{formData.icon} {formData.name}</p>
              {formData.description && (
                <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
              )}
            </div>

            {/* URL Slug */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">URL Slug</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/{formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}</code>
            </div>

            {/* Environment & Deployment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Environment</p>
                <p className="font-medium capitalize">{formData.environment || 'production'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Auto-start</p>
                <p className="font-medium">{formData.autoStart ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Generate Docs</p>
                <p className="font-medium">{formData.generateDocs ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="font-medium">{formData.status}</p>
              </div>
            </div>

            {/* Target Apps */}
            {formData.targetApps && formData.targetApps.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Target Apps</p>
                <div className="flex flex-wrap gap-2">
                  {formData.targetApps.map(appId => {
                    const appLabels: Record<string, string> = {
                      'nova-gfx': 'Nova GFX',
                      'pulsar-vs': 'Pulsar VS',
                      'fusion': 'Fusion',
                      'pulsar-mcr': 'Pulsar MCR'
                    };
                    return (
                      <Badge key={appId} variant="secondary">
                        {appLabels[appId] || appId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Type */}
            {formData.dataType && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Type</p>
                <div className="flex items-center gap-2">
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  <span className="font-medium">{formData.dataType}</span>
                </div>
              </div>
            )}

            {/* Data Sources */}
            {formData.dataSources && formData.dataSources.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Sources</p>
                <div className="flex flex-wrap gap-2">
                  {formData.dataSources.map(source => (
                    <Badge key={source.id} variant="outline">
                      {source.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Relationships */}
            {formData.relationships && formData.relationships.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Relationships</p>
                <p className="text-sm">{formData.relationships.length} relationship(s) defined</p>
              </div>
            )}

            {/* Output Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Output Format</p>
                <p className="font-medium">{formData.format}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cache Duration</p>
                <p className="font-medium">{formData.cache}</p>
              </div>
            </div>

            {/* Field Mappings */}
            {formData.fieldMappings && formData.fieldMappings.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Field Mappings</p>
                <p className="text-sm">{formData.fieldMappings.length} field(s) mapped</p>
              </div>
            )}

            {/* Transformations */}
            {formData.transforms && formData.transforms.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Transformations</p>
                <div className="flex flex-wrap gap-2">
                  {formData.transforms.map((t, i) => (
                    <Badge key={i} variant="outline" className="capitalize">
                      {t.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Security</p>
              <div className="space-y-1 text-sm">
                <p>Authentication: {formData.requiresAuth ? formData.auth : 'None'}</p>
              </div>
            </div>

            {/* Generated URL */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Generated Endpoint</p>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {novaApiBaseUrl}/api/{formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-')}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic':
        return 'Basic Information';
      case 'dataType':
        return 'Data Type';
      case 'dataSources':
        return 'Data Sources';
      case 'configureNewSources':
        // Check if Nova Weather, Nova Election, or Nova Finance is selected and if in edit mode
        const selectedDataTypes = Array.isArray(formData.dataType) ? formData.dataType : (formData.dataType ? [formData.dataType] : []);
        if (selectedDataTypes.includes('Nova Weather') || selectedDataTypes.includes('Nova Election') || selectedDataTypes.includes('Nova Finance')) {
          return editAgent ? 'Configure Data Source' : 'Configure New Sources';
        }
        return 'Configure New Sources';
      case 'relationships':
        return 'Data Relationships';
      case 'outputFormat':
        return 'Output Format';
      case 'transformations':
        return 'Transformations';
      case 'security':
        return 'Security';
      case 'test':
        return 'Test';
      case 'review':
        return 'Review & Create';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'basic':
        return 'Give your agent a name and description';
      case 'dataType':
        return 'Choose the category of data to work with';
      case 'dataSources':
        return 'Select specific feeds to aggregate';
      case 'configureNewSources':
        return 'Configure connection details for new data sources';
      case 'relationships':
        return 'Define how sources relate to each other';
      case 'outputFormat':
        return 'Configure the output format and field mappings';
      case 'transformations':
        return 'Add optional data transformations';
      case 'security':
        return 'Configure authentication and caching';
      case 'test':
        return 'Test your API endpoint before deploying';
      case 'review':
        return 'Review your configuration before creating';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto"
        ref={dialogContentRef}
        onScroll={saveScrollPosition}
        onInteractOutside={(e: Event) => {
          // Prevent closing on overlay click in create mode
          if (!editAgent) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>
                {editAgent ? 'Edit Agent' : 'Create New Agent'}
              </DialogTitle>
              <DialogDescription>
                {getStepDescription()}
              </DialogDescription>
            </div>
            {editAgent && (
              <Button onClick={() => handleSave(false)} size="sm" className="ml-4 mr-4" disabled={isSaving}>
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[400px]">
          <h3 className="mb-4">{getStepTitle()}</h3>
          {currentStep === 'basic' && renderBasicInfo()}
          {currentStep === 'dataType' && renderDataType()}
          {currentStep === 'dataSources' && renderDataSources()}
          {currentStep === 'configureNewSources' && renderConfigureNewSources()}
          {currentStep === 'relationships' && renderRelationships()}
          {currentStep === 'outputFormat' && renderOutputFormat()}
          {currentStep === 'transformations' && renderTransformations()}
          {currentStep === 'security' && (
            <SecurityStep
              ref={securityStepRef}
              formData={formData}
              setFormData={setFormData}
              agentId={editAgent?.id}
            />
          )}
          {currentStep === 'test' && (
            <TestStep formData={formData} onSaveTest={handleSaveTest} />
          )}
          {currentStep === 'review' && renderReview()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {currentStepIndex < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={!isStepValid() || isSavingDataSources}>
                {isSavingDataSources ? 'Saving...' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => handleSave()} disabled={!isStepValid() || isSaving}>
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : (editAgent ? 'Save Changes' : 'Create Agent')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
