import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Card,
  CardContent,
  SelectChangeEvent,
  Tooltip,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  BugReport as DebugIcon,
  Image as ImageIcon,
  Collections as LibraryIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Terminal as TerminalIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import {
  loadAIImageGenSettings,
  saveAIImageGenSettings,
  callGoogleAPIViaProxy,
  storeImageInSupabase,
  GEMINI_MODELS,
  IMAGEN_MODELS,
  ASPECT_RATIOS,
  AISettings
} from '../types/aiImageGen';

interface StyleInfo {
  Name: string;
  Theme: string;
  Type: string;
  Description: string;
  MaterialRef: string;
  MaterialID: string;
}

interface ActorInfo {
  actorName: string;
  tags: string;
  description: string;
  section: string;
}

interface ActorDetail {
  Name: string;
  ActorName: string;
  Tags: string;
  Description: string;
  Section: string;
  "Blueprint Actor": string;
  Location: {
    X: number;
    Y: number;
    Z: number;
  };
  Rotation: {
    Pitch: number;
    Yaw: number;
    Roll: number;
  };
}

interface SceneDescriptor {
  Sections: string[];
  Styles: StyleInfo[];
  ActorTags: Record<string, string>;
  ActorDetails?: ActorDetail[];
}

interface SceneParameters {
  Floor?: string;
  WallLeft?: string;
  WallBack?: string;
  WallRight?: string;
  Platform?: string;
  Columns?: string;
  Roof?: string;
  Back?: string;
  Screen?: string;
  Backdrop?: string;
  summary?: string; // AI-generated summary of what was created/changed
}

interface AvailableOptions {
  Floor: string[];
  WallLeft: string[];
  WallBack: string[];
  WallRight: string[];
  Platform: string[];
  Columns: string[];
  Roof: string[];
  Back: string[];
  Screen: string[];
}

interface ChannelConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  objectPath?: string;  // Changed from presetId to objectPath
}

interface RCPObject {
  objectPath: string;
  name: string;
  type?: string;
}

interface RCPFunction {
  name: string;
  objectPath: string;
  description?: string;
}

