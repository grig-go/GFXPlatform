import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer's MapSet plugin for Set/Map support
enableMapSet();
import type {
  Project, Layer, Folder, Template, Element,
  Animation, Keyframe, Binding, AnimationPhase, BindingType,
  ElementType, ProjectDesignSystem, AIChanges,
  DesignTool, HistoryEntry, DesignerSnapshot,
} from '@emergent-platform/types';
import {
  loadChatHistory,
  saveChatMessage,
  clearChatHistory,
  type ChatAttachment,
} from '@/services/chatService';
import {
  fetchProject,
  fetchLayers,
  fetchTemplates,
  fetchElements,
  fetchAnimations,
  fetchKeyframes,
  fetchBindings,
} from '@/services/projectService';
import { supabase } from '@emergent-platform/supabase-client';
import { captureCanvasSnapshot } from '@/lib/canvasSnapshot';

/**
 * Upload a thumbnail to Supabase Storage
 * @param projectId - The project ID (used as filename)
 * @param dataUrl - Base64 data URL of the image
 * @returns The public URL of the uploaded image, or null on failure
 */
async function uploadThumbnailToStorage(projectId: string, dataUrl: string): Promise<string | null> {
  if (!supabase || !dataUrl) return null;

  try {
    // Convert base64 data URL to Blob
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      console.warn('Invalid data URL format for thumbnail');
      return dataUrl; // Return as-is if not a proper data URL
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Upload to storage bucket "thumbnails"
    const fileName = `${projectId}.jpg`;
    const { error } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('Error uploading thumbnail to storage:', error.message);
      // Fall back to storing base64 directly (not ideal but works)
      console.log('Falling back to base64 storage for thumbnail');
      return dataUrl;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    console.log('✅ Thumbnail uploaded to storage:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error in uploadThumbnailToStorage:', err);
    // Fall back to base64 on any error
    return dataUrl;
  }
}

// Chat message type for the store (extends StoredChatMessage with local UI state)
export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  changes_applied?: AIChanges | null;
  error?: boolean;
  created_at: string;
  // Local state
  isSending?: boolean;
  changesApplied?: boolean;
}

interface DesignerState {
  // Project data
  project: Project | null;
  designSystem: ProjectDesignSystem | null;
  layers: Layer[];
  folders: Folder[];
  templates: Template[];

  // Current template being edited
  currentTemplateId: string | null;
  elements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  bindings: Binding[];

  // Selection
  selectedElementIds: string[];
  hoveredElementId: string | null;

  // Canvas state
  zoom: number;
  panX: number;
  panY: number;
  tool: DesignTool;
  showGrid: boolean;
  showGuides: boolean;
  showSafeArea: boolean;

  // Timeline state
  currentPhase: AnimationPhase;
  playheadPosition: number;
  isPlaying: boolean;
  isPlayingFullPreview: boolean; // Playing through all phases (IN → LOOP → OUT)
  selectedKeyframeIds: string[];
  phaseDurations: Record<AnimationPhase, number>; // Duration in ms for each phase

  // On-Air state (for preview/playback testing)
  onAirTemplates: Record<string, { 
    templateId: string; 
    state: 'idle' | 'in' | 'loop' | 'out';
    pendingSwitch?: string; // Template ID to switch to after OUT completes
  }>;

  // Chat state
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Outline panel state
  expandedNodes: Set<string>;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Dirty tracking
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface DesignerActions {
  // Project operations
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  setProject: (project: Project) => void;
  updateProjectSettings: (updates: Partial<Project>) => Promise<void>;
  updateDesignSystem: (designSystem: ProjectDesignSystem) => void;

  // Template operations
  selectTemplate: (id: string | null) => void;
  setTemplates: (templates: Template[]) => void;
  addTemplate: (layerId: string, name?: string) => string;
  duplicateTemplate: (templateId: string) => string | null;
  deleteTemplate: (templateId: string) => Promise<void>;

  // Element operations
  addElement: (type: ElementType, position: { x: number; y: number }, parentId?: string) => string;
  addElementFromData: (data: Partial<Element>) => string;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElements: (ids: string[]) => void;
  setElements: (elements: Element[]) => void;
  groupElements: (ids: string[]) => string | null;
  ungroupElements: (groupId: string) => void;
  moveElementsToTemplate: (elementIds: string[], targetTemplateId: string) => void;

  // Z-order operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setZIndex: (id: string, zIndex: number) => void;

  // Selection
  selectElements: (ids: string[], mode?: 'replace' | 'add' | 'toggle') => void;
  selectAll: () => void;
  deselectAll: () => void;
  setHoveredElement: (id: string | null) => void;

  // Animation operations
  addAnimation: (elementId: string, phase: AnimationPhase) => string;
  updateAnimation: (id: string, updates: Partial<Animation>) => void;
  deleteAnimation: (id: string) => void;
  setAnimations: (animations: Animation[]) => void;
  
  // Keyframe operations
  addKeyframe: (animationId: string, position: number, properties: Record<string, string | number | null>) => string;
  updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  deleteSelectedKeyframes: () => void;
  setKeyframes: (keyframes: Keyframe[]) => void;
  selectKeyframes: (ids: string[]) => void;

  // Binding operations
  setBindings: (bindings: Binding[]) => void;
  addBinding: (
    elementId: string,
    bindingKey: string,
    targetProperty: string,
    bindingType: BindingType
  ) => string;
  deleteBinding: (bindingId: string) => void;

  // Layer operations
  setLayers: (layers: Layer[]) => void;
  addLayer: (type: string, name: string) => Promise<Layer>;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  showAllLayers: () => void;

  // Template visibility/lock
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  toggleTemplateVisibility: (id: string) => void;
  toggleTemplateLock: (id: string) => void;
  showAllTemplates: () => void;
  showAll: () => void;

  // Folder operations
  setFolders: (folders: Folder[]) => void;

  // Canvas controls
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setTool: (tool: DesignTool) => void;
  fitToScreen: (containerWidth?: number, containerHeight?: number) => void;
  resetView: () => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleSafeArea: () => void;

  // Timeline controls
  setPhase: (phase: AnimationPhase) => void;
  setPlayhead: (position: number) => void;
  setPhaseDuration: (phase: AnimationPhase, duration: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  playFullPreview: () => void; // Play through all phases (IN → LOOP → OUT)
  isPlayingFullPreview: boolean; // Whether playing through all phases

  // On-Air controls
  playIn: (templateId: string, layerId: string) => void;
  playOut: (layerId: string) => void;
  switchTemplate: (newTemplateId: string, layerId: string) => void;
  setOnAirState: (layerId: string, state: 'idle' | 'in' | 'loop' | 'out') => void;
  clearOnAir: (layerId: string) => void;

  // Outline panel
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Chat operations
  loadChatMessages: (projectId: string) => Promise<void>;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'project_id' | 'created_at'>) => Promise<ChatMessage | null>;
  markChangesApplied: (messageId: string) => void;
  clearChat: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;
  clearHistory: () => void;
}

// Helper functions
function getDefaultElementName(type: ElementType): string {
  const names: Record<ElementType, string> = {
    div: 'Container',
    text: 'Text',
    line: 'Line',
    image: 'Image',
    shape: 'Shape',
    group: 'Group',
    video: 'Video',
    lottie: 'Lottie',
    'd3-chart': 'Chart',
    map: 'Map',
    ticker: 'Ticker',
    'topic-badge': 'Topic Badge',
    svg: 'SVG',
    icon: 'Icon',
    table: 'Table',
    countdown: 'Countdown',
  };
  return names[type] || 'Element';
}

function getDefaultContent(type: ElementType): Element['content'] {
  switch (type) {
    case 'text':
      return { type: 'text', text: 'New Text' };
    case 'line':
      return {
        type: 'line',
        points: [
          { x: 0, y: 1 },
          { x: 200, y: 1 },
        ],
        stroke: '#FFFFFF',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        arrowStart: { enabled: false, type: 'none' },
        arrowEnd: { enabled: false, type: 'none' },
        opacity: 1,
      };
    case 'image':
      return { type: 'image', src: '', fit: 'cover' };
    case 'shape':
      return { type: 'shape', shape: 'rectangle', fill: '#3B82F6' };
    case 'd3-chart':
      return { 
        type: 'chart', 
        chartType: 'bar',
        data: {
          labels: ['Team A', 'Team B', 'Team C', 'Team D'],
          datasets: [{
            label: 'Points',
            data: [65, 59, 80, 45],
          }],
        },
        options: {
          showLegend: true,
          animated: true,
        },
      };
    case 'map':
      return {
        type: 'map',
        mapStyle: 'dark',
        center: [-74.006, 40.7128] as [number, number], // New York City
        zoom: 12,
        pitch: 0,
        bearing: 0,
        markers: [],
      };
    case 'video':
      return {
        type: 'video',
        src: 'https://www.youtube.com/watch?v=bImk2wEVVCc', // Default video
        loop: true,
        muted: true,
        autoplay: true,
        videoType: 'youtube',
      };
    case 'ticker':
      return {
        type: 'ticker',
        items: [
          { id: '1', content: 'Breaking: First ticker item' },
          { id: '2', content: 'Second ticker item with more text' },
          { id: '3', content: 'Third ticker item' },
        ],
        config: {
          mode: 'scroll',
          direction: 'left',
          speed: 50,
          pauseOnHover: true,
          delay: 3000,
          gap: 60,
          loop: true,
          gradient: true,
          gradientWidth: 50,
        },
      };
    case 'topic-badge':
      return {
        type: 'topic-badge',
        defaultTopic: 'news',
        showIcon: true,
        animated: true,
      };
    case 'svg':
      return {
        type: 'svg',
        svgContent: '',
        preserveAspectRatio: 'xMidYMid meet',
      };
    case 'icon':
      return {
        type: 'icon',
        library: 'lucide',
        iconName: 'Sparkles',
        size: 48,
        color: '#FFFFFF',
      };
    case 'table':
      return {
        type: 'table',
        columns: [
          { id: 'col1', header: 'Team', accessorKey: 'team', width: 200, align: 'left', format: 'text' },
          { id: 'col2', header: 'W', accessorKey: 'wins', width: 80, align: 'center', format: 'number' },
          { id: 'col3', header: 'L', accessorKey: 'losses', width: 80, align: 'center', format: 'number' },
          { id: 'col4', header: 'PCT', accessorKey: 'pct', width: 100, align: 'right', format: 'percentage' },
        ],
        data: [
          { id: 'row1', team: 'Team A', wins: 10, losses: 2, pct: 0.833 },
          { id: 'row2', team: 'Team B', wins: 8, losses: 4, pct: 0.667 },
          { id: 'row3', team: 'Team C', wins: 6, losses: 6, pct: 0.500 },
        ],
        showHeader: true,
        striped: false,
        bordered: false,
        compact: false,
      };
    case 'countdown':
      return {
        type: 'countdown',
        mode: 'duration', // 'duration' | 'datetime' | 'clock'
        durationSeconds: 60, // Default 60 seconds countdown
        targetDatetime: null, // ISO string for datetime mode
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
        showMilliseconds: false,
        showLabels: true,
        separator: ':',
        padZeros: true,
        onComplete: 'stop', // 'stop' | 'loop' | 'hide'
        clockFormat: '24h', // '12h' | '24h' for clock mode
        showDate: false, // Show date in clock mode
        timezone: 'local', // 'local' or IANA timezone string
      };
    default:
      return { type: 'div' };
  }
}

function getDefaultStyles(type: ElementType): Record<string, string | number> {
  switch (type) {
    case 'text':
      return {
        fontSize: '32px',
        fontFamily: 'Inter',
        fontWeight: 600,
        color: '#FFFFFF',
      };
    case 'shape':
      return {
        borderRadius: '8px',
      };
    case 'countdown':
      return {
        fontSize: '48px',
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#FFFFFF',
      };
    default:
      return {};
  }
}

export const useDesignerStore = create<DesignerState & DesignerActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        project: null,
        designSystem: null,
        layers: [],
        folders: [],
        templates: [],
        currentTemplateId: null,
        elements: [],
        animations: [],
        keyframes: [],
        bindings: [],
        selectedElementIds: [],
        hoveredElementId: null,
        zoom: 0.5,
        panX: 0,
        panY: 0,
        tool: 'select',
        showGrid: false,
        showGuides: true,
        showSafeArea: true,
        currentPhase: 'in',
        playheadPosition: 0,
        isPlaying: false,
        isPlayingFullPreview: false,
        selectedKeyframeIds: [],
        phaseDurations: { in: 1500, loop: 3000, out: 1500 }, // Default durations in ms
        onAirTemplates: {},
        chatMessages: [],
        isChatLoading: false,
        expandedNodes: new Set(),
        history: [],
        historyIndex: -1,
        isDirty: false,
        isSaving: false,
        lastSaved: null,
        isLoading: false,
        error: null,

