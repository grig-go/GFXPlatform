import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  RefreshCw,
  Bug,
  AlertTriangle,
  Send,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Sparkles,
  Image as ImageIcon,
  Search,
  Check,
  Rows3,
  Columns2,
  Mic,
  MicOff,
  Save,
  X,
  Database,
  CloudOff,
  Plus,
  Settings,
  Plane,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useProject } from "./ProjectContext";

const supabaseUrl = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_PULSAR_VS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
import { ProjectSelector } from "./ProjectSelector";
import { ProjectManagementModal } from "./ProjectManagementModal";
import {
  loadAIImageGenSettings,
  saveAIImageGenSettings,
  callGoogleAPIViaProxy,
  generateWithGemini,
  generateImageWithImagen,
  editImageWithImagen,
  fetchPulsarVSProviders,
  GEMINI_MODELS,
  IMAGEN_MODELS,
  ASPECT_RATIOS,
  AISettings,
  DEFAULT_AI_SETTINGS,
  AIProvider,
} from "../types/aiImageGen";

import { sendCommandToUnreal } from "../services/unreal/commandService";
import { BackdropFilter } from "./BackdropFilter";
import { getAirportInstructions } from "../utils/aiSettingsApi";
import type { BackdropAsset } from "./BackdropFilter";

// ============================================
// TYPE DEFINITIONS
// ============================================

// Project type enum
type ProjectType = "VirtualSet" | "Airport";

// VirtualSet types (existing)
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
  Location: { X: number; Y: number; Z: number };
  Rotation: { Pitch: number; Yaw: number; Roll: number };
}

interface VirtualSetSceneDescriptor {
  Sections: string[];
  Styles: StyleInfo[];
  ActorTags: Record<string, string>;
  ActorDetails?: ActorDetail[];
}

interface VirtualSetSceneParameters {
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
  summary?: string;
}

interface VirtualSetAvailableOptions {
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

// Airport types (NEW)
interface AirportSectionOption {
  id: string;
  name: string;
  description: string;
}

interface AirportSection {
  id: string;
  name: string;
  description: string;
  currentOption: string | null;
  options: AirportSectionOption[];
}

interface AirportSceneDescriptor {
  sections: AirportSection[];
  environment?: {
    TimeOfDay?: number;
    affect?: string;
  };
  environment_background?: Array<{
    options: AirportSectionOption[];
  }>;
  levelinfo?: {
    id: string;
    name: string;
    description: string;
    version: string;
  };
}

interface AirportSceneParameters {
  timeOfDay?: string;
  environment_background?: string;
  BaseDown?: string;
  BaseTop?: string;
  DecoDown?: string;
  DecoTop?: string;
  ElementDown?: string;
  ElementMiddle?: string;
  ElementTop?: string;
  summary?: string;
}

interface AirportOptionItem {
  id: string;
  name: string;
}

interface AirportAvailableOptions {
  timeOfDay: AirportOptionItem[];
  environment_background: AirportOptionItem[];
  BaseDown: AirportOptionItem[];
  BaseTop: AirportOptionItem[];
  DecoDown: AirportOptionItem[];
  DecoTop: AirportOptionItem[];
  ElementDown: AirportOptionItem[];
  ElementMiddle: AirportOptionItem[];
  ElementTop: AirportOptionItem[];
}

// Union types
type SceneDescriptor = VirtualSetSceneDescriptor | AirportSceneDescriptor;
type SceneParameters = VirtualSetSceneParameters | AirportSceneParameters;
type AvailableOptions = VirtualSetAvailableOptions | AirportAvailableOptions;

// Type guards
function isVirtualSetDescriptor(descriptor: SceneDescriptor): descriptor is VirtualSetSceneDescriptor {
  return 'Sections' in descriptor && 'Styles' in descriptor && 'ActorTags' in descriptor;
}

function isAirportDescriptor(descriptor: SceneDescriptor): descriptor is AirportSceneDescriptor {
  return 'sections' in descriptor && Array.isArray((descriptor as AirportSceneDescriptor).sections);
}

function isVirtualSetParams(params: SceneParameters): params is VirtualSetSceneParameters {
  return 'Floor' in params || 'WallLeft' in params || 'WallBack' in params;
}

function isAirportParams(params: SceneParameters): params is AirportSceneParameters {
  return 'timeOfDay' in params || 'BaseDown' in params || 'ElementTop' in params;
}

function isVirtualSetOptions(options: AvailableOptions): options is VirtualSetAvailableOptions {
  return 'Floor' in options || 'WallLeft' in options;
}

function isAirportOptions(options: AvailableOptions): options is AirportAvailableOptions {
  return 'timeOfDay' in options || 'BaseDown' in options;
}

// Other interfaces
interface ChannelConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  objectPath?: string;
  active?: boolean;
  type?: string;
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
  underlyingObjectPath?: string;
  presetName?: string;
}

// Pulsar Instance data from Supabase (UPDATED with project_type)
interface PulsarInstance {
  instance_id: string;
  friendly_name: string;
  channel_name: string;
  rcp_name: string;
  set_manager_json: any;
  project_type: ProjectType;
  updated_at: string;
}

import { sampleSceneDescriptor } from "./sampleData";

interface VirtualSetPageProps {
  externalScene?: any | null;
  externalBackdrop?: string | null;
  onChannelChange?: (channelName: string | null) => void;
  onContentSaved?: () => void;
}