export default function VirtualSetPage() {

  // State
  const [environmentPrompt, setEnvironmentPrompt] = useState('');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [environmentPromptHistory, setEnvironmentPromptHistory] = useState<string[]>([]);
  const [backgroundPromptHistory, setBackgroundPromptHistory] = useState<string[]>([]);
  const [assistantResponses, setAssistantResponses] = useState<string[]>([]); // AI-generated summaries for environment
  const [backgroundAssistantResponses, setBackgroundAssistantResponses] = useState<string[]>([]); // AI-generated summaries for background
  const environmentChatRef = useRef<HTMLDivElement>(null);
  const backgroundChatRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [isGeneratingEnvironment, setIsGeneratingEnvironment] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [generatedFields, setGeneratedFields] = useState<SceneParameters | null>(null);
  const [showGeneratedFields, setShowGeneratedFields] = useState(false);
  
  // Channel and connection
  const [selectedChannel, setSelectedChannel] = useState('');
  const [availableChannels, setAvailableChannels] = useState<ChannelConfig[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Scene data
  const [sceneDescriptor, setSceneDescriptor] = useState<SceneDescriptor | null>(null);
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneParameters | null>(null);
  const [recentBackdrops, setRecentBackdrops] = useState<string[]>([]);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string | null>(null); // Selected but not yet applied
  const [previewBackdrop, setPreviewBackdrop] = useState<string | null>(null); // Actually applied to Unreal
  const [pendingBackdrop, setPendingBackdrop] = useState<string | null>(null);
  
  // Feedback
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [backdropToDelete, setBackdropToDelete] = useState<string | null>(null);

  // Recent backdrops visibility
  const [showRecentBackdrops, setShowRecentBackdrops] = useState(true);

  // Advanced Settings
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [backgroundAspectRatio, setBackgroundAspectRatio] = useState('16:9');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState('gemini-2.5-flash-lite');
  const [selectedImagenModel, setSelectedImagenModel] = useState('imagen-4.0-fast-generate-001');

  // Manual JSON input (workaround for empty SetManagerJson property)
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [availableRCPObjects, setAvailableRCPObjects] = useState<RCPObject[]>([]);
  const [availableRCPFunctions, setAvailableRCPFunctions] = useState<RCPFunction[]>([]);
  const [boundSetVirtualSetFunction, setBoundSetVirtualSetFunction] = useState('');
  const [boundSetBackdropFunction, setBoundSetBackdropFunction] = useState('');
  const [isLoadingRCPObjects, setIsLoadingRCPObjects] = useState(false);

  // Load available channels on mount
  useEffect(() => {
    loadChannels();
    loadRecentBackdrops();
    loadSavedSettings();
  }, []);

  // Load saved advanced settings
  const loadSavedSettings = async () => {
    try {
      const settings = await loadAIImageGenSettings();

      // Update state from saved settings
      if (settings.virtualSet.defaultAspectRatio) {
        setBackgroundAspectRatio(settings.virtualSet.defaultAspectRatio);
      }
      if (settings.virtualSet.selectedGeminiModel) {
        setSelectedGeminiModel(settings.virtualSet.selectedGeminiModel);
      }
      if (settings.virtualSet.selectedImagenModel) {
        setSelectedImagenModel(settings.virtualSet.selectedImagenModel);
      }
      if (settings.virtualSet.boundSetVirtualSetFunction) {
        setBoundSetVirtualSetFunction(settings.virtualSet.boundSetVirtualSetFunction);
      }
      if (settings.virtualSet.boundSetBackdropFunction) {
        setBoundSetBackdropFunction(settings.virtualSet.boundSetBackdropFunction);
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }
  };
  
  // Load recent backdrops from Supabase
  const loadRecentBackdrops = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('vsimages')
        .list('', {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) {
        console.error('Error loading backdrops:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const urls = data.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('vsimages')
            .getPublicUrl(file.name);
          return publicUrl;
        });

        setRecentBackdrops(urls);

        // Set the first one as selected (but not applied)
        if (urls.length > 0) {
          setSelectedBackdrop(urls[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load recent backdrops:', error);
    }
  };

  // Check connection when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      checkConnection();
    }
  }, [selectedChannel]);

  // Save advanced settings whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const currentSettings = await loadAIImageGenSettings();

        const updatedSettings: AISettings = {
          ...currentSettings,
          virtualSet: {
            ...currentSettings.virtualSet,
            defaultAspectRatio: backgroundAspectRatio,
            selectedGeminiModel: selectedGeminiModel,
            selectedImagenModel: selectedImagenModel,
            boundSetVirtualSetFunction: boundSetVirtualSetFunction,
            boundSetBackdropFunction: boundSetBackdropFunction
          }
        };

        await saveAIImageGenSettings(updatedSettings);
      } catch (error) {
        console.error('Failed to save advanced settings:', error);
      }
    };

    // Only save if we have actual values (not initial empty state)
    if (backgroundAspectRatio || selectedGeminiModel || selectedImagenModel) {
      saveSettings();
    }
  }, [backgroundAspectRatio, selectedGeminiModel, selectedImagenModel, boundSetVirtualSetFunction, boundSetBackdropFunction]);

  // Initialize canvas when drawing mode is enabled
  useEffect(() => {
    if (isDrawingMode && canvasRef.current && selectedBackdrop) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }
  }, [isDrawingMode, selectedBackdrop]);

  const addDebugLog = (message: string) => {
    if (debugMode) {
      setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    }
  };

  const loadChannels = async () => {
    try {
      // Object paths for different scenarios
      // PIE (Play In Editor): /Game/Levels/UEDPIE_0_CleanLevel...
      // Standalone: /Game/Levels/CleanLevel...
      // The number after UEDPIE_ is the PIE session number (0, 1, 2, etc.)
      
      const channels: ChannelConfig[] = [
        {
          id: 'ue5-local',
          name: 'Unreal Engine (Local)',
          host: 'localhost',
          port: 30010,
          // This path will be tried with different PIE session numbers
          objectPath: '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1'
        },
        {
          id: 'ue5-remote',
          name: 'Unreal Engine (Remote)',
          host: '192.168.1.100',
          port: 30010,
          objectPath: '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1'
        }
      ];
      
      setAvailableChannels(channels);

      // Auto-select first channel if available
      if (channels.length > 0) {
        setSelectedChannel(channels[0].id);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      showSnackbar('Failed to load channels', 'error');
    }
  };

  const checkConnection = async () => {
    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) return;

    setIsConnecting(true);
    try {
      // Try to get RCP info via WebSocket
      const response = await sendRCPCommand('/remote/info', 'GET');

      if (response.status >= 200 && response.status < 300) {
        setIsConnected(true);
        addDebugLog(`Connected to ${channel.name}`);
        showSnackbar('Connected to Unreal Engine', 'success');

        // Fetch initial scene descriptor
        await fetchSceneDescriptor();
      } else {
        setIsConnected(false);
        showSnackbar('Failed to connect to Unreal Engine', 'error');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      addDebugLog(`Connection failed: ${error}`);
      showSnackbar('Connection failed', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchSceneDescriptor = async () => {
    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) {
      return;
    }

    try {
      // Try to fetch from RemoteController preset if it exists
      const url = '/remote/preset/RemoteController/property/SetManagerJSON';

      addDebugLog('Fetching scene descriptor from RemoteController preset...');

      // Fetch the SetManagerJson property via WebSocket
      const response = await sendRCPCommand(url, 'GET');

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch scene descriptor: ${response.status}`);
      }

      const data = response.data;
      
      // Extract the PropertyValue from the RCP response structure
      let setManagerrJson: string | null = null;
      
      // Handle the RCP response format: { ExposedPropertyDescription: {...}, PropertyValues: [...] }
      if (data.PropertyValues && Array.isArray(data.PropertyValues) && data.PropertyValues.length > 0) {
        setManagerrJson = data.PropertyValues[0].PropertyValue;
      } 
      // Fallback to simpler formats if the structure is different
      else if (data.propertyValue) {
        setManagerrJson = data.propertyValue;
      } 
      else if (data.PropertyValue) {
        setManagerrJson = data.PropertyValue;
      }
      else if (typeof data === 'string') {
        setManagerrJson = data;
      }
      
      if (!setManagerrJson || setManagerrJson.trim() === '') {
        console.error('SetManagerJson property is empty or not found');
        console.error('Response data:', data);

        // Log the actual object path being queried
        if (data.PropertyValues && data.PropertyValues[0]) {
          console.error('Object path queried:', data.PropertyValues[0].ObjectPath);
          console.error('TIP: If you see the value in UE GUI but not here, the ObjectPath might be different.');
          console.error('Click "Debug: Find All Instances" button to scan all possible paths.');
        }

        console.error('SOLUTION: The SetManagerJson property exists but has no value.');
        console.error('Please ensure the BP_SetManager_v4 blueprint has set the SetManagerJson property with the scene configuration.');
        throw new Error('SetManagerJson property is empty - Blueprint needs to populate this property with scene data');
      }

      // Trim whitespace and carriage returns, then parse the JSON string
      const trimmedJsonString = setManagerrJson.trim();

      const descriptor = JSON.parse(trimmedJsonString);

      setSceneDescriptor(descriptor);
      addDebugLog('Scene descriptor loaded');

      // Extract available options
      extractAvailableOptions(descriptor);

    } catch (error) {
      console.error('Failed to fetch scene descriptor:', error);
      console.warn('Could not fetch scene descriptor, using fallback options:', error);
      
      // Use fallback options when preset isn't available
      const fallbackOptions: AvailableOptions = {
        Floor: ['BP_Floor:Wood2', 'BP_Floor:Stone1', 'BP_Floor:Marble'],
        WallLeft: ['BP_WallLeft_Wood:Wood1', 'BP_WallLeft_Wood:Wood0', 'BP_WallLeft_Wood:Brick1'],
        WallBack: ['BP_Back_Glass:Glass1', 'BP_Back_Glass:Glass2'],
        WallRight: ['BP_WallRight_Wood:Wood1', 'BP_WallRight_Wood:Wood0', 'BP_WallRight_Wood:Brick1'],
        Platform: ['BP_Platform2'],
        Columns: ['Columns:Blue', 'Columns:Yellow0', 'Columns:White0'],
        Roof: ['BP_Roof_Glass:Glass1', 'BP_Roof_Glass:Glass2'],
        Back: ['BP_Back2'],
        Screen: []
      };

      setAvailableOptions(fallbackOptions);
      addDebugLog('Using fallback scene options (RemoteController preset not found)');
    }
  };

  const extractAvailableOptions = (descriptor: SceneDescriptor) => {
    const options: AvailableOptions = {
      Floor: [],
      WallLeft: [],
      WallBack: [],
      WallRight: [],
      Platform: [],
      Columns: [],
      Roof: [],
      Back: [],
      Screen: []
    };

    // Build a map of section -> actor info for faster lookups
    // Note: AllActorsWithTags keys are actor names, not section keys
    const sectionToActors: Record<string, ActorInfo[]> = {};

    Object.entries(descriptor.ActorTags).forEach(([actorName, jsonString]) => {
      try {
        const actorInfo: ActorInfo = JSON.parse(jsonString);

        // Extract the section from the tags field (e.g., ",CFG_S_WallLeft" -> "CFG_S_WallLeft")
        const sectionMatch = actorInfo.tags.match(/CFG_S_\w+/);
        if (sectionMatch) {
          const section = sectionMatch[0];
          if (!sectionToActors[section]) {
            sectionToActors[section] = [];
          }
          sectionToActors[section].push(actorInfo);
        } else {
          console.warn(`Actor ${actorName} has no valid section tag:`, actorInfo.tags);
        }
      } catch (e) {
        console.warn(`Failed to parse actor info for ${actorName}:`, e);
      }
    });

    Object.entries(sectionToActors).forEach(() => {
    });

    // Build Actor:Style combinations based on theme and type restrictions
    const buildOptionsForSection = (sectionKey: string): string[] => {
      const actors = sectionToActors[sectionKey];
      if (!actors) {
        return [];
      }

      const combinations: string[] = [];

      actors.forEach(actor => {
        const actorName = actor.actorName;

        // Check if actor name has a theme suffix (e.g., _Glass, _Wood, _Brick)
        // Extract only the material type from the last part (e.g., BP_WallLeft_Brick -> Brick)
        // Split by underscore and take the last part
        const parts = actorName.split('_');
        const lastPart = parts[parts.length - 1];

        // Only use as theme if it's a known material type (not a number or generic name)
        // Known materials: Glass, Wood, Brick
        const knownMaterials = ['Glass', 'Brick', 'Wood'];
        const actorTheme = knownMaterials.includes(lastPart) ? lastPart : null;

        // Extract the section type from actor.section field for type filtering
        const actorSectionType = actor.section;

        // Filter styles based on type and theme restrictions
        const compatibleStyles = descriptor.Styles.filter(style => {
          // First, check if the style type matches the actor's section type
          if (actorSectionType && style.Type && style.Type !== actorSectionType) {
            return false;
          }

          // Then check theme compatibility
          if (actorTheme) {
            // If actor has theme, only include styles matching that theme
            const isCompatible = style.Theme.includes(actorTheme);
            return isCompatible;
          }
          // Otherwise, all styles are compatible (as long as type matched)
          return true;
        });


        // Create combinations
        compatibleStyles.forEach(style => {
          combinations.push(`${actorName}:${style.Name}`);
        });
      });

      return combinations;
    };

    // Build options for each section from the schema
    options.Floor = buildOptionsForSection('CFG_S_Floor');
    options.WallLeft = buildOptionsForSection('CFG_S_WallLeft');
    options.WallBack = buildOptionsForSection('CFG_S_WallBack');
    options.WallRight = buildOptionsForSection('CFG_S_WallRight');
    options.Platform = buildOptionsForSection('CFG_S_Platform');
    options.Columns = buildOptionsForSection('CFG_S_Columns');
    options.Roof = buildOptionsForSection('CFG_S_Roof');
    options.Back = buildOptionsForSection('CFG_S_Back');
    options.Screen = buildOptionsForSection('CFG_S_Screen');

    setAvailableOptions(options);
    addDebugLog(`Extracted ${Object.values(options).reduce((sum, arr) => sum + arr.length, 0)} total options across all sections`);
    addDebugLog(`Options per section: Floor(${options.Floor.length}), WallLeft(${options.WallLeft.length}), WallBack(${options.WallBack.length}), WallRight(${options.WallRight.length}), Platform(${options.Platform.length}), Columns(${options.Columns.length}), Roof(${options.Roof.length}), Back(${options.Back.length}), Screen(${options.Screen.length})`);
  };

  const debugQueryAllInstances = async () => {
    const possiblePaths = [
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_2',
      '/Game/Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/-Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/-Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
    ];

    for (const path of possiblePaths) {
      try {
        // Try to read the property directly via object path
        const url = `/remote/object/property/read`;
        const response = await sendRCPCommand(url, 'PUT', {
          objectPath: path,
          propertyName: 'SetManagerJson'
        });

        if (response.status >= 200 && response.status < 300) {
          if (response.data && response.data.trim() !== '') {
            return { path, data: response.data };
          }
        }
      } catch (error) {
      }
    }

    return null;
  };

  const loadManualJson = () => {
    if (!manualJsonInput.trim()) {
      showSnackbar('Please paste JSON data first', 'warning');
      return;
    }

    try {
      const descriptor = JSON.parse(manualJsonInput.trim());

      setSceneDescriptor(descriptor);
      extractAvailableOptions(descriptor);

      showSnackbar('Scene descriptor loaded successfully!', 'success');
      addDebugLog('Manual JSON loaded successfully');

      // Clear the input after successful load
      setManualJsonInput('');
    } catch (error) {
      console.error('Failed to parse manual JSON:', error);
      showSnackbar('Invalid JSON format. Please check your input.', 'error');
    }
  };

  const generateEnvironment = async () => {
    if (!environmentPrompt.trim()) {
      showSnackbar('Please enter an environment description', 'warning');
      return;
    }

    if (!isConnected || !availableOptions) {
      showSnackbar('Not connected to Unreal Engine', 'error');
      return;
    }

    setIsGeneratingEnvironment(true);
    addDebugLog(`Generating environment for prompt: "${environmentPrompt}"`);

    try {
      const aiSettings = await loadAIImageGenSettings();

      if (!aiSettings.gemini.apiKey || aiSettings.gemini.apiKey === 'YOUR_GOOGLE_STUDIO_API_KEY') {
        throw new Error('Please configure your AI API key in Settings');
      }

      // Build a comprehensive prompt with descriptions
      const buildPromptSection = (sectionName: string, options: string[]): string => {
        if (!sceneDescriptor) return `${sectionName}: ${options.join(', ')}, ""`;

        const lines: string[] = [`\n${sectionName} options:`];

        // Group by actor
        const actorGroups: Record<string, string[]> = {};
        options.forEach(opt => {
          const [actorName] = opt.split(':');
          if (!actorGroups[actorName]) {
            actorGroups[actorName] = [];
          }
          actorGroups[actorName].push(opt);
        });

        Object.entries(actorGroups).forEach(([actorName, actorOptions]) => {
          // Get actor description and additional details from both ActorDetails and ActorTags
          let actorDesc = '';
          let actorTags = '';
          let actorSection = '';
          let blueprintActor = '';

          // Try to get info from ActorDetails first (more structured)
          if (sceneDescriptor.ActorDetails) {
            const actorDetail = sceneDescriptor.ActorDetails.find(
              detail => detail.ActorName === actorName
            );
            if (actorDetail) {
              actorDesc = actorDetail.Description || '';
              actorTags = actorDetail.Tags || '';
              actorSection = actorDetail.Section || '';
              blueprintActor = actorDetail['Blueprint Actor'] || '';
            }
          }

          // Also check ActorTags for additional context
          const sectionKey = Object.keys(sceneDescriptor.ActorTags).find(key => {
            try {
              const info = JSON.parse(sceneDescriptor.ActorTags[key]);
              return info.actorName === actorName;
            } catch {
              return false;
            }
          });

          if (sectionKey) {
            try {
              const actorInfo = JSON.parse(sceneDescriptor.ActorTags[sectionKey]);
              // Use ActorTags info if ActorDetails didn't provide it
              if (!actorDesc) actorDesc = actorInfo.description || '';
              if (!actorTags) actorTags = actorInfo.tags || '';
              if (!actorSection) actorSection = actorInfo.section || '';
            } catch {}
          }

          // Build actor description line with all available info
          let actorLine = `  ${actorName}`;
          if (actorDesc) {
            actorLine += ` - ${actorDesc}`;
          }
          if (actorTags) {
            const cleanTags = actorTags.replace(/^,/, '').trim();
            if (cleanTags && cleanTags !== actorSection) {
              actorLine += ` [Tags: ${cleanTags}]`;
            }
          }
          if (blueprintActor && blueprintActor !== 'None') {
            const blueprintName = blueprintActor.split('/').pop()?.replace(/'/g, '') || blueprintActor;
            actorLine += ` (Blueprint: ${blueprintName})`;
          }

          lines.push(actorLine);

          // List compatible styles
          actorOptions.forEach(opt => {
            const [, styleName] = opt.split(':');
            const style = sceneDescriptor.Styles.find(s => s.Name === styleName);
            if (style) {
              // Clean up NSLOCTEXT format
              const cleanDesc = style.Description.replace(/NSLOCTEXT\([^)]+\)/g, '').replace(/"/g, '').trim();
              lines.push(`    - ${opt}: ${cleanDesc}`);
            } else {
              lines.push(`    - ${opt}`);
            }
          });
        });

        lines.push('  - "" (empty/disabled)');
        return lines.join('\n');
      };

      const systemPrompt = `Virtual set designer AI. Select Actor:Style combinations based on user description.

FORMAT: Each parameter uses "<ActorName>:<StyleName>" format.
${buildPromptSection('Floor', availableOptions.Floor)}
${buildPromptSection('WallLeft', availableOptions.WallLeft)}
${buildPromptSection('WallBack', availableOptions.WallBack)}
${buildPromptSection('WallRight', availableOptions.WallRight)}
${buildPromptSection('Platform', availableOptions.Platform)}
${buildPromptSection('Columns', availableOptions.Columns)}
${buildPromptSection('Roof', availableOptions.Roof)}
${buildPromptSection('Back', availableOptions.Back)}
${buildPromptSection('Screen', availableOptions.Screen)}

RULES:
- This is an ITERATIVE process - build upon existing scene configuration
- ONLY modify parameters explicitly mentioned by user
- PRESERVE values for unmentioned parameters from current scene
- Use "" (empty string) to explicitly disable/remove an element
- Empty = element disabled/hidden

MATERIAL/STYLE INFERENCE RULES:
- When user says "glass room", "glass set", or "glass walls", apply glass material to: WallLeft, WallRight, WallBack, Roof, Floor
- When user says "wood room", "wood set", or "wood walls", apply wood material to: WallLeft, WallRight, WallBack, Roof, Floor
- When user says "brick room", "brick set", or "brick walls", apply brick material to: WallLeft, WallRight, WallBack, Roof, Floor
- ANY mention of "room" or "set" with a material means apply that material to ALL structural surfaces (walls, floor, roof)
- If user explicitly mentions a specific wall or surface, that overrides the room-wide material
- Example: "glass room with wood floor" means glass walls/roof but wood floor
- Example: "wood set but glass back wall" means wood on all walls/floor/roof except WallBack which is glass

ACTOR SELECTION RULES FOR BACK PARAMETER:
- Back1 = ARCH/ARCHWAY - use when user mentions: "arch", "archway", "arched", "curved opening", "framed backdrop"
- Back2 = BACKDROP PILLARS/PANELS - use when user mentions: "pillar" OR "pillars" in the BACK/BACKDROP context, "vertical panels", "panel backdrop", "tall panels behind"

CRITICAL DISTINCTION - Columns vs Back:
- "Columns" parameter = FRONT columns with spotlights (BP_Columns2Front, BP_Columns2Back, BP_Columns4)
- "Back" parameter = BACKDROP elements behind the scene (Back1=arch, Back2=pillars/panels)
- When user says "pillars" or "pillar" → DEFAULT to Back2 (backdrop pillars) NOT Columns
- When user says "columns" or explicitly mentions "spotlights" or "front columns" → use Columns parameter
- If ambiguous, prefer Back2 for "pillars" since it's more commonly requested

OTHER RULES:
- Consider actor descriptions when matching user intent
- Consider style descriptions when choosing materials
- Actors with theme suffix (e.g., _Glass) are restricted to matching theme styles
- Return valid JSON with ALL section keys PLUS a "summary" field explaining what you created/changed

Example response with arch: {"Floor":"BP_Floor:Wood2","WallLeft":"BP_WallLeft_Wood:Wood1","WallBack":"BP_Back_Glass:Glass1","WallRight":"","Platform":"BP_Platform2","Columns":"","Roof":"BP_Roof_Glass:Glass1","Back":"Back1:Wood1","Screen":"","summary":"I created a modern glass room with wooden floors and a wooden arch backdrop. The glass walls and roof create an open, airy atmosphere while the wood floor and arch add warmth."}

Example response with pillars (BACK2 not Columns): {"Floor":"BP_Floor:Stone1","WallLeft":"BP_WallLeft_Brick:Brick1","WallBack":"BP_WallBack_Brick:Brick1","WallRight":"BP_WallRight_Brick:Brick1","Platform":"","Columns":"","Roof":"BP_BrickRoof:Brick0","Back":"Back2:Brick1","Screen":"","summary":"I created an industrial brick set with stone flooring and pillar backdrop panels for added depth and texture."}

Example with front columns (not pillars): {"Floor":"BP_Floor:Wood3","WallLeft":"BP_WallLeft_Wood:Wood1","WallBack":"","WallRight":"BP_WallRight_Wood:Wood1","Platform":"BP_Platform1:Blue","Columns":"Four Columns:Wood1","Roof":"","Back":"","Screen":"","summary":"I created a warm wood set with four front columns featuring spotlights and a circular blue platform."}`;

      // Build context about current scene for iterative updates
      const currentSceneContext = currentScene
        ? `\n\nCURRENT SCENE STATE:\n${JSON.stringify(currentScene, null, 2)}\n\nIMPORTANT: Keep existing values unless the user explicitly wants to change them.`
        : '\n\nThis is a new scene - set only the mentioned elements.';

      const userPrompt = `Request: "${environmentPrompt}"${currentSceneContext}
Return JSON preserving current values, only updating what's mentioned. Use "" to explicitly remove elements.
IMPORTANT: Include a "summary" field with a friendly 1-2 sentence explanation of what you created or changed.`;


      addDebugLog('Sending request to AI...');

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedGeminiModel}:generateContent?key=${aiSettings.gemini.apiKey}`;
      const requestBody = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more deterministic output
          maxOutputTokens: 500, // Increased from 200 to handle complete JSON responses
          responseMimeType: "application/json"
        }
      };

      // Call AI API via proxy (using Google Gemini)
      const data = await callGoogleAPIViaProxy(apiUrl, 'POST', { 'Content-Type': 'application/json' }, requestBody);
      
      // Check for MAX_TOKENS error
      if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error('AI response was cut off - token limit too low. Please try a simpler prompt.');
      }
      
      // Extract the generated JSON from the response
      let sceneParams: SceneParameters;
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = data.candidates[0].content.parts[0].text;
        
        try {
          sceneParams = JSON.parse(responseText);
          addDebugLog(`AI response: ${JSON.stringify(sceneParams)}`);
        } catch (parseError) {
          // Try to extract JSON from the text if it's wrapped in other content
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            sceneParams = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('AI did not return valid JSON');
          }
        }
      } else {
        
        // Check if it's a known error condition
        if (data.candidates?.[0]?.finishReason) {
          throw new Error(`AI response failed: ${data.candidates[0].finishReason}`);
        }
        
        throw new Error('Unexpected AI response format - no content returned');
      }

      // Validate the response

      // Check if at least some parameters are set (not all empty)
      const hasAnyContent = sceneParams.Floor || sceneParams.WallLeft ||
                           sceneParams.WallRight || sceneParams.WallBack || sceneParams.Platform ||
                           sceneParams.Columns || sceneParams.Roof || sceneParams.Back ||
                           sceneParams.Screen;

      if (!hasAnyContent) {
        throw new Error('AI response has no parameters set - at least one element must be configured');
      }

      // Generate additional context about changes
      let assistantSummary = sceneParams.summary || '';

      // Add change details if we have a previous scene
      if (currentScene) {
        const changes: string[] = [];
        const paramKeys: (keyof SceneParameters)[] = ['Floor', 'WallLeft', 'WallRight', 'WallBack', 'Platform', 'Columns', 'Roof', 'Back', 'Screen'];

        paramKeys.forEach(key => {
          const oldVal = currentScene[key];
          const newVal = sceneParams[key];

          if (oldVal !== newVal && newVal !== undefined) {
            if (newVal === '') {
              changes.push(`Removed ${key}`);
            } else if (oldVal === '' || !oldVal) {
              changes.push(`Added ${key}: ${newVal}`);
            } else {
              changes.push(`Changed ${key}`);
            }
          }
        });

        if (changes.length > 0 && !assistantSummary) {
          assistantSummary = `Updated: ${changes.join(', ')}`;
        }
      }

      // Store generated fields (keep hidden until user clicks Show)
      setGeneratedFields(sceneParams);

      // Apply the scene parameters immediately
      await applySceneParameters(sceneParams);

      // Add to prompt history and assistant responses for iterative context
      setEnvironmentPromptHistory(prev => [...prev, environmentPrompt]);
      setAssistantResponses(prev => [...prev, assistantSummary || 'Scene updated successfully']);

      // Clear the input field
      setEnvironmentPrompt('');

      // Scroll to bottom of chat
      setTimeout(() => {
        if (environmentChatRef.current) {
          environmentChatRef.current.scrollTop = environmentChatRef.current.scrollHeight;
        }
      }, 100);

    } catch (error) {
      console.error('Environment generation error:', error);
      addDebugLog(`Error: ${error}`);
      showSnackbar(`Failed to generate environment: ${error}`, 'error')
    } finally {
      setIsGeneratingEnvironment(false);
    }
  };

  const applySceneParameters = async (params: SceneParameters) => {
    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) return;

    try {
      // Create the request body for ChangeScene with all parameters
      // IMPORTANT: Parameter names must match exactly what the function expects
      const requestBody = {
        Parameters: {
          WallLeft: params.WallLeft || "",
          WallRight: params.WallRight || "",
          WallBack: params.WallBack || "",
          Back: params.Back || "",
          Platform: params.Platform || "",
          Roof: params.Roof || "",
          Screen: params.Screen || "",
          Columns: params.Columns || "",
          Floor: params.Floor || ""
        }
      };

      // Use bound function if set, otherwise use default
      const url = boundSetVirtualSetFunction || `/remote/preset/RemoteController/function/Change%20Scene`;

      const response = await sendRCPCommand(url, 'PUT', requestBody);

      if (response.status >= 200 && response.status < 300) {
        setCurrentScene(params);
        addDebugLog('Scene parameters applied successfully');
        showSnackbar('Scene updated successfully!', 'success');
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to apply scene parameters:', error);
      
      // Fallback: Try object/call method if preset doesn't work
      await applySceneParametersViaObject(params);
    }
  };
  
  // Fallback method using object paths
  const applySceneParametersViaObject = async (params: SceneParameters) => {
    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) return;

    const objectPaths = [
      '/Game/Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/UEDPIE_1_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/UEDPIE_2_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/UEDPIE_3_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1'
    ];

    for (const objectPath of objectPaths) {
      try {
        const requestBody = {
          objectPath: objectPath,
          functionName: "ChangeScene",
          parameters: {
            WallLeft: params.WallLeft || "",
            WallRight: params.WallRight || "",
            WallBack: params.WallBack || "",
            Back: params.Back || "",
            Platform: params.Platform || "",
            Roof: params.Roof || "",
            Screen: params.Screen || "",
            Columns: params.Columns || "",
            Floor: params.Floor || ""
          }
        };

        const response = await sendRCPCommand('/remote/object/call', 'PUT', requestBody);

        if (response.status >= 200 && response.status < 300) {
          setCurrentScene(params);
          addDebugLog('Scene parameters applied successfully via object path');
          showSnackbar('Scene updated successfully!', 'success');
          return;
        }
      } catch (error) {
      }
    }

    // If we get here, all methods failed
    console.error('Failed to call ChangeScene - all methods failed');
    addDebugLog('Failed to apply scene parameters - check console for details');
    showSnackbar('Failed to update scene - check configuration', 'error');
  };

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convert canvas annotations to a black/white mask for Vertex AI inpainting
  const getMaskFromAnnotations = async (): Promise<string | null> => {
    if (!selectedBackdrop || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const maskCanvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve) => {
      img.onload = () => {
        // Set mask canvas to match image dimensions
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Fill with black (areas to keep)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Draw annotations canvas scaled to image size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve(null);
          return;
        }
        tempCtx.drawImage(canvas, 0, 0);

        // Get annotation pixels
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Create scaled mask - white where annotations exist
        ctx.fillStyle = 'white';
        const scaleX = maskCanvas.width / canvas.width;
        const scaleY = maskCanvas.height / canvas.height;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const alpha = data[i + 3];

            // If pixel has any annotation (alpha > 0), mark as white in mask
            if (alpha > 0) {
              ctx.fillRect(
                Math.floor(x * scaleX),
                Math.floor(y * scaleY),
                Math.ceil(scaleX) + 1,
                Math.ceil(scaleY) + 1
              );
            }
          }
        }

        // Convert to base64 PNG
        resolve(maskCanvas.toDataURL('image/png'));
      };
      img.src = selectedBackdrop;
    });
  };

  const generateBackgroundImage = async () => {
    if (!backgroundPrompt.trim()) {
      showSnackbar('Please enter a background description', 'warning');
      return;
    }

    setIsGeneratingBackground(true);

    try {
      const aiSettings = await loadAIImageGenSettings();

      if (!aiSettings.imagen.apiKey || aiSettings.imagen.apiKey === 'YOUR_GOOGLE_STUDIO_API_KEY') {
        throw new Error('Please configure your AI API key in Settings');
      }

      // Check if there are annotations
      let hasAnnotations = false;
      if (isDrawingMode && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        hasAnnotations = imageData?.data.some(pixel => pixel !== 0) || false;
      }

      // If we have a selected backdrop, use Gemini 2.5 Flash Image for editing (with or without annotations)
      if (selectedBackdrop) {
        addDebugLog(`Using Gemini 2.5 Flash Image for image editing${hasAnnotations ? ' with annotations' : ''}`);

        // Load the base image
        const baseImageResponse = await fetch(selectedBackdrop);
        const baseImageBlob = await baseImageResponse.blob();
        const baseImageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(baseImageBlob);
        });

        // Get the mask/annotations
        const maskBase64 = await getMaskFromAnnotations();

        // Extract base64 data without data URL prefix
        const baseImageData = baseImageBase64.split(',')[1];
        const baseImageMimeType = baseImageBlob.type || 'image/jpeg';

        // Build the prompt for Gemini
        const editPrompt = maskBase64
          ? `${backgroundPrompt} (Note: The second image contains hand-drawn annotations indicating areas to modify. Please interpret these as guidance and remove all drawing marks from the final output - provide a clean image without any visible annotations)`
          : `Edit the provided image based on this request: ${backgroundPrompt}. Keep the overall composition and style but make the requested changes.`;

        // Call Gemini 2.5 Flash Image API
        const geminiImageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${aiSettings.gemini.apiKey}`;

        const parts: any[] = [
          {
            inlineData: {
              mimeType: baseImageMimeType,
              data: baseImageData
            }
          }
        ];

        // Add mask if it exists
        if (maskBase64) {
          const maskImageData = maskBase64.split(',')[1];
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: maskImageData
            }
          });
        }

        // Add text prompt
        parts.push({ text: editPrompt });

        const geminiImageRequestBody = {
          contents: [{
            parts
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: backgroundAspectRatio
            }
          }
        };

        const geminiImageData = await callGoogleAPIViaProxy(
          geminiImageApiUrl,
          'POST',
          { 'Content-Type': 'application/json' },
          geminiImageRequestBody
        );

        // Extract the edited image from response
        const firstCandidate = geminiImageData.candidates?.[0];

        if (!firstCandidate?.content?.parts?.length) {
          throw new Error('No image data in Gemini response');
        }

        const imagePart = firstCandidate.content.parts.find((p: any) => p.inlineData);

        if (!imagePart?.inlineData?.data) {
          throw new Error('No inline image data found in response');
        }

        const base64Image = imagePart.inlineData.data;

        // Store in Supabase
        const publicUrl = await storeImageInSupabase(base64Image);

        if (!publicUrl) {
          throw new Error('Failed to store edited image');
        }

        showSnackbar('Background edited successfully!', 'success');
        addDebugLog(`Edited image stored at: ${publicUrl}`);

        // Add to recent backdrops and set as selected
        setRecentBackdrops(prev => [publicUrl, ...prev.filter(url => url !== publicUrl)].slice(0, 10));
        setSelectedBackdrop(publicUrl);

        // Generate AI summary for the edit using Gemini
        let editSummary = '';
        try {
          const summaryPrompt = `You edited a backdrop image based on this request: "${backgroundPrompt}". The user drew annotations on specific areas to highlight what to change. Write a friendly 1-2 sentence summary of what changes you made to the image.`;

          const summaryApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.gemini.textModel}:generateContent?key=${aiSettings.gemini.apiKey}`;
          const summaryRequestBody = {
            contents: [{
              parts: [{ text: summaryPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 150
            }
          };

          const summaryData = await callGoogleAPIViaProxy(summaryApiUrl, 'POST', { 'Content-Type': 'application/json' }, summaryRequestBody);

          if (summaryData.candidates?.[0]?.content?.parts?.[0]?.text) {
            editSummary = summaryData.candidates[0].content.parts[0].text.trim();
          }
        } catch (error) {
          console.error('Failed to generate edit summary:', error);
        }

        // Add to prompt history and assistant responses
        setBackgroundPromptHistory(prev => [...prev, backgroundPrompt]);
        const finalEditSummary = editSummary || `✓ Image edited with your annotations${maskBase64 ? ' and applied changes' : ''}`;
        setBackgroundAssistantResponses(prev => [...prev, finalEditSummary]);

        // Clear the input field and annotations
        setBackgroundPrompt('');
        if (isDrawingMode) {
          clearDrawing();
          setIsDrawingMode(false);
        }

        // Scroll to bottom of chat
        setTimeout(() => {
          if (backgroundChatRef.current) {
            backgroundChatRef.current.scrollTop = backgroundChatRef.current.scrollHeight;
          }
        }, 100);

        setIsGeneratingBackground(false);
        return;
      }

      // Prepare image generation prompt - keep it iterative by maintaining context
      const baseContext = previewBackdrop
        ? `Building upon the current landscape, create a variation: `
        : `Create a landscape image showing: `;

      const imagePrompt = `${baseContext}${backgroundPrompt}. IMPORTANT: Style: photorealistic, professional quality, high resolution.`;

      // Call Google Imagen API via fetch-proxy to avoid CORS issues
      const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedImagenModel}:predict?key=${aiSettings.imagen.apiKey}`;

      const requestBody = {
        instances: [
          {
            prompt: imagePrompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: backgroundAspectRatio,
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult"
        }
      };

      // Get Supabase session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please sign in.');
      }

      // Call fetch-proxy
      const proxyUrl = `${import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-proxy`;
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: imagenApiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        })
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const proxyResponse = await response.json();

      if (proxyResponse.status !== 200) {
        throw new Error(`Image generation failed: ${proxyResponse.status}`);
      }

      const data = proxyResponse.data;

      // Imagen API returns predictions array with generated_images
      if (data.predictions && data.predictions.length > 0) {
        // Get the generated image (base64) from predictions
        const prediction = data.predictions[0];
        const imageData = prediction.bytesBase64Encoded || prediction.generated_images?.[0]?.bytesBase64Encoded;

        if (!imageData) {
          console.error('No image data in prediction:', prediction);
          throw new Error('No image data in API response');
        }

        const base64Image = imageData.startsWith('data:')
          ? imageData.split(',')[1]
          : imageData;

        // Convert base64 to blob
        const byteCharacters = atob(base64Image);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Upload to Supabase storage
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backdrop-${timestamp}.png`;

        // Upload the image (bucket should already exist, created by admin)
        const { error: uploadError } = await supabase.storage
          .from('vsimages')
          .upload(filename, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Upload failed:', uploadError);
          throw new Error('Failed to upload image to storage');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('vsimages')
          .getPublicUrl(filename);

        // Add to recent backdrops and set as selected
        setRecentBackdrops(prev => [publicUrl, ...prev.filter(url => url !== publicUrl)].slice(0, 10));
        setSelectedBackdrop(publicUrl);

        // Generate AI summary using Gemini
        let aiSummary = '';
        try {
          const summaryPrompt = backgroundPromptHistory.length > 0
            ? `You generated a backdrop image based on this request: "${backgroundPrompt}". This is variation ${backgroundPromptHistory.length + 1} building on previous backdrops. Write a friendly 1-2 sentence summary of what you created, focusing on the key visual elements and atmosphere.`
            : `You generated a backdrop image based on this request: "${backgroundPrompt}". Write a friendly 1-2 sentence summary of what you created, focusing on the key visual elements and atmosphere.`;

          const summaryApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.gemini.textModel}:generateContent?key=${aiSettings.gemini.apiKey}`;
          const summaryRequestBody = {
            contents: [{
              parts: [{ text: summaryPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 150
            }
          };

          const summaryData = await callGoogleAPIViaProxy(summaryApiUrl, 'POST', { 'Content-Type': 'application/json' }, summaryRequestBody);

          if (summaryData.candidates?.[0]?.content?.parts?.[0]?.text) {
            aiSummary = summaryData.candidates[0].content.parts[0].text.trim();
          }
        } catch (error) {
          console.error('Failed to generate summary:', error);
          // Fallback to generic message
        }

        // Add to prompt history and assistant responses for iterative context
        setBackgroundPromptHistory(prev => {
          const updatedHistory = [...prev, backgroundPrompt];

          // Use AI summary or fallback to generic message
          const finalSummary = aiSummary || (prev.length > 0
            ? `✓ Background image generated successfully (Building on ${prev.length} previous variation${prev.length > 1 ? 's' : ''})`
            : '✓ Background image generated successfully');

          setBackgroundAssistantResponses(prevResponses =>
            [...prevResponses, finalSummary]
          );

          return updatedHistory;
        });

        // Clear the input field and annotations
        setBackgroundPrompt('');
        if (isDrawingMode) {
          clearDrawing();
          setIsDrawingMode(false);
        }

        // Scroll to bottom of chat
        setTimeout(() => {
          if (backgroundChatRef.current) {
            backgroundChatRef.current.scrollTop = backgroundChatRef.current.scrollHeight;
          }
        }, 100);

        showSnackbar('Background image generated! Click "Apply to Virtual Set" to use it.', 'success');
        addDebugLog(`Backdrop set: ${publicUrl}`);
      } else {
        throw new Error('No images returned from AI');
      }
    } catch (error) {
      console.error('Background generation error:', error);
      showSnackbar(`Failed to generate background: ${error}`, 'error');
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const acceptBackdrop = async () => {
    if (!pendingBackdrop) return;

    // Check connection to Unreal Engine
    if (!isConnected) {
      showSnackbar('Not connected to Unreal Engine - image saved but not applied', 'warning');
      setRecentBackdrops(prev => [pendingBackdrop, ...prev.filter(url => url !== pendingBackdrop)].slice(0, 10));
      setPendingBackdrop(null);
      return;
    }
    
    // Call Unreal Engine
    await callSetBackdropImage(pendingBackdrop);
    
    // Update UI state
    setPreviewBackdrop(pendingBackdrop);
    setRecentBackdrops(prev => [pendingBackdrop, ...prev.filter(url => url !== pendingBackdrop)].slice(0, 10));
    
    // Clear pending
    setPendingBackdrop(null);
    
    showSnackbar('Backdrop accepted and applied!', 'success');
  };
  
  const rejectBackdrop = async () => {
    if (!pendingBackdrop) return;

    // Optionally delete from Supabase storage
    try {
      const filename = pendingBackdrop.split('/').pop();
      if (filename) {
        await supabase.storage.from('vsimages').remove([filename]);
      }
    } catch (error) {
      console.warn('Could not delete rejected backdrop:', error);
    }

    setPendingBackdrop(null);
    showSnackbar('Backdrop rejected', 'info');
  };

  const handleDeleteBackdrop = async () => {
    if (!backdropToDelete) return;

    try {
      // Extract filename from URL
      const filename = backdropToDelete.split('/').pop();
      if (!filename) {
        throw new Error('Invalid backdrop URL');
      }

      // Delete from Supabase storage
      const { error } = await supabase.storage.from('vsimages').remove([filename]);

      if (error) {
        throw error;
      }

      // Remove from state and check if this is the last backdrop
      const updatedBackdrops = recentBackdrops.filter(url => url !== backdropToDelete);
      setRecentBackdrops(updatedBackdrops);

      // Clear selection if the deleted backdrop was selected
      if (selectedBackdrop === backdropToDelete) {
        setSelectedBackdrop(null);
      }

      // Clear preview if the deleted backdrop was previewed
      if (previewBackdrop === backdropToDelete) {
        setPreviewBackdrop(null);
      }

      // If this was the last backdrop, clear the conversation history
      if (updatedBackdrops.length === 0) {
        setBackgroundPromptHistory([]);
        setBackgroundAssistantResponses([]);
        setBackgroundPrompt('');
        showSnackbar('Last backdrop deleted - history cleared', 'success');
      } else {
        showSnackbar('Backdrop deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to delete backdrop:', error);
      showSnackbar('Failed to delete backdrop', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setBackdropToDelete(null);
    }
  };

  // Function to call SetBackdropImage via WebSocket
  const callSetBackdropImage = async (imageUrl: string) => {
    const channel = availableChannels.find(c => c.id === selectedChannel);
    if (!channel) return;

    // Try preset function first
    try {
      // Use bound function if set, otherwise use default
      const url = boundSetBackdropFunction || `/remote/preset/RemoteController/function/Set%20Backdrop%20Image`;

      const requestBody = {
        Parameters: {
          URL: imageUrl
        }
      };

      const response = await sendRCPCommand(url, 'PUT', requestBody);

      if (response.status >= 200 && response.status < 300) {
        return;
      }
    } catch (error) {
    }

    // Fallback to object/call method
    const objectPaths = [
      '/Game/Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/Levels/UEDPIE_1_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/Levels/UEDPIE_2_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/Levels/UEDPIE_3_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_2',
      // Also try _C_1 if _C_2 doesn't work
      '/Game/Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1',
      '/Game/Levels/CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1'
    ];

    for (const objectPath of objectPaths) {
      try {
        const requestBody = {
          objectPath: objectPath,
          functionName: "SetBackdropImage",
          parameters: {
            URL: imageUrl
          }
        };


        const response = await sendRCPCommand('/remote/object/call', 'PUT', requestBody);

        if (response.status >= 200 && response.status < 300) {
          return;
        }
      } catch (error) {
      }
    }

    console.warn('Could not call SetBackdropImage - all methods failed');
  };

  // Apply selected backdrop to virtual set
  const applySelectedBackdrop = async () => {
    if (!selectedBackdrop) {
      showSnackbar('No backdrop selected', 'warning');
      return;
    }

    if (!isConnected) {
      showSnackbar('Not connected to Unreal Engine', 'error');
      return;
    }

    try {
      await callSetBackdropImage(selectedBackdrop);
      setPreviewBackdrop(selectedBackdrop);
      showSnackbar('Backdrop applied to virtual set!', 'success');
    } catch (error) {
      console.error('Failed to apply backdrop:', error);
      showSnackbar('Failed to apply backdrop', 'error');
    }
  };

  // Helper function for WebSocket RCP communication
  const sendRCPCommand = (url: string, verb: string = 'GET', body: any = null): Promise<any> => {
    return new Promise((resolve, reject) => {
      const channel = availableChannels.find(c => c.id === selectedChannel);
      if (!channel) {
        reject(new Error('No channel selected'));
        return;
      }
  
      const ws = new WebSocket(`ws://${channel.host}:30020`);
      
      const message = {
        MessageName: "http",
        Parameters: {
          Url: url,
          Verb: verb,
          Body: body
        }
      };
      
      
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          ws.close();
          reject(new Error('WebSocket request timed out'));
        }
      }, 10000); // 10 second timeout
      
      ws.onopen = () => {
        ws.send(JSON.stringify(message));
      };
      
      ws.onmessage = async (event) => {
        responseReceived = true;
        clearTimeout(timeout);
        
        const text = event.data instanceof Blob ? await event.data.text() : event.data;
        
        let msg;
        try {
          msg = JSON.parse(text);
        } catch (e) {
          console.error('WebSocket Non-JSON payload:', text);
          ws.close();
          reject(new Error('Invalid JSON response'));
          return;
        }
        
        // ✅ PRIMARY: Check for ResponseCode at top level (Unreal 5.x format)
        if (msg.ResponseCode !== undefined) {
          
          if (msg.ResponseCode >= 200 && msg.ResponseCode < 300) {
            // Success - return the ResponseBody
            const data = msg.ResponseBody || null;
            resolve({ status: msg.ResponseCode, data: data });
          } else {
            console.error('WebSocket Error response:', msg.ResponseCode, msg.ResponseBody);
            reject(new Error(`RCP Error: ${msg.ResponseCode}`));
          }
          ws.close();
          return;
        }
        
        // FALLBACK: Check for msg.Type === 'http.response' (older format)
        if (msg.Type === 'http.response') {
          
          if (msg.ResponseCode >= 200 && msg.ResponseCode < 300) {
            // Try to parse body as JSON if possible
            if (msg.Body) {
              try {
                const parsedBody = JSON.parse(msg.Body);
                resolve({ status: msg.ResponseCode, data: parsedBody });
              } catch {
                resolve({ status: msg.ResponseCode, data: msg.Body });
              }
            } else {
              resolve({ status: msg.ResponseCode, data: null });
            }
          } else {
            console.error('WebSocket Error response:', msg.ResponseCode, msg.Body);
            reject(new Error(`RCP Error: ${msg.ResponseCode}`));
          }
          ws.close();
          return;
        }
        
        // UNKNOWN: Treat as potential success
        resolve({ status: 200, data: msg });
        ws.close();
      };
      
      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('WebSocket connection error:', err);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {};
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Query RCP for available objects and functions
  const queryRCPObjects = async () => {
    setIsLoadingRCPObjects(true);
    const objects: RCPObject[] = [];
    const functions: RCPFunction[] = [];

    try {
      // Strategy 1: Try /remote/presets to list all presets
      try {
        const presetsResponse = await sendRCPCommand('/remote/presets', 'GET');

        if (presetsResponse.status >= 200 && presetsResponse.status < 300 && presetsResponse.data) {
          // Try different possible response structures
          const presets = presetsResponse.data.Presets ||
                         presetsResponse.data.presets ||
                         (Array.isArray(presetsResponse.data) ? presetsResponse.data : []);

          for (const preset of presets) {
            const presetName = preset.Name || preset.name || preset.ID || preset.id;

            if (presetName) {
              objects.push({
                objectPath: `/remote/preset/${presetName}`,
                name: presetName,
                type: 'Preset'
              });

              // Try to get details for this preset
              try {
                const presetDetailResponse = await sendRCPCommand(`/remote/preset/${presetName}`, 'GET');
                const responseData = presetDetailResponse.data;
                const presetData = responseData.Preset || responseData.preset || responseData;

                // Look for functions in Groups first, then fallback to top-level
                let exposedFunctions: any[] = [];

                if (presetData.Groups && Array.isArray(presetData.Groups)) {
                  for (const group of presetData.Groups) {
                    const groupFunctions = group.ExposedFunctions ||
                                          group.exposedFunctions ||
                                          group.Functions ||
                                          group.functions ||
                                          [];
                    exposedFunctions = exposedFunctions.concat(groupFunctions);
                  }
                } else {
                  // Fallback to top-level functions
                  exposedFunctions = presetData.ExposedFunctions ||
                                    presetData.exposedFunctions ||
                                    presetData.Functions ||
                                    presetData.functions ||
                                    [];
                }

                for (const func of exposedFunctions) {
                  const funcName = func.DisplayName || func.Name || func.name || func.ID || func.id;
                  const funcDesc = func.UnderlyingFunction?.Description ||
                                 func.Description ||
                                 func.description ||
                                 func.Metadata?.Description ||
                                 '';

                  if (funcName) {
                    functions.push({
                      name: funcName,
                      objectPath: `/remote/preset/${presetName}/function/${encodeURIComponent(funcName)}`,
                      description: funcDesc
                    });
                  }
                }
              } catch (e) {
              }
            }
          }
        }
      } catch (e) {
      }

      // Strategy 2: Try known preset directly (RemoteController)
      try {
        const rcpTestResponse = await sendRCPCommand('/remote/preset/RemoteController', 'GET');
        if (rcpTestResponse.status >= 200 && rcpTestResponse.status < 300) {
          const responseData = rcpTestResponse.data;

          // Handle nested Preset structure
          const preset = responseData.Preset || responseData.preset || responseData;
          const presetName = preset.Name || preset.name || 'RemoteController';

          // Add RemoteController as an object if not already added
          if (!objects.some(obj => obj.name === presetName)) {
            objects.push({
              objectPath: `/remote/preset/${presetName}`,
              name: presetName,
              type: 'Preset'
            });
          }

          // Extract functions from Groups
          let exposedFunctions: any[] = [];

          // Check if functions are nested in Groups
          if (preset.Groups && Array.isArray(preset.Groups)) {
            // Iterate through all groups and collect exposed functions
            for (const group of preset.Groups) {
                                                
              // @ts-ignore: Unused for future functionality
                    const _groupName = group.Name || group.name || 'Unknown';

              const groupFunctions = group.ExposedFunctions ||
                                    group.exposedFunctions ||
                                    group.Functions ||
                                    group.functions ||
                                    [];

              exposedFunctions = exposedFunctions.concat(groupFunctions);
            }
          } else {
            // Fallback to top-level functions
            exposedFunctions = preset.ExposedFunctions ||
                              preset.exposedFunctions ||
                              preset.Functions ||
                              preset.functions ||
                              [];
          }

          for (const func of exposedFunctions) {
            const funcName = func.DisplayName || func.Name || func.name || func.ID || func.id;
            const funcDesc = func.UnderlyingFunction?.Description ||
                           func.Description ||
                           func.description ||
                           func.Metadata?.Description ||
                           '';

            if (funcName && !functions.some(f => f.name === funcName && f.objectPath.includes(presetName))) {
              functions.push({
                name: funcName,
                objectPath: `/remote/preset/${presetName}/function/${encodeURIComponent(funcName)}`,
                description: funcDesc
              });
            }
          }
        }
      } catch (e) {
      }

      // Strategy 3: If nothing found, add manual fallback
      if (objects.length === 0) {
        objects.push({
          objectPath: '/remote/preset/RemoteController',
          name: 'RemoteController',
          type: 'Preset'
        });
      }

      if (functions.length === 0) {
        functions.push(
          {
            name: 'Change Scene',
            objectPath: '/remote/preset/RemoteController/function/Change%20Scene',
            description: 'Changes the virtual set scene configuration'
          },
          {
            name: 'Set Backdrop Image',
            objectPath: '/remote/preset/RemoteController/function/Set%20Backdrop%20Image',
            description: 'Sets the backdrop image URL'
          }
        );
      }

      setAvailableRCPObjects(objects);
      setAvailableRCPFunctions(functions);

      if (functions.length > 2) {
        showSnackbar(`Found ${objects.length} objects and ${functions.length} functions`, 'success');
      } else {
        showSnackbar(`Using ${functions.length} known functions (RCP query returned no additional functions)`, 'info');
      }

    } catch (error) {
      console.error('Failed to query RCP objects:', error);
      // Still provide fallback functions
      if (functions.length === 0) {
        functions.push(
          {
            name: 'Change Scene',
            objectPath: '/remote/preset/RemoteController/function/Change%20Scene',
            description: 'Changes the virtual set scene configuration'
          },
          {
            name: 'Set Backdrop Image',
            objectPath: '/remote/preset/RemoteController/function/Set%20Backdrop%20Image',
            description: 'Sets the backdrop image URL'
          }
        );
      }

      if (objects.length === 0) {
        objects.push({
          objectPath: '/remote/preset/RemoteController',
          name: 'RemoteController',
          type: 'Preset'
        });
      }

      setAvailableRCPObjects(objects);
      setAvailableRCPFunctions(functions);
      showSnackbar('Using known RCP functions (query failed)', 'warning');
    } finally {
      setIsLoadingRCPObjects(false);
    }
  };

  return (
    (<Container maxWidth={false} sx={{ py: 4, px: 4, bgcolor: 'white', minHeight: '100vh', position: 'relative' }}>
      {/* Settings Icon - Top Right */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color={isConnected ? 'success.main' : 'text.secondary'}>
          {isConnecting ? 'Connecting...' : (isConnected ? '● Connected' : '○ Not connected')}
        </Typography>
        <Tooltip title="Settings">
          <IconButton
            onClick={() => setAdvancedSettingsOpen(true)}
            color="primary"
            sx={{
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.50'
              }
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={advancedSettingsOpen}
        onClose={() => setAdvancedSettingsOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, p: 3 }
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
        </Box>

        {/* Channel Selection */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Channel</InputLabel>
            <Select
              value={selectedChannel}
              onChange={(e: SelectChangeEvent) => setSelectedChannel(e.target.value)}
              label="Channel"
            >
              {availableChannels.map(channel => (
                <MenuItem key={channel.id} value={channel.id}>
                  {channel.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color={isConnected ? 'success.main' : 'text.secondary'}>
              {isConnecting ? 'Connecting...' : (isConnected ? '● Connected' : '○ Not connected')}
            </Typography>
            <IconButton
              size="small"
              color="primary"
              onClick={checkConnection}
              disabled={!selectedChannel}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Background Aspect Ratio */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Background Aspect Ratio</InputLabel>
                <Select
                  value={backgroundAspectRatio}
                  onChange={(e) => setBackgroundAspectRatio(e.target.value)}
                  label="Background Aspect Ratio"
                >
                  {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {value} ({key})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Aspect ratio for AI-generated backdrop images
              </Typography>
            </Box>

            {/* Gemini Model Selection */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Gemini Model (Text Generation)</InputLabel>
                <Select
                  value={selectedGeminiModel}
                  onChange={(e) => setSelectedGeminiModel(e.target.value)}
                  label="Gemini Model (Text Generation)"
                >
                  {GEMINI_MODELS.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Model used for virtual set environment generation
              </Typography>
            </Box>

            {/* Imagen Model Selection */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Imagen Model (Image Generation)</InputLabel>
                <Select
                  value={selectedImagenModel}
                  onChange={(e) => setSelectedImagenModel(e.target.value)}
                  label="Imagen Model (Image Generation)"
                >
                  {IMAGEN_MODELS.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Model used for backdrop image generation
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* RCP Function Bindings */}
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              RCP Function Bindings
              <Tooltip title="Query Unreal Engine for available RCP objects and functions">
                <IconButton
                  size="small"
                  onClick={queryRCPObjects}
                  disabled={!isConnected || isLoadingRCPObjects}
                >
                  {isLoadingRCPObjects ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Typography>

            {/* Set Virtual Set Function Binding */}
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Set Virtual Set Function</InputLabel>
                <Select
                  value={boundSetVirtualSetFunction}
                  onChange={(e) => setBoundSetVirtualSetFunction(e.target.value)}
                  label="Set Virtual Set Function"
                  disabled={availableRCPFunctions.length === 0}
                >
                  <MenuItem value="">
                    <em>Default (Change Scene)</em>
                  </MenuItem>
                  {availableRCPFunctions
                    .filter(func => func.name.toLowerCase().includes('scene') || func.name.toLowerCase().includes('set'))
                    .map((func, index) => (
                      <MenuItem key={index} value={func.objectPath}>
                        {func.name}
                        {func.description && ` - ${func.description}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                RCP function to call when setting virtual set parameters
              </Typography>
            </Box>

            {/* Set Backdrop Function Binding */}
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Set Backdrop Function</InputLabel>
                <Select
                  value={boundSetBackdropFunction}
                  onChange={(e) => setBoundSetBackdropFunction(e.target.value)}
                  label="Set Backdrop Function"
                  disabled={availableRCPFunctions.length === 0}
                >
                  <MenuItem value="">
                    <em>Default (Set Backdrop Image)</em>
                  </MenuItem>
                  {availableRCPFunctions
                    .filter(func => func.name.toLowerCase().includes('backdrop') || func.name.toLowerCase().includes('image'))
                    .map((func, index) => (
                      <MenuItem key={index} value={func.objectPath}>
                        {func.name}
                        {func.description && ` - ${func.description}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                RCP function to call when setting backdrop image
              </Typography>
            </Box>

        {/* Available Objects Info */}
        {availableRCPObjects.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Found {availableRCPObjects.length} RCP objects and {availableRCPFunctions.length} functions
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Debug Console Toggle */}
        <Box>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<TerminalIcon />}
            onClick={() => setDebugMode(!debugMode)}
            color={debugMode ? 'primary' : 'inherit'}
          >
            {debugMode ? 'Hide Debug Console' : 'Show Debug Console'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            View detailed logs and current scene state
          </Typography>
        </Box>
      </Drawer>
      {/* Manual JSON Input - Workaround for empty SetManagerJson property */}
      {!sceneDescriptor && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Scene descriptor not loaded from Unreal Engine</strong>
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              The SetManagerJson property in BP_SetManager_v4 is empty via RCP API.
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={fetchSceneDescriptor}
                disabled={!isConnected}
                startIcon={<RefreshIcon />}
              >
                Retry Fetch from Unreal
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={debugQueryAllInstances}
                disabled={!isConnected}
                startIcon={<DebugIcon />}
              >
                Debug: Find All Instances
              </Button>
            </Box>
            <Typography variant="caption" display="block" sx={{ mb: 1, color: 'text.secondary' }}>
              "Retry Fetch" tries the preset path. "Find All Instances" checks all possible object paths (see console).
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Or manually paste the JSON data below as a workaround:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              placeholder='Paste JSON here (e.g., {"Sections":[],"Styles":[],"ActorTags":{},"ActorDetails":[]})'
              value={manualJsonInput}
              onChange={(e) => setManualJsonInput(e.target.value)}
              sx={{
                mt: 1,
                mb: 1,
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={loadManualJson}
              disabled={!manualJsonInput.trim()}
            >
              Load JSON
            </Button>
        </Alert>
      )}
      <Divider sx={{ my: 3 }} />
      {/* Virtual Set Environment - Chat Style */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 0.5 }}>
              Virtual Set Environment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Describe your virtual set configuration (walls, platform, roof, back style)
            </Typography>
          </Box>
          {environmentPromptHistory.length > 0 && (
            <Tooltip title="Clear & Reset">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setEnvironmentPromptHistory([]);
                  setAssistantResponses([]);
                  setCurrentScene(null);
                  setEnvironmentPrompt('');
                  showSnackbar('History cleared - starting fresh', 'info');
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Chat Container */}
        <Card sx={{ mb: 2, bgcolor: 'grey.50', height: environmentPromptHistory.length > 0 ? 400 : 'auto', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'grey.300' }}>
          {/* Chat History */}
          <Box
            ref={environmentChatRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              minHeight: environmentPromptHistory.length > 0 ? 0 : 100,
              bgcolor: 'white'
            }}
          >
            {environmentPromptHistory.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'grey.400' }}>
                <Typography variant="body2">
                  Start a conversation by describing your virtual set...
                </Typography>
              </Box>
            ) : (
              environmentPromptHistory.map((prompt, idx) => (
                <Box key={idx}>
                  {/* User Message */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Box sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      maxWidth: '80%',
                      borderBottomRightRadius: 4
                    }}>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, mb: 0.5 }}>
                        You
                      </Typography>
                      <Typography variant="body2">{prompt}</Typography>
                    </Box>
                  </Box>
                  {/* AI Response */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Box sx={{
                      bgcolor: 'grey.100',
                      color: 'text.primary',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      maxWidth: '80%',
                      borderBottomLeftRadius: 4,
                      border: '1px solid',
                      borderColor: 'grey.300'
                    }}>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, mb: 0.5 }}>
                        AI Assistant
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {assistantResponses[idx] || '✓ Scene updated'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.300', bgcolor: 'grey.50', position: 'relative' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  variant="outlined"
                  placeholder={
                    environmentPromptHistory.length > 0
                      ? "Continue the conversation..."
                      : "Example: Glass walls with elevated platform, solid roof, and large columns"
                  }
                  value={environmentPrompt}
                  onChange={(e) => setEnvironmentPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (environmentPrompt.trim() && !isGeneratingEnvironment && isConnected) {
                        generateEnvironment();
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      pr: 6,
                      '& fieldset': { borderColor: 'grey.300' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                    }
                  }}
                />
                {/* Send Icon Button - Inside TextField */}
                <IconButton
                  color="primary"
                  onClick={generateEnvironment}
                  disabled={isGeneratingEnvironment || !isConnected || !environmentPrompt.trim()}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                  }}
                >
                  {isGeneratingEnvironment ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                </IconButton>
              </Box>
              {/* Parameter Toggle - Outside TextField, aligned with send button */}
              {generatedFields && (
                <IconButton
                  color="primary"
                  onClick={() => setShowGeneratedFields(!showGeneratedFields)}
                  sx={{
                    mt: 'auto',
                    mb: '8px',
                    border: '1px solid',
                    borderColor: showGeneratedFields ? 'primary.main' : 'grey.300',
                    bgcolor: showGeneratedFields ? 'primary.50' : 'transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.100'
                    }
                  }}
                >
                  {showGeneratedFields ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              )}
            </Box>
          </Box>
        </Card>

        {/* Generated Fields Preview */}
        {generatedFields && showGeneratedFields && (
          <Card sx={{ mt: 3, bgcolor: 'grey.50', overflow: 'hidden' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Generated Scene Parameters
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<PlayIcon />}
                  onClick={async () => {
                    await applySceneParameters(generatedFields);
                  }}
                  disabled={!isConnected}
                >
                  Apply to Virtual Set
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {Object.entries(generatedFields).map(([key, value]) => {
                  const fieldKey = key as keyof AvailableOptions;
                  const options = availableOptions?.[fieldKey] || [];

                  return (
                    <FormControl key={key} fullWidth size="small">
                      <InputLabel>{key}</InputLabel>
                      <Select
                        value={value || ''}
                        onChange={(e) => {
                          setGeneratedFields({
                            ...generatedFields,
                            [key]: e.target.value
                          });
                        }}
                        label={key}
                      >
                        <MenuItem value="">
                          <em>None (disabled)</em>
                        </MenuItem>
                        {options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                      {value && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Selected: {value}
                        </Typography>
                      )}
                    </FormControl>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
      <Divider sx={{ my: 3 }} />
      {/* Virtual Set Background - Chat Style */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 0.5 }}>
              Virtual Set Background
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate an AI image to use as the backdrop for your virtual set
            </Typography>
          </Box>
          {backgroundPromptHistory.length > 0 && (
            <Tooltip title="Clear & Reset">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setBackgroundPromptHistory([]);
                  setBackgroundAssistantResponses([]);
                  setBackgroundPrompt('');
                  setSelectedBackdrop(null);
                  if (isDrawingMode) {
                    setIsDrawingMode(false);
                    clearDrawing();
                  }
                  showSnackbar('History cleared - reset to Imagen mode', 'info');
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Chat Container - Hidden when in edit mode */}
        {!isDrawingMode && (
        <Card sx={{ mb: 2, bgcolor: 'grey.50', height: backgroundPromptHistory.length > 0 ? 400 : 'auto', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'grey.300' }}>
          {/* Chat History */}
          <Box
            ref={backgroundChatRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              minHeight: backgroundPromptHistory.length > 0 ? 0 : 100,
              bgcolor: 'white'
            }}
          >
            {backgroundPromptHistory.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'grey.400' }}>
                <Typography variant="body2">
                  Start a conversation by describing your backdrop image...
                </Typography>
              </Box>
            ) : (
              backgroundPromptHistory.map((prompt, idx) => (
                <Box key={idx}>
                  {/* User Message */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Box sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      maxWidth: '80%',
                      borderBottomRightRadius: 4
                    }}>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, mb: 0.5 }}>
                        You
                      </Typography>
                      <Typography variant="body2">{prompt}</Typography>
                    </Box>
                  </Box>
                  {/* AI Response */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Box sx={{
                      bgcolor: 'grey.100',
                      color: 'text.primary',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      maxWidth: '80%',
                      borderBottomLeftRadius: 4,
                      border: '1px solid',
                      borderColor: 'grey.300'
                    }}>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, mb: 0.5 }}>
                        AI Assistant
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {backgroundAssistantResponses[idx] || '✓ Background generated'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.300', bgcolor: 'grey.50', position: 'relative' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  variant="outlined"
                  placeholder={
                    backgroundPromptHistory.length > 0
                      ? "Continue the conversation..."
                      : "Example: Sunset city skyline with modern skyscrapers silhouetted against vibrant orange and purple sky"
                  }
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (backgroundPrompt.trim() && !isGeneratingBackground) {
                        generateBackgroundImage();
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      pr: 6,
                      '& fieldset': { borderColor: 'grey.300' },
                      '&:hover fieldset': { borderColor: 'grey.400' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                    }
                  }}
                />
                {/* Send Icon Button - Inside TextField */}
                <IconButton
                  color="primary"
                  onClick={generateBackgroundImage}
                  disabled={isGeneratingBackground || !backgroundPrompt.trim()}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                  }}
                >
                  {isGeneratingBackground ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                </IconButton>
              </Box>
              {/* Library Button - Toggle Recent Backdrops visibility */}
              <Tooltip title={showRecentBackdrops ? "Hide Recent Backdrops" : "Show Recent Backdrops"}>
                <IconButton
                  color="primary"
                  onClick={() => {
                    setShowRecentBackdrops(!showRecentBackdrops);
                  }}
                  sx={{
                    mt: 'auto',
                    mb: '8px',
                    border: '1px solid',
                    borderColor: showRecentBackdrops ? 'primary.main' : 'grey.300',
                    bgcolor: showRecentBackdrops ? 'primary.50' : 'transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.100'
                    }
                  }}
                >
                  <LibraryIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Card>
        )}

        {/* Recent Backdrops Gallery */}
        {!isDrawingMode && recentBackdrops.length > 0 && showRecentBackdrops && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Recent Backgrounds
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Click any backdrop to select it
            </Typography>
            <Box sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              p: 2,
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 1,
              bgcolor: 'grey.50',
              '&::-webkit-scrollbar': {
                height: 8
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'grey.200',
                borderRadius: 1
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'grey.400',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'grey.500'
                }
              }
            }}>
              {recentBackdrops.map((url, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    minWidth: 120,
                    width: 120,
                    height: 67.5, // 16:9 aspect ratio
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: selectedBackdrop === url ? '3px solid #1976d2' : '1px solid rgba(0,0,0,0.2)',
                    borderRadius: 1,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 2,
                      '& .delete-button': {
                        opacity: 1
                      }
                    }
                  }}
                  onClick={() => {
                    setSelectedBackdrop(url);
                  }}
                >
                  <img
                    src={url}
                    alt={`Backdrop ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    loading="lazy"
                  />
                  {previewBackdrop === url && (
                    <Box sx={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      bgcolor: 'success.main',
                      color: 'white',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      zIndex: 1
                    }}>
                      <CheckIcon sx={{ fontSize: 16 }} />
                    </Box>
                  )}
                  <IconButton
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBackdropToDelete(url);
                      setDeleteConfirmOpen(true);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: 'error.main'
                      }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Selected Backdrop Preview */}
        {selectedBackdrop ? (
          <Card sx={{ mt: 3, bgcolor: 'grey.50', overflow: 'hidden' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Selected Background
                  </Typography>
                  {previewBackdrop === selectedBackdrop && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', mt: 0.5 }}>
                      <CheckIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="medium">
                        Applied to Virtual Set
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Deselect to generate a new backdrop">
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="medium"
                      startIcon={<CloseIcon />}
                      onClick={() => {
                        setSelectedBackdrop(null);
                        if (isDrawingMode) {
                          setIsDrawingMode(false);
                          clearDrawing();
                        }
                        showSnackbar('Background deselected', 'info');
                      }}
                    >
                      Deselect
                    </Button>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    color={isDrawingMode ? 'error' : 'primary'}
                    size="medium"
                    startIcon={isDrawingMode ? <ClearIcon /> : <EditIcon />}
                    onClick={() => {
                      if (isDrawingMode) {
                        clearDrawing();
                      }
                      setIsDrawingMode(!isDrawingMode);
                    }}
                  >
                    {isDrawingMode ? 'Cancel Edit' : 'Edit'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    startIcon={<PlayIcon />}
                    onClick={applySelectedBackdrop}
                    disabled={!selectedBackdrop || !isConnected || previewBackdrop === selectedBackdrop}
                  >
                    Play
                  </Button>
                </Box>
              </Box>

              {/* Drawing Controls */}
              {isDrawingMode && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'medium' }}>
                    Drawing Tools
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">Color:</Typography>
                      <input
                        type="color"
                        value={drawingColor}
                        onChange={(e) => setDrawingColor(e.target.value)}
                        style={{ width: 40, height: 30, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <Typography variant="caption">Brush Size:</Typography>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 30 }}>{brushSize}px</Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              <Box sx={{
                width: '100%',
                aspectRatio: '16/9',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 2,
                boxShadow: 2,
                position: 'relative'
              }}>
                <img
                  src={selectedBackdrop}
                  alt="Selected background"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                {isDrawingMode && (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'crosshair'
                    }}
                  />
                )}
              </Box>

              {/* Edit Prompt Input (shown when drawing mode is active) */}
              {isDrawingMode && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', fontWeight: 'medium' }}>
                    Edit This Image
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                    Annotate areas on the image above, then describe what changes you want to make
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="Example: Make the sky more dramatic with storm clouds, or brighten the windows..."
                      value={backgroundPrompt}
                      onChange={(e) => setBackgroundPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          if (backgroundPrompt.trim() && !isGeneratingBackground) {
                            generateBackgroundImage();
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          pr: 6,
                          '& fieldset': { borderColor: 'grey.300' },
                          '&:hover fieldset': { borderColor: 'grey.400' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      onClick={generateBackgroundImage}
                      disabled={isGeneratingBackground || !isConnected || !backgroundPrompt.trim()}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                      }}
                    >
                      {isGeneratingBackground ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    Press Ctrl+Enter to submit • Uses Gemini 2.5 Flash Image for editing
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          (<Card sx={{ mt: 3, minHeight: 300, bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography variant="body2">
                  Generated backdrops will appear here
                </Typography>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Images are stored in Supabase and can be reused
                </Typography>
              </Box>
            </CardContent>
          </Card>)
        )}
      </Box>
      {/* Pending Backdrop - Awaiting User Acceptance */}
      {pendingBackdrop && (
        <Alert
          severity="info"
          sx={{ mt: 3 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<SendIcon />}
                onClick={acceptBackdrop}
              >
                Accept & Apply
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={rejectBackdrop}
              >
                Reject
              </Button>
            </Box>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            New backdrop generated - Review and accept to apply to virtual set
          </Typography>
          <Box sx={{
            width: '100%',
            maxWidth: 400,
            aspectRatio: '16/9',
            borderRadius: 1,
            overflow: 'hidden',
            mt: 1,
            boxShadow: 2
          }}>
            <img
              src={pendingBackdrop}
              alt="Pending backdrop preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </Box>
        </Alert>
      )}
      {/* Debug Panel */}
      {debugMode && (
        <Paper
          variant="outlined"
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'grey.900',
            color: 'grey.100',
            maxHeight: 300,
            overflow: 'auto'
          }}
        >
          <Typography variant="subtitle2" gutterBottom sx={{ fontFamily: 'monospace' }}>
            Debug Log
          </Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {debugLog.length === 0 ? 'No debug logs yet...' : debugLog.join('\n')}
          </Box>
          {currentScene && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                Current Scene:
              </Typography>
              <pre style={{ margin: 0, fontSize: '0.85rem' }}>
                {JSON.stringify(currentScene, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Backdrop?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this backdrop? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteBackdrop} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>)
  );
}