        // Project operations
        loadProject: async (projectId) => {
          set({ isLoading: true, error: null });

          // UUID regex for validation
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isValidUUID = UUID_REGEX.test(projectId);

          try {
            let project: Project | null = null;

            // For REAL projects (valid UUIDs), always load from database to ensure consistency
            // localStorage is only used for demo/local projects or as a fallback
            if (isValidUUID && projectId !== 'demo') {
              // Clear localStorage cache for this project to prevent stale data
              localStorage.removeItem(`nova-project-${projectId}`);
              console.log('🔄 Loading project from database (cleared localStorage cache)');
            } else {
              // For demo/local projects, check localStorage first
              const savedLocal = localStorage.getItem(`nova-project-${projectId}`);
              if (savedLocal) {
                try {
                  const localData = JSON.parse(savedLocal);
                  // Validate data structure to prevent crashes
                  if (!localData || typeof localData !== 'object') {
                    throw new Error('Invalid localStorage data structure');
                  }

                  // Ensure all arrays exist and are arrays
                  const safeData = {
                    project: localData.project || null,
                    designSystem: localData.project?.settings?.designSystem || localData.designSystem || null,
                    layers: Array.isArray(localData.layers) ? localData.layers : [],
                    templates: Array.isArray(localData.templates) ? localData.templates : [],
                    elements: Array.isArray(localData.elements) ? localData.elements : [],
                    animations: Array.isArray(localData.animations) ? localData.animations : [],
                    keyframes: Array.isArray(localData.keyframes) ? localData.keyframes : [],
                    bindings: Array.isArray(localData.bindings) ? localData.bindings : [],
                    chatMessages: Array.isArray(localData.chatMessages) ? localData.chatMessages : [],
                  };

                  set({
                    ...safeData,
                    currentTemplateId: safeData.templates?.[0]?.id || null,
                    isLoading: false,
                    isDirty: false,
                    error: null,
                  });
                  console.log('✅ Loaded project from localStorage:', safeData.project?.name);
                  return;
                } catch (e) {
                  console.error('Failed to parse localStorage data:', e);
                  // Clear corrupted data
                  localStorage.removeItem(`nova-project-${projectId}`);
                  console.warn('Cleared corrupted localStorage data, trying Supabase...');
                }
              }
            }

            // Handle demo/local project (fallback to create new demo if no localStorage data)
            if (!isValidUUID || projectId === 'demo') {
              // Create a new local demo project
              project = {
                id: projectId,
                organization_id: 'local',
                created_by: null,
                name: 'Demo Project',
                description: 'Local demo project',
                slug: 'demo',
                custom_url_slug: null,
                canvas_width: 1920,
                canvas_height: 1080,
                background_color: 'transparent',
                frame_rate: 30,
                api_key: '',
                api_enabled: false,
                is_live: false,
                archived: false,
                published: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                settings: {},
              };
              
              // Create default layers for demo project
              const backgroundLayerId = crypto.randomUUID();
              const fullscreenLayerId = crypto.randomUUID();
              const lowerThirdLayerId = crypto.randomUUID();
              const bugLayerId = crypto.randomUUID();
              
              const demoLayers: Layer[] = [
                {
                  id: backgroundLayerId,
                  project_id: projectId,
                  name: 'Background',
                  layer_type: 'background',
                  z_index: 0,
                  sort_order: 0,
                  position_anchor: 'top-left',
                  position_offset_x: 0,
                  position_offset_y: 0,
                  width: 1920,
                  height: 1080,
                  auto_out: false,
                  allow_multiple: false,
                  transition_in: 'fade',
                  transition_in_duration: 500,
                  transition_out: 'fade',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: true, // Background layer is always on
                  created_at: new Date().toISOString(),
                },
                {
                  id: fullscreenLayerId,
                  project_id: projectId,
                  name: 'Fullscreen',
                  layer_type: 'fullscreen',
                  z_index: 100,
                  sort_order: 1,
                  position_anchor: 'top-left',
                  position_offset_x: 0,
                  position_offset_y: 0,
                  width: 1920,
                  height: 1080,
                  auto_out: false,
                  allow_multiple: false,
                  transition_in: 'fade',
                  transition_in_duration: 500,
                  transition_out: 'fade',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: false,
                  created_at: new Date().toISOString(),
                },
                {
                  id: lowerThirdLayerId,
                  project_id: projectId,
                  name: 'Lower Third',
                  layer_type: 'lower-third',
                  z_index: 300,
                  sort_order: 2,
                  position_anchor: 'bottom-left',
                  position_offset_x: 50,
                  position_offset_y: 150,
                  width: null,
                  height: null,
                  auto_out: true,
                  allow_multiple: false,
                  transition_in: 'slide',
                  transition_in_duration: 500,
                  transition_out: 'slide',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: false,
                  created_at: new Date().toISOString(),
                },
                {
                  id: bugLayerId,
                  project_id: projectId,
                  name: 'Bug',
                  layer_type: 'bug',
                  z_index: 400,
                  sort_order: 3,
                  position_anchor: 'top-right',
                  position_offset_x: 50,
                  position_offset_y: 50,
                  width: null,
                  height: null,
                  auto_out: false,
                  allow_multiple: true,
                  transition_in: 'fade',
                  transition_in_duration: 300,
                  transition_out: 'fade',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: false,
                  created_at: new Date().toISOString(),
                },
              ];
              
              // Create default templates for each layer
              const firstTemplateId = crypto.randomUUID();
              const demoTemplates: Template[] = [
                {
                  id: firstTemplateId,
                  project_id: projectId,
                  layer_id: fullscreenLayerId,
                  folder_id: null,
                  name: 'Main Fullscreen',
                  description: 'Primary fullscreen graphic',
                  tags: ['fullscreen'],
                  thumbnail_url: null,
                  html_template: '<div class="gfx-root"></div>',
                  css_styles: '',
                  width: 1920,
                  height: 1080,
                  in_duration: 500,
                  loop_duration: 0,
                  loop_iterations: 0,
                  out_duration: 300,
                  libraries: [],
                  custom_script: null,
                  enabled: true,
                  locked: false,
                  archived: false,
                  version: 1,
                  sort_order: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: null,
                },
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  layer_id: lowerThirdLayerId,
                  folder_id: null,
                  name: 'Basic L3',
                  description: 'Standard lower third',
                  tags: ['lower-third', 'name'],
                  thumbnail_url: null,
                  html_template: '<div class="gfx-root"></div>',
                  css_styles: '',
                  width: 700,
                  height: 150,
                  in_duration: 500,
                  loop_duration: 0,
                  loop_iterations: 0,
                  out_duration: 300,
                  libraries: [],
                  custom_script: null,
                  enabled: true,
                  locked: false,
                  archived: false,
                  version: 1,
                  sort_order: 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: null,
                },
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  layer_id: bugLayerId,
                  folder_id: null,
                  name: 'Score Bug',
                  description: 'Live score display',
                  tags: ['score', 'bug'],
                  thumbnail_url: null,
                  html_template: '<div class="gfx-root"></div>',
                  css_styles: '',
                  width: 200,
                  height: 80,
                  in_duration: 300,
                  loop_duration: 0,
                  loop_iterations: 0,
                  out_duration: 300,
                  libraries: [],
                  custom_script: null,
                  enabled: true,
                  locked: false,
                  archived: false,
                  version: 1,
                  sort_order: 3,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: null,
                },
              ];
              
              set({
                project,
                layers: demoLayers,
                templates: demoTemplates,
                elements: [],
                animations: [],
                keyframes: [],
                bindings: [],
                chatMessages: [],
                currentTemplateId: firstTemplateId,
                isLoading: false,
                isDirty: false,
                error: null,
              });
              
              console.log('Loaded demo project with default layers');
              return;
            }
            
            // Fetch real project from database
            project = await fetchProject(projectId);
            if (!project) {
              set({ isLoading: false, error: 'Project not found' });
              return;
            }
            
            // Fetch layers - ensure all are enabled by default
            let layers = (await fetchLayers(projectId)).map(layer => ({
              ...layer,
              enabled: true, // Always show all layers on load
            }));
            
            // If no layers found, create default layers
            if (layers.length === 0) {
              console.log('No layers found, creating default layers...');
              const canvasWidth = project.canvas_width || 1920;
              const canvasHeight = project.canvas_height || 1080;
              
              layers = [
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  name: 'Background',
                  layer_type: 'background',
                  z_index: 10,
                  sort_order: 0,
                  position_anchor: 'top-left',
                  position_offset_x: 0,
                  position_offset_y: 0,
                  width: canvasWidth,
                  height: canvasHeight,
                  auto_out: false,
                  allow_multiple: false,
                  transition_in: 'fade',
                  transition_in_duration: 500,
                  transition_out: 'fade',
                  transition_out_duration: 500,
                  enabled: true,
                  locked: false,
                  always_on: true, // Background layer is always on
                  created_at: new Date().toISOString(),
                },
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  name: 'Fullscreen',
                  layer_type: 'fullscreen',
                  z_index: 100,
                  sort_order: 1,
                  position_anchor: 'top-left',
                  position_offset_x: 0,
                  position_offset_y: 0,
                  width: canvasWidth,
                  height: canvasHeight,
                  auto_out: false,
                  allow_multiple: false,
                  transition_in: 'fade',
                  transition_in_duration: 500,
                  transition_out: 'fade',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: false, // Fullscreen layers are not always on
                  created_at: new Date().toISOString(),
                },
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  name: 'Lower Third',
                  layer_type: 'lower-third',
                  z_index: 300,
                  sort_order: 2,
                  position_anchor: 'bottom-left',
                  position_offset_x: Math.round(canvasWidth * 0.04),
                  position_offset_y: Math.round(-canvasHeight * 0.11),
                  width: Math.round(canvasWidth * 0.36),
                  height: Math.round(canvasHeight * 0.14),
                  auto_out: true,
                  allow_multiple: false,
                  transition_in: 'slide-right',
                  transition_in_duration: 400,
                  transition_out: 'slide-left',
                  transition_out_duration: 300,
                  enabled: true,
                  locked: false,
                  always_on: false, // Lower third layers are not always on
                  created_at: new Date().toISOString(),
                },
                {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  name: 'Bug',
                  layer_type: 'bug',
                  z_index: 450,
                  sort_order: 3,
                  position_anchor: 'top-right',
                  position_offset_x: Math.round(-canvasWidth * 0.02),
                  position_offset_y: Math.round(canvasHeight * 0.04),
                  width: Math.round(canvasWidth * 0.1),
                  height: Math.round(canvasHeight * 0.074),
                  auto_out: false,
                  allow_multiple: true,
                  transition_in: 'fade',
                  transition_in_duration: 300,
                  transition_out: 'fade',
                  transition_out_duration: 200,
                  enabled: true,
                  locked: false,
                  always_on: false, // Bug layers are not always on
                  created_at: new Date().toISOString(),
                },
              ];
            }
            
            // Fetch templates - ensure all are enabled by default
            let templates: Template[] = [];
            try {
              templates = (await fetchTemplates(projectId)).map(template => ({
                ...template,
                enabled: true, // Always show all templates on load
              }));
            } catch (e) {
              console.error('Error fetching templates:', e);
              templates = [];
            }
            
            // Fetch all elements, animations, keyframes for all templates
            const allElements: Element[] = [];
            const allAnimations: Animation[] = [];
            const allKeyframes: Keyframe[] = [];
            const allBindings: Binding[] = [];
            
            for (const template of templates) {
              try {
                const [elements, animations, bindings] = await Promise.all([
                  fetchElements(template.id).catch(e => { console.error(`Error fetching elements for template ${template.id}:`, e); return []; }),
                  fetchAnimations(template.id).catch(e => { console.error(`Error fetching animations for template ${template.id}:`, e); return []; }),
                  fetchBindings(template.id).catch(e => { console.error(`Error fetching bindings for template ${template.id}:`, e); return []; }),
                ]);
                
                // Validate arrays
                if (Array.isArray(elements)) allElements.push(...elements);
                if (Array.isArray(animations)) allAnimations.push(...animations);
                if (Array.isArray(bindings)) allBindings.push(...bindings);
                
                // Fetch keyframes for each animation
                for (const anim of animations) {
                  try {
                    const keyframes = await fetchKeyframes(anim.id);
                    if (Array.isArray(keyframes)) allKeyframes.push(...keyframes);
                  } catch (e) {
                    console.error(`Error fetching keyframes for animation ${anim.id}:`, e);
                  }
                }
              } catch (e) {
                console.error(`Error processing template ${template.id}:`, e);
                // Continue with next template
              }
            }
            
            // Load chat history with error handling
            let chatMessages: ChatMessage[] = [];
            try {
              const chatHistory = await loadChatHistory(projectId);
              chatMessages = (Array.isArray(chatHistory) ? chatHistory : []).map((msg) => ({
                ...msg,
                attachments: msg.attachments || undefined, // Convert null to undefined
                isApplied: msg.changes_applied !== null,
              }));
            } catch (e) {
              console.error('Error loading chat history:', e);
              chatMessages = [];
            }
            
            set({
              project,
              layers,
              templates,
              elements: allElements,
              animations: allAnimations,
              keyframes: allKeyframes,
              bindings: allBindings,
              chatMessages,
              currentTemplateId: templates[0]?.id || null,
              isLoading: false,
              isDirty: false,
              error: null,
            });
            
            console.log(`Loaded project: ${project.name} with ${templates.length} templates, ${allElements.length} elements`);
          } catch (error) {
            console.error('Error loading project:', error);
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Failed to load project' 
            });
          }
        },

        saveProject: async () => {
          const state = get();
          if (!state.project) {
            console.warn('No project to save');
            return;
          }

          const projectId = state.project.id;

          // Capture canvas thumbnail
          set({ isSaving: true });
          const thumbnailDataUrl = await captureCanvasSnapshot(0.7, 480);

          // Upload thumbnail to Supabase Storage (only for real projects)
          let thumbnailUrl: string | null = state.project.thumbnail_url || null;
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isValidUUID = UUID_REGEX.test(projectId);

          if (thumbnailDataUrl && isValidUUID && projectId !== 'demo') {
            const uploadedUrl = await uploadThumbnailToStorage(projectId, thumbnailDataUrl);
            if (uploadedUrl) {
              thumbnailUrl = uploadedUrl;
            }
          }

          // Update project with thumbnail URL and timestamp
          const updatedProject = {
            ...state.project,
            thumbnail_url: thumbnailUrl || undefined,
            updated_at: new Date().toISOString(),
          };
          
          // Update the project in state
          set({ project: updatedProject });

          // Skip database operations for demo/local projects
          if (!isValidUUID || projectId === 'demo') {
            console.log('Demo project - saving to localStorage only');
            // Save to localStorage for persistence
            const localData = {
              project: updatedProject,
              layers: state.layers,
              templates: state.templates,
              elements: state.elements,
              animations: state.animations,
              keyframes: state.keyframes,
              bindings: state.bindings,
            };
            localStorage.setItem(`nova-project-${projectId}`, JSON.stringify(localData));
            set({
              isDirty: false,
              isSaving: false,
              lastSaved: new Date(),
            });
            console.log('✅ Demo project saved to localStorage');
            return;
          }
          
          set({ isSaving: true, error: null });
          
          try {
            console.log('Saving project:', projectId);
            
            // 1. Update project metadata (only include columns that exist in DB)
            const projectData: Record<string, unknown> = {
              name: state.project.name,
              description: state.project.description,
              canvas_width: state.project.canvas_width,
              canvas_height: state.project.canvas_height,
              background_color: state.project.background_color,
              frame_rate: state.project.frame_rate,
              thumbnail_url: thumbnailUrl,
              updated_at: new Date().toISOString(),
            };
            
            // Add optional columns if they exist (may fail on older schemas)
            if (state.project.settings) {
              projectData.settings = state.project.settings;
            }
            
            const { error: projectError } = await supabase
              .from('gfx_projects')
              .update(projectData)
              .eq('id', projectId);
            
            if (projectError) {
              console.error('Error saving project:', projectError);
              // Don't throw - continue with other saves
            }
            
            // 2. Save layers (only include DB columns)
            if (state.layers.length > 0) {
              const layersToSave = state.layers.map(l => ({
                id: l.id,
                project_id: projectId,
                name: l.name,
                layer_type: l.layer_type,
                z_index: l.z_index,
                sort_order: l.sort_order,
                position_anchor: l.position_anchor,
                position_offset_x: l.position_offset_x,
                position_offset_y: l.position_offset_y,
                width: l.width,
                height: l.height,
                auto_out: l.auto_out,
                allow_multiple: l.allow_multiple,
                transition_in: l.transition_in,
                transition_in_duration: l.transition_in_duration,
                transition_out: l.transition_out,
                transition_out_duration: l.transition_out_duration,
                enabled: l.enabled ?? true,
                locked: l.locked ?? false,
                always_on: l.always_on ?? false,
              }));
              const { error: layersError } = await supabase
                .from('gfx_layers')
                .upsert(layersToSave, { onConflict: 'id' });
              if (layersError) console.error('Error saving layers:', layersError);
            }
            
            // 3. Save templates (only include DB columns)
            if (state.templates.length > 0) {
              const templatesToSave = state.templates.map(t => ({
                id: t.id,
                project_id: projectId,
                layer_id: t.layer_id,
                folder_id: t.folder_id,
                name: t.name,
                description: t.description,
                tags: t.tags,
                thumbnail_url: t.thumbnail_url,
                html_template: t.html_template,
                css_styles: t.css_styles,
                width: t.width,
                height: t.height,
                in_duration: t.in_duration,
                loop_duration: t.loop_duration,
                loop_iterations: t.loop_iterations,
                out_duration: t.out_duration,
                libraries: t.libraries,
                custom_script: t.custom_script,
                enabled: t.enabled ?? true,
                locked: t.locked ?? false,
                archived: t.archived,
                version: t.version,
                sort_order: t.sort_order,
                updated_at: new Date().toISOString(),
              }));
              const { error: templatesError } = await supabase
                .from('gfx_templates')
                .upsert(templatesToSave, { onConflict: 'id' });
              if (templatesError) console.error('Error saving templates:', templatesError);
            }
            
            // 4. Save elements (only include DB columns)
            if (state.elements.length > 0) {
              const elementsToSave = state.elements.map(e => ({
                id: e.id,
                template_id: e.template_id,
                name: e.name,
                element_id: e.element_id,
                element_type: e.element_type,
                parent_element_id: e.parent_element_id,
                sort_order: e.sort_order,
                z_index: e.z_index ?? 0,
                position_x: e.position_x,
                position_y: e.position_y,
                width: e.width,
                height: e.height,
                rotation: e.rotation,
                scale_x: e.scale_x,
                scale_y: e.scale_y,
                anchor_x: e.anchor_x,
                anchor_y: e.anchor_y,
                opacity: e.opacity,
                content: e.content,
                styles: e.styles,
                classes: e.classes,
                visible: e.visible,
                locked: e.locked,
              }));
              const { error: elementsError } = await supabase
                .from('gfx_elements')
                .upsert(elementsToSave, { onConflict: 'id' });
              if (elementsError) console.error('Error saving elements:', elementsError);
            }
            
            // 5. Save animations
            if (state.animations.length > 0) {
              const animationsToSave = state.animations.map(a => ({
                id: a.id,
                template_id: a.template_id,
                element_id: a.element_id,
                phase: a.phase,
                delay: a.delay,
                duration: a.duration,
                iterations: a.iterations,
                direction: a.direction,
                easing: a.easing,
                preset_id: a.preset_id,
              }));
              const { error: animationsError } = await supabase
                .from('gfx_animations')
                .upsert(animationsToSave, { onConflict: 'id' });
              if (animationsError) console.error('Error saving animations:', animationsError);
            }
            
            // 6. Save keyframes (use properties JSONB column)
            if (state.keyframes.length > 0) {
              const keyframesToSave = state.keyframes.map(k => ({
                id: k.id,
                animation_id: k.animation_id,
                position: k.position,
                easing: k.easing || 'linear',
                properties: k.properties || {},
                // Also save individual columns for backward compatibility
                position_x: k.properties?.position_x ?? k.position_x ?? null,
                position_y: k.properties?.position_y ?? k.position_y ?? null,
                rotation: k.properties?.rotation ?? k.rotation ?? null,
                scale_x: k.properties?.scale_x ?? k.scale_x ?? null,
                scale_y: k.properties?.scale_y ?? k.scale_y ?? null,
                opacity: k.properties?.opacity ?? k.opacity ?? null,
                color: k.properties?.color ?? k.color ?? null,
                background_color: k.properties?.backgroundColor ?? k.background_color ?? null,
                sort_order: k.sort_order ?? 0,
              }));
              const { error: keyframesError } = await supabase
                .from('gfx_keyframes')
                .upsert(keyframesToSave, { onConflict: 'id' });
              if (keyframesError) console.error('Error saving keyframes:', keyframesError);
            }
            
            // 7. Save bindings
            if (state.bindings.length > 0) {
              const bindingsToSave = state.bindings.map(b => ({
                id: b.id,
                template_id: b.template_id,
                element_id: b.element_id,
                binding_key: b.binding_key,
                target_property: b.target_property,
                binding_type: b.binding_type,
                default_value: b.default_value,
                formatter: b.formatter,
                formatter_options: b.formatter_options,
                required: b.required,
              }));
              const { error: bindingsError } = await supabase
                .from('gfx_bindings')
                .upsert(bindingsToSave, { onConflict: 'id' });
              if (bindingsError) console.error('Error saving bindings:', bindingsError);
            }
            
            // Also save to localStorage as backup (for Supabase projects too)
            const localData = {
              project: state.project,
              layers: state.layers,
              templates: state.templates,
              elements: state.elements,
              animations: state.animations,
              keyframes: state.keyframes,
              bindings: state.bindings,
            };
            localStorage.setItem(`nova-project-${projectId}`, JSON.stringify(localData));
            
            set({
              isDirty: false,
              isSaving: false,
              lastSaved: new Date(),
            });
            
            console.log('✅ Project saved successfully to Supabase + localStorage backup');
          } catch (error) {
            console.error('❌ Error saving project:', error);
            
            // Even if Supabase fails, try to save to localStorage as fallback
            try {
              const localData = {
                project: state.project,
                layers: state.layers,
                templates: state.templates,
                elements: state.elements,
                animations: state.animations,
                keyframes: state.keyframes,
                bindings: state.bindings,
              };
              localStorage.setItem(`nova-project-${projectId}`, JSON.stringify(localData));
              console.log('⚠️ Supabase save failed, but saved to localStorage as fallback');
            } catch (localError) {
              console.error('❌ localStorage fallback also failed:', localError);
            }
            
            set({ 
              isSaving: false, 
              error: error instanceof Error ? error.message : 'Failed to save project' 
            });
          }
        },

        setProject: (project) => {
          set({ project });
        },

        updateProjectSettings: async (updates) => {
          const state = get();
          if (!state.project) return;
          
          // Update local state immediately
          const updatedProject = { ...state.project, ...updates };
          set({ project: updatedProject, isDirty: true });
          
          // Persist to Supabase
          try {
            const { error } = await supabase
              .from('gfx_projects')
              .update({
                name: updatedProject.name,
                description: updatedProject.description,
                slug: updatedProject.slug,
                canvas_width: updatedProject.canvas_width,
                canvas_height: updatedProject.canvas_height,
                frame_rate: updatedProject.frame_rate,
                background_color: updatedProject.background_color,
                settings: updatedProject.settings,
                updated_at: new Date().toISOString(),
              })
              .eq('id', state.project.id);
            
            if (error) {
              console.error('Failed to update project settings:', error);
              // Optionally revert on error
            } else {
              set({ isDirty: false, lastSaved: new Date() });
            }
          } catch (error) {
            console.error('Failed to update project settings:', error);
          }
        },

        updateDesignSystem: (designSystem) => {
          set((state) => {
            state.designSystem = designSystem;
            state.isDirty = true;
            // Also store in project settings for persistence
            if (state.project) {
              state.project.settings = {
                ...state.project.settings,
                designSystem,
              };
            }
          });
          get().pushHistory('Update Design System');
        },

        // Template operations
        selectTemplate: (id) => {
          set({
            currentTemplateId: id,
            selectedElementIds: [],
            currentPhase: 'in',
            playheadPosition: 0,
          });
        },

        setTemplates: (templates) => {
          set({ templates });
        },

        addTemplate: (layerId, name) => {
          const id = crypto.randomUUID();
          const state = get();
          const layer = state.layers.find((l) => l.id === layerId);
          const existingTemplates = state.templates.filter((t) => t.layer_id === layerId);
          
          const templateName = name || `${layer?.name || 'Template'} ${existingTemplates.length + 1}`;
          
          const newTemplate: Template = {
            id,
            project_id: state.project?.id || 'demo',
            layer_id: layerId,
            folder_id: null,
            name: templateName,
            description: null,
            tags: [],
            thumbnail_url: null,
            html_template: '<div class="gfx-root"></div>',
            css_styles: '',
            width: layer?.width || 1920,
            height: layer?.height || 1080,
            in_duration: 500,
            loop_duration: null,
            loop_iterations: -1,
            out_duration: 300,
            libraries: [],
            custom_script: null,
            enabled: true,
            locked: false,
            archived: false,
            version: 1,
            sort_order: existingTemplates.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null,
          };
          
          set((state) => {
            state.templates.push(newTemplate);
            state.isDirty = true;
          });
          
          // Auto-select the new template
          get().selectTemplate(id);
          
          return id;
        },

        duplicateTemplate: (templateId) => {
          const state = get();
          const original = state.templates.find((t) => t.id === templateId);
          if (!original) return null;
          
          const id = crypto.randomUUID();
          const existingTemplates = state.templates.filter((t) => t.layer_id === original.layer_id);
          
          // Copy template
          const newTemplate: Template = {
            ...original,
            id,
            name: `${original.name} Copy`,
            sort_order: existingTemplates.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Copy all elements that belong to this template
          const originalElements = state.elements.filter((e) => e.template_id === templateId);
          const elementIdMap = new Map<string, string>(); // old id -> new id
          
          const newElements: Element[] = originalElements.map((el) => {
            const newElId = crypto.randomUUID();
            elementIdMap.set(el.id, newElId);
            return {
              ...el,
              id: newElId,
              template_id: id,
              element_id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
          });
          
          // Update parent references for nested elements
          newElements.forEach((el) => {
            if (el.parent_element_id && elementIdMap.has(el.parent_element_id)) {
              el.parent_element_id = elementIdMap.get(el.parent_element_id)!;
            }
          });
          
          // Copy animations
          const originalAnimations = state.animations.filter((a) => 
            originalElements.some((e) => e.id === a.element_id)
          );
          const animationIdMap = new Map<string, string>();
          
          const newAnimations: Animation[] = originalAnimations.map((anim) => {
            const newAnimId = crypto.randomUUID();
            animationIdMap.set(anim.id, newAnimId);
            return {
              ...anim,
              id: newAnimId,
              element_id: elementIdMap.get(anim.element_id) || anim.element_id,
            };
          });
          
          // Copy keyframes
          const originalKeyframes = state.keyframes.filter((k) =>
            originalAnimations.some((a) => a.id === k.animation_id)
          );
          
          const newKeyframes: Keyframe[] = originalKeyframes.map((kf) => ({
            ...kf,
            id: crypto.randomUUID(),
            animation_id: animationIdMap.get(kf.animation_id) || kf.animation_id,
          }));
          
          set((state) => {
            state.templates.push(newTemplate);
            state.elements.push(...newElements);
            state.animations.push(...newAnimations);
            state.keyframes.push(...newKeyframes);
            state.isDirty = true;
          });
          
          // Auto-select the duplicated template
          get().selectTemplate(id);
          
          return id;
        },

        deleteTemplate: async (templateId) => {
          const state = get();
          const projectId = state.project?.id;
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isValidUUID = projectId && UUID_REGEX.test(projectId);

          // Archive in database immediately (for real projects)
          if (isValidUUID && projectId !== 'demo') {
            try {
              const { error } = await supabase
                .from('gfx_templates')
                .update({ archived: true, updated_at: new Date().toISOString() })
                .eq('id', templateId);

              if (error) {
                console.error('Failed to archive template in database:', error);
              } else {
                console.log('✅ Template archived in database:', templateId);
              }
            } catch (err) {
              console.error('Error archiving template:', err);
            }
          }

          set((draft) => {
            // Delete template from local state
            draft.templates = draft.templates.filter((t) => t.id !== templateId);

            // Delete all elements in template
            const elementIds = draft.elements
              .filter((e) => e.template_id === templateId)
              .map((e) => e.id);
            draft.elements = draft.elements.filter((e) => e.template_id !== templateId);

            // Delete animations for those elements
            const animationIds = draft.animations
              .filter((a) => elementIds.includes(a.element_id))
              .map((a) => a.id);
            draft.animations = draft.animations.filter((a) => !elementIds.includes(a.element_id));

            // Delete keyframes for those animations
            draft.keyframes = draft.keyframes.filter((k) => !animationIds.includes(k.animation_id));

            // Clear selection if deleted template was selected
            if (draft.currentTemplateId === templateId) {
              draft.currentTemplateId = null;
              draft.selectedElementIds = [];
            }

            draft.isDirty = true;
          });
        },

        // Element operations
        addElement: (type, position, parentId) => {
          const id = crypto.randomUUID();
          const elementId = `el-${Date.now()}`;
          const state = get();

          // Calculate z_index: new elements get the highest z_index in the current template
          // Video elements always get z_index 0
          const templateElements = state.elements.filter(e => e.template_id === state.currentTemplateId);
          const maxZIndex = templateElements.length > 0 
            ? Math.max(...templateElements.map(e => e.z_index ?? 0)) 
            : 0;

          const newElement: Element = {
            id,
            template_id: state.currentTemplateId!,
            name: getDefaultElementName(type),
            element_id: elementId,
            element_type: type,
            parent_element_id: parentId || null,
            sort_order: state.elements.length,
            z_index: type === 'video' ? 0 : (maxZIndex + 10), // Video elements always get z_index 0, others get maxZIndex + 10
            position_x: position.x,
            position_y: position.y,
            width: type === 'text' ? null : type === 'line' ? 200 : 200,
            height: type === 'text' ? null : type === 'line' ? 2 : 100,
            rotation: 0,
            scale_x: 1,
            scale_y: 1,
            anchor_x: 0.5,
            anchor_y: 0.5,
            opacity: 1,
            content: getDefaultContent(type),
            styles: getDefaultStyles(type),
            classes: [],
            visible: true,
            locked: false,
          };

          set((state) => {
            state.elements.push(newElement);
            state.selectedElementIds = [id];
            state.isDirty = true;
          });

          get().pushHistory(`Add ${type}`);
          return id;
        },

        addElementFromData: (data) => {
          const id = crypto.randomUUID();
          const state = get();
          
          // Use provided template_id or fall back to current, or first available
          const templateId = data.template_id || state.currentTemplateId || state.templates[0]?.id;
          if (!templateId) {
            console.error('No template ID available for element creation');
            return id;
          }

          // Calculate z_index: new elements get the highest z_index
          const templateElements = state.elements.filter(e => e.template_id === templateId);
          const maxZIndex = templateElements.length > 0 
            ? Math.max(...templateElements.map(e => e.z_index ?? 0)) 
            : 0;

          const elementType = data.element_type || 'shape';
          const newElement: Element = {
            id,
            template_id: templateId,
            name: data.name || 'AI Element',
            element_id: `el-${Date.now()}`,
            element_type: elementType,
            parent_element_id: data.parent_element_id || null,
            sort_order: state.elements.length,
            z_index: data.z_index ?? (elementType === 'video' ? 0 : maxZIndex + 10), // Video elements always get z_index 0
            position_x: data.position_x ?? 100,
            position_y: data.position_y ?? 100,
            width: data.width ?? 200,
            height: data.height ?? 100,
            rotation: data.rotation ?? 0,
            scale_x: data.scale_x ?? 1,
            scale_y: data.scale_y ?? 1,
            anchor_x: data.anchor_x ?? 0.5,
            anchor_y: data.anchor_y ?? 0.5,
            opacity: data.opacity ?? 1,
            content: data.content || { type: 'shape', shape: 'rectangle', fill: '#3B82F6' },
            styles: data.styles || {},
            classes: data.classes || [],
            visible: true,
            locked: false,
          };

          set((state) => {
            state.elements.push(newElement);
            state.selectedElementIds = [id];
            state.isDirty = true;
          });

          get().pushHistory(`AI Create: ${newElement.name}`);
          return id;
        },

        updateElement: (id, updates) => {
          set((state) => {
            const index = state.elements.findIndex((e) => e.id === id);
            if (index !== -1) {
              state.elements[index] = { ...state.elements[index], ...updates };
              state.isDirty = true;
            }
          });
        },

        deleteElements: (ids) => {
          set((state) => {
            state.elements = state.elements.filter((e) => !ids.includes(e.id));
            state.animations = state.animations.filter((a) => !ids.includes(a.element_id));
            state.selectedElementIds = state.selectedElementIds.filter((id) => !ids.includes(id));
            state.isDirty = true;
          });
          get().pushHistory(`Delete elements`);
        },

        setElements: (elements) => {
          set({ elements });
        },

        groupElements: (ids) => {
          if (ids.length < 2) return null;
          
          const state = get();
          const elementsToGroup = state.elements.filter((e) => ids.includes(e.id));
          
          if (elementsToGroup.length < 2) return null;
          
          // Calculate bounding box of all elements
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          elementsToGroup.forEach((el) => {
            minX = Math.min(minX, el.position_x);
            minY = Math.min(minY, el.position_y);
            maxX = Math.max(maxX, el.position_x + (el.width || 0));
            maxY = Math.max(maxY, el.position_y + (el.height || 0));
          });
          
          // Group z_index should be the max of all grouped elements
          const maxZIndex = Math.max(...elementsToGroup.map(e => e.z_index ?? 0));
          
          // Create group element
          const groupId = crypto.randomUUID();
          const groupElement: Element = {
            id: groupId,
            template_id: state.currentTemplateId!,
            name: `Group (${elementsToGroup.length})`,
            element_id: `group-${Date.now()}`,
            element_type: 'group',
            parent_element_id: null,
            sort_order: Math.min(...elementsToGroup.map((e) => e.sort_order)),
            z_index: maxZIndex,
            position_x: minX,
            position_y: minY,
            width: maxX - minX,
            height: maxY - minY,
            rotation: 0,
            scale_x: 1,
            scale_y: 1,
            anchor_x: 0,
            anchor_y: 0,
            opacity: 1,
            content: { type: 'group' },
            styles: {},
            classes: [],
            visible: true,
            locked: false,
          };
          
          set((state) => {
            // Build new elements array: update children + add group
            const updatedElements = state.elements.map((el) => {
              if (ids.includes(el.id)) {
                return {
                  ...el,
                  parent_element_id: groupId,
                  // Make positions relative to group
                  position_x: el.position_x - minX,
                  position_y: el.position_y - minY,
                };
              }
              return el;
            });
            
            // Add group element to the array
            updatedElements.push(groupElement);
            state.elements = updatedElements;
            
            state.selectedElementIds = [groupId];
            state.isDirty = true;
            
            // Auto-expand the group to show children
            state.expandedNodes.add(groupId);
          });
          
          get().pushHistory('Group elements');
          return groupId;
        },

        ungroupElements: (groupId) => {
          const state = get();
          const group = state.elements.find((e) => e.id === groupId);
          
          if (!group || group.element_type !== 'group') return;
          
          const children = state.elements.filter((e) => e.parent_element_id === groupId);
          
          set((state) => {
            // Update children to remove parent reference and adjust positions
            state.elements = state.elements.map((el) => {
              if (el.parent_element_id === groupId) {
                return {
                  ...el,
                  parent_element_id: group.parent_element_id,
                  // Convert positions back to absolute
                  position_x: el.position_x + group.position_x,
                  position_y: el.position_y + group.position_y,
                };
              }
              return el;
            });
            
            // Remove the group element
            state.elements = state.elements.filter((e) => e.id !== groupId);
            
            // Select the former children
            state.selectedElementIds = children.map((c) => c.id);
            state.isDirty = true;
          });
          
          get().pushHistory('Ungroup elements');
        },

        moveElementsToTemplate: (elementIds, targetTemplateId) => {
          const state = get();

          // Verify target template exists
          const targetTemplate = state.templates.find(t => t.id === targetTemplateId);
          if (!targetTemplate) {
            console.error('Target template not found:', targetTemplateId);
            return;
          }

          // Get all elements to move (including nested children)
          const getElementAndChildren = (id: string): string[] => {
            const children = state.elements
              .filter(e => e.parent_element_id === id)
              .flatMap(child => getElementAndChildren(child.id));
            return [id, ...children];
          };

          const allElementIds = new Set<string>();
          elementIds.forEach(id => {
            getElementAndChildren(id).forEach(childId => allElementIds.add(childId));
          });

          set((draft) => {
            // Update elements' template_id
            for (const el of draft.elements) {
              if (allElementIds.has(el.id)) {
                el.template_id = targetTemplateId;
                // Clear parent if the parent isn't also being moved
                if (el.parent_element_id && !allElementIds.has(el.parent_element_id)) {
                  el.parent_element_id = null;
                }
              }
            }

            // Animations reference element_id, not template_id, so no changes needed

            draft.isDirty = true;

            // Clear selection
            draft.selectedElementIds = [];
          });

          get().pushHistory(`Move elements to ${targetTemplate.name}`);

          // Switch to target template to see the moved elements
          get().selectTemplate(targetTemplateId);
        },

        // Z-order operations
        bringToFront: (id) => {
          const state = get();
          const element = state.elements.find(e => e.id === id);
          if (!element) return;
          
          // Get all sibling elements (same template, same parent)
          const siblings = state.elements.filter(
            e => e.template_id === element.template_id && 
                 e.parent_element_id === element.parent_element_id &&
                 e.id !== id
          );
          
          const maxZIndex = siblings.length > 0 
            ? Math.max(...siblings.map(e => e.z_index ?? 0))
            : 0;
          
          set((draft) => {
            const idx = draft.elements.findIndex(e => e.id === id);
            if (idx !== -1) {
              draft.elements[idx].z_index = maxZIndex + 10;
              draft.isDirty = true;
            }
          });
          
          get().pushHistory('Bring to front');
        },

        sendToBack: (id) => {
          const state = get();
          const element = state.elements.find(e => e.id === id);
          if (!element) return;
          
          // Get all sibling elements
          const siblings = state.elements.filter(
            e => e.template_id === element.template_id && 
                 e.parent_element_id === element.parent_element_id &&
                 e.id !== id
          );
          
          const minZIndex = siblings.length > 0 
            ? Math.min(...siblings.map(e => e.z_index ?? 0))
            : 0;
          
          set((draft) => {
            const idx = draft.elements.findIndex(e => e.id === id);
            if (idx !== -1) {
              draft.elements[idx].z_index = Math.max(0, minZIndex - 10);
              draft.isDirty = true;
            }
          });
          
          get().pushHistory('Send to back');
        },

        bringForward: (id) => {
          const state = get();
          const element = state.elements.find(e => e.id === id);
          if (!element) return;
          
          // Get sibling elements sorted by z_index
          const siblings = state.elements
            .filter(
              e => e.template_id === element.template_id && 
                   e.parent_element_id === element.parent_element_id &&
                   e.id !== id
            )
            .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));
          
          // Find the next element above
          const currentZIndex = element.z_index ?? 0;
          const nextAbove = siblings.find(e => (e.z_index ?? 0) > currentZIndex);
          
          if (nextAbove) {
            // Swap z_indices
            set((draft) => {
              const elementIdx = draft.elements.findIndex(e => e.id === id);
              const nextAboveIdx = draft.elements.findIndex(e => e.id === nextAbove.id);
              if (elementIdx !== -1 && nextAboveIdx !== -1) {
                const tempZ = draft.elements[elementIdx].z_index;
                draft.elements[elementIdx].z_index = draft.elements[nextAboveIdx].z_index;
                draft.elements[nextAboveIdx].z_index = tempZ;
                draft.isDirty = true;
              }
            });
          } else {
            // Already at top, just increment
            set((draft) => {
              const idx = draft.elements.findIndex(e => e.id === id);
              if (idx !== -1) {
                draft.elements[idx].z_index = (draft.elements[idx].z_index ?? 0) + 10;
                draft.isDirty = true;
              }
            });
          }
          
          get().pushHistory('Bring forward');
        },

        sendBackward: (id) => {
          const state = get();
          const element = state.elements.find(e => e.id === id);
          if (!element) return;
          
          // Get sibling elements sorted by z_index
          const siblings = state.elements
            .filter(
              e => e.template_id === element.template_id && 
                   e.parent_element_id === element.parent_element_id &&
                   e.id !== id
            )
            .sort((a, b) => (b.z_index ?? 0) - (a.z_index ?? 0)); // Descending
          
          // Find the next element below
          const currentZIndex = element.z_index ?? 0;
          const nextBelow = siblings.find(e => (e.z_index ?? 0) < currentZIndex);
          
          if (nextBelow) {
            // Swap z_indices
            set((draft) => {
              const elementIdx = draft.elements.findIndex(e => e.id === id);
              const nextBelowIdx = draft.elements.findIndex(e => e.id === nextBelow.id);
              if (elementIdx !== -1 && nextBelowIdx !== -1) {
                const tempZ = draft.elements[elementIdx].z_index;
                draft.elements[elementIdx].z_index = draft.elements[nextBelowIdx].z_index;
                draft.elements[nextBelowIdx].z_index = tempZ;
                draft.isDirty = true;
              }
            });
          } else {
            // Already at bottom, just decrement (min 0)
            set((draft) => {
              const idx = draft.elements.findIndex(e => e.id === id);
              if (idx !== -1) {
                draft.elements[idx].z_index = Math.max(0, (draft.elements[idx].z_index ?? 0) - 10);
                draft.isDirty = true;
              }
            });
          }
          
          get().pushHistory('Send backward');
        },

        setZIndex: (id, zIndex) => {
          set((draft) => {
            const idx = draft.elements.findIndex(e => e.id === id);
            if (idx !== -1) {
              draft.elements[idx].z_index = Math.max(0, zIndex);
              draft.isDirty = true;
            }
          });
        },

        // Selection
        selectElements: (ids, mode = 'replace') => {
          const state = get();

          // Auto-select the template containing the first selected element
          // This ensures timeline shows the correct element's keyframes
          if (ids.length > 0) {
            const firstElement = state.elements.find(e => e.id === ids[0]);
            if (firstElement && firstElement.template_id !== state.currentTemplateId) {
              // Switch to the element's template
              set({ currentTemplateId: firstElement.template_id });
            }
          }

          set((draft) => {
            if (mode === 'replace') {
              draft.selectedElementIds = ids;
            } else if (mode === 'add') {
              draft.selectedElementIds = [...new Set([...draft.selectedElementIds, ...ids])];
            } else if (mode === 'toggle') {
              const current = new Set(draft.selectedElementIds);
              ids.forEach((id) => {
                if (current.has(id)) {
                  current.delete(id);
                } else {
                  current.add(id);
                }
              });
              draft.selectedElementIds = Array.from(current);
            }
          });
        },

        selectAll: () => {
          set((state) => {
            state.selectedElementIds = state.elements
              .filter((e) => e.visible && !e.locked)
              .map((e) => e.id);
          });
        },

        deselectAll: () => {
          set({ selectedElementIds: [] });
        },

        setHoveredElement: (id) => {
          set({ hoveredElementId: id });
        },

        // Animation operations
        addAnimation: (elementId, phase) => {
          const id = crypto.randomUUID();
          const state = get();

          // Use the phase duration for the animation duration so keyframes align with timeline
          const phaseDuration = state.phaseDurations[phase];

          const newAnimation: Animation = {
            id,
            template_id: state.currentTemplateId!,
            element_id: elementId,
            phase,
            delay: 0,
            duration: phaseDuration,
            iterations: 1,
            direction: 'normal',
            easing: 'ease-out',
            preset_id: null,
            created_at: new Date().toISOString(),
          };

          set((state) => {
            state.animations.push(newAnimation);
            state.isDirty = true;
          });

          return id;
        },

        updateAnimation: (id, updates) => {
          set((state) => {
            const index = state.animations.findIndex((a) => a.id === id);
            if (index !== -1) {
              state.animations[index] = { ...state.animations[index], ...updates };
              state.isDirty = true;
            }
          });
        },

        deleteAnimation: (id) => {
          set((state) => {
            state.animations = state.animations.filter((a) => a.id !== id);
            // Also delete associated keyframes
            state.keyframes = state.keyframes.filter((kf) => kf.animation_id !== id);
            state.isDirty = true;
          });
        },

        setAnimations: (animations) => {
          set({ animations });
        },

        // Keyframe operations
        addKeyframe: (animationId, position, properties) => {
          const id = crypto.randomUUID();

          const newKeyframe: Keyframe = {
            id,
            animation_id: animationId,
            position,
            properties: properties as Record<string, string | number>,
          };

          set((state) => {
            state.keyframes.push(newKeyframe);
            state.isDirty = true;
          });

          console.log('[Store] Added keyframe:', { id, animationId, position, properties });
          return id;
        },

        updateKeyframe: (id, updates) => {
          set((state) => {
            const index = state.keyframes.findIndex((kf) => kf.id === id);
            if (index !== -1) {
              // Merge properties additively if updating properties
              if (updates.properties) {
                state.keyframes[index] = {
                  ...state.keyframes[index],
                  ...updates,
                  properties: {
                    ...state.keyframes[index].properties,
                    ...updates.properties,
                  },
                };
              } else {
                state.keyframes[index] = { ...state.keyframes[index], ...updates };
              }
              state.isDirty = true;
            }
          });
          console.log('[Store] Updated keyframe:', id, updates);
        },

        deleteKeyframe: (id) => {
          set((state) => {
            state.keyframes = state.keyframes.filter((kf) => kf.id !== id);
            state.selectedKeyframeIds = state.selectedKeyframeIds.filter((kfId) => kfId !== id);
            state.isDirty = true;
          });
        },

        deleteSelectedKeyframes: () => {
          const state = get();
          if (state.selectedKeyframeIds.length === 0) return;
          
          set((draft) => {
            draft.keyframes = draft.keyframes.filter(
              (kf) => !state.selectedKeyframeIds.includes(kf.id)
            );
            draft.selectedKeyframeIds = [];
            draft.isDirty = true;
          });
        },

        setKeyframes: (keyframes) => {
          set({ keyframes });
        },

        selectKeyframes: (ids) => {
          set({ selectedKeyframeIds: ids });
        },

        // Binding operations
        setBindings: (bindings) => {
          set({ bindings });
        },

        addBinding: (elementId, bindingKey, targetProperty, bindingType) => {
          const id = crypto.randomUUID();
          const state = get();

          const newBinding: Binding = {
            id,
            template_id: state.currentTemplateId!,
            element_id: elementId,
            binding_key: bindingKey,
            target_property: targetProperty,
            binding_type: bindingType,
            default_value: null,
            formatter: null,
            formatter_options: null,
            required: false,
          };

          set((state) => {
            state.bindings.push(newBinding);
            state.isDirty = true;
          });

          return id;
        },

        deleteBinding: (bindingId) => {
          set((state) => {
            state.bindings = state.bindings.filter((b) => b.id !== bindingId);
            state.isDirty = true;
          });
        },

        // Layer operations
        setLayers: (layers) => {
          set((state) => {
            state.layers = layers;
            // Expand all layers by default
            const expanded = new Set<string>();
            layers.forEach((l) => expanded.add(l.id));
            state.expandedNodes = expanded;
          });
        },

        addLayer: async (type, name) => {
          const id = crypto.randomUUID();
          const state = get();
          
          const newLayer: Layer = {
            id,
            project_id: state.project?.id || '',
            name,
            layer_type: type as Layer['layer_type'],
            z_index: state.layers.length * 100,
            sort_order: state.layers.length,
            position_anchor: 'top-left',
            position_offset_x: 0,
            position_offset_y: 0,
            width: null,
            height: null,
            auto_out: false,
            allow_multiple: false,
            transition_in: 'fade',
            transition_in_duration: 500,
            transition_out: 'fade',
            transition_out_duration: 300,
            enabled: true,
            locked: false,
            always_on: false,
            created_at: new Date().toISOString(),
          };

          set((state) => {
            state.layers.push(newLayer);
            state.expandedNodes.add(id);
            state.isDirty = true;
          });

          return newLayer;
        },

        updateLayer: (id, updates) => {
          set((state) => {
            const layer = state.layers.find((l) => l.id === id);
            if (layer) {
              Object.assign(layer, updates);
              state.isDirty = true;
            }
          });
        },

        toggleLayerVisibility: (id) => {
          set((state) => {
            const layer = state.layers.find((l) => l.id === id);
            if (layer) {
              layer.enabled = !layer.enabled;
              state.isDirty = true;
            }
          });
        },

        toggleLayerLock: (id) => {
          set((state) => {
            const layer = state.layers.find((l) => l.id === id);
            if (layer) {
              layer.locked = !layer.locked;
              state.isDirty = true;
            }
          });
        },

        deleteLayer: (id) => {
          set((state) => {
            // Check if layer has any templates
            const layerTemplates = state.templates.filter((t) => t.layer_id === id);
            if (layerTemplates.length > 0) {
              console.warn('Cannot delete layer: layer contains templates');
              return;
            }

            // Remove layer from array
            state.layers = state.layers.filter((l) => l.id !== id);
            
            // Remove from expanded nodes if present
            state.expandedNodes.delete(id);
            
            // Clear on-air state if this layer was on-air
            if (state.onAirTemplates[id]) {
              delete state.onAirTemplates[id];
            }
            
            state.isDirty = true;
            get().pushHistory('Delete layer');
          });
        },

        showAllLayers: () => {
          set((state) => {
            state.layers.forEach((layer) => {
              layer.enabled = true;
            });
            state.isDirty = true;
          });
        },

        updateTemplate: (id, updates) => {
          set((state) => {
            const template = state.templates.find((t) => t.id === id);
            if (template) {
              Object.assign(template, updates);
              state.isDirty = true;
            }
          });
        },

        toggleTemplateVisibility: (id) => {
          set((state) => {
            const template = state.templates.find((t) => t.id === id);
            if (template) {
              template.enabled = !template.enabled;
              state.isDirty = true;
            }
          });
        },

        toggleTemplateLock: (id) => {
          set((state) => {
            const template = state.templates.find((t) => t.id === id);
            if (template) {
              template.locked = !template.locked;
              state.isDirty = true;
            }
          });
        },

        showAllTemplates: () => {
          set((state) => {
            state.templates.forEach((template) => {
              template.enabled = true;
            });
            state.isDirty = true;
          });
        },

        showAll: () => {
          set((state) => {
            // Enable all layers
            state.layers.forEach((layer) => {
              layer.enabled = true;
            });
            // Enable all templates
            state.templates.forEach((template) => {
              template.enabled = true;
            });
            state.isDirty = true;
          });
        },

        // Folder operations
        setFolders: (folders) => {
          set({ folders });
        },

        // Canvas controls
        setZoom: (zoom) => {
          set({ zoom: Math.min(Math.max(zoom, 0.1), 4) });
        },

        setPan: (x, y) => {
          set({ panX: x, panY: y });
        },

        setTool: (tool) => {
          set({ tool });
        },

        fitToScreen: (containerWidth?: number, containerHeight?: number) => {
          // Use provided container dimensions or fall back to estimates
          const viewportWidth = containerWidth ?? window.innerWidth - 580;
          const viewportHeight = containerHeight ?? window.innerHeight - 350;
          const project = get().project;
          if (!project) return;

          // Calculate scale to fit canvas exactly in viewport (100% fit, no margin)
          const scaleX = viewportWidth / project.canvas_width;
          const scaleY = viewportHeight / project.canvas_height;
          const zoom = Math.min(scaleX, scaleY);

          // Center the canvas in the viewport
          const scaledCanvasWidth = project.canvas_width * zoom;
          const scaledCanvasHeight = project.canvas_height * zoom;

          set({
            zoom,
            panX: (viewportWidth - scaledCanvasWidth) / 2,
            panY: (viewportHeight - scaledCanvasHeight) / 2,
          });
        },

        resetView: () => {
          set({ zoom: 0.5, panX: 0, panY: 0 });
        },

        toggleGrid: () => {
          set((state) => {
            state.showGrid = !state.showGrid;
          });
        },

        toggleGuides: () => {
          set((state) => {
            state.showGuides = !state.showGuides;
          });
        },

        toggleSafeArea: () => {
          set((state) => {
            state.showSafeArea = !state.showSafeArea;
          });
        },

        // Timeline controls
        setPhase: (phase) => {
          const state = get();
          // Don't stop playing if we're in full preview mode (transitioning between phases)
          if (state.isPlayingFullPreview) {
            set({ currentPhase: phase, playheadPosition: 0 });
          } else {
            set({ currentPhase: phase, playheadPosition: 0, isPlaying: false });
          }
        },

        setPlayhead: (position) => {
          const { phaseDurations, currentPhase } = get();
          const maxPosition = phaseDurations[currentPhase];
          // Clamp playhead to valid range (0 to phase duration)
          const clampedPosition = Math.max(0, Math.min(position, maxPosition));
          set({ playheadPosition: clampedPosition });
        },

        setPhaseDuration: (phase, duration) => {
          set((state) => ({
            phaseDurations: {
              ...state.phaseDurations,
              [phase]: Math.max(500, Math.min(300000, duration)), // Min 0.5s, max 5 min
            },
          }));
        },

        play: () => {
          const state = get();
          const phaseDuration = state.phaseDurations[state.currentPhase];
          
          // If playhead is at or near the end (within 50ms), restart from beginning
          // Otherwise, resume from current position
          if (state.playheadPosition >= phaseDuration - 50) {
            set({ isPlaying: true, playheadPosition: 0 });
          } else {
            set({ isPlaying: true });
          }
        },

        pause: () => {
          set({ isPlaying: false, isPlayingFullPreview: false });
        },

        stop: () => {
          set({ isPlaying: false, isPlayingFullPreview: false, playheadPosition: 0 });
        },

        playFullPreview: () => {
          // Play only the CURRENT phase for the selected template
          // This resets playhead to 0 and sets a flag to isolate to current template
          set({
            playheadPosition: 0,
            isPlaying: true,
            isPlayingFullPreview: true
          });
        },

        // On-Air controls
        playIn: (templateId, layerId) => {
          console.log('[OnAir] Play IN:', templateId, 'in layer:', layerId);
          set((state) => {
            state.onAirTemplates[layerId] = { 
              templateId, 
              state: 'in',
              pendingSwitch: undefined,
            };
          });
        },

        playOut: (layerId) => {
          console.log('[OnAir] Play OUT for layer:', layerId);
          set((state) => {
            if (state.onAirTemplates[layerId]) {
              state.onAirTemplates[layerId].state = 'out';
            }
          });
        },

        switchTemplate: (newTemplateId, layerId) => {
          const state = get();
          const current = state.onAirTemplates[layerId];
          console.log('[OnAir] Switch to:', newTemplateId, 'in layer:', layerId, 'current:', current);
          
          if (current && current.templateId !== newTemplateId) {
            // Mark pending switch and play out current
            set((draft) => {
              draft.onAirTemplates[layerId] = {
                ...draft.onAirTemplates[layerId],
                state: 'out',
                pendingSwitch: newTemplateId,
              };
            });
          } else if (!current) {
            // No current, just play in
            set((draft) => {
              draft.onAirTemplates[layerId] = { 
                templateId: newTemplateId, 
                state: 'in',
                pendingSwitch: undefined,
              };
            });
          }
        },

        setOnAirState: (layerId, state) => {
          set((draft) => {
            if (draft.onAirTemplates[layerId]) {
              draft.onAirTemplates[layerId].state = state;
            }
          });
        },

        clearOnAir: (layerId) => {
          set((state) => {
            delete state.onAirTemplates[layerId];
          });
        },

        // Outline panel
        toggleNode: (nodeId) => {
          set((state) => {
            const expanded = new Set(state.expandedNodes);
            if (expanded.has(nodeId)) {
              expanded.delete(nodeId);
            } else {
              expanded.add(nodeId);
            }
            state.expandedNodes = expanded;
          });
        },

        expandAll: () => {
          set((state) => {
            const expanded = new Set<string>();
            state.layers.forEach((l) => expanded.add(l.id));
            state.folders.forEach((f) => expanded.add(f.id));
            state.expandedNodes = expanded;
          });
        },

        collapseAll: () => {
          set({ expandedNodes: new Set() });
        },

        // Chat operations
        loadChatMessages: async (projectId) => {
          set({ isChatLoading: true });
          try {
            const messages = await loadChatHistory(projectId);
            set({
              chatMessages: messages.map((m) => ({
                id: m.id,
                project_id: m.project_id,
                role: m.role,
                content: m.content,
                attachments: m.attachments || undefined,
                changes_applied: m.changes_applied,
                error: m.error,
                created_at: m.created_at,
                changesApplied: m.changes_applied !== null,
              })),
              isChatLoading: false,
            });
          } catch (error) {
            console.error('Failed to load chat messages:', error);
            set({ isChatLoading: false });
          }
        },

        addChatMessage: async (message) => {
          const project = get().project;
          if (!project) return null;

          // Add message optimistically
          const tempId = crypto.randomUUID();
          const tempMessage: ChatMessage = {
            id: tempId,
            project_id: project.id,
            role: message.role,
            content: message.content,
            attachments: message.attachments,
            changes_applied: message.changes_applied,
            error: message.error,
            created_at: new Date().toISOString(),
            isSending: true,
            changesApplied: message.changesApplied,
          };

          set((state) => {
            state.chatMessages.push(tempMessage);
          });

          // Save to database
          const saved = await saveChatMessage(project.id, {
            role: message.role,
            content: message.content,
            attachments: message.attachments,
            changes_applied: message.changes_applied,
            error: message.error,
            context_template_id: get().currentTemplateId,
            context_element_ids: get().selectedElementIds,
          });

          if (saved) {
            // Update with saved message
            set((state) => {
              const index = state.chatMessages.findIndex((m) => m.id === tempId);
              if (index !== -1) {
                state.chatMessages[index] = {
                  ...saved,
                  attachments: saved.attachments || undefined, // Convert null to undefined
                  isSending: false,
                  changesApplied: message.changesApplied,
                };
              }
            });
            return { 
              ...saved, 
              attachments: saved.attachments || undefined,
              changesApplied: message.changesApplied 
            };
          } else {
            // Database save failed, but message was already sent successfully
            // Just mark as no longer sending, keep the original error state from the message
            // Don't mark as error just because database save failed
            set((state) => {
              const index = state.chatMessages.findIndex((m) => m.id === tempId);
              if (index !== -1) {
                state.chatMessages[index].isSending = false;
                // Keep the original error state from the message, don't override it
                // The message.error flag is set by ChatPanel only when AI actually fails
              }
            });
            // Return the temp message as a successful local message
            return { 
              ...tempMessage, 
              isSending: false,
              attachments: tempMessage.attachments || undefined,
              changesApplied: message.changesApplied 
            };
          }
        },

        markChangesApplied: (messageId) => {
          set((state) => {
            const index = state.chatMessages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              state.chatMessages[index].changesApplied = true;
            }
          });
        },

        clearChat: async () => {
          const project = get().project;
          if (!project) return;

          await clearChatHistory(project.id);
          set({ chatMessages: [] });
        },

        // History
        pushHistory: (description) => {
          const state = get();
          const snapshot: DesignerSnapshot = {
            elements: JSON.parse(JSON.stringify(state.elements)),
            animations: JSON.parse(JSON.stringify(state.animations)),
            keyframes: JSON.parse(JSON.stringify(state.keyframes)),
            bindings: JSON.parse(JSON.stringify(state.bindings)),
          };

          set((state) => {
            // Remove any redo history
            state.history = state.history.slice(0, state.historyIndex + 1);
            // Add new entry
            state.history.push({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              description,
              state: snapshot,
            });
            state.historyIndex = state.history.length - 1;
            // Limit history size
            if (state.history.length > 50) {
              state.history.shift();
              state.historyIndex--;
            }
          });
        },

        undo: () => {
          const state = get();
          if (state.historyIndex <= 0) return;

          const prevEntry = state.history[state.historyIndex - 1];
          set({
            elements: JSON.parse(JSON.stringify(prevEntry.state.elements)),
            animations: JSON.parse(JSON.stringify(prevEntry.state.animations)),
            keyframes: JSON.parse(JSON.stringify(prevEntry.state.keyframes)),
            bindings: JSON.parse(JSON.stringify(prevEntry.state.bindings)),
            historyIndex: state.historyIndex - 1,
            isDirty: true,
          });
        },

        redo: () => {
          const state = get();
          if (state.historyIndex >= state.history.length - 1) return;

          const nextEntry = state.history[state.historyIndex + 1];
          set({
            elements: JSON.parse(JSON.stringify(nextEntry.state.elements)),
            animations: JSON.parse(JSON.stringify(nextEntry.state.animations)),
            keyframes: JSON.parse(JSON.stringify(nextEntry.state.keyframes)),
            bindings: JSON.parse(JSON.stringify(nextEntry.state.bindings)),
            historyIndex: state.historyIndex + 1,
            isDirty: true,
          });
        },

        clearHistory: () => {
          set({ history: [], historyIndex: -1 });
        },
      }))
    )
  )
);