let backdropSearchQuery = "";
export default function VirtualSetPage({
  externalScene,
  externalBackdrop,
  onChannelChange,
  onContentSaved,
}: VirtualSetPageProps = {}) {
  // Translation
  const { t } = useTranslation('virtualSet');
  const { t: tCommon } = useTranslation('common');

  // Project context
  const { activeProject, updateProjectChannel } = useProject();

  // State
  const [environmentPrompt, setEnvironmentPrompt] = useState("");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [isGeneratingEnvironment, setIsGeneratingEnvironment] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<SceneParameters | null>(null);
  const [showGeneratedFields, setShowGeneratedFields] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<"vertical" | "horizontal">("vertical");

  // Project type state (NEW)
  const [currentProjectType, setCurrentProjectType] = useState<ProjectType>("VirtualSet");

  // Chat state
  const [environmentPromptHistory, setEnvironmentPromptHistory] = useState<string[]>([]);
  const [environmentAssistantResponses, setEnvironmentAssistantResponses] = useState<string[]>([]);
  const [backgroundPromptHistory, setBackgroundPromptHistory] = useState<string[]>([]);
  const [backgroundAssistantResponses, setBackgroundAssistantResponses] = useState<string[]>([]);
  const environmentChatRef = useRef<HTMLDivElement>(null);
  const backgroundChatRef = useRef<HTMLDivElement>(null);
  const environmentInputRef = useRef<HTMLTextAreaElement>(null);
  const backgroundInputRef = useRef<HTMLTextAreaElement>(null);

  // Speech recognition state
  const [isRecordingEnvironment, setIsRecordingEnvironment] = useState(false);
  const [isRecordingBackground, setIsRecordingBackground] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Channel and connection
  const [selectedChannel, setSelectedChannel] = useState("");
  const [availableChannels, setAvailableChannels] = useState<ChannelConfig[]>([]);
  const [isLoadingInstance, setIsLoadingInstance] = useState(false);
  const [instanceData, setInstanceData] = useState<PulsarInstance | null>(null);
  const [instanceError, setInstanceError] = useState<string | null>(null);

  // Scene data
  const [sceneDescriptor, setSceneDescriptor] = useState<SceneDescriptor | null>(null);
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneParameters | null>(null);
  const [recentBackdrops, setRecentBackdrops] = useState<BackdropAsset[]>([]);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string | null>(null);
  const [previewBackdrop, setPreviewBackdrop] = useState<string | null>(null);
  const [pendingBackdrop, setPendingBackdrop] = useState<string | null>(null);

  // Manual JSON input
  const [manualJsonInput, setManualJsonInput] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [availableRCPObjects, setAvailableRCPObjects] = useState<RCPObject[]>([]);
  const [availableRCPFunctions, setAvailableRCPFunctions] = useState<RCPFunction[]>([
    {
      name: "Change Scene",
      objectPath: "/remote/preset/RemoteController/function/Change%20Scene",
      description: "Changes the virtual set scene configuration",
    },
    {
      name: "Set Backdrop Image",
      objectPath: "/remote/preset/RemoteController/function/Set%20Backdrop%20Image",
      description: "Sets the backdrop image URL",
    },
  ]);
  const [isLoadingRCPObjects, setIsLoadingRCPObjects] = useState(false);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingColor, setDrawingColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(3);

  // Dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [backdropToDelete, setBackdropToDelete] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveTags, setSaveTags] = useState<string[]>(["virtual-set", "user-saved"]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [showInstanceDialog, setShowInstanceDialog] = useState(false);

  // AI Providers state (loaded from backend)
  const [aiProviders, setAiProviders] = useState<{
    text: AIProvider | null;
    imageGen: AIProvider | null;
    imageEdit: AIProvider | null;
  }>({ text: null, imageGen: null, imageEdit: null });
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // ============================================
  // EFFECTS
  // ============================================

  // Load AI providers from backend on mount
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoadingProviders(true);
      try {
        const providers = await fetchPulsarVSProviders();
        setAiProviders(providers);
        console.log('[VirtualSetPage] Loaded AI providers from backend:', providers);
      } catch (error) {
        console.error('[VirtualSetPage] Failed to load AI providers:', error);
      } finally {
        setIsLoadingProviders(false);
      }
    };
    loadProviders();
  }, []);

  useEffect(() => {
    loadChannels();
    loadRecentBackdrops();
  }, []);

  useEffect(() => {
    if (activeProject?.default_channel_id && availableChannels.length > 0) {
      const projectChannel = availableChannels.find(
        (c) => c.id === activeProject.default_channel_id
      );
      if (projectChannel && projectChannel.id !== selectedChannel) {
        setSelectedChannel(projectChannel.id);
      }
    }
  }, [activeProject?.default_channel_id, availableChannels]);

  useEffect(() => {
    if (selectedChannel && availableChannels.length > 0) {
      const channel = availableChannels.find((c) => c.id === selectedChannel);
      if (channel) {
        console.log("[VirtualSetPage] Auto-fetching instance data for channel:", channel.name);
        fetchInstanceByChannel(channel.name);
        queryRCPObjects();
        // Notify parent of current channel name
        onChannelChange?.(channel.name);
      }
    } else if (!selectedChannel) {
      onChannelChange?.(null);
    }
  }, [selectedChannel, availableChannels]);

  useEffect(() => {
    if (externalScene !== undefined && externalScene !== null) {
      console.log("📥 Received external scene configuration:", externalScene);
      setCurrentScene(externalScene);
      // Also populate the dropdowns so user can continue editing
      setGeneratedFields(externalScene);
      setShowGeneratedFields(true);

      // Detect project type from scene fields
      const isAirport = 'timeOfDay' in externalScene || 'BaseDown' in externalScene || 'environment_background' in externalScene;
      setCurrentProjectType(isAirport ? "Airport" : "VirtualSet");
      console.log("📥 Detected project type:", isAirport ? "Airport" : "VirtualSet");
    }
  }, [externalScene]);

  useEffect(() => {
    if (externalBackdrop !== undefined && externalBackdrop !== null) {
      console.log("📥 Received external backdrop:", externalBackdrop);
      setSelectedBackdrop(externalBackdrop);
    }
  }, [externalBackdrop]);

  useEffect(() => {
    setAvailableRCPFunctions([
      {
        name: "Change Scene",
        objectPath: "/remote/preset/RemoteController/function/Change%20Scene",
        description: "Changes the virtual set scene configuration",
      },
      {
        name: "Set Backdrop Image",
        objectPath: "/remote/preset/RemoteController/function/Set%20Backdrop%20Image",
        description: "Sets the backdrop image URL",
      },
    ]);
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const addDebugLog = (message: string) => {
    if (debugMode) {
      setDebugLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    }
    console.log(`[VirtualSetPage] ${message}`);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    if (severity === "success") toast.success(message);
    else if (severity === "error") toast.error(message);
    else if (severity === "warning") toast.warning(message);
    else toast.info(message);
  };

  const createMessageObject = (url: string, verb: string, body: any) => {
    return {
      MessageName: "http",
      Parameters: { Url: url, Verb: verb, Body: body },
    };
  };

  // ============================================
  // FETCH & PROCESS INSTANCE DATA
  // ============================================

  const fetchInstanceByChannel = async (channelName: string) => {
    setIsLoadingInstance(true);
    setInstanceError(null);
    addDebugLog(`Fetching instance data for channel: ${channelName}`);

    try {
      const { data, error } = await supabase.rpc("get_instance_by_channel", {
        p_channel_name: channelName,
      });

      if (error) {
        console.error("RPC error:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        const errorMsg = data?.error || "Failed to fetch instance data";
        console.warn("Instance fetch failed:", errorMsg);
        setInstanceData(null);
        setSceneDescriptor(null);
        setInstanceError(errorMsg);
        addDebugLog(`Instance not found: ${errorMsg}`);
        return;
      }

      const instance = data.data as PulsarInstance;
      setInstanceData(instance);
      
      // Set project type from instance data (NEW)
      const projectType = instance.project_type || "VirtualSet";
      setCurrentProjectType(projectType);
      addDebugLog(`Instance loaded: ${instance.friendly_name}, Project Type: ${projectType}`);

      // Parse and process the set_manager_json based on project type
      processSetManagerJson(instance.set_manager_json, projectType);

      toast.success(`Loaded configuration for ${instance.friendly_name}`);
    } catch (error) {
      console.error("Failed to fetch instance:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setInstanceData(null);
      setSceneDescriptor(null);
      setInstanceError(errorMsg);
      addDebugLog(`Fetch error: ${errorMsg}`);
      toast.error("Failed to load instance data, using offline mode");
    } finally {
      setIsLoadingInstance(false);
    }
  };

  // UPDATED: Process set_manager_json based on project type
  const processSetManagerJson = (jsonData: any, projectType: ProjectType) => {
    if (!jsonData) {
      addDebugLog("No set_manager_json data to process");
      fetchSceneDescriptorFallback(projectType);
      return;
    }

    try {
      const parsed = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      // Handle array format - the array IS the sections array for Airport
      if (Array.isArray(parsed)) {
        console.log("📦 set_manager_json is an array with", parsed.length, "items");
        console.log("📦 First few items:", parsed.slice(0, 3).map((p: any) =>
          p?.$schema ? `Schema v${p.$schema}` :
          p?.Sections ? 'OldFormat(Sections)' :
          p?.sections ? 'NewFormat(sections)' :
          p?.id ? `id:${p.id}` :
          Object.keys(p || {}).slice(0, 3).join(',')
        ));
        addDebugLog(`set_manager_json array format detected: ${parsed.length} items`);

        // Check if this looks like Airport sections (array of objects with id and options)
        if (parsed.length > 0 && parsed[0].id && parsed[0].options) {
          // This is the sections array directly - wrap it in Airport descriptor format
          const airportDescriptor: AirportSceneDescriptor = {
            sections: parsed,
            environment_background: []
          };
          setSceneDescriptor(airportDescriptor);
          extractAirportAvailableOptions(airportDescriptor);
          addDebugLog("Airport sections array loaded from database");
          return;
        }

        // Check if first element contains the actual descriptor
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            // Check for new VirtualSet v1.1.0 schema format (has actors array)
            if (item.$schema && item.sections && item.actors) {
              console.log("✅ Found new VirtualSet schema v1.1.0 format in array");
              processNewSchemaFormat(item);
              return;
            }
            // Check for Airport schema format (has sections with id+options)
            if (item.$schema && item.sections && Array.isArray(item.sections) && !item.actors) {
              const firstSection = item.sections[0];
              if (firstSection && firstSection.id && firstSection.options) {
                console.log("✅ Found Airport schema format in array");
                setSceneDescriptor(item as AirportSceneDescriptor);
                extractAirportAvailableOptions(item as AirportSceneDescriptor);
                addDebugLog("Airport descriptor (schema format) found in array");
                return;
              }
            }
            // Check for old VirtualSet format (Sections with capital S, Styles, ActorTags)
            if (item.Sections && item.Styles && item.ActorTags) {
              console.log("✅ Found old VirtualSet format in array");
              setSceneDescriptor(item as VirtualSetSceneDescriptor);
              extractVirtualSetAvailableOptions(item as VirtualSetSceneDescriptor);
              addDebugLog("VirtualSet descriptor found in array");
              return;
            }
            // Check for old VirtualSet format without ActorTags (Sections + Styles only)
            if (item.Sections && item.Styles && !item.$schema) {
              console.log("✅ Found old VirtualSet format (Sections+Styles) in array");
              setSceneDescriptor(item as VirtualSetSceneDescriptor);
              extractVirtualSetAvailableOptions(item as VirtualSetSceneDescriptor);
              addDebugLog("VirtualSet descriptor (no ActorTags) found in array");
              return;
            }
            // Check for Airport format with sections property (legacy, no $schema)
            if (item.sections && Array.isArray(item.sections) && !item.$schema && !item.actors) {
              console.log("✅ Found Airport legacy format in array");
              setSceneDescriptor(item as AirportSceneDescriptor);
              extractAirportAvailableOptions(item as AirportSceneDescriptor);
              addDebugLog("Airport descriptor found in array");
              return;
            }
          }
        }

        console.warn("Array format not recognized, items:", parsed.map((p: any) => p?.id || Object.keys(p || {})));
        addDebugLog("Unknown array format, falling back to defaults");
        fetchSceneDescriptorFallback(projectType);
        return;
      }

      // NEW: Check for v1.1.0 VirtualSet schema format (has $schema, sections, actors - NOT options in sections)
      if (parsed.$schema && parsed.sections && parsed.actors) {
        console.log("📋 New VirtualSet schema v1.1.0 format detected");
        processNewSchemaFormat(parsed);
        return;
      }

      // Check for Airport schema format (has $schema, sections with id+options, environment_background)
      if (parsed.$schema && parsed.sections && Array.isArray(parsed.sections)) {
        // Airport sections have 'id' and 'options' properties
        const firstSection = parsed.sections[0];
        if (firstSection && firstSection.id && firstSection.options) {
          console.log("📋 Airport schema format detected");
          setSceneDescriptor(parsed as AirportSceneDescriptor);
          extractAirportAvailableOptions(parsed as AirportSceneDescriptor);
          addDebugLog("Airport scene descriptor loaded from database (schema format)");
          return;
        }
      }

      if (projectType === "Airport") {
        // Airport schema parsing (legacy without $schema)
        if (parsed.sections && Array.isArray(parsed.sections)) {
          setSceneDescriptor(parsed as AirportSceneDescriptor);
          extractAirportAvailableOptions(parsed as AirportSceneDescriptor);
          addDebugLog("Airport scene descriptor loaded from database");
          return;
        }
      } else {
        // VirtualSet schema parsing (existing logic)
        if (parsed.Sections && parsed.Styles && parsed.ActorTags) {
          setSceneDescriptor(parsed as VirtualSetSceneDescriptor);
          extractVirtualSetAvailableOptions(parsed as VirtualSetSceneDescriptor);
          addDebugLog("VirtualSet scene descriptor loaded from database");
          return;
        }

        // Check RCP format
        if (parsed.ExposedPropertyDescription || parsed.PropertyValues) {
          const propertyValue = parsed.PropertyValues?.[0]?.PropertyValue;
          if (propertyValue && typeof propertyValue === "string" && propertyValue.trim()) {
            try {
              const sceneData = JSON.parse(propertyValue);
              if (sceneData.Sections && sceneData.Styles && sceneData.ActorTags) {
                setSceneDescriptor(sceneData);
                extractVirtualSetAvailableOptions(sceneData);
                addDebugLog("Scene descriptor extracted from PropertyValue");
                return;
              }
            } catch (e) {
              console.warn("Could not parse PropertyValue as scene descriptor:", e);
            }
          }
          addDebugLog("RCP metadata format detected, but no scene data in PropertyValue");
          fetchSceneDescriptorFallback(projectType);
          return;
        }
      }

      console.warn("Unknown set_manager_json format:", Array.isArray(parsed) ? `Array(${parsed.length})` : Object.keys(parsed));
      addDebugLog("Unknown JSON format, falling back to defaults");
      fetchSceneDescriptorFallback(projectType);
    } catch (error) {
      console.error("Error processing set_manager_json:", error);
      addDebugLog(`JSON processing error: ${error}`);
      fetchSceneDescriptorFallback(projectType);
    }
  };

  // NEW: Process v1.1.0 schema format with sections, materials, and actors
  const processNewSchemaFormat = (schema: any) => {
    const schemaVersion = schema.$schema || "unknown";
    const levelName = schema.levelinfo?.name || "Unknown Level";
    console.log(`📋 Processing schema v${schemaVersion} for level: ${levelName}`);
    addDebugLog(`New schema v${schemaVersion} detected: ${levelName}`);

    // Get all materials (materials can go to any section)
    const allMaterials = schema.materials || [];

    // Group actors by section
    const actorsBySection: Record<string, any[]> = {};
    (schema.actors || []).forEach((actor: any) => {
      const section = actor.section || "General";
      if (!actorsBySection[section]) actorsBySection[section] = [];
      actorsBySection[section].push(actor);
    });

    // Build available options from sections
    const options: Record<string, string[]> = {};

    // For each section, create Actor:Material options
    // Materials can go to any section, so pair each actor with ALL materials
    (schema.sections || []).forEach((section: any) => {
      const sectionName = section.name;
      const sectionActors = actorsBySection[sectionName] || [];

      const actorMaterialOptions: string[] = [];

      // If section has actors, create Actor:Material combinations
      if (sectionActors.length > 0) {
        sectionActors.forEach((actor: any) => {
          // Check if actor has specific allowedMaterials
          if (actor.allowedMaterials && actor.allowedMaterials.length > 0) {
            // Use only allowed materials for this actor
            actor.allowedMaterials.forEach((matId: string) => {
              const material = allMaterials.find((m: any) => m.materialid === matId);
              if (material) {
                const theme = material.theme || material.materialid;
                actorMaterialOptions.push(`${actor.name}:${theme}`);
              }
            });
          } else {
            // No specific materials restricted - use ALL materials
            allMaterials.forEach((material: any) => {
              const theme = material.theme || material.materialid;
              const optionValue = `${actor.name}:${theme}`;
              if (!actorMaterialOptions.includes(optionValue)) {
                actorMaterialOptions.push(optionValue);
              }
            });
          }
        });
      }

      // Filter out any empty strings and add "__none__" for clear option
      const filteredOptions = actorMaterialOptions.filter(opt => opt && opt !== "");
      options[sectionName] = filteredOptions.length > 0 ? [...filteredOptions, "__none__"] : [];

      if (filteredOptions.length > 0) {
        console.log(`📋 Section "${sectionName}": ${sectionActors.length} actors × ${allMaterials.length} materials => ${filteredOptions.length} options`);
      }
    });

    // Store the raw schema for AI context (includes actor descriptions)
    setSceneDescriptor({
      ...schema,
      _schemaVersion: schemaVersion,
      _processedOptions: options,
      _actorsBySection: actorsBySection,
      _allMaterials: allMaterials,
    } as any);

    setAvailableOptions(options as VirtualSetAvailableOptions);
    const sectionsWithOptions = Object.keys(options).filter(k => options[k].length > 0);
    console.log(`✅ New schema processed: ${sectionsWithOptions.length} sections with options`, options);
    addDebugLog(`New schema processed: ${sectionsWithOptions.length} sections with options`);
  };

  // NEW: Extract Airport available options
  const extractAirportAvailableOptions = (descriptor: AirportSceneDescriptor) => {
    const options: AirportAvailableOptions = {
      timeOfDay: Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), name: `${i + 1}:00` })),
      environment_background: [],
      BaseDown: [],
      BaseTop: [],
      DecoDown: [],
      DecoTop: [],
      ElementDown: [],
      ElementMiddle: [],
      ElementTop: [],
    };

    descriptor.sections.forEach((section) => {
      const sectionId = section.id as keyof Omit<AirportAvailableOptions, 'timeOfDay'>;
      if (sectionId in options && sectionId !== 'timeOfDay') {
        options[sectionId] = section.options.map((opt) => ({ id: opt.id, name: opt.name || opt.id }));
      }
    });
    if (descriptor.environment_background && Array.isArray(descriptor.environment_background)) {
      descriptor.environment_background.forEach((bg) => {
        if (bg.options && Array.isArray(bg.options)) {
          const bgOptions = bg.options
            .filter((opt) => opt.id)  // Filter out empty ids
            .map((opt) => ({ id: opt.id, name: opt.name || opt.id }));
          options.environment_background.push(...bgOptions);
        }
      });
    }

    setAvailableOptions(options);
    addDebugLog(`Extracted Airport options: ${JSON.stringify(options)}`);
  };

  // Renamed: Extract VirtualSet available options (existing logic)
  const extractVirtualSetAvailableOptions = (descriptor: VirtualSetSceneDescriptor) => {
    const options: VirtualSetAvailableOptions = {
      Floor: [],
      WallLeft: [],
      WallBack: [],
      WallRight: [],
      Platform: [],
      Columns: [],
      Roof: [],
      Back: [],
      Screen: [],
    };

    const sectionToActors: Record<string, ActorInfo[]> = {};

    Object.entries(descriptor.ActorTags).forEach(([actorName, jsonString]) => {
      try {
        const actorInfo: ActorInfo = JSON.parse(jsonString);
        const sectionMatch = actorInfo.tags.match(/CFG_S_\w+/);
        if (sectionMatch) {
          const section = sectionMatch[0];
          if (!sectionToActors[section]) sectionToActors[section] = [];
          sectionToActors[section].push(actorInfo);
        }
      } catch (e) {
        console.warn(`Failed to parse actor info for ${actorName}:`, e);
      }
    });

    const buildOptionsForSection = (sectionKey: string): string[] => {
      const actors = sectionToActors[sectionKey];
      if (!actors) return [];

      const combinations: string[] = [];
      actors.forEach((actor) => {
        let actorName = actor.actorName;
        const parts = actorName.split("_");
        const lastPart = parts[parts.length - 1];
        const knownMaterials = ["Glass", "Brick", "Wood"];
        const actorTheme = knownMaterials.includes(lastPart) ? lastPart : null;
        const actorSectionType = actor.section;

        const compatibleStyles = descriptor.Styles.filter((style) => {
          if (actorSectionType && style.Type && style.Type !== actorSectionType) {
            return false;
          }
          if (actorTheme) {
            return style.Theme.includes(actorTheme);
          }
          return true;
        });

        compatibleStyles.forEach((style) => {
          combinations.push(`${actorName}:${style.Name}`);
        });
      });

      return combinations;
    };

    options.Floor = buildOptionsForSection("CFG_S_Floor");
    options.WallLeft = buildOptionsForSection("CFG_S_WallLeft");
    options.WallBack = buildOptionsForSection("CFG_S_WallBack");
    options.WallRight = buildOptionsForSection("CFG_S_WallRight");
    options.Platform = buildOptionsForSection("CFG_S_Platform");
    options.Columns = buildOptionsForSection("CFG_S_Columns");
    options.Roof = buildOptionsForSection("CFG_S_Roof");
    options.Back = buildOptionsForSection("CFG_S_Back");
    options.Screen = buildOptionsForSection("CFG_S_Screen");

    setAvailableOptions(options);
    addDebugLog(
      `Extracted ${Object.values(options).reduce((sum, arr) => sum + arr.length, 0)} total options across all sections`
    );
  };

  // UPDATED: Fallback based on project type
  const fetchSceneDescriptorFallback = (projectType: ProjectType) => {
    addDebugLog(`Using fallback scene options for ${projectType} (offline mode)`);

    if (projectType === "Airport") {
      const fallbackOptions: AirportAvailableOptions = {
        timeOfDay: Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), name: `${i + 1}:00` })),
        environment_background: [{ id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        BaseDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        BaseTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        DecoDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        DecoTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        ElementDown: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        ElementMiddle: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }],
        ElementTop: [{ id: "option1", name: "Option 1" }, { id: "option2", name: "Option 2" }, { id: "option3", name: "Option 3" }, { id: "option4", name: "Option 4" }, { id: "option5", name: "Option 5" }, { id: "option6", name: "Option 6" }, { id: "option7", name: "Option 7" }, { id: "option8", name: "Option 8" }, { id: "option9", name: "Option 9" }],
      };
      setAvailableOptions(fallbackOptions);
    } else {
      const fallbackOptions: VirtualSetAvailableOptions = {
        Floor: ["BP_Floor:Wood2", "BP_Floor:Stone1", "BP_Floor:Marble"],
        WallLeft: ["BP_WallLeft_Wood:Wood1", "BP_WallLeft_Wood:Wood0", "BP_WallLeft_Wood:Brick1"],
        WallBack: ["BP_Back_Glass:Glass1", "BP_Back_Glass:Glass2"],
        WallRight: ["BP_WallRight_Wood:Wood1", "BP_WallRight_Wood:Wood0", "BP_WallRight_Wood:Brick1"],
        Platform: ["BP_Platform2"],
        Columns: ["Columns:Blue", "Columns:Yellow0", "Columns:White0"],
        Roof: ["BP_Roof_Glass:Glass1", "BP_Roof_Glass:Glass2"],
        Back: ["BP_Back2"],
        Screen: [],
      };
      setAvailableOptions(fallbackOptions);
    }
  };

  const fetchSceneDescriptor = async () => {
    fetchSceneDescriptorFallback(currentProjectType);
  };

  // ============================================
  // GENERATE ENVIRONMENT (UPDATED FOR BOTH TYPES)
  // ============================================

  const generateEnvironment = async () => {
    if (isGeneratingEnvironment) {
      console.log("⚠️ Already generating environment, skipping duplicate call...");
      return;
    }

    if (!environmentPrompt.trim()) {
      showSnackbar("Please enter an environment description", "warning");
      return;
    }

    if (!availableOptions) {
      showSnackbar("Scene options not loaded", "error");
      return;
    }

    setIsGeneratingEnvironment(true);
    addDebugLog(`Generating environment for prompt: "${environmentPrompt}" (Type: ${currentProjectType})`);

    try {
      const aiSettings = await loadAIImageGenSettings();
      const hasLocalKey =
        aiSettings.gemini.apiKey &&
        aiSettings.gemini.apiKey !== "YOUR_GOOGLE_STUDIO_API_KEY";

      // Use backend provider model if available, otherwise fall back to settings
      const textModel = aiProviders.text?.model ||
        aiSettings.virtualSet?.selectedGeminiModel ||
        DEFAULT_AI_SETTINGS.gemini.textModel;

      let systemPrompt: string;
      let userPrompt: string;

      if (currentProjectType === "Airport") {
        // Airport-specific AI prompt - load custom instructions
        const customInstructions = await getAirportInstructions();
        systemPrompt = buildAirportSystemPrompt(availableOptions as AirportAvailableOptions, customInstructions);
        userPrompt = buildAirportUserPrompt(environmentPrompt, currentScene as AirportSceneParameters);
      } else {
        // VirtualSet-specific AI prompt (existing logic)
        systemPrompt = buildVirtualSetSystemPrompt(availableOptions as VirtualSetAvailableOptions);
        userPrompt = buildVirtualSetUserPrompt(environmentPrompt, currentScene as VirtualSetSceneParameters);
      }

      addDebugLog(`Sending request to AI using model: ${textModel}...`);

      let responseText = "";

      if (hasLocalKey) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${aiSettings.gemini.apiKey}`;
        const requestBody = {
          contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        };

        const response = await callGoogleAPIViaProxy(
          apiUrl,
          "POST",
          { "Content-Type": "application/json" },
          requestBody
        );

        if (response.candidates?.[0]?.content?.parts) {
          responseText = response.candidates[0].content.parts[0].text;
        } else {
          throw new Error("Invalid response format from Gemini API");
        }
      } else {
        const response = await generateWithGemini(systemPrompt + "\n\n" + userPrompt, {
          gemini: {
            ...aiSettings.gemini,
            textModel: textModel,
            apiKey: aiSettings.gemini.apiKey || DEFAULT_AI_SETTINGS.gemini.apiKey,
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          responseText = response.candidates[0].content.parts[0].text;
        } else {
          throw new Error("Invalid response format from Gemini API (Wrapper)");
        }
      }

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const sceneParams: SceneParameters = JSON.parse(jsonMatch[0]);
      addDebugLog("AI generated parameters: " + JSON.stringify(sceneParams));

      // Process based on project type
      let newGeneratedFields: SceneParameters;
      
      if (currentProjectType === "Airport") {
        newGeneratedFields = processAirportAIResponse(sceneParams as AirportSceneParameters, currentScene as AirportSceneParameters);
      } else {
        newGeneratedFields = processVirtualSetAIResponse(sceneParams as VirtualSetSceneParameters, currentScene as VirtualSetSceneParameters, generatedFields as VirtualSetSceneParameters);
      }

      setGeneratedFields(newGeneratedFields);
      setCurrentScene(newGeneratedFields);

      await applySceneParameters(newGeneratedFields);

      // Extract summary
      const assistantSummary = sceneParams.summary || "Scene updated successfully";

      // Add to history
      setEnvironmentPromptHistory((prev) => [...prev, environmentPrompt]);
      setEnvironmentAssistantResponses((prev) => [...prev, assistantSummary]);
      setEnvironmentPrompt("");

      setTimeout(() => {
        if (environmentChatRef.current) {
          environmentChatRef.current.scrollTop = environmentChatRef.current.scrollHeight;
        }
        if (environmentInputRef.current) {
          environmentInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error("Environment generation failed:", error);
      showSnackbar(
        "Failed to generate environment: " + (error instanceof Error ? error.message : String(error)),
        "error"
      );
      addDebugLog("Generation failed: " + String(error));
    } finally {
      setIsGeneratingEnvironment(false);
    }
  };

  // NEW: Build Airport system prompt
  const buildAirportSystemPrompt = (options: AirportAvailableOptions, customInstructions?: string): string => {
    // Format options showing ID = name mapping - AI must return the ID
    const formatOptions = (items: AirportOptionItem[]) =>
      items.filter(item => item.name).map(item => `"${item.id}" = ${item.name}`).join(", ");

    // Build custom instructions section if available
    const customSection = customInstructions
      ? `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n`
      : '';

    return `Airport display configuration AI. Select options based on user description.
${customSection}
AVAILABLE OPTIONS - You MUST return the ID (like "option1", "option2"), NOT the name:
- timeOfDay: "1" to "24" (hour of day)
- environment_background: ${formatOptions(options.environment_background)}
- BaseDown: ${formatOptions(options.BaseDown)}
- BaseTop: ${formatOptions(options.BaseTop)}
- DecoDown: ${formatOptions(options.DecoDown)}
- DecoTop: ${formatOptions(options.DecoTop)}
- ElementDown: ${formatOptions(options.ElementDown)}
- ElementMiddle: ${formatOptions(options.ElementMiddle)}
- ElementTop: ${formatOptions(options.ElementTop)}

CRITICAL RULES:
- Return the OPTION ID (like "option1", "option2", "option3"), NOT the friendly name
- ONLY modify parameters explicitly mentioned by user
- PRESERVE values for unmentioned parameters from current scene
- Use "" (empty string) to disable/remove an element
- Return valid JSON with ALL section keys PLUS a "summary" field

Example: User says "set background to marble" - look up marble in environment_background: "option2" = Marble, so return "option2"
Example response: {"timeOfDay":"14","environment_background":"option2","BaseDown":"","BaseTop":"option3","DecoDown":"","DecoTop":"","ElementDown":"","ElementMiddle":"","ElementTop":"option2","summary":"I set a marble background and hawk top element."}

IMPORTANT: In the summary, use friendly names only (like "marble", "hawk") - never include option IDs in parentheses.`;
  };

  // NEW: Build Airport user prompt
  const buildAirportUserPrompt = (prompt: string, currentScene: AirportSceneParameters | null): string => {
    const currentSceneContext = currentScene
      ? `\n\nCURRENT SCENE STATE:\n${JSON.stringify(currentScene, null, 2)}\n\nIMPORTANT: Keep existing values unless the user explicitly wants to change them.`
      : "\n\nThis is a new scene - set only the mentioned elements.";

    return `Request: "${prompt}"${currentSceneContext}
Return JSON preserving current values, only updating what's mentioned. Use "" to explicitly remove elements.
IMPORTANT: Include a "summary" field with a friendly 1-2 sentence explanation of what you created or changed.`;
  };

  // NEW: Process Airport AI response
  const processAirportAIResponse = (
    sceneParams: AirportSceneParameters,
    previousScene: AirportSceneParameters | null
  ): AirportSceneParameters => {
    const baseState: AirportSceneParameters = {
      timeOfDay: "",
      environment_background: "",
      BaseDown: "",
      BaseTop: "",
      DecoDown: "",
      DecoTop: "",
      ElementDown: "",
      ElementMiddle: "",
      ElementTop: "",
      summary: "",
    };

    const previousState = previousScene || baseState;

    const filteredParams: Partial<AirportSceneParameters> = {};
    const paramKeys: (keyof AirportSceneParameters)[] = [
      "timeOfDay", "environment_background", "BaseDown", "BaseTop", "DecoDown", "DecoTop",
      "ElementDown", "ElementMiddle", "ElementTop"
    ];

    paramKeys.forEach((key) => {
      const newValue = sceneParams[key];
      const oldValue = previousState[key];

      if (newValue !== undefined && newValue !== null) {
        if (newValue !== "" || (newValue === "" && oldValue && oldValue !== "")) {
          filteredParams[key] = newValue;
        }
      }
    });

    if (sceneParams.summary) {
      filteredParams.summary = sceneParams.summary;
    }

    return { ...baseState, ...previousState, ...filteredParams };
  };

  // Existing: Build VirtualSet system prompt
  const buildVirtualSetSystemPrompt = (options: VirtualSetAvailableOptions): string => {
    const buildPromptSection = (sectionName: string, sectionOptions: string[]): string => {
      if (!sceneDescriptor) return `${sectionName}: ${sectionOptions.join(", ")}, ""`;
      const lines: string[] = [`\n${sectionName} options:`];
      const actorGroups: Record<string, string[]> = {};
      sectionOptions.forEach((opt) => {
        const [actorName] = opt.split(":");
        if (!actorGroups[actorName]) actorGroups[actorName] = [];
        actorGroups[actorName].push(opt);
      });
      Object.entries(actorGroups).forEach(([actorName, actorOptions]) => {
        lines.push(`  ${actorName}`);
        actorOptions.forEach((opt) => lines.push(`    - ${opt}`));
      });
      lines.push('  - "" (empty/disabled)');
      return lines.join("\n");
    };

    return `Virtual set designer AI. Select Actor:Style combinations based on user description.

FORMAT: Each parameter uses "<ActorName>:<StyleName>" format.
${buildPromptSection("Floor", options.Floor)}
${buildPromptSection("WallLeft", options.WallLeft)}
${buildPromptSection("WallBack", options.WallBack)}
${buildPromptSection("WallRight", options.WallRight)}
${buildPromptSection("Platform", options.Platform)}
${buildPromptSection("Columns", options.Columns)}
${buildPromptSection("Roof", options.Roof)}
${buildPromptSection("Back", options.Back)}
${buildPromptSection("Screen", options.Screen)}

RULES:
- This is an ITERATIVE process - build upon existing scene configuration
- ONLY modify parameters explicitly mentioned by user
- PRESERVE values for unmentioned parameters from current scene
- Use "" (empty string) to explicitly disable/remove an element
- Return valid JSON with ALL section keys PLUS a "summary" field`;
  };

  // Existing: Build VirtualSet user prompt
  const buildVirtualSetUserPrompt = (prompt: string, currentScene: VirtualSetSceneParameters | null): string => {
    const currentSceneContext = currentScene
      ? `\n\nCURRENT SCENE STATE:\n${JSON.stringify(currentScene, null, 2)}\n\nIMPORTANT: Keep existing values unless the user explicitly wants to change them.`
      : "\n\nThis is a new scene - set only the mentioned elements.";

    return `Request: "${prompt}"${currentSceneContext}
Return JSON preserving current values, only updating what's mentioned. Use "" to explicitly remove elements.
IMPORTANT: Include a "summary" field with a friendly 1-2 sentence explanation of what you created or changed.`;
  };

  // Existing: Process VirtualSet AI response
  const processVirtualSetAIResponse = (
    sceneParams: VirtualSetSceneParameters,
    previousScene: VirtualSetSceneParameters | null,
    previousGenerated: VirtualSetSceneParameters | null
  ): VirtualSetSceneParameters => {
    const baseState: VirtualSetSceneParameters = {
      Floor: "", WallLeft: "", WallBack: "", WallRight: "",
      Platform: "", Columns: "", Roof: "", Back: "", Screen: "", summary: "",
    };

    const previousState = previousGenerated || previousScene || baseState;

    const filteredParams: Partial<VirtualSetSceneParameters> = {};
    const paramKeys: (keyof VirtualSetSceneParameters)[] = [
      "Floor", "WallLeft", "WallBack", "WallRight",
      "Platform", "Columns", "Roof", "Back", "Screen"
    ];

    paramKeys.forEach((key) => {
      const newValue = sceneParams[key];
      const oldValue = previousState[key];

      if (newValue !== undefined && newValue !== null) {
        if (newValue !== "" || (newValue === "" && oldValue && oldValue !== "")) {
          filteredParams[key] = newValue;
        }
      }
    });

    if (sceneParams.summary) {
      filteredParams.summary = sceneParams.summary;
    }

    return { ...baseState, ...previousState, ...filteredParams };
  };
  // ============================================
  // APPLY SCENE PARAMETERS (UPDATED FOR BOTH TYPES)
  // ============================================

  const applySceneParameters = async (params: SceneParameters) => {
    if (isSendingCommand) {
      console.log("⚠️ applySceneParameters called while command is sending, skipping...");
      return;
    }

    console.log("🚀 applySceneParameters called");

    const channel = availableChannels.find((c) => c.id === selectedChannel);
    if (!channel) {
      console.error("❌ No channel found for ID:", selectedChannel);
      showSnackbar("Channel not found", "error");
      return;
    }

    console.log("📡 Found channel:", { id: channel.id, name: channel.name });

    setIsSendingCommand(true);

    try {
      await applySceneParametersViaObject(params);
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
    } finally {
      setIsSendingCommand(false);
    }
  };

  // UPDATED: Apply scene via object based on project type
  const applySceneParametersViaObject = async (params: SceneParameters) => {
    const channel = availableChannels.find((c) => c.id === selectedChannel);
    if (!channel) {
      console.error("❌ No channel found for ID:", selectedChannel);
      throw new Error("No channel selected");
    }

    console.log("📡 Using channel:", { id: channel.id, name: channel.name });

    try {
      let messageObject: any;

      if (currentProjectType === "Airport") {
        // Airport message format
        const airportParams = params as AirportSceneParameters;
        messageObject = {
          objectPath: "/Game/UEDPIE_0_RigLevel01.RigLevel01:PersistentLevel.SceneController_C_1",
          functionName: "ChangeScene",
          parameters: {
            timeOfDay: airportParams.timeOfDay || "",
            environment_background: airportParams.environment_background || "",
            BaseDown: airportParams.BaseDown || "",
            BaseTop: airportParams.BaseTop || "",
            DecoDown: airportParams.DecoDown || "",
            DecoTop: airportParams.DecoTop || "",
            ElementDown: airportParams.ElementDown || "",
            ElementMiddle: airportParams.ElementMiddle || "",
            ElementTop: airportParams.ElementTop || "",
          },
        };
      } else {
        // VirtualSet message format (existing)
        const vsParams = params as VirtualSetSceneParameters;
        messageObject = {
          objectPath: "/Game/-Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1",
          functionName: "ChangeScene",
          parameters: {
            WallLeft: vsParams.WallLeft || "",
            WallRight: vsParams.WallRight || "",
            WallBack: vsParams.WallBack || "",
            Back: vsParams.Back || "",
            Platform: vsParams.Platform || "",
            Roof: vsParams.Roof || "",
            Screen: vsParams.Screen || "",
            Columns: vsParams.Columns || "",
            Floor: vsParams.Floor || "",
          },
        };
      }

      console.log(`📤 Sending ${currentProjectType} command:`, messageObject);
      await sendCommandToUnreal(channel.name, messageObject);
    } catch (error) {
      console.error("Command failed:", error);
    }

    showSnackbar("Scene updated", "success");
  };

  // ============================================
  // CHANNELS & RCP
  // ============================================

  const loadChannels = async () => {
    try {
      console.log("[VirtualSetPage] Loading channels from edge function...");

      const response = await fetch(
        `${supabaseUrl}/functions/v1/channels?type=Unreal`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch channels: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const unrealChannels = (data.channels || []).map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        host: channel.config?.host || "localhost",
        port: channel.config?.port || 30010,
        objectPath: channel.config?.object_path || undefined,
        active: channel.active,
        type: channel.type,
      }));

      setAvailableChannels(unrealChannels);

      if (unrealChannels.length > 0) {
        setSelectedChannel(unrealChannels[0].id);
      } else {
        showSnackbar("No active Unreal channels found", "warning");
      }
    } catch (error) {
      console.error("[VirtualSetPage] Error loading channels:", error);
      showSnackbar(`Failed to load channels: ${error instanceof Error ? error.message : String(error)}`, "error");
      setAvailableChannels([]);
    }
  };

  const refreshInstanceData = () => {
    const channel = availableChannels.find((c) => c.id === selectedChannel);
    if (channel) {
      fetchInstanceByChannel(channel.name);
    }
  };

  const queryRCPObjects = async () => {
    setIsLoadingRCPObjects(true);
    const objects: RCPObject[] = [];
    const functions: RCPFunction[] = [
      {
        name: "Change Scene",
        objectPath: "/remote/preset/RemoteController/function/Change%20Scene",
        description: "Changes the scene configuration",
      },
      {
        name: "Set Backdrop Image",
        objectPath: "/remote/preset/RemoteController/function/Set%20Backdrop%20Image",
        description: "Sets the backdrop image URL",
      },
    ];

    try {
      objects.push({
        objectPath: "/remote/preset/RemoteController",
        name: "RemoteController",
        type: "Preset",
      });
      setAvailableRCPObjects(objects);
      setAvailableRCPFunctions(functions);
    } catch (error) {
      console.error("Failed to queue RCP query commands:", error);
      setAvailableRCPObjects(objects);
      setAvailableRCPFunctions(functions);
    } finally {
      setIsLoadingRCPObjects(false);
    }
  };

  const debugQueryAllInstances = async () => {
    console.warn("debugQueryAllInstances: Not available with fire-and-forget model");
    showSnackbar("Debug query not available with fire-and-forget model", "warning");
    return null;
  };

  const loadManualJson = () => {
    if (!manualJsonInput.trim()) {
      showSnackbar("Please paste JSON data first", "warning");
      return;
    }

    try {
      const descriptor = JSON.parse(manualJsonInput.trim());
      setSceneDescriptor(descriptor);
      
      // Detect type and extract options
      if (descriptor.sections && Array.isArray(descriptor.sections)) {
        setCurrentProjectType("Airport");
        extractAirportAvailableOptions(descriptor as AirportSceneDescriptor);
      } else {
        setCurrentProjectType("VirtualSet");
        extractVirtualSetAvailableOptions(descriptor as VirtualSetSceneDescriptor);
      }
      
      showSnackbar("Scene descriptor loaded successfully!", "success");
      addDebugLog("Manual JSON loaded successfully");
      setManualJsonInput("");
    } catch (error) {
      console.error("Failed to parse manual JSON:", error);
      showSnackbar("Invalid JSON format. Please check your input.", "error");
    }
  };

  const loadSampleJson = () => {
    setManualJsonInput(JSON.stringify(sampleSceneDescriptor, null, 2));
    setSceneDescriptor(sampleSceneDescriptor);
    extractVirtualSetAvailableOptions(sampleSceneDescriptor);
    setCurrentProjectType("VirtualSet");
    showSnackbar("Sample scene descriptor loaded!", "success");
    addDebugLog("Sample JSON loaded");
  };

  // ============================================
  // SPEECH RECOGNITION
  // ============================================

  const startSpeechRecognition = (type: "environment" | "background") => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => {
      if (type === "environment") setIsRecordingEnvironment(true);
      else setIsRecordingBackground(true);
      toast.info("Listening... Speak now");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript += transcript;
      }
      const currentText = finalTranscript + interimTranscript;
      if (type === "environment") setEnvironmentPrompt(currentText);
      else setBackgroundPrompt(currentText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error(`Speech recognition error: ${event.error}`);
      stopSpeechRecognition();
    };

    recognition.onend = () => stopSpeechRecognition();

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecordingEnvironment(false);
    setIsRecordingBackground(false);
  };

  const toggleSpeechRecognition = (type: "environment" | "background") => {
    const isRecording = type === "environment" ? isRecordingEnvironment : isRecordingBackground;
    if (isRecording) {
      stopSpeechRecognition();
      toast.success("Recording stopped");
    } else {
      startSpeechRecognition(type);
    }
  };

  // ============================================
  // BACKDROPS
  // ============================================

  const loadRecentBackdrops = async (searchQuery: string = "") => {
    backdropSearchQuery = searchQuery;
    try {
      const params = new URLSearchParams({ type: "image", limit: "50", offset: "0" });
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const response = await fetch(
        `${supabaseUrl}/functions/v1/media-library?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        showSnackbar("Failed to load recent backdrops", "warning");
        return;
      }

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const backdropAssets: BackdropAsset[] = result.data
          .filter((asset: any) =>
            asset.media_type === "image" &&
            (asset.tags?.includes("virtual-set") ||
              asset.tags?.includes("backdrop") ||
              asset.tags?.includes("ai-generated"))
          )
          .map((asset: any) => ({
            id: asset.id,
            file_url: asset.file_url,
            name: asset.name || t('save.untitled'),
            description: asset.description,
            file_size: asset.file_size,
            ai_model_used: asset.ai_model_used,
            created_at: asset.created_at,
            tags: asset.tags,
          }))
          .slice(0, 12);

        setRecentBackdrops(backdropAssets);
      } else {
        setRecentBackdrops([]);
      }
    } catch (error) {
      console.error("Failed to load recent backdrops:", error);
      showSnackbar("Failed to load recent backdrops", "error");
      setRecentBackdrops([]);
    }
  };

  const handleBackdropSearch = (searchQuery: string) => loadRecentBackdrops(searchQuery);
  const acceptBackdrop = async () => {
    if (!pendingBackdrop) return;
    setSelectedBackdrop(pendingBackdrop);
    setPendingBackdrop(null);
    showSnackbar("Backdrop accepted", "success");
  };
  const rejectBackdrop = () => setPendingBackdrop(null);

  const applySelectedBackdrop = async () => {
    if (!selectedBackdrop) return;
    try {
      await callSetBackdropImage(selectedBackdrop);
      setPreviewBackdrop(selectedBackdrop);
      showSnackbar("Backdrop applied to virtual set!", "success");
    } catch (error) {
      console.error("Failed to apply backdrop:", error);
      showSnackbar("Failed to apply backdrop", "error");
    }
  };

  const callSetBackdropImage = async (imageUrl: string) => {
    const channel = availableChannels.find((c) => c.id === selectedChannel);
    if (!channel) return;

    try {
      const messageObject = {
        objectPath: "/Game/-Levels/UEDPIE_0_CleanLevel.CleanLevel:PersistentLevel.BP_SetManager_v4_C_1",
        functionName: "SetBackdropImage",
        parameters: { URL: imageUrl }
      };
      await sendCommandToUnreal(channel.name, messageObject);
    } catch (error) {
      console.warn(`Massive Failure`, error);
    }
  };

  const sendRCPCommand = async (url: string, verb: string = "GET", body: any = null): Promise<any> => {
    const channel = availableChannels.find((c) => c.id === selectedChannel);
    if (!channel) throw new Error("No channel selected");
    const messageObject = createMessageObject(url, verb, body);
    const result = await sendCommandToUnreal(channel.name, messageObject);
    return { status: 200, data: result };
  };

  // ============================================
  // DRAWING
  // ============================================

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ctx = canvas.getContext("2d");
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  
  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getMaskFromAnnotations = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const hasAnnotations = imageData?.data.some((pixel) => pixel !== 0);
    if (!hasAnnotations) return null;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return null;

    maskCtx.fillStyle = "#000000";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.drawImage(canvas, 0, 0);

    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = maskImageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
    maskCtx.putImageData(maskImageData, 0, 0);
    return maskCanvas.toDataURL("image/png");
  };

  // ============================================
  // SAVE DIALOG
  // ============================================

  const handleSaveContent = async () => {
    // For Airport: just parameters
    // For VirtualSet: parameters + backdrop image
    // Check both currentScene and generatedFields (manual selections go to generatedFields)
    const sceneToSave = currentScene || generatedFields;
    const hasParameters = sceneToSave && Object.keys(sceneToSave).length > 0;

    if (currentProjectType === "Airport" && !hasParameters) {
      toast.error("Nothing to save. Please configure the airport display first.");
      return;
    }

    if (currentProjectType === "VirtualSet" && !hasParameters && !selectedBackdrop) {
      toast.error("Nothing to save. Please set parameters or generate a backdrop first.");
      return;
    }

    // Use environment prompt for name
    const lastPrompt = environmentPromptHistory.length > 0
      ? environmentPromptHistory[environmentPromptHistory.length - 1]
      : t('save.untitledConfiguration');

    const name = lastPrompt.length > 50 ? lastPrompt.substring(0, 47) + "..." : lastPrompt;

    setSaveDialogOpen(true);
    setSaveName(name);
    setSaveDescription(lastPrompt);
    setSaveTags([currentProjectType.toLowerCase(), "user-saved"]);
    setIsPublic(false);
    setNameError("");
  };

  const performSave = async () => {
    if (!saveName.trim()) {
      setNameError("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      // For Airport: just save parameters (no backdrop)
      // For VirtualSet: save parameters + backdrop
      const backdropToSave = currentProjectType === "VirtualSet" ? selectedBackdrop : null;

      // Ensure project type is in tags for later detection
      const tagsWithType = saveTags.includes(currentProjectType.toLowerCase())
        ? saveTags
        : [...saveTags, currentProjectType.toLowerCase()];

      // DEBUG: Log current state values
      console.log("🔍 performSave - generatedFields:", JSON.stringify(generatedFields, null, 2));
      console.log("🔍 performSave - currentScene:", JSON.stringify(currentScene, null, 2));

      // Use generatedFields as the source of truth for scene config since dropdowns bind to it
      // When user loads external content, it populates both currentScene AND generatedFields
      // After that, all dropdown changes go to generatedFields, so that's what we save
      const rawSceneConfig = generatedFields || currentScene || {};
      console.log("🔍 performSave - rawSceneConfig:", JSON.stringify(rawSceneConfig, null, 2));

      // Filter to only include relevant parameters for the project type
      let sceneConfigToSave: Record<string, any> = {};
      if (currentProjectType === "Airport") {
        // Only save Airport parameters
        const airportKeys = ['timeOfDay', 'environment_background', 'BaseDown', 'BaseTop', 'DecoDown', 'DecoTop', 'ElementDown', 'ElementMiddle', 'ElementTop'];
        for (const key of airportKeys) {
          if (key in rawSceneConfig) {
            sceneConfigToSave[key] = rawSceneConfig[key];
          }
        }
      } else {
        // Only save VirtualSet parameters
        const vsKeys = ['WallLeft', 'WallRight', 'WallBack', 'Back', 'Platform', 'Roof', 'Screen', 'Columns', 'Floor'];
        for (const key of vsKeys) {
          if (key in rawSceneConfig) {
            sceneConfigToSave[key] = rawSceneConfig[key];
          }
        }
      }

      const { data, error } = await supabase.rpc("vs_content_save", {
        p_id: null, // New content, no existing ID
        p_name: saveName,
        p_scene_config: sceneConfigToSave,
        p_backdrop_url: backdropToSave,
        p_description: saveDescription,
        p_tags: tagsWithType,
        p_is_public: isPublic,
        p_folder_id: null, // No folder for now
        p_project_id: activeProject?.id || null, // Associate with current project
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${currentProjectType} configuration saved!`);
        setSaveDialogOpen(false);
        setSaveName("");
        setSaveDescription("");
        setSaveTags([currentProjectType.toLowerCase(), "user-saved"]);
        setIsPublic(false);
        setNameError("");
        // Notify parent to refresh content library
        onContentSaved?.();
      } else {
        throw new Error(data?.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSaveTags(saveTags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (saveTags.length >= 10) {
        toast.warning("Maximum 10 tags allowed");
        return;
      }
      if (saveTags.includes(newTag)) {
        toast.warning("Tag already added");
        return;
      }
      setSaveTags([...saveTags, newTag]);
      setTagInput("");
    }
  };

  // ============================================
  // BACKGROUND IMAGE GENERATION
  // ============================================

  const generateBackgroundImage = async () => {
    if (isGeneratingBackground) {
      console.log("⚠️ Already generating background, skipping duplicate call...");
      return;
    }

    if (!backgroundPrompt.trim()) {
      showSnackbar("Please enter a background description", "warning");
      return;
    }

    setIsGeneratingBackground(true);
    addDebugLog(`Generating background image for prompt: "${backgroundPrompt}"`);

    try {
      const aiSettings = await loadAIImageGenSettings();

      if (!aiSettings.imagen.apiKey || aiSettings.imagen.apiKey === "YOUR_GOOGLE_STUDIO_API_KEY") {
        throw new Error("Please configure your AI API key in Settings");
      }

      // Check if we have an existing backdrop AND mask annotations for editing mode
      const maskDataUri = await getMaskFromAnnotations();
      const isEditMode = selectedBackdrop && maskDataUri;

      // Add to history immediately
      setBackgroundPromptHistory((prev) => [...prev, backgroundPrompt]);
      setBackgroundAssistantResponses((prev) => [
        ...prev,
        isEditMode ? "Editing your image..." : "Generating your backdrop..."
      ]);

      const selectedRatio = aiSettings.virtualSet.defaultAspectRatio || '16:9';
      // Use backend provider model if available, otherwise fall back to settings
      const selectedModel = aiProviders.imageGen?.model ||
        aiSettings.virtualSet?.selectedImagenModel ||
        aiSettings.imagen.model ||
        DEFAULT_AI_SETTINGS.imagen.model;

      addDebugLog(`Using model: ${selectedModel}, ratio: ${selectedRatio}`);
      addDebugLog(`Mode: ${isEditMode ? 'EDIT (with mask)' : 'GENERATE (new image)'}`);

      // Use backend provider model for image editing if available
      const imageEditModel = aiProviders.imageEdit?.model ||
        aiSettings.virtualSet?.selectedImageEditModel ||
        aiSettings.imageEdit?.model ||
        DEFAULT_AI_SETTINGS.imageEdit.model;

      let result: { imageUrl?: string; base64?: string; error?: string };

      if (isEditMode) {
        // EDIT MODE: Use existing backdrop with mask for inpainting
        addDebugLog(`Calling Imagen Edit API with mask using model: ${imageEditModel}...`);

        // Merge backend provider model into settings
        const editSettings = {
          ...aiSettings,
          virtualSet: {
            ...aiSettings.virtualSet,
            selectedImageEditModel: imageEditModel
          }
        };

        result = await editImageWithImagen(
          selectedBackdrop!,  // Source image
          maskDataUri!,       // Mask (white = edit areas)
          backgroundPrompt,   // What to generate in masked areas
          editSettings
        );

        // Clear the canvas after editing
        clearDrawing();
      } else {
        // GENERATE MODE: Create new image from scratch
        const enhancedPrompt = `Professional virtual set backdrop: ${backgroundPrompt}. High quality, cinematic lighting, broadcast quality, 4K resolution.`;

        addDebugLog("Calling Imagen Generate API...");

        // Merge backend provider model into settings
        const genSettings = {
          ...aiSettings,
          imagen: {
            ...aiSettings.imagen,
            model: selectedModel
          }
        };

        result = await generateImageWithImagen(
          enhancedPrompt,
          genSettings,
          backgroundPrompt.length > 50 ? backgroundPrompt.substring(0, 47) + "..." : backgroundPrompt,
          backgroundPrompt,
          true  // usePromptInjectors
        );
      }

      if (result.imageUrl || result.base64) {
        const generatedImageUrl = result.imageUrl || `data:image/png;base64,${result.base64}`;
        addDebugLog(`Image ${isEditMode ? 'edited' : 'generated'} successfully: ${generatedImageUrl.substring(0, 100)}...`);

        // Save to media library (only for new generations, edits are saved by editImageWithImagen)
        if (!isEditMode) {
          try {
            const response = await fetch(
              `${supabaseUrl}/functions/v1/media-library`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  file_url: generatedImageUrl,
                  name: backgroundPrompt.length > 50
                    ? backgroundPrompt.substring(0, 47) + "..."
                    : backgroundPrompt,
                  description: backgroundPrompt,
                  media_type: "image",
                  ai_model_used: selectedModel,
                  ai_prompt: backgroundPrompt,
                  tags: ["virtual-set", "backdrop", "ai-generated"],
                }),
              }
            );

            if (response.ok) {
              addDebugLog("Saved to media library");
            }
          } catch (saveError) {
            console.warn("Failed to save to media library:", saveError);
          }
        }

        // Reload backdrops to show new/edited image
        await loadRecentBackdrops(backdropSearchQuery);

        // Set as pending backdrop for preview - preserves session by updating current selection
        setPendingBackdrop(generatedImageUrl);
        setSelectedBackdrop(generatedImageUrl);

        // Update assistant response with friendly summary
        setBackgroundAssistantResponses((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = isEditMode
            ? t('ai.doneUpdatedImage', { prompt: backgroundPrompt })
            : t('ai.heresYourBackdrop', { prompt: backgroundPrompt });
          return updated;
        });

        setBackgroundPrompt("");
        showSnackbar(isEditMode ? t('toast.backgroundEdited') : t('toast.backgroundGenerated'), "success");

        // Auto-scroll to bottom
        setTimeout(() => {
          if (backgroundChatRef.current) {
            backgroundChatRef.current.scrollTop = backgroundChatRef.current.scrollHeight;
          }
          if (backgroundInputRef.current) {
            backgroundInputRef.current.focus();
          }
        }, 100);
      } else {
        throw new Error(result.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Background generation error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Update assistant response with error
      setBackgroundAssistantResponses((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = `Sorry, I couldn't process the image: ${errorMsg}`;
        return updated;
      });

      showSnackbar(`Failed to process background: ${errorMsg}`, "error");
      addDebugLog(`Generation/edit failed: ${errorMsg}`);
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  // ============================================
  // HELPER: Get option keys for current project type
  // ============================================

  const getOptionKeys = (): string[] => {
    if (currentProjectType === "Airport") {
      return ["timeOfDay","environment_background", "BaseDown", "BaseTop", "DecoDown", "DecoTop", "ElementDown", "ElementMiddle", "ElementTop"];
    }
    // For VirtualSet, use dynamic keys from availableOptions if available
    // This supports both old schema and new v1.1.0 schema with dynamic sections
    if (availableOptions) {
      const dynamicKeys = Object.keys(availableOptions).filter(
        key => (availableOptions as any)[key]?.length > 0
      );
      if (dynamicKeys.length > 0) {
        return dynamicKeys;
      }
    }
    // Fallback to default keys for old schema
    return ["Floor", "WallLeft", "WallBack", "WallRight", "Platform", "Columns", "Roof", "Back", "Screen"];
  };

  const getProjectIcon = () => {
    if (currentProjectType === "Airport") {
      return <Plane className="size-5" />;
    }
    return <Sparkles className="size-5" />;
  };

  const getProjectTitle = () => {
    if (currentProjectType === "Airport") {
      return t('environment.airportTitle');
    }
    return t('environment.virtualSetTitle');
  };

  const getProjectDescription = () => {
    if (currentProjectType === "Airport") {
      return t('environment.airportSubtitle');
    }
    return t('environment.virtualSetSubtitle');
  };

  // Get current channel for display
  const currentChannel = availableChannels.find((c) => c.id === selectedChannel);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`mt-3 ${layoutMode === "vertical" ? "max-w-2xl" : "max-w-[95%]"} mx-auto`}>
      <div className="mb-6">
        {/* Channel and Actions Section */}
        <div className="mb-6 flex gap-4">
          <ProjectSelector
            onManageProjects={() => setShowProjectModal(true)}
            onCreateProject={() => setShowProjectModal(true)}
          />

          {/* Channel Box */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 space-y-2 border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="channel-select" className="text-sm font-medium">{t('channel.label')}</Label>
              {/* Project Type Badge */}
              <Badge variant={currentProjectType === "Airport" ? "default" : "secondary"} className="text-xs">
                {currentProjectType === "Airport" ? <Plane className="size-3 me-1" /> : <Sparkles className="size-3 me-1" />}
                {currentProjectType === "Airport" ? t('projectType.airport') : t('projectType.virtualSet')}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={selectedChannel}
                onValueChange={(value) => {
                  if (value === "__create_channel__") {
                    toast.info(t('channel.creationComingSoon'));
                    return;
                  }
                  if (value === "__manage_channels__") {
                    toast.info(t('channel.managementComingSoon'));
                    return;
                  }
                  setSelectedChannel(value);
                  if (activeProject) updateProjectChannel(value);
                }}
              >
                <SelectTrigger id="channel-select" className="flex-1">
                  <SelectValue placeholder={t('channel.selectChannel')}>
                    {selectedChannel && availableChannels.find((c) => c.id === selectedChannel)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{channel.name}</span>
                        <div className="flex items-center gap-1.5">
                          {channel.type && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                              {channel.type}
                            </Badge>
                          )}
                          <Badge
                            variant={channel.active ? "default" : "secondary"}
                            className={channel.active
                              ? "text-xs bg-green-100 text-green-800 border-green-300"
                              : "text-xs bg-muted text-muted-foreground"
                            }
                          >
                            {channel.active ? tCommon('status.active') : tCommon('status.inactive')}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {availableChannels.length > 0 && (
                    <div className="border-t mt-2 pt-2">
                      <SelectItem value="__create_channel__">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Plus className="size-4" />
                          <span>{t('channel.newChannel')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="__manage_channels__">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Settings className="size-4" />
                          <span>{t('channel.manageChannels')}</span>
                        </div>
                      </SelectItem>
                    </div>
                  )}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap max-md-900:hidden">
                {isLoadingInstance ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-blue-500" />
                    <span>{t('channel.loading')}</span>
                  </>
                ) : instanceData ? (
                  <button
                    onClick={() => setShowInstanceDialog(true)}
                    className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <Database className="size-3 text-green-500" />
                    <span className="text-green-600">{t('channel.connected')}</span>
                  </button>
                ) : selectedChannel && instanceError ? (
                  <>
                    <CloudOff className="size-3 text-amber-500" />
                    <span className="text-amber-600">{t('channel.notConnected')}</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{t('channel.offlineMode')}</span>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={refreshInstanceData}
                disabled={isLoadingInstance || !selectedChannel}
                className="h-9 w-9"
                title="Refresh instance data"
              >
                <RefreshCw className={`size-4 ${isLoadingInstance ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </motion.div>

          {/* Actions Box */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="flex-1 space-y-2 border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-md"
          >
            <Label className="text-sm font-medium">{t('actions.label')}</Label>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveContent}
                className="h-7 px-2 bg-black text-white hover:bg-gray-800 border-black"
              >
                <Save className="size-3" />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={layoutMode === "vertical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayoutMode("vertical")}
                  className="h-7 px-2"
                >
                  <Rows3 className="size-4" />
                </Button>
                <Button
                  variant={layoutMode === "horizontal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayoutMode("horizontal")}
                  className="h-7 px-2"
                >
                  <Columns2 className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Loading State */}
        {!sceneDescriptor && isLoadingInstance && (
          <div className="mt-4 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">{t('loading.title')}</h3>
                <p className="text-sm text-blue-700 mt-1">{t('loading.message')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual JSON Input */}
        {!sceneDescriptor && !isLoadingInstance && !instanceData && (
          <div className="mt-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-medium text-amber-900">{t('error.sceneNotLoaded')}</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {instanceError
                      ? t('error.couldNotLoad', { error: instanceError })
                      : selectedChannel
                        ? t('error.noInstanceData')
                        : t('error.selectChannelOrLoad')}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshInstanceData}
                    disabled={isLoadingInstance || !selectedChannel}
                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    <RefreshCw className={`size-4 me-2 ${isLoadingInstance ? "animate-spin" : ""}`} />
                    {t('actions.retryFetch')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={debugQueryAllInstances}
                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    <Bug className="size-4 me-2" />
                    {t('actions.debug')}
                  </Button>
                </div>

                <Separator className="bg-amber-200" />

                <div className="space-y-2">
                  <Textarea
                    placeholder={t('manualJson.placeholder')}
                    value={manualJsonInput}
                    onChange={(e) => setManualJsonInput(e.target.value)}
                    rows={4}
                    className="font-mono text-sm border-amber-200"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={loadManualJson}
                      disabled={!manualJsonInput.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {t('actions.loadJson')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSampleJson}
                      className="border-amber-300 text-amber-900 hover:bg-amber-100"
                    >
                      {t('actions.sampleVirtualSet')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two-column container */}
        <div className={layoutMode === "horizontal" ? "grid grid-cols-2 gap-6" : ""}>
          {/* Environment Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className={`${layoutMode === "vertical" ? "mb-6" : ""} border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-2xl group`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.div
                  className={`p-2 rounded-lg text-white transition-transform duration-300 group-hover:scale-110 ${
                    currentProjectType === "Airport"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                      : "bg-gradient-to-br from-purple-500 to-pink-500"
                  }`}
                >
                  {getProjectIcon()}
                </motion.div>
                <div>
                  <h3 className="font-medium mb-1">{getProjectTitle()}</h3>
                  <p className="text-sm text-muted-foreground max-md-900:hidden">{getProjectDescription()}</p>
                </div>
              </div>
              {environmentPromptHistory.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setEnvironmentPromptHistory([]);
                    setEnvironmentAssistantResponses([]);
                    setCurrentScene(null);
                    setGeneratedFields(null);
                    setEnvironmentPrompt("");
                    showSnackbar(t('toast.historyCleared'), "info");
                  }}
                >
                  <Trash2 className="size-4 me-2" />
                  <span className="max-md-900:hidden">{tCommon('buttons.clearHistory')}</span>
                </Button>
              )}
            </div>

            {/* Chat Container */}
            <Card className={`mb-3 bg-muted/50 flex flex-col !border-0 rounded-lg overflow-hidden shadow-sm ${environmentPromptHistory.length > 0 ? "h-[400px]" : ""}`}>
              <div
                ref={environmentChatRef}
                className={`flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-card border border-b-0 ${environmentPromptHistory.length === 0 ? "min-h-[160px]" : ""}`}
              >
                {environmentPromptHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">
                      {currentProjectType === "Airport"
                        ? t('chat.airportPlaceholder')
                        : t('chat.virtualSetPlaceholder')}
                    </p>
                  </div>
                ) : (
                  environmentPromptHistory.map((prompt, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex justify-end mb-1">
                        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-br-none max-w-[80%]">
                          <p className="text-sm">{prompt}</p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground px-3 py-2 rounded-lg rounded-bl-none max-w-[80%] border">
                          <span className="block text-xs opacity-60 mb-1">{tCommon('aiAssistant')}</span>
                          <p className="text-sm">{environmentAssistantResponses[idx] || t('ai.sceneUpdated')}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-3 relative border">
                <div className="flex gap-2 items-end">
                  <div className="relative flex-1">
                    <Textarea
                      ref={environmentInputRef}
                      placeholder={
                        currentProjectType === "Airport"
                          ? t('chat.airportExample')
                          : t('chat.virtualSetExample')
                      }
                      value={environmentPrompt}
                      onChange={(e) => setEnvironmentPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (environmentPrompt.trim() && !isGeneratingEnvironment) {
                            generateEnvironment();
                          }
                        }
                      }}
                      className="bg-background pr-24 resize-none min-h-[44px]"
                      rows={1}
                      disabled={isGeneratingEnvironment}
                    />
                    <Button
                      size="icon"
                      onClick={() => toggleSpeechRecognition("environment")}
                      disabled={isGeneratingEnvironment}
                      variant={isRecordingEnvironment ? "default" : "ghost"}
                      className={`absolute end-12 bottom-2 h-8 w-8 ${isRecordingEnvironment ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}`}
                    >
                      {isRecordingEnvironment ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={generateEnvironment}
                      disabled={isGeneratingEnvironment || !environmentPrompt.trim()}
                      className="absolute end-2 bottom-2 h-8 w-8"
                    >
                      {isGeneratingEnvironment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" />}
                    </Button>
                  </div>

                  <Button
                    variant={showGeneratedFields ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowGeneratedFields(!showGeneratedFields)}
                    className="h-[44px] w-10"
                  >
                    {showGeneratedFields ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Generated Fields Preview - UPDATED FOR BOTH TYPES */}
            <AnimatePresence>
              {showGeneratedFields && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Card className="mt-4 bg-muted/50 border-2 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">{t('generatedFields.title', { type: currentProjectType })}</h4>
                        <Button
                          onClick={async () => {
                            if (generatedFields) await applySceneParameters(generatedFields);
                          }}
                          disabled={isSendingCommand || !generatedFields}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {tCommon('buttons.apply')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableOptions && getOptionKeys().map((key) => {
                          const options = (availableOptions as any)[key] || [];
                          const value = (generatedFields as any)?.[key] || "";

                          return (
                            <div key={key} className="space-y-2">
                              <Label htmlFor={`field-${key}`}>{key}</Label>
                              <Select
                                value={value || "__none__"}
                                onValueChange={(val) => {
                                  const newValue = val === "__none__" ? "" : val;
                                  console.log(`🔄 Dropdown change: ${key} = "${newValue}"`);
                                  // Use functional update to ensure we always have the latest state
                                  setGeneratedFields((prevFields) => {
                                    const updatedFields = { ...(prevFields || {}), [key]: newValue };
                                    console.log(`🔄 Updated ${key}:`, JSON.stringify(updatedFields, null, 2));
                                    return updatedFields as SceneParameters;
                                  });
                                  // Also sync with currentScene for consistency
                                  setCurrentScene((prevScene) => {
                                    return { ...(prevScene || {}), [key]: newValue } as SceneParameters;
                                  });
                                }}
                              >
                                <SelectTrigger id={`field-${key}`}>
                                  <SelectValue placeholder={t('generatedFields.noneDisabled')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__"><em>{t('generatedFields.noneDisabled')}</em></SelectItem>
                                  {options
                                    .filter((option: string | AirportOptionItem) => {
                                      // Filter out empty strings, __none__ (already added above), and items with empty IDs
                                      const optionId = typeof option === 'string' ? option : option.id;
                                      return optionId && optionId !== "" && optionId !== "__none__";
                                    })
                                    .map((option: string | AirportOptionItem) => {
                                      // Handle both string (VirtualSet) and object (Airport) options
                                      const optionId = typeof option === 'string' ? option : option.id;
                                      const optionName = typeof option === 'string' ? option : option.name;
                                      return (
                                        <SelectItem key={optionId} value={optionId}>{optionName}</SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                              {value && (
                                <p className="text-xs text-muted-foreground">
                                  Selected: {
                                    // Show name for Airport, id for VirtualSet
                                    currentProjectType === "Airport" && options.length > 0 && typeof options[0] !== 'string'
                                      ? (options as AirportOptionItem[]).find(o => o.id === value)?.name || value
                                      : value
                                  }
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Background Panel - Only show for VirtualSet */}
          {currentProjectType === "VirtualSet" && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-2xl group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white transition-transform duration-300 group-hover:scale-110">
                    <ImageIcon className="size-5" />
                  </motion.div>
                  <div>
                    <h3 className="font-medium mb-1">{t('background.title')}</h3>
                    <p className="text-sm text-muted-foreground max-md-900:hidden">{t('background.subtitle')}</p>
                  </div>
                </div>
                {backgroundPromptHistory.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setBackgroundPromptHistory([]);
                      setBackgroundAssistantResponses([]);
                      setBackgroundPrompt("");
                      showSnackbar(t('toast.backgroundHistoryCleared'), "info");
                    }}
                  >
                    <Trash2 className="size-4 me-2" />
                    <span className="max-md-900:hidden">{tCommon('buttons.clearHistory')}</span>
                  </Button>
                )}
              </div>

              {/* Chat Container - half height when backdrop is selected for editing */}
              <Card className={`mb-3 bg-muted/50 flex flex-col !border-0 rounded-lg overflow-hidden shadow-sm ${backgroundPromptHistory.length > 0 ? (selectedBackdrop ? "h-[200px]" : "h-[400px]") : ""}`}>
                <div
                  ref={backgroundChatRef}
                  className={`flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-card border border-b-0 ${backgroundPromptHistory.length === 0 ? "min-h-[160px]" : ""}`}
                >
                  {backgroundPromptHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">{t('background.placeholder')}</p>
                    </div>
                  ) : (
                    backgroundPromptHistory.map((prompt, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex justify-end mb-1">
                          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg rounded-br-none max-w-[80%]">
                            <p className="text-sm">{prompt}</p>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-muted text-foreground px-3 py-2 rounded-lg rounded-bl-none max-w-[85%] border">
                            <span className="block text-xs opacity-60 mb-1">{tCommon('aiAssistant')}</span>
                            <p className="text-sm">{backgroundAssistantResponses[idx] || t('ai.backgroundGenerated')}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-transparent relative border">
                  <div className="flex gap-2 items-end">
                    <div className="relative flex-1">
                      <Textarea
                        ref={backgroundInputRef}
                        placeholder={t('background.inputExample')}
                        value={backgroundPrompt}
                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (backgroundPrompt.trim() && !isGeneratingBackground) {
                              generateBackgroundImage();
                            }
                          }
                        }}
                        className="bg-background pr-24 resize-none min-h-[44px]"
                        rows={1}
                        disabled={isGeneratingBackground}
                      />
                      <Button
                        size="icon"
                        onClick={() => toggleSpeechRecognition("background")}
                        disabled={isGeneratingBackground}
                        variant={isRecordingBackground ? "default" : "ghost"}
                        className={`absolute end-12 bottom-2 h-8 w-8 ${isRecordingBackground ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}`}
                      >
                        {isRecordingBackground ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                      </Button>
                      <Button
                        size="icon"
                        onClick={generateBackgroundImage}
                        disabled={isGeneratingBackground || !backgroundPrompt.trim()}
                        className="absolute end-2 bottom-2 h-8 w-8"
                      >
                        {isGeneratingBackground ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsDrawingMode(!isDrawingMode)}
                      className={`h-[44px] w-10 ${isDrawingMode ? "bg-purple-500/10 border-purple-500" : ""}`}
                      title="Toggle drawing mode for mask annotations"
                    >
                      <ImageIcon className={`size-4 ${isDrawingMode ? "text-purple-600" : ""}`} />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Drawing Tools - Show when drawing mode is active */}
              <AnimatePresence>
                {isDrawingMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 border border-purple-500/30 rounded-lg bg-purple-500/10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Label className="text-sm font-medium">{t('drawing.title')}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearDrawing}
                        className="ml-auto"
                      >
                        {t('drawing.clear')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('drawing.color')}</Label>
                        <input
                          type="color"
                          value={drawingColor}
                          onChange={(e) => setDrawingColor(e.target.value)}
                          className="h-8 w-12 rounded border"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('drawing.brush')}</Label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-xs w-6">{brushSize}px</span>
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      Draw on the preview below to create a mask for inpainting
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Backdrop Preview and Apply */}
              {selectedBackdrop && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3"
                >
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{t('backdrop.selected')}</CardTitle>
                        <div className="flex items-center gap-2">
                          {pendingBackdrop && (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="size-3 me-1" />
                              {t('backdrop.new')}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant={isDrawingMode ? "default" : "outline"}
                            onClick={() => setIsDrawingMode(!isDrawingMode)}
                            className={isDrawingMode ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                            title={t('backdrop.drawTooltip')}
                          >
                            <Edit2 className="size-3 me-1.5" />
                            {isDrawingMode ? t('backdrop.drawing') : t('backdrop.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackdrop(null);
                              setPendingBackdrop(null);
                              setPreviewBackdrop(null);
                              clearDrawing();
                              setIsDrawingMode(false);
                            }}
                            title={t('backdrop.deselectTooltip')}
                          >
                            <X className="size-3 me-1.5" />
                            {t('backdrop.deselect')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={applySelectedBackdrop}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="size-3 me-1.5" />
                            {t('backdrop.applyToSet')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 relative">
                      <div className="relative">
                        <img
                          src={selectedBackdrop}
                          alt="Selected backdrop"
                          className="w-full h-auto object-cover"
                          style={{ maxHeight: "300px" }}
                        />
                        {isDrawingMode && (
                          <canvas
                            ref={canvasRef}
                            width={1920}
                            height={1080}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                            style={{ maxHeight: "300px" }}
                          />
                        )}
                      </div>
                      {/* Drawing tools when in edit mode */}
                      {isDrawingMode && (
                        <div className="p-3 bg-purple-50 border-t flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{t('drawing.color')}</Label>
                            <input
                              type="color"
                              value={drawingColor}
                              onChange={(e) => setDrawingColor(e.target.value)}
                              className="w-8 h-6 rounded border cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{t('drawing.size')}</Label>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={brushSize}
                              onChange={(e) => setBrushSize(Number(e.target.value))}
                              className="w-20"
                            />
                            <span className="text-xs text-muted-foreground">{brushSize}px</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={clearDrawing}
                            className="ml-auto"
                          >
                            <Trash2 className="size-3 me-1" />
                            {t('drawing.clear')}
                          </Button>
                        </div>
                      )}
                      {previewBackdrop === selectedBackdrop && (
                        <div className="absolute top-2 end-2">
                          <Badge className="bg-green-600">
                            <Check className="size-3 me-1" />
                            Applied
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Pending backdrop acceptance */}
              {pendingBackdrop && pendingBackdrop !== selectedBackdrop && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 border-2 border-blue-400 rounded-lg bg-blue-500/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-400">New backdrop generated!</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={rejectBackdrop}
                        className="border-blue-300"
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={acceptBackdrop}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="size-4 me-1.5" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Media Library Selector */}
              <div className="mt-3">
                <BackdropFilter
                  backdrops={recentBackdrops}
                  selectedBackdrop={selectedBackdrop}
                  onSelectBackdrop={setSelectedBackdrop}
                  onSearchChange={handleBackdropSearch}
                  isLoading={false}
                />
              </div>
            </motion.div>
          )}

          {/* Airport-specific second panel (optional info) */}
          {/* {currentProjectType === "Airport" && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="border border-gray-300 rounded-lg p-4 bg-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  <Plane className="size-5" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Airport Display Info</h3>
                  <p className="text-sm text-muted-foreground">Current configuration details</p>
                </div>
              </div>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  {currentScene ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Active Parameters:</p>
                      <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-[300px]">
                        {JSON.stringify(currentScene, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No configuration set yet. Use the chat to configure your airport display.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )} */}
        </div>
      </div>

      {/* Instance Details Dialog */}
      <Dialog open={showInstanceDialog} onOpenChange={setShowInstanceDialog}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-5 text-green-500" />
            Instance Details
          </DialogTitle>
          <DialogDescription className="sr-only">Instance connection details</DialogDescription>

          {instanceData && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Instance Name</label>
                <p className="text-sm mt-1">{instanceData.friendly_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Project Type</label>
                <p className="text-sm mt-1">
                  <Badge variant={currentProjectType === "Airport" ? "default" : "secondary"}>
                    {currentProjectType}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Channel</label>
                <p className="text-sm mt-1">{instanceData.channel_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Last Updated</label>
                <p className="text-sm mt-1">{new Date(instanceData.updated_at).toLocaleString()}</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setShowInstanceDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{t('save.title')}</DialogTitle>
          <DialogDescription>{t('save.description', { type: currentProjectType })}</DialogDescription>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">{tCommon('labels.name')} *</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => { setSaveName(e.target.value); setNameError(""); }}
                placeholder={t('save.namePlaceholder')}
                className={nameError ? "border-red-500" : ""}
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-desc">{tCommon('labels.description')}</Label>
              <Textarea
                id="save-desc"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder={t('save.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('save.tags')}</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[44px]">
                {saveTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="pl-2.5 pr-1 py-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={t('save.addTagPlaceholder')}
                  className="flex-1 min-w-[100px] border-0 shadow-none h-7 text-sm px-0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setSaveDialogOpen(false)} disabled={isSaving}>
                {tCommon('buttons.cancel')}
              </Button>
              <Button onClick={performSave} disabled={isSaving || !saveName.trim()}>
                {isSaving ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
                {tCommon('buttons.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectManagementModal open={showProjectModal} onOpenChange={setShowProjectModal} />

      <canvas ref={canvasRef} style={{ display: "none" }} width={1920} height={1080} />
    </div>
  );
}