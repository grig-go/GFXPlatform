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
import { supabase, markSupabaseSuccess, markSupabaseFailure, directRestUpdate } from '@emergent-platform/supabase-client';
import { useAuthStore, getOrganizationId } from '@/stores/authStore';
import { captureCanvasSnapshot } from '@/lib/canvasSnapshot';

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @param operation - Name of the operation for error messages
 * @returns The result of the promise, or throws if timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Direct REST API upsert - bypasses Supabase client to avoid stale connection issues.
 * Uses POST with Prefer: resolution=merge-duplicates for upsert behavior.
 */
async function directRestDelete(
  table: string,
  ids: string[],
  timeoutMs: number = 15000
): Promise<{ success: boolean; error?: string }> {
  if (ids.length === 0) {
    return { success: true };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Use PostgREST's IN filter to delete multiple records
    const idsParam = ids.map(id => `"${id}"`).join(',');
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=in.(${idsParam})`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[directRestDelete] ${table} failed:`, response.status, errorText);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: `Request timed out after ${timeoutMs}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function directRestUpsert(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  timeoutMs: number = 15000,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Use access token if provided, otherwise fall back to anon key
  const authToken = accessToken || supabaseKey;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${authToken}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[directRestUpsert] ${table} failed:`, response.status, errorText);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: `Request timed out after ${timeoutMs}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Upload a thumbnail to Supabase Storage using REST API directly
 * This bypasses the Supabase client to avoid timeout/hanging issues
 * @param projectId - The project ID (used as filename)
 * @param dataUrl - Base64 data URL of the image
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns The public URL of the uploaded image, or null on failure
 */
async function uploadThumbnailToStorage(projectId: string, dataUrl: string, timeoutMs: number = 10000): Promise<string | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // Use the user's access token for authenticated requests (required by RLS policies)
  const accessToken = useAuthStore.getState().accessToken;

  if (!supabaseUrl || !supabaseAnonKey || !dataUrl) return null;

  if (!accessToken) {
    console.warn('[Thumbnail] No access token available, user may not be authenticated');
    return dataUrl; // Return base64 as fallback
  }

  try {
    console.log('[Thumbnail] Starting REST upload for project:', projectId);

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

    const fileName = `${projectId}.jpg`;
    console.log('[Thumbnail] Uploading via REST API, file:', fileName, 'size:', blob.size);

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Upload using Supabase Storage REST API
    // POST to /storage/v1/object/{bucket}/{path} for upload
    // Use upsert by adding x-upsert header
    const response = await fetch(`${supabaseUrl}/storage/v1/object/thumbnails/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=3600',
      },
      body: blob,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Thumbnail] REST upload failed:', response.status, errorText);
      // Fall back to storing base64 directly
      return dataUrl;
    }

    // Construct the public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/thumbnails/${fileName}`;
    console.log('✅ Thumbnail uploaded via REST:', publicUrl);
    return publicUrl;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[Thumbnail] Upload timed out after', timeoutMs, 'ms');
    } else {
      console.error('Error in uploadThumbnailToStorage:', err);
    }
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

  // Pending deletions (tracked until saved to DB)
  pendingDeletions: {
    elements: string[];
    animations: string[];
    keyframes: string[];
    bindings: string[];
    templates: string[];
    layers: string[];
  };

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
  showFps: boolean;
  guides: Array<{ id: string; orientation: 'horizontal' | 'vertical'; position: number }>;

  // Timeline state
  currentPhase: AnimationPhase;
  playheadPosition: number;
  isPlaying: boolean;
  isPlayingFullPreview: boolean; // Playing through all phases (IN → LOOP → OUT)
  selectedKeyframeIds: string[];
  phaseDurations: Record<AnimationPhase, number>; // Duration in ms for each phase
  showEasingEditor: boolean; // Show/hide the bezier curve easing editor panel

  // On-Air state (for preview/playback testing)
  onAirTemplates: Record<string, {
    templateId: string;
    state: 'idle' | 'in' | 'loop' | 'out';
    pendingSwitch?: string; // Template ID to switch to after OUT completes
    timestamp?: number; // Timestamp for detecting repeated plays of the same state
  }>;

  // Script play mode (for testing interactive scripts in canvas)
  isScriptPlayMode: boolean;

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

  // Data binding state
  dataSourceId: string | null;
  dataSourceName: string | null;
  dataSourceSlug: string | null; // Endpoint slug for refresh capability
  dataPayload: Record<string, unknown>[] | null;
  currentRecordIndex: number;
  dataDisplayField: string | null;
  dataLastFetched: number | null; // Timestamp of last data fetch
  dataLoading: boolean; // Loading state for data refresh
  dataError: string | null; // Error state for data operations

  // Cache of data payloads per template (templateId -> payload data)
  // This preserves data bindings when switching between templates
  templateDataCache: Record<string, {
    dataSourceId: string;
    dataSourceName: string;
    dataSourceSlug: string | null;
    dataPayload: Record<string, unknown>[];
    dataDisplayField: string | null;
    currentRecordIndex: number;
  }>;
}

interface DesignerActions {
  // Project operations
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: (newName: string) => Promise<string | null>;
  setProject: (project: Project) => void;
  updateProjectSettings: (updates: Partial<Project>, options?: { skipSave?: boolean }) => Promise<void>;
  updateDesignSystem: (designSystem: ProjectDesignSystem) => Promise<void>;

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
  duplicateElement: (id: string) => string | null;
  deleteElements: (ids: string[]) => void;
  setElements: (elements: Element[]) => void;
  groupElements: (ids: string[]) => string | null;
  ungroupElements: (groupId: string) => void;
  moveElementsToTemplate: (elementIds: string[], targetTemplateId: string) => void;
  reorderElement: (elementId: string, targetIndex: number, parentId?: string | null) => void;
  updateFitToContentParent: (parentId: string) => void;

  // Z-order operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setZIndex: (id: string, zIndex: number) => void;

  // Selection
  selectElements: (ids: string[], mode?: 'replace' | 'add' | 'toggle', options?: { skipTemplateSwitch?: boolean; expandInOutline?: boolean }) => void;
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
  removeKeyframeProperty: (keyframeId: string, propertyKey: string) => void;
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
    bindingType: BindingType,
    templateId?: string
  ) => string;
  updateBinding: (bindingId: string, updates: Partial<Binding>) => void;
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
  reorderTemplate: (templateId: string, targetIndex: number) => void;
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
  toggleFps: () => void;
  addGuide: (guide: { id: string; orientation: 'horizontal' | 'vertical'; position: number }) => void;
  moveGuide: (id: string, newPosition: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  // Timeline controls
  setPhase: (phase: AnimationPhase) => void;
  setPlayhead: (position: number) => void;
  setPhaseDuration: (phase: AnimationPhase, duration: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  playFullPreview: () => void; // Play through all phases (IN → LOOP → OUT)
  endPreviewPlayback: () => void; // End preview but keep template isolated
  setIsPlayingFullPreview: (value: boolean) => void; // Set isolated preview mode
  isPlayingFullPreview: boolean; // Whether playing through all phases
  setShowEasingEditor: (show: boolean) => void; // Toggle the bezier curve easing editor

  // On-Air controls
  playIn: (templateId: string, layerId: string) => void;
  playOut: (layerId: string) => void;
  switchTemplate: (newTemplateId: string, layerId: string) => void;
  setOnAirState: (layerId: string, state: 'idle' | 'in' | 'loop' | 'out') => void;
  clearOnAir: (layerId: string) => void;

  // Script play mode (for testing interactive scripts in canvas)
  setScriptPlayMode: (enabled: boolean) => void;
  toggleScriptPlayMode: () => void;

  // Outline panel
  outlineTab: 'elements' | 'layers';
  setOutlineTab: (tab: 'elements' | 'layers') => void;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToElement: (elementId: string) => void;

  // Chat operations
  loadChatMessages: (projectId: string) => Promise<void>;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'project_id' | 'created_at'>) => Promise<ChatMessage | null>;
  updateChatMessageContent: (messageId: string, content: string) => void;
  markChangesApplied: (messageId: string) => void;
  clearChat: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;
  clearHistory: () => void;

  // Data binding operations
  setDataSource: (id: string, name: string, data: Record<string, unknown>[], displayField: string, slug?: string) => Promise<void>;
  refreshDataSource: () => Promise<void>;
  clearDataSource: () => Promise<void>;
  setCurrentRecordIndex: (index: number) => void;
  setDefaultRecordIndex: (index: number) => Promise<void>;
  nextRecord: () => void;
  prevRecord: () => void;

  // Get data record for a specific template (used by StageElement)
  getDataRecordForTemplate: (templateId: string) => Record<string, unknown> | null;
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
    interactive: 'Interactive',
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
    case 'interactive':
      return {
        type: 'interactive',
        inputType: 'button',
        name: 'button',
        label: 'Button',
        buttonVariant: 'primary',
        buttonSize: 'md',
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
        verticalAlign: 'top',
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

// Binding autosave disabled - only save on explicit Ctrl+S or Save button
function triggerBindingAutosave() {
  // No-op: Auto-save disabled for bindings
  // Changes will be saved when user explicitly saves the project
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
        pendingDeletions: {
          elements: [],
          animations: [],
          keyframes: [],
          bindings: [],
          templates: [],
          layers: [],
        },
        selectedElementIds: [],
        hoveredElementId: null,
        zoom: 0.5,
        panX: 0,
        panY: 0,
        tool: 'select',
        showGrid: false,
        showGuides: true,
        showSafeArea: true,
        showFps: false,
        guides: [],
        currentPhase: 'in',
        playheadPosition: 0,
        isPlaying: false,
        isPlayingFullPreview: false,
        selectedKeyframeIds: [],
        phaseDurations: { in: 1500, loop: 3000, out: 1500 }, // Default durations in ms
        showEasingEditor: false,
        onAirTemplates: {},
        isScriptPlayMode: false,
        chatMessages: [],
        isChatLoading: false,
        expandedNodes: new Set(),
        outlineTab: 'elements',
        history: [],
        historyIndex: -1,
        isDirty: false,
        isSaving: false,
        lastSaved: null,
        isLoading: false,
        error: null,

        // Data binding state
        dataSourceId: null,
        dataSourceName: null,
        dataSourceSlug: null,
        dataPayload: null,
        currentRecordIndex: 0,
        dataDisplayField: null,
        dataLastFetched: null,
        dataLoading: false,
        dataError: null,
        templateDataCache: {},

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
            // NOTE: We DON'T clear localStorage until AFTER successful DB load to prevent data loss
            if (isValidUUID && projectId !== 'demo') {
              console.log('🔄 Loading project from database (localStorage will be refreshed after load)');
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

                  // Load phaseDurations from project settings if available
                  const savedPhaseDurations = safeData.project?.settings?.phaseDurations;
                  const phaseDurations = savedPhaseDurations || { in: 1500, loop: 3000, out: 1500 };

                  // Hydrate data source state for the first template if it has one
                  const firstTemplate = safeData.templates?.[0];
                  let localDataSourceId: string | null = null;
                  let localDataSourceName: string | null = null;
                  let localDataSourceSlug: string | null = null;
                  let localDataPayload: Record<string, unknown>[] | null = null;
                  let localDataDisplayField: string | null = null;
                  let localDefaultRecordIndex = 0;

                  if (firstTemplate?.data_source_id) {
                    const config = firstTemplate.data_source_config as { displayField?: string; slug?: string; defaultRecordIndex?: number } | null;
                    localDataSourceId = firstTemplate.data_source_id;
                    localDataSourceSlug = config?.slug || null;
                    localDataDisplayField = config?.displayField || null;
                    localDefaultRecordIndex = config?.defaultRecordIndex ?? 0;
                    // Data will be fetched from endpoint when user refreshes or reopens data modal
                    if (localDataSourceSlug) {
                      console.log(`📊 Template "${firstTemplate.name}" has endpoint "${localDataSourceSlug}" - use refresh to fetch data`);
                    }
                  }

                  set({
                    ...safeData,
                    currentTemplateId: safeData.templates?.[0]?.id || null,
                    isLoading: false,
                    isDirty: false,
                    error: null,
                    tool: 'select', // Reset tool to select on project load
                    phaseDurations, // Restore saved phase durations
                    // Hydrate data source state for first template
                    dataSourceId: localDataSourceId,
                    dataSourceName: localDataSourceName,
                    dataSourceSlug: localDataSourceSlug,
                    dataPayload: localDataPayload,
                    dataDisplayField: localDataDisplayField,
                    currentRecordIndex: localDefaultRecordIndex,
                    dataLastFetched: null,
                    dataLoading: false,
                    dataError: null,
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
            
            // Fetch real project from database (with timeout)
            const LOAD_TIMEOUT = 15000; // 15 second timeout for load operations

            try {
              project = await withTimeout(fetchProject(projectId), LOAD_TIMEOUT, 'Fetch project');
            } catch (err) {
              console.error('Timeout fetching project:', err);
              set({ isLoading: false, error: 'Failed to load project - request timed out' });
              return;
            }

            if (!project) {
              set({ isLoading: false, error: 'Project not found' });
              return;
            }

            // Fetch layers - ensure all are enabled by default (with timeout)
            let layers: Layer[] = [];
            try {
              const fetchedLayers = await withTimeout(fetchLayers(projectId), LOAD_TIMEOUT, 'Fetch layers');
              layers = fetchedLayers.map(layer => ({
                ...layer,
                enabled: true, // Always show all layers on load
              }));
            } catch (err) {
              console.error('Timeout fetching layers:', err);
              // Continue with empty layers - they'll be created below
            }
            
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
            
            // Fetch templates - ensure all are enabled by default (with timeout)
            let templates: Template[] = [];
            try {
              const fetchedTemplates = await withTimeout(fetchTemplates(projectId), LOAD_TIMEOUT, 'Fetch templates');
              templates = fetchedTemplates.map(template => ({
                ...template,
                enabled: true, // Always show all templates on load
              }));
            } catch (e) {
              console.error('Error/timeout fetching templates:', e);
              templates = [];
            }

            // Fetch all elements, animations, keyframes for all templates (with timeout on batch)
            const allElements: Element[] = [];
            const allAnimations: Animation[] = [];
            const allKeyframes: Keyframe[] = [];
            const allBindings: Binding[] = [];

            for (const template of templates) {
              try {
                const [elements, animations, bindings] = await withTimeout(
                  Promise.all([
                    fetchElements(template.id).catch(e => { console.error(`Error fetching elements for template ${template.id}:`, e); return []; }),
                    fetchAnimations(template.id).catch(e => { console.error(`Error fetching animations for template ${template.id}:`, e); return []; }),
                    fetchBindings(template.id).catch(e => { console.error(`Error fetching bindings for template ${template.id}:`, e); return []; }),
                  ]),
                  LOAD_TIMEOUT,
                  `Fetch template data for ${template.name}`
                );

                // Validate arrays
                if (Array.isArray(elements)) allElements.push(...elements);
                if (Array.isArray(animations)) allAnimations.push(...animations);
                if (Array.isArray(bindings)) {
                  console.log(`📊 Loaded ${bindings.length} bindings for template ${template.id}:`, bindings.map(b => ({
                    id: b.id.slice(0, 8),
                    element_id: b.element_id.slice(0, 8),
                    binding_key: b.binding_key,
                  })));
                  allBindings.push(...bindings);
                }

                // Fetch keyframes for each animation (batch with timeout)
                if (animations.length > 0) {
                  console.log(`📦 Fetching keyframes for ${animations.length} animations in template ${template.id}...`);
                  try {
                    const keyframeResults = await withTimeout(
                      Promise.all(animations.map(anim => fetchKeyframes(anim.id).catch((e) => {
                        console.error(`Failed to fetch keyframes for animation ${anim.id}:`, e);
                        return [];
                      }))),
                      LOAD_TIMEOUT,
                      'Fetch keyframes'
                    );
                    let templateKeyframeCount = 0;
                    keyframeResults.forEach(keyframes => {
                      if (Array.isArray(keyframes)) {
                        templateKeyframeCount += keyframes.length;
                        allKeyframes.push(...keyframes);
                      }
                    });
                    console.log(`✅ Loaded ${templateKeyframeCount} keyframes for template ${template.id}`);
                  } catch (e) {
                    console.error('Error/timeout fetching keyframes:', e);
                  }
                } else {
                  console.log(`⚠️ No animations found for template ${template.id}, skipping keyframe fetch`);
                }
              } catch (e) {
                console.error(`Error/timeout processing template ${template.id}:`, e);
                // Continue with next template
              }
            }
            
            // Load chat history with error handling (with timeout)
            let chatMessages: ChatMessage[] = [];
            try {
              const chatHistory = await withTimeout(loadChatHistory(projectId), LOAD_TIMEOUT, 'Load chat history');
              chatMessages = (Array.isArray(chatHistory) ? chatHistory : []).map((msg) => ({
                ...msg,
                attachments: msg.attachments || undefined, // Convert null to undefined
                isApplied: msg.changes_applied !== null,
              }));
            } catch (e) {
              console.error('Error/timeout loading chat history:', e);
              chatMessages = [];
            }
            
            // Load phaseDurations from project settings if available
            const savedPhaseDurations = project.settings?.phaseDurations;
            const phaseDurations = savedPhaseDurations || { in: 1500, loop: 3000, out: 1500 };

            // Find the best template to select on load:
            // 1. First, try to find a template with a data source connected
            // 2. If not, try to find a template that has bindings (data-driven design)
            // 3. If not, try to find a template that has elements (not blank)
            // 4. Finally, fall back to the first template
            console.log(`🔍 Checking ${templates.length} templates for data sources/bindings...`);
            templates.forEach((t, i) => {
              const bindingCount = allBindings.filter(b => b.template_id === t.id).length;
              const elementCount = allElements.filter(e => e.template_id === t.id).length;
              console.log(`  [${i}] "${t.name}" - data_source_id: ${t.data_source_id || 'null'}, bindings: ${bindingCount}, elements: ${elementCount}`);
            });

            const templateWithDataSource = templates.find(t => t.data_source_id);
            const templateWithBindings = templates.find(t => allBindings.some(b => b.template_id === t.id));
            const templateWithElements = templates.find(t => allElements.some(e => e.template_id === t.id));
            const selectedTemplateId = templateWithDataSource?.id || templateWithBindings?.id || templateWithElements?.id || templates[0]?.id || null;
            console.log(`📌 Selected template: ${selectedTemplateId} (dataSource: ${!!templateWithDataSource}, bindings: ${!!templateWithBindings}, elements: ${!!templateWithElements})`);

            let dataSourceId: string | null = null;
            let dataSourceName: string | null = null;
            let dataSourceSlug: string | null = null;
            let dataPayload: Record<string, unknown>[] | null = null;
            let dataDisplayField: string | null = null;
            let defaultRecordIndex = 0;

            if (templateWithDataSource?.data_source_id) {
              const config = templateWithDataSource.data_source_config as { displayField?: string; slug?: string; defaultRecordIndex?: number } | null;
              dataSourceId = templateWithDataSource.data_source_id;
              dataSourceSlug = config?.slug || null;
              dataDisplayField = config?.displayField || null;
              defaultRecordIndex = config?.defaultRecordIndex ?? 0;
              console.log(`📋 [loadProject] Template data source config:`, { dataSourceId, dataSourceSlug, dataDisplayField, config });
            }

            // Set initial state first (without dataPayload if we need to fetch it)
            set({
              project,
              layers,
              templates,
              elements: allElements,
              animations: allAnimations,
              keyframes: allKeyframes,
              bindings: allBindings,
              chatMessages,
              currentTemplateId: selectedTemplateId,
              isLoading: false,
              isDirty: false,
              error: null,
              tool: 'select', // Reset tool to select on project load
              phaseDurations, // Restore saved phase durations
              pendingDeletions: {
                elements: [],
                animations: [],
                keyframes: [],
                bindings: [],
                templates: [],
                layers: [],
              },
              // Hydrate data source state for first template
              dataSourceId,
              dataSourceName,
              dataSourceSlug,
              dataPayload,
              dataDisplayField,
              currentRecordIndex: defaultRecordIndex,
              dataLastFetched: null,
              dataLoading: false,
              dataError: null,
            });

            console.log(`✅ Loaded project: ${project.name} with ${templates.length} templates, ${allElements.length} elements, ${allAnimations.length} animations, ${allKeyframes.length} keyframes, ${allBindings.length} bindings`);

            // Update localStorage with fresh DB data to prevent stale/deleted items from showing
            // This ensures localStorage mirrors the database state
            if (isValidUUID && projectId !== 'demo') {
              try {
                const localData = {
                  project,
                  layers,
                  templates,
                  elements: allElements,
                  animations: allAnimations,
                  keyframes: allKeyframes,
                  bindings: allBindings,
                  chatMessages,
                };
                localStorage.setItem(`nova-project-${projectId}`, JSON.stringify(localData));
                console.log(`📦 Updated localStorage with fresh DB data (${templates.length} templates)`);
              } catch (e) {
                console.warn('Failed to update localStorage after DB load:', e);
              }
            }

            // Auto-fetch data from endpoint if template has a slug
            if (dataSourceSlug && selectedTemplateId) {
              console.log(`📊 Auto-fetching data from endpoint "${dataSourceSlug}"...`);
              set({ dataLoading: true });

              import('@/services/novaEndpointService').then(async ({ fetchEndpointData, getEndpointBySlug }) => {
                try {
                  console.log(`🔄 [loadProject] Starting fetch for ${dataSourceSlug}...`);
                  const [fetchedData, endpoint] = await Promise.all([
                    fetchEndpointData(dataSourceSlug!),
                    getEndpointBySlug(dataSourceSlug!)
                  ]);
                  console.log(`📦 [loadProject] Fetch complete: ${fetchedData?.length || 0} records, endpoint: ${endpoint?.name || 'null'}`);

                  if (fetchedData && fetchedData.length > 0) {
                    const endpointName = endpoint?.name || dataSourceSlug;
                    console.log(`📝 [loadProject] Updating state with ${fetchedData.length} records...`);
                    set((draft) => {
                      draft.dataPayload = fetchedData;
                      draft.dataSourceName = endpointName;
                      draft.dataLastFetched = Date.now();
                      draft.dataLoading = false;
                      draft.dataError = null;

                      // Update cache for this template
                      draft.templateDataCache[selectedTemplateId!] = {
                        dataSourceId: dataSourceId!,
                        dataSourceName: endpointName || '',
                        dataSourceSlug: dataSourceSlug,
                        dataPayload: fetchedData,
                        dataDisplayField: dataDisplayField,
                        currentRecordIndex: defaultRecordIndex,
                      };
                    });
                    console.log(`✅ [loadProject] Auto-fetched ${fetchedData.length} records from ${dataSourceSlug}. State updated.`);
                  } else {
                    set({ dataLoading: false, dataError: 'No data returned from endpoint' });
                  }
                } catch (error) {
                  console.error('[loadProject] Failed to auto-fetch data:', error);
                  set({ dataLoading: false, dataError: 'Failed to fetch data' });
                }
              });
            } else if (!dataSourceSlug && selectedTemplateId && allBindings.some(b => b.template_id === selectedTemplateId)) {
              // FALLBACK: Template has bindings but no slug - try to find matching endpoint
              // This handles projects created before the slug fix was implemented
              const templateBindings = allBindings.filter(b => b.template_id === selectedTemplateId);
              const bindingKeys = templateBindings.map(b => b.binding_key);
              const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
              const templateDataSourceId = selectedTemplate?.data_source_id;

              console.log(`🔍 [loadProject] Template has ${templateBindings.length} bindings but no slug. Looking up endpoint...`);
              console.log(`   Template data_source_id: ${templateDataSourceId || 'null'}`);
              console.log(`   Binding keys: ${bindingKeys.join(', ')}`);

              set({ dataLoading: true });

              import('@/services/novaEndpointService').then(async ({ listNovaEndpoints, fetchEndpointData, getEndpointById }) => {
                try {
                  // FAST PATH: If template has data_source_id, look up endpoint by ID
                  if (templateDataSourceId) {
                    const endpoint = await getEndpointById(templateDataSourceId);
                    if (endpoint) {
                      console.log(`✅ [loadProject] Found endpoint by ID: "${endpoint.name}" (slug: ${endpoint.slug})`);
                      const fetchedData = await fetchEndpointData(endpoint.slug);

                      if (fetchedData && fetchedData.length > 0) {
                        // Update template config with slug for future loads
                        if (selectedTemplate) {
                          selectedTemplate.data_source_config = {
                            ...(selectedTemplate.data_source_config as Record<string, unknown> || {}),
                            slug: endpoint.slug
                          };
                        }

                        set((draft) => {
                          draft.dataSourceId = endpoint.id;
                          draft.dataSourceName = endpoint.name;
                          draft.dataSourceSlug = endpoint.slug;
                          draft.dataPayload = fetchedData;
                          draft.dataLastFetched = Date.now();
                          draft.dataLoading = false;
                          draft.dataError = null;
                          draft.isDirty = true; // Mark dirty so it saves the slug fix

                          draft.templateDataCache[selectedTemplateId!] = {
                            dataSourceId: endpoint.id,
                            dataSourceName: endpoint.name,
                            dataSourceSlug: endpoint.slug,
                            dataPayload: fetchedData,
                            dataDisplayField: null,
                            currentRecordIndex: 0,
                          };
                        });
                        console.log(`✅ [loadProject] Auto-fetched ${fetchedData.length} records and saved slug to config`);
                        return;
                      }
                    } else {
                      console.warn(`⚠️ [loadProject] Endpoint not found by ID: ${templateDataSourceId}`);
                    }
                  }

                  // SLOW PATH: No data_source_id, search by matching field names
                  const endpoints = await listNovaEndpoints();
                  const { getNestedValue } = await import('@/data/sampleDataSources');
                  console.log(`   Searching ${endpoints.length} endpoints by field matching...`);

                  for (const endpoint of endpoints) {
                    try {
                      const testData = await fetchEndpointData(endpoint.slug);
                      if (testData && testData.length > 0) {
                        const firstRecord = testData[0];
                        // Check if nested paths can be resolved in this data structure
                        const matchingKeys = bindingKeys.filter(key => {
                          const value = getNestedValue(firstRecord, key);
                          return value !== undefined;
                        });
                        const matchPercentage = matchingKeys.length / bindingKeys.length;

                        console.log(`   Endpoint "${endpoint.name}": ${matchingKeys.length}/${bindingKeys.length} keys match (${Math.round(matchPercentage * 100)}%)`);

                        if (matchPercentage >= 0.5) {
                          console.log(`✅ [loadProject] Auto-matched endpoint "${endpoint.name}" for orphaned bindings`);

                          if (selectedTemplate) {
                            selectedTemplate.data_source_id = endpoint.id;
                            selectedTemplate.data_source_config = { slug: endpoint.slug };
                          }

                          set((draft) => {
                            draft.dataSourceId = endpoint.id;
                            draft.dataSourceName = endpoint.name;
                            draft.dataSourceSlug = endpoint.slug;
                            draft.dataPayload = testData;
                            draft.dataLastFetched = Date.now();
                            draft.dataLoading = false;
                            draft.dataError = null;
                            draft.isDirty = true;

                            draft.templateDataCache[selectedTemplateId!] = {
                              dataSourceId: endpoint.id,
                              dataSourceName: endpoint.name,
                              dataSourceSlug: endpoint.slug,
                              dataPayload: testData,
                              dataDisplayField: null,
                              currentRecordIndex: 0,
                            };
                          });
                          return;
                        }
                      }
                    } catch (endpointError) {
                      console.warn(`   Failed to fetch endpoint "${endpoint.slug}":`, endpointError);
                    }
                  }

                  console.warn('⚠️ [loadProject] No matching endpoint found for orphaned bindings');
                  set({ dataLoading: false });
                } catch (error) {
                  console.error('[loadProject] Failed to auto-match endpoint:', error);
                  set({ dataLoading: false });
                }
              });
            }
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

          // Capture canvas thumbnail (lower quality for faster upload)
          set({ isSaving: true });
          const thumbnailDataUrl = await captureCanvasSnapshot(0.6, 400);

          // Upload thumbnail to Supabase Storage (only for real projects)
          let thumbnailUrl: string | null = state.project.thumbnail_url || null;
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isValidUUID = UUID_REGEX.test(projectId);

          if (thumbnailDataUrl && isValidUUID && projectId !== 'demo') {
            try {
              // Upload thumbnail via REST API with 10s timeout - function handles its own timeout
              const uploadedUrl = await uploadThumbnailToStorage(projectId, thumbnailDataUrl, 10000);
              if (uploadedUrl) {
                thumbnailUrl = uploadedUrl;
              }
            } catch (thumbnailError) {
              // Continue with save - thumbnail upload failure shouldn't block it
              console.warn('Thumbnail upload failed, continuing with save', thumbnailError);
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

            // Use direct REST API to bypass stale Supabase client connections
            console.log('[designerStore] Saving via direct REST API...');

            const SAVE_TIMEOUT = 15000; // 15 second timeout per operation

            // 1. Update project metadata using direct REST API
            // Get current user for updated_by tracking and access token for RLS
            const authState = useAuthStore.getState();
            const currentUserId = authState.user?.id;
            const accessToken = authState.accessToken;

            const projectData: Record<string, unknown> = {
              name: state.project.name,
              description: state.project.description,
              canvas_width: state.project.canvas_width,
              canvas_height: state.project.canvas_height,
              background_color: state.project.background_color,
              frame_rate: state.project.frame_rate,
              thumbnail_url: thumbnailUrl,
              updated_at: new Date().toISOString(),
              updated_by: currentUserId || null,
            };

            // Add optional columns if they exist (may fail on older schemas)
            if (state.project.settings) {
              projectData.settings = state.project.settings;
            }

            // Save interactive configuration (scripts, event handlers, etc.)
            if (state.project.interactive_config) {
              projectData.interactive_config = state.project.interactive_config;
            }

            const projectResult = await directRestUpdate(
              'gfx_projects',
              projectData,
              { column: 'id', value: projectId },
              SAVE_TIMEOUT,
              accessToken || undefined
            );

            if (!projectResult.success) {
              console.error('Error saving project:', projectResult.error);
              // Don't throw - continue with other saves
            }

            // 2. Save layers (only include DB columns)
            // IMPORTANT: PostgREST bulk upsert requires all objects to have the same keys
            if (state.layers.length > 0) {
              const layersToSave = state.layers.map(l => ({
                id: l.id,
                project_id: projectId,
                name: l.name ?? 'Layer',
                layer_type: l.layer_type ?? 'fullscreen',
                z_index: l.z_index ?? 0,
                sort_order: l.sort_order ?? 0,
                position_anchor: l.position_anchor ?? 'center',
                position_offset_x: l.position_offset_x ?? 0,
                position_offset_y: l.position_offset_y ?? 0,
                width: l.width ?? null,
                height: l.height ?? null,
                auto_out: l.auto_out ?? true,
                allow_multiple: l.allow_multiple ?? false,
                transition_in: l.transition_in ?? 'fade',
                transition_in_duration: l.transition_in_duration ?? 500,
                transition_out: l.transition_out ?? 'fade',
                transition_out_duration: l.transition_out_duration ?? 500,
                enabled: l.enabled ?? true,
                locked: l.locked ?? false,
                always_on: l.always_on ?? false,
              }));
              const layersResult = await directRestUpsert('gfx_layers', layersToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!layersResult.success) console.error('Error saving layers:', layersResult.error);
            }

            // 3. Save templates (only include DB columns)
            // IMPORTANT: PostgREST bulk upsert requires all objects to have the same keys
            if (state.templates.length > 0) {
              // Debug: Log data source info for templates before save
              state.templates.forEach(t => {
                if (t.data_source_id || t.data_source_config) {
                  console.log(`📋 Template "${t.name}" has data_source_id: ${t.data_source_id}, config:`, t.data_source_config);
                }
              });
              const templatesToSave = state.templates.map(t => ({
                id: t.id,
                project_id: projectId,
                layer_id: t.layer_id,
                folder_id: t.folder_id ?? null,
                name: t.name ?? 'Template',
                description: t.description ?? null,
                tags: t.tags ?? [],
                thumbnail_url: t.thumbnail_url ?? null,
                html_template: t.html_template ?? null,
                css_styles: t.css_styles ?? null,
                width: t.width ?? 1920,
                height: t.height ?? 1080,
                in_duration: t.in_duration ?? 500,
                loop_duration: t.loop_duration ?? 5000,
                loop_iterations: t.loop_iterations ?? 1,
                out_duration: t.out_duration ?? 500,
                libraries: t.libraries ?? [],
                custom_script: t.custom_script ?? null,
                enabled: t.enabled ?? true,
                locked: t.locked ?? false,
                archived: t.archived ?? false,
                version: t.version ?? 1,
                sort_order: t.sort_order ?? 0,
                updated_at: new Date().toISOString(),
                // Data source fields for dynamic data binding
                data_source_id: t.data_source_id ?? null,
                data_source_config: t.data_source_config ?? null,
              }));
              const templatesResult = await directRestUpsert('gfx_templates', templatesToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!templatesResult.success) console.error('Error saving templates:', templatesResult.error);
            }

            // 4. Save elements (only include DB columns)
            // IMPORTANT: PostgREST bulk upsert requires all objects to have the same keys
            if (state.elements.length > 0) {
              const elementsToSave = state.elements.map(e => ({
                id: e.id,
                template_id: e.template_id,
                name: e.name ?? 'Element',
                element_id: e.element_id ?? null,
                element_type: e.element_type,
                parent_element_id: e.parent_element_id ?? null,
                sort_order: e.sort_order ?? 0,
                z_index: e.z_index ?? 0,
                position_x: e.position_x ?? 0,
                position_y: e.position_y ?? 0,
                width: e.width ?? 100,
                height: e.height ?? 100,
                rotation: e.rotation ?? 0,
                scale_x: e.scale_x ?? 1,
                scale_y: e.scale_y ?? 1,
                anchor_x: e.anchor_x ?? 0.5,
                anchor_y: e.anchor_y ?? 0.5,
                opacity: e.opacity ?? 1,
                content: e.content ?? {},
                styles: e.styles ?? {},
                classes: e.classes ?? [],
                visible: e.visible ?? true,
                locked: e.locked ?? false,
              }));
              const elementsResult = await directRestUpsert('gfx_elements', elementsToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!elementsResult.success) console.error('Error saving elements:', elementsResult.error);
            }

            // 5. Save animations
            // IMPORTANT: PostgREST bulk upsert requires all objects to have the same keys
            // Use null (not undefined) for optional fields to ensure consistent object shapes
            if (state.animations.length > 0) {
              const animationsToSave = state.animations.map(a => ({
                id: a.id,
                template_id: a.template_id,
                element_id: a.element_id,
                phase: a.phase,
                delay: a.delay ?? 0,
                duration: a.duration ?? 1000,
                iterations: a.iterations ?? 1,
                direction: a.direction ?? 'normal',
                easing: a.easing ?? 'ease',
                preset_id: a.preset_id ?? null, // Ensure null, not undefined
              }));
              const animationsResult = await directRestUpsert('gfx_animations', animationsToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!animationsResult.success) console.error('Error saving animations:', animationsResult.error);
            }

            // 6. Save keyframes (use properties JSONB column)
            // NOTE: position is now stored as absolute milliseconds (not percentage 0-100)
            if (state.keyframes.length > 0) {
              const keyframesToSave = state.keyframes.map(k => ({
                id: k.id,
                animation_id: k.animation_id,
                name: k.name ?? null,
                position: k.position, // Absolute milliseconds
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
              const keyframesResult = await directRestUpsert('gfx_keyframes', keyframesToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!keyframesResult.success) console.error('Error saving keyframes:', keyframesResult.error);
            }

            // 7. Save bindings
            // IMPORTANT: PostgREST bulk upsert requires all objects to have the same keys
            console.log(`📊 Bindings in state: ${state.bindings.length}`, state.bindings.map(b => ({
              id: b.id.slice(0, 8),
              element_id: b.element_id.slice(0, 8),
              template_id: b.template_id.slice(0, 8),
              binding_key: b.binding_key,
              formatter_options: b.formatter_options,
            })));
            if (state.bindings.length > 0) {
              const bindingsToSave = state.bindings.map(b => ({
                id: b.id,
                template_id: b.template_id,
                element_id: b.element_id,
                binding_key: b.binding_key,
                target_property: b.target_property,
                binding_type: b.binding_type ?? 'text',
                default_value: b.default_value ?? null,
                formatter: b.formatter ?? null,
                formatter_options: b.formatter_options ?? null,
                required: b.required ?? false,
              }));
              console.log(`💾 Saving ${bindingsToSave.length} bindings to database:`, bindingsToSave.map(b => ({
                id: b.id.slice(0, 8),
                binding_key: b.binding_key,
                formatter_options: b.formatter_options,
              })));
              const bindingsResult = await directRestUpsert('gfx_bindings', bindingsToSave, SAVE_TIMEOUT, accessToken || undefined);
              if (!bindingsResult.success) {
                console.error('❌ Error saving bindings:', bindingsResult.error);
              } else {
                console.log(`✅ Bindings saved successfully`);
              }
            } else {
              console.log(`⚠️ No bindings to save`);
            }

            // 8. Delete pending items from database
            // Delete in reverse order of dependencies (keyframes -> animations -> elements)
            const pendingDeletions = state.pendingDeletions;

            if (pendingDeletions.keyframes.length > 0) {
              console.log(`Deleting ${pendingDeletions.keyframes.length} keyframes from DB`);
              const keyframesDeleteResult = await directRestDelete('gfx_keyframes', pendingDeletions.keyframes, SAVE_TIMEOUT, accessToken || undefined);
              if (!keyframesDeleteResult.success) console.error('Error deleting keyframes:', keyframesDeleteResult.error);
            }

            if (pendingDeletions.animations.length > 0) {
              console.log(`Deleting ${pendingDeletions.animations.length} animations from DB`);
              const animationsDeleteResult = await directRestDelete('gfx_animations', pendingDeletions.animations, SAVE_TIMEOUT, accessToken || undefined);
              if (!animationsDeleteResult.success) console.error('Error deleting animations:', animationsDeleteResult.error);
            }

            if (pendingDeletions.bindings.length > 0) {
              console.log(`Deleting ${pendingDeletions.bindings.length} bindings from DB`);
              const bindingsDeleteResult = await directRestDelete('gfx_bindings', pendingDeletions.bindings, SAVE_TIMEOUT, accessToken || undefined);
              if (!bindingsDeleteResult.success) console.error('Error deleting bindings:', bindingsDeleteResult.error);
            }

            if (pendingDeletions.elements.length > 0) {
              console.log(`Deleting ${pendingDeletions.elements.length} elements from DB`);
              const elementsDeleteResult = await directRestDelete('gfx_elements', pendingDeletions.elements, SAVE_TIMEOUT, accessToken || undefined);
              if (!elementsDeleteResult.success) console.error('Error deleting elements:', elementsDeleteResult.error);
            }

            if (pendingDeletions.templates.length > 0) {
              console.log(`Deleting ${pendingDeletions.templates.length} templates from DB`);
              const templatesDeleteResult = await directRestDelete('gfx_templates', pendingDeletions.templates, SAVE_TIMEOUT, accessToken || undefined);
              if (!templatesDeleteResult.success) console.error('Error deleting templates:', templatesDeleteResult.error);
            }

            if (pendingDeletions.layers.length > 0) {
              console.log(`Deleting ${pendingDeletions.layers.length} layers from DB`);
              const layersDeleteResult = await directRestDelete('gfx_layers', pendingDeletions.layers, SAVE_TIMEOUT, accessToken || undefined);
              if (!layersDeleteResult.success) console.error('Error deleting layers:', layersDeleteResult.error);
            }

            // Clear pending deletions after successful save
            set((state) => {
              state.pendingDeletions = {
                elements: [],
                animations: [],
                keyframes: [],
                bindings: [],
                templates: [],
                layers: [],
              };
            });

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

            // Mark successful Supabase operation
            markSupabaseSuccess();

            console.log('✅ Project saved successfully to Supabase + localStorage backup');
          } catch (error) {
            console.error('❌ Error saving project:', error);

            // Track Supabase failure for potential reconnection
            await markSupabaseFailure();

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

        saveProjectAs: async (newName: string) => {
          const state = get();
          if (!state.project) {
            console.warn('No project to save');
            return null;
          }

          set({ isSaving: true, error: null });

          try {
            // Get current user, organization, and access token for RLS
            const authState = useAuthStore.getState();
            const currentUser = authState.user;
            let accessToken = authState.accessToken;
            const organizationId = state.project.organization_id || getOrganizationId(currentUser);

            // Ensure we have a fresh session before creating project
            if (supabase) {
              const { data } = await supabase.auth.getSession();
              if (data?.session?.access_token) {
                accessToken = data.session.access_token;
              }
            }

            if (!organizationId) {
              throw new Error('Organization ID required to create project');
            }

            // Create a new project with the new name
            const { createProject, createLayer, createTemplate, createElement, createAnimation, createKeyframe, createBinding } = await import('@/services/projectService');

            const newProject = await createProject({
              name: newName,
              description: state.project.description || '',
              canvas_width: state.project.canvas_width,
              canvas_height: state.project.canvas_height,
              frame_rate: state.project.frame_rate,
              background_color: state.project.background_color,
              organization_id: organizationId,
              created_by: currentUser?.id,
            }, accessToken || undefined);

            if (!newProject) {
              throw new Error('Failed to create new project');
            }

            // Create layer ID mapping
            const layerIdMap = new Map<string, string>();
            for (const layer of state.layers) {
              const newLayer = await createLayer({
                project_id: newProject.id,
                name: layer.name,
                layer_type: layer.layer_type,
                z_index: layer.z_index,
                sort_order: layer.sort_order,
                position_anchor: layer.position_anchor,
                position_offset_x: layer.position_offset_x,
                position_offset_y: layer.position_offset_y,
                width: layer.width,
                height: layer.height,
                auto_out: layer.auto_out,
                allow_multiple: layer.allow_multiple,
                transition_in: layer.transition_in,
                transition_in_duration: layer.transition_in_duration,
                transition_out: layer.transition_out,
                transition_out_duration: layer.transition_out_duration,
                enabled: layer.enabled,
                locked: layer.locked,
                always_on: layer.always_on,
              });
              if (newLayer) {
                layerIdMap.set(layer.id, newLayer.id);
              }
            }

            // Create template ID mapping
            const templateIdMap = new Map<string, string>();
            for (const template of state.templates) {
              const newLayerId = layerIdMap.get(template.layer_id);
              if (!newLayerId) continue;

              const newTemplate = await createTemplate({
                project_id: newProject.id,
                layer_id: newLayerId,
                folder_id: template.folder_id,
                name: template.name,
                description: template.description,
                tags: template.tags,
                html_template: template.html_template,
                css_styles: template.css_styles,
                width: template.width,
                height: template.height,
                in_duration: template.in_duration,
                loop_duration: template.loop_duration,
                loop_iterations: template.loop_iterations,
                out_duration: template.out_duration,
                libraries: template.libraries,
                custom_script: template.custom_script,
                enabled: template.enabled,
                locked: template.locked,
                sort_order: template.sort_order,
              });
              if (newTemplate) {
                templateIdMap.set(template.id, newTemplate.id);
              }
            }

            // Create element ID mapping
            const elementIdMap = new Map<string, string>();
            for (const element of state.elements) {
              const newTemplateId = templateIdMap.get(element.template_id);
              if (!newTemplateId) continue;

              const newElement = await createElement({
                template_id: newTemplateId,
                name: element.name,
                element_id: element.element_id,
                element_type: element.element_type,
                parent_element_id: element.parent_element_id ? elementIdMap.get(element.parent_element_id) : null,
                sort_order: element.sort_order,
                z_index: element.z_index,
                position_x: element.position_x,
                position_y: element.position_y,
                width: element.width,
                height: element.height,
                rotation: element.rotation,
                scale_x: element.scale_x,
                scale_y: element.scale_y,
                anchor_x: element.anchor_x,
                anchor_y: element.anchor_y,
                opacity: element.opacity,
                content: element.content,
                styles: element.styles,
                classes: element.classes,
                visible: element.visible,
                locked: element.locked,
                screenMask: element.screenMask,
              });
              if (newElement) {
                elementIdMap.set(element.id, newElement.id);
              }
            }

            // Create animation ID mapping
            const animationIdMap = new Map<string, string>();
            for (const anim of state.animations) {
              const newElementId = elementIdMap.get(anim.element_id);
              const newTemplateId = templateIdMap.get(anim.template_id);
              if (!newElementId || !newTemplateId) continue;

              const newAnim = await createAnimation({
                template_id: newTemplateId,
                element_id: newElementId,
                phase: anim.phase,
                delay: anim.delay,
                duration: anim.duration,
                iterations: anim.iterations,
                direction: anim.direction,
                easing: anim.easing,
                preset_id: anim.preset_id,
              });
              if (newAnim) {
                animationIdMap.set(anim.id, newAnim.id);
              }
            }

            // Duplicate keyframes
            for (const kf of state.keyframes) {
              const newAnimationId = animationIdMap.get(kf.animation_id);
              if (!newAnimationId) continue;

              await createKeyframe({
                animation_id: newAnimationId,
                name: kf.name,
                position: kf.position,
                easing: kf.easing,
                properties: kf.properties,
                sort_order: kf.sort_order,
              });
            }

            // Duplicate bindings
            for (const binding of state.bindings) {
              const newElementId = elementIdMap.get(binding.element_id);
              const newTemplateId = templateIdMap.get(binding.template_id);
              if (!newElementId || !newTemplateId) continue;

              await createBinding({
                template_id: newTemplateId,
                element_id: newElementId,
                binding_key: binding.binding_key,
                target_property: binding.target_property,
                binding_type: binding.binding_type,
                default_value: binding.default_value,
                formatter: binding.formatter,
                formatter_options: binding.formatter_options,
                required: binding.required,
              });
            }

            set({ isSaving: false });
            console.log('✅ Project saved as:', newProject.name, newProject.id);
            return newProject.id;
          } catch (error) {
            console.error('❌ Error saving project as:', error);
            set({
              isSaving: false,
              error: error instanceof Error ? error.message : 'Failed to save project as'
            });
            return null;
          }
        },

        setProject: (project) => {
          set({ project });
        },

        updateProjectSettings: async (updates, options?: { skipSave?: boolean }) => {
          const state = get();
          if (!state.project) return;

          // Update local state immediately
          const updatedProject = { ...state.project, ...updates };
          set({ project: updatedProject, isDirty: true });

          // If skipSave is true, only update local state (useful for tracking pending changes)
          if (options?.skipSave) {
            return;
          }

          // Get current user for updated_by tracking
          const currentUserId = useAuthStore.getState().user?.id;

          // Persist to Supabase using direct REST API
          try {
            const result = await directRestUpdate(
              'gfx_projects',
              {
                name: updatedProject.name,
                description: updatedProject.description,
                slug: updatedProject.slug,
                canvas_width: updatedProject.canvas_width,
                canvas_height: updatedProject.canvas_height,
                frame_rate: updatedProject.frame_rate,
                background_color: updatedProject.background_color,
                interactive_enabled: updatedProject.interactive_enabled,
                interactive_config: updatedProject.interactive_config,
                settings: updatedProject.settings,
                updated_at: new Date().toISOString(),
                updated_by: currentUserId || null,
              },
              { column: 'id', value: state.project.id },
              5000
            );

            if (!result.success) {
              console.error('Failed to update project settings:', result.error);
              // Optionally revert on error
            } else {
              set({ isDirty: false, lastSaved: new Date() });
            }
          } catch (error) {
            console.error('Failed to update project settings:', error);
          }
        },

        updateDesignSystem: async (designSystem) => {
          const state = get();

          set((s) => {
            s.designSystem = designSystem;
            s.isDirty = true;
            // Also store in project settings for persistence
            if (s.project) {
              s.project.settings = {
                ...s.project.settings,
                designSystem,
              };
            }
          });
          get().pushHistory('Update Design System');

          // Save to database immediately if we have a real project
          if (state.project?.id && state.project.id !== 'demo') {
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (UUID_REGEX.test(state.project.id)) {
              try {
                const authState = useAuthStore.getState();
                const accessToken = authState.accessToken;
                const newSettings = {
                  ...state.project.settings,
                  designSystem,
                };

                const result = await directRestUpdate(
                  'gfx_projects',
                  { settings: newSettings, updated_at: new Date().toISOString() },
                  { column: 'id', value: state.project.id },
                  10000,
                  accessToken || undefined
                );

                if (result.success) {
                  console.log('[designerStore] Design system saved to database');
                  set({ isDirty: false });
                } else {
                  console.warn('[designerStore] Failed to save design system:', result.error);
                }
              } catch (err) {
                console.error('[designerStore] Error saving design system:', err);
              }
            }
          }
        },

        // Template operations
        selectTemplate: (id) => {
          const {
            templates,
            currentTemplateId,
            dataSourceId: currentDataSourceId,
            dataSourceName: currentDataSourceName,
            dataPayload: currentDataPayload,
            dataDisplayField: currentDataDisplayField,
            currentRecordIndex: currentRecordIdx,
            templateDataCache
          } = get();
          const template = templates.find(t => t.id === id);

          // Cache the current template's data before switching (if it has data)
          let newCache = { ...templateDataCache };
          if (currentTemplateId && currentDataSourceId && currentDataPayload) {
            newCache[currentTemplateId] = {
              dataSourceId: currentDataSourceId,
              dataSourceName: currentDataSourceName || '',
              dataPayload: currentDataPayload,
              dataDisplayField: currentDataDisplayField,
              currentRecordIndex: currentRecordIdx,
            };
          }

          // Try to restore from cache first, then fall back to loading from data source
          let dataSourceId: string | null = null;
          let dataSourceName: string | null = null;
          let dataPayload: Record<string, unknown>[] | null = null;
          let dataDisplayField: string | null = null;
          let recordIndex = 0;

          // Check cache first (id is guaranteed to be a string by the action signature)
          if (id && newCache[id]) {
            const cached = newCache[id];
            dataSourceId = cached.dataSourceId;
            dataSourceName = cached.dataSourceName;
            dataPayload = cached.dataPayload;
            dataDisplayField = cached.dataDisplayField;
            recordIndex = cached.currentRecordIndex;
          } else if (template?.data_source_id) {
            // Load from template config - auto-fetch data if slug is available
            const config = template?.data_source_config as { displayField?: string; slug?: string; defaultRecordIndex?: number } | null;
            dataSourceId = template.data_source_id;
            dataDisplayField = config?.displayField || null;
            recordIndex = config?.defaultRecordIndex ?? 0;
            const slug = config?.slug || null;

            // If we have a slug, auto-fetch the data
            if (slug) {
              // Set slug immediately so UI shows it
              set({ dataSourceSlug: slug, dataLoading: true });

              // Fetch data asynchronously
              import('@/services/novaEndpointService').then(async ({ fetchEndpointData, getEndpointBySlug }) => {
                try {
                  const [fetchedData, endpoint] = await Promise.all([
                    fetchEndpointData(slug),
                    getEndpointBySlug(slug)
                  ]);

                  if (fetchedData && fetchedData.length > 0) {
                    const endpointName = endpoint?.name || slug;
                    set((draft) => {
                      draft.dataPayload = fetchedData;
                      draft.dataSourceName = endpointName;
                      draft.dataLastFetched = Date.now();
                      draft.dataLoading = false;
                      draft.dataError = null;

                      // Update cache for this template
                      if (id) {
                        draft.templateDataCache[id] = {
                          dataSourceId: dataSourceId!,
                          dataSourceName: endpointName,
                          dataSourceSlug: slug,
                          dataPayload: fetchedData,
                          dataDisplayField: dataDisplayField,
                          currentRecordIndex: recordIndex,
                        };
                      }
                    });
                    console.log(`[selectTemplate] Auto-fetched ${fetchedData.length} records from ${slug}`);
                  } else {
                    set({ dataLoading: false, dataError: 'No data returned from endpoint' });
                  }
                } catch (error) {
                  console.error('[selectTemplate] Failed to auto-fetch data:', error);
                  set({ dataLoading: false, dataError: 'Failed to fetch data' });
                }
              });
            }
          }

          // If clicking on the same template, just clear element selection (to show Data tab)
          if (id === currentTemplateId) {
            // Only update data source if it's not already loaded
            if (!currentDataSourceId && dataSourceId) {
              set({
                selectedElementIds: [],
                dataSourceId,
                dataSourceName,
                dataPayload,
                dataDisplayField,
                currentRecordIndex: recordIndex,
                templateDataCache: newCache,
              });
            } else {
              set({ selectedElementIds: [], templateDataCache: newCache });
            }
            return;
          }

          // Get config to check if we're doing async fetch
          const templateConfig = template?.data_source_config as { slug?: string } | null;
          const isAsyncFetch = !!(templateConfig?.slug && !dataPayload);

          set({
            currentTemplateId: id,
            selectedElementIds: [],
            currentPhase: 'in',
            // Don't reset playheadPosition - keep it at current position when switching templates
            // Hydrate data source state - but don't overwrite dataPayload if async fetch is in progress
            dataSourceId,
            dataSourceName,
            ...(isAsyncFetch ? {} : { dataPayload }),
            dataDisplayField,
            currentRecordIndex: recordIndex,
            templateDataCache: newCache,
          });
        },

        setTemplates: (templates) => {
          set({ templates, isDirty: true });
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

          // Copy bindings (critical for data-driven templates)
          const originalBindings = state.bindings.filter((b) =>
            originalElements.some((e) => e.id === b.element_id)
          );

          const newBindings: Binding[] = originalBindings.map((binding) => ({
            ...binding,
            id: crypto.randomUUID(),
            template_id: id,
            element_id: elementIdMap.get(binding.element_id) || binding.element_id,
          }));

          console.log(`📋 Duplicating template: copying ${newBindings.length} bindings`);

          set((state) => {
            state.templates.push(newTemplate);
            state.elements.push(...newElements);
            state.animations.push(...newAnimations);
            state.keyframes.push(...newKeyframes);
            state.bindings.push(...newBindings);
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
          const isValidProjectUUID = projectId && UUID_REGEX.test(projectId);
          const isValidTemplateUUID = templateId && UUID_REGEX.test(templateId);

          console.log('[deleteTemplate] Starting deletion:', { templateId, projectId, isValidProjectUUID, isValidTemplateUUID });

          // Archive in database immediately (for real projects with valid template UUID)
          if (isValidProjectUUID && isValidTemplateUUID && projectId !== 'demo') {
            let dbArchiveSuccess = false;

            try {
              // Use Supabase client directly with .select() to verify the update worked
              if (supabase) {
                console.log('[deleteTemplate] Archiving template via Supabase client...');
                const { data, error } = await supabase
                  .from('gfx_templates')
                  .update({ archived: true, updated_at: new Date().toISOString() })
                  .eq('id', templateId)
                  .select()
                  .single();

                if (error) {
                  console.error('[deleteTemplate] Supabase error:', error.message);
                } else if (data && data.archived === true) {
                  console.log('✅ Template archived in database (confirmed):', templateId);
                  dbArchiveSuccess = true;
                } else {
                  console.error('[deleteTemplate] Archive not confirmed - data:', data);
                }
              }
            } catch (err) {
              console.error('[deleteTemplate] Error archiving template:', err);
            }

            // Fallback to REST API if Supabase client failed
            if (!dbArchiveSuccess) {
              console.log('[deleteTemplate] Trying REST API fallback...');
              try {
                const result = await directRestUpdate(
                  'gfx_templates',
                  { archived: true, updated_at: new Date().toISOString() },
                  { column: 'id', value: templateId },
                  10000
                );
                if (result.success) {
                  console.log('✅ Template archived via REST API:', templateId);
                } else {
                  console.error('[deleteTemplate] REST API failed:', result.error);
                }
              } catch (restErr) {
                console.error('[deleteTemplate] REST API error:', restErr);
              }
            }
          } else {
            console.log('[deleteTemplate] Skipping database archive - demo project or invalid UUID');
          }

          set((draft) => {
            // Delete template from local state
            const templateBefore = draft.templates.length;
            draft.templates = draft.templates.filter((t) => t.id !== templateId);
            console.log(`[deleteTemplate] Templates: ${templateBefore} -> ${draft.templates.length}`);

            // Delete all elements in template
            const elementIds = draft.elements
              .filter((e) => e.template_id === templateId)
              .map((e) => e.id);
            const elementsBefore = draft.elements.length;
            draft.elements = draft.elements.filter((e) => e.template_id !== templateId);
            console.log(`[deleteTemplate] Elements: ${elementsBefore} -> ${draft.elements.length} (removed ${elementIds.length})`);

            // Delete animations for those elements
            const animationIds = draft.animations
              .filter((a) => elementIds.includes(a.element_id))
              .map((a) => a.id);
            draft.animations = draft.animations.filter((a) => !elementIds.includes(a.element_id));

            // Delete keyframes for those animations
            draft.keyframes = draft.keyframes.filter((k) => !animationIds.includes(k.animation_id));

            // Delete bindings for those elements
            const bindingIds = draft.bindings
              .filter((b) => elementIds.includes(b.element_id))
              .map((b) => b.id);
            draft.bindings = draft.bindings.filter((b) => !elementIds.includes(b.element_id));
            if (bindingIds.length > 0) {
              console.log(`[deleteTemplate] Removed ${bindingIds.length} bindings`);
              draft.pendingDeletions.bindings.push(...bindingIds);
            }

            // Clear selection if deleted template was selected
            if (draft.currentTemplateId === templateId) {
              draft.currentTemplateId = null;
              draft.selectedElementIds = [];
            }

            draft.isDirty = true;
          });

          // Update localStorage to sync with deleted state
          if (isValidProjectUUID && projectId !== 'demo') {
            try {
              const state = get();
              const localData = {
                project: state.project,
                layers: state.layers,
                templates: state.templates,
                elements: state.elements,
                animations: state.animations,
                keyframes: state.keyframes,
                bindings: state.bindings,
                chatMessages: state.chatMessages,
              };
              localStorage.setItem(`nova-project-${projectId}`, JSON.stringify(localData));
              console.log(`📦 [deleteTemplate] Updated localStorage (${state.templates.length} templates remaining)`);
            } catch (e) {
              console.warn('[deleteTemplate] Failed to update localStorage:', e);
            }
          }
        },

        // Element operations
        addElement: (type, position, parentId) => {
          const id = crypto.randomUUID();
          const elementId = `el-${Date.now()}`;
          const state = get();

          // Calculate z_index: new elements get the highest z_index in the current template
          // Video elements always get z_index 0
          // Ticker elements default to z_index 500 (to appear above most elements)
          const templateElements = state.elements.filter(e => e.template_id === state.currentTemplateId);
          const maxZIndex = templateElements.length > 0
            ? Math.max(...templateElements.map(e => e.z_index ?? 0))
            : 0;

          // Determine z_index based on element type
          const getZIndex = () => {
            if (type === 'video') return 0; // Video always at bottom
            if (type === 'ticker') return 500; // Ticker defaults to 500
            return maxZIndex + 10; // Others get next available
          };

          const newElement: Element = {
            id,
            template_id: state.currentTemplateId!,
            name: getDefaultElementName(type),
            element_id: elementId,
            element_type: type,
            parent_element_id: parentId || null,
            sort_order: state.elements.length,
            z_index: getZIndex(),
            position_x: position.x,
            position_y: position.y,
            width: type === 'text' ? 200 : type === 'line' ? 200 : 200,
            height: type === 'text' ? 40 : type === 'line' ? 2 : 100,
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
            state.selectedKeyframeIds = []; // Clear keyframe selection when creating new element
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
          // Video elements always get z_index 0
          // Ticker elements default to z_index 500 (to appear above most elements)
          const templateElements = state.elements.filter(e => e.template_id === templateId);
          const maxZIndex = templateElements.length > 0
            ? Math.max(...templateElements.map(e => e.z_index ?? 0))
            : 0;

          const elementType = data.element_type || 'shape';

          // Determine default z_index based on element type (if not provided)
          const getDefaultZIndex = () => {
            if (elementType === 'video') return 0; // Video always at bottom
            if (elementType === 'ticker') return 500; // Ticker defaults to 500
            return maxZIndex + 10; // Others get next available
          };

          const newElement: Element = {
            id,
            template_id: templateId,
            name: data.name || 'AI Element',
            element_id: `el-${Date.now()}`,
            element_type: elementType,
            parent_element_id: data.parent_element_id || null,
            sort_order: state.elements.length,
            z_index: data.z_index ?? getDefaultZIndex(),
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
            state.selectedKeyframeIds = []; // Clear keyframe selection when creating new element
            state.isDirty = true;
          });

          get().pushHistory(`AI Create: ${newElement.name}`);
          return id;
        },

        updateElement: (id, updates) => {
          const state = get();
          const element = state.elements.find((e) => e.id === id);

          set((draft) => {
            const index = draft.elements.findIndex((e) => e.id === id);
            if (index !== -1) {
              draft.elements[index] = { ...draft.elements[index], ...updates };
              draft.isDirty = true;
            }
          });

          // If this element has a parent with fitToContent, update the parent's size
          // Check if position, size, content, or styles changed (content/styles affect text measurement)
          if (element?.parent_element_id &&
              (updates.position_x !== undefined || updates.position_y !== undefined ||
               updates.width !== undefined || updates.height !== undefined ||
               updates.content !== undefined || updates.styles !== undefined)) {
            const parent = state.elements.find(e => e.id === element.parent_element_id);
            if (parent?.element_type === 'shape') {
              const content = parent.content as { type: 'shape'; fitToContent?: boolean };
              if (content?.fitToContent) {
                // Defer to next tick to allow the state update to complete
                setTimeout(() => get().updateFitToContentParent(parent.id), 0);
              }
            }
          }
        },

        duplicateElement: (id) => {
          const state = get();
          const element = state.elements.find((e) => e.id === id);
          if (!element) return null;

          const newId = crypto.randomUUID();

          // Calculate new z_index (one above the original)
          const templateElements = state.elements.filter(e => e.template_id === element.template_id);
          const maxZIndex = Math.max(...templateElements.map(e => e.z_index ?? 0));

          // Create duplicated element with offset position
          const duplicatedElement: Element = {
            ...element,
            id: newId,
            element_id: `el-${Date.now()}`,
            name: `${element.name} Copy`,
            position_x: element.position_x + 20,
            position_y: element.position_y + 20,
            z_index: maxZIndex + 10,
            sort_order: state.elements.length,
          };

          // Copy any bindings for this element
          const originalBindings = state.bindings.filter((b) => b.element_id === id);
          const newBindings: Binding[] = originalBindings.map((binding) => ({
            ...binding,
            id: crypto.randomUUID(),
            element_id: newId,
          }));

          set((state) => {
            state.elements.push(duplicatedElement);
            if (newBindings.length > 0) {
              state.bindings.push(...newBindings);
              console.log(`📋 Duplicated element: copying ${newBindings.length} binding(s)`);
            }
            state.selectedElementIds = [newId];
            state.selectedKeyframeIds = []; // Clear keyframe selection when duplicating element
            state.isDirty = true;
          });

          get().pushHistory(`Duplicate: ${element.name}`);
          return newId;
        },

        deleteElements: (ids) => {
          set((state) => {
            // Track animation IDs that will be deleted (for cascading keyframe deletion)
            const animationIdsToDelete = state.animations
              .filter((a) => ids.includes(a.element_id))
              .map((a) => a.id);

            // Track keyframe IDs that will be deleted
            const keyframeIdsToDelete = state.keyframes
              .filter((k) => animationIdsToDelete.includes(k.animation_id))
              .map((k) => k.id);

            // Track binding IDs that will be deleted (for DB sync on save)
            const bindingIdsToDelete = state.bindings
              .filter((b) => ids.includes(b.element_id))
              .map((b) => b.id);

            // Add to pending deletions (for DB sync on save)
            state.pendingDeletions.elements.push(...ids);
            state.pendingDeletions.animations.push(...animationIdsToDelete);
            state.pendingDeletions.keyframes.push(...keyframeIdsToDelete);
            state.pendingDeletions.bindings.push(...bindingIdsToDelete);

            // Remove from local state
            state.elements = state.elements.filter((e) => !ids.includes(e.id));
            state.animations = state.animations.filter((a) => !ids.includes(a.element_id));
            state.keyframes = state.keyframes.filter((k) => !animationIdsToDelete.includes(k.animation_id));
            state.bindings = state.bindings.filter((b) => !ids.includes(b.element_id));
            state.selectedElementIds = state.selectedElementIds.filter((id) => !ids.includes(id));
            state.isDirty = true;
          });
          get().pushHistory(`Delete elements`);
        },

        setElements: (elements) => {
          set({ elements, isDirty: true });
        },

        groupElements: (ids) => {
          if (ids.length < 2) return null;

          const state = get();
          const elementsToGroup = state.elements.filter((e) => ids.includes(e.id));

          if (elementsToGroup.length < 2) return null;

          // Check if all elements share the same parent (required for grouping)
          // This allows grouping elements inside a group, or grouping groups together
          const parentIds = new Set(elementsToGroup.map(e => e.parent_element_id));
          if (parentIds.size > 1) {
            console.warn('Cannot group elements from different parents');
            return null;
          }
          const sharedParentId = elementsToGroup[0].parent_element_id;

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

          // Count existing groups to name the new one
          const existingGroups = state.elements.filter(e => e.element_type === 'group');
          const groupNumber = existingGroups.length + 1;

          // Create group element - inherits parent from grouped elements (supports nested groups)
          const groupId = crypto.randomUUID();
          const groupElement: Element = {
            id: groupId,
            template_id: state.currentTemplateId!,
            name: `Group ${groupNumber}`,
            element_id: `group-${Date.now()}`,
            element_type: 'group',
            parent_element_id: sharedParentId, // Inherit parent for nested group support
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

            // Update animation keyframes to use relative positions
            // Find all animations for the grouped elements
            const elementAnimations = state.animations.filter(a => ids.includes(a.element_id));
            const animationIds = new Set(elementAnimations.map(a => a.id));

            // Update keyframes for these animations
            state.keyframes = state.keyframes.map((kf) => {
              if (!animationIds.has(kf.animation_id)) return kf;

              // Find which element this animation belongs to
              const anim = elementAnimations.find(a => a.id === kf.animation_id);
              if (!anim) return kf;

              const originalElement = elementsToGroup.find(e => e.id === anim.element_id);
              if (!originalElement) return kf;

              // Adjust position keyframes to be relative
              const updatedProperties = { ...kf.properties };
              if ('position_x' in updatedProperties && updatedProperties.position_x !== null) {
                updatedProperties.position_x = Number(updatedProperties.position_x) - minX;
              }
              if ('position_y' in updatedProperties && updatedProperties.position_y !== null) {
                updatedProperties.position_y = Number(updatedProperties.position_y) - minY;
              }

              return { ...kf, properties: updatedProperties };
            });

            state.selectedElementIds = [groupId];
            state.selectedKeyframeIds = []; // Clear keyframe selection when grouping elements
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
          const childIds = children.map(c => c.id);

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

            // Update animation keyframes to use absolute positions again
            const childAnimations = state.animations.filter(a => childIds.includes(a.element_id));
            const animationIds = new Set(childAnimations.map(a => a.id));

            state.keyframes = state.keyframes.map((kf) => {
              if (!animationIds.has(kf.animation_id)) return kf;

              // Adjust position keyframes back to absolute
              const updatedProperties = { ...kf.properties };
              if ('position_x' in updatedProperties && updatedProperties.position_x !== null) {
                updatedProperties.position_x = Number(updatedProperties.position_x) + group.position_x;
              }
              if ('position_y' in updatedProperties && updatedProperties.position_y !== null) {
                updatedProperties.position_y = Number(updatedProperties.position_y) + group.position_y;
              }

              return { ...kf, properties: updatedProperties };
            });

            // Remove the group element
            state.elements = state.elements.filter((e) => e.id !== groupId);

            // Select the former children
            state.selectedElementIds = childIds;
            state.selectedKeyframeIds = []; // Clear keyframe selection when ungrouping
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

        reorderElement: (elementId, targetIndex, parentId = null) => {
          const state = get();
          const element = state.elements.find(e => e.id === elementId);
          if (!element) return;

          // Get siblings (elements with the same parent)
          const currentParentId = element.parent_element_id;
          const targetParentId = parentId === undefined ? currentParentId : parentId;

          set((draft) => {
            // Get siblings at the target parent level
            const siblings = draft.elements
              .filter(e =>
                e.template_id === element.template_id &&
                e.parent_element_id === targetParentId &&
                e.id !== elementId
              )
              .sort((a, b) => a.sort_order - b.sort_order);

            // Find the element to update
            const elIdx = draft.elements.findIndex(e => e.id === elementId);
            if (elIdx === -1) return;

            // Update parent if moving to different parent
            if (targetParentId !== currentParentId) {
              const movedElement = draft.elements[elIdx];
              const oldParent = currentParentId ? draft.elements.find(e => e.id === currentParentId) : null;
              const newParent = targetParentId ? draft.elements.find(e => e.id === targetParentId) : null;

              // Convert positions when moving between parents
              // First, convert to absolute coordinates
              let absoluteX = movedElement.position_x;
              let absoluteY = movedElement.position_y;
              if (oldParent) {
                absoluteX += oldParent.position_x;
                absoluteY += oldParent.position_y;
              }

              // Then, convert to new parent's relative coordinates
              if (newParent) {
                movedElement.position_x = absoluteX - newParent.position_x;
                movedElement.position_y = absoluteY - newParent.position_y;
              } else {
                // Moving to root level - use absolute coordinates
                movedElement.position_x = absoluteX;
                movedElement.position_y = absoluteY;
              }

              draft.elements[elIdx].parent_element_id = targetParentId;
            }

            // Assign new sort_order AND z_index values
            // Insert at targetIndex, shift others
            // z_index determines visual stacking, sort_order determines list order
            let sortOrder = 0;
            let zIndexBase = 10; // Start z_index at 10, increment by 10 for spacing
            for (let i = 0; i < siblings.length; i++) {
              if (i === targetIndex) {
                // This is where the moved element goes
                draft.elements[elIdx].sort_order = sortOrder;
                draft.elements[elIdx].z_index = zIndexBase;
                sortOrder++;
                zIndexBase += 10;
              }
              // Update sibling sort_order and z_index
              const sibIdx = draft.elements.findIndex(e => e.id === siblings[i].id);
              if (sibIdx !== -1) {
                draft.elements[sibIdx].sort_order = sortOrder;
                draft.elements[sibIdx].z_index = zIndexBase;
                sortOrder++;
                zIndexBase += 10;
              }
            }

            // If targetIndex is at or beyond the end, place element last
            if (targetIndex >= siblings.length) {
              draft.elements[elIdx].sort_order = sortOrder;
              draft.elements[elIdx].z_index = zIndexBase;
            }

            draft.isDirty = true;
          });

          get().pushHistory('Reorder element');

          // If moved into a shape with fitToContent, trigger resize
          if (targetParentId) {
            const newParent = state.elements.find(e => e.id === targetParentId);
            if (newParent?.element_type === 'shape') {
              const content = newParent.content as { type: 'shape'; fitToContent?: boolean };
              if (content?.fitToContent) {
                setTimeout(() => get().updateFitToContentParent(targetParentId), 0);
              }
            }
          }
        },

        updateFitToContentParent: (parentId) => {
          const state = get();
          const parent = state.elements.find(e => e.id === parentId);
          if (!parent || parent.element_type !== 'shape') return;

          const content = parent.content as { type: 'shape'; fitToContent?: boolean; fitPadding?: { top?: number; right?: number; bottom?: number; left?: number } };
          if (!content.fitToContent) return;

          // Get all children of this parent
          const children = state.elements.filter(e => e.parent_element_id === parentId);
          if (children.length === 0) return;

          // Get padding values (default to 16 if not specified)
          const padding = content.fitPadding ?? {};
          const paddingTop = padding.top ?? 16;
          const paddingRight = padding.right ?? 16;
          const paddingBottom = padding.bottom ?? 16;
          const paddingLeft = padding.left ?? 16;

          // Import the text measurement utility dynamically
          import('../lib/textMeasurement').then(({ measureTextBounds, measureMultilineTextBounds }) => {
            // Measure all children - use async measurement for text elements
            const measureChildren = async () => {
              const childBounds: Array<{ x: number; y: number; width: number; height: number; elementId: string }> = [];

              for (const child of children) {
                if (child.element_type === 'text') {
                  // Get text content and styles
                  const textContent = child.content as { type: 'text'; text?: string };
                  const text = textContent.text || '';
                  const styles = (child.styles || {}) as Record<string, any>;

                  // Extract font properties
                  const fontSize = styles.fontSize || '16px';
                  const fontFamily = styles.fontFamily || 'Inter';
                  const fontWeight = styles.fontWeight || 400;
                  const fontStyle = styles.fontStyle || 'normal';

                  // Check if text should wrap (has constrained width)
                  const hasWrapping = child.width && child.width > 0;

                  try {
                    let textBounds;
                    if (hasWrapping && child.width) {
                      // Measure multiline text with wrapping
                      const lineHeight = parseFloat(String(styles.lineHeight || '1.2'));
                      textBounds = await measureMultilineTextBounds(
                        text,
                        fontSize,
                        fontFamily,
                        child.width,
                        fontWeight,
                        fontStyle,
                        lineHeight
                      );
                    } else {
                      // Measure single line text
                      textBounds = await measureTextBounds(
                        text,
                        fontSize,
                        fontFamily,
                        fontWeight,
                        fontStyle
                      );
                    }

                    childBounds.push({
                      x: child.position_x,
                      y: child.position_y,
                      width: textBounds.width,
                      height: textBounds.height,
                      elementId: child.id,
                    });
                  } catch {
                    // Fallback to element bounds
                    childBounds.push({
                      x: child.position_x,
                      y: child.position_y,
                      width: child.width ?? 100,
                      height: child.height ?? 40,
                      elementId: child.id,
                    });
                  }
                } else {
                  // For non-text elements, use element bounds
                  childBounds.push({
                    x: child.position_x,
                    y: child.position_y,
                    width: child.width ?? 100,
                    height: child.height ?? 40,
                    elementId: child.id,
                  });
                }
              }

              return childBounds;
            };

            measureChildren().then((childBounds) => {
              if (childBounds.length === 0) return;

              // Calculate bounding box of all children using measured bounds
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

              for (const bounds of childBounds) {
                const childRight = bounds.x + bounds.width;
                const childBottom = bounds.y + bounds.height;

                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, childRight);
                maxY = Math.max(maxY, childBottom);
              }

              // Calculate new parent dimensions to fit all children + padding
              const contentWidth = maxX - minX;
              const contentHeight = maxY - minY;
              const newWidth = contentWidth + paddingLeft + paddingRight;
              const newHeight = contentHeight + paddingTop + paddingBottom;

              // Calculate position offset - parent moves so children fit within padding
              const offsetX = minX - paddingLeft;
              const offsetY = minY - paddingTop;

              set((draft) => {
                const parentIdx = draft.elements.findIndex(e => e.id === parentId);
                if (parentIdx === -1) return;

                // Update parent size and position
                draft.elements[parentIdx].width = newWidth;
                draft.elements[parentIdx].height = newHeight;
                draft.elements[parentIdx].position_x = parent.position_x + offsetX;
                draft.elements[parentIdx].position_y = parent.position_y + offsetY;

                // Adjust children positions to be relative to new parent position
                for (const child of children) {
                  const childIdx = draft.elements.findIndex(e => e.id === child.id);
                  if (childIdx !== -1) {
                    draft.elements[childIdx].position_x = child.position_x - minX + paddingLeft;
                    draft.elements[childIdx].position_y = child.position_y - minY + paddingTop;
                  }
                }

                draft.isDirty = true;
              });
            });
          });
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
        selectElements: (ids, mode = 'replace', options = {}) => {
          const state = get();
          const { expandInOutline = true } = options;

          // Auto-select the template containing the first selected element
          // This ensures timeline shows the correct element's keyframes
          // Skip if options.skipTemplateSwitch is true (e.g., when selecting via keyframe click)
          if (ids.length > 0 && !options.skipTemplateSwitch) {
            const firstElement = state.elements.find(e => e.id === ids[0]);
            if (firstElement && firstElement.template_id !== state.currentTemplateId) {
              // Switch to the element's template and hydrate data source state
              const template = state.templates.find(t => t.id === firstElement.template_id);
              const targetTemplateId = firstElement.template_id;

              // Cache the current template's data before switching (if it has data)
              let newCache = { ...state.templateDataCache };
              if (state.currentTemplateId && state.dataSourceId && state.dataPayload) {
                newCache[state.currentTemplateId] = {
                  dataSourceId: state.dataSourceId,
                  dataSourceName: state.dataSourceName || '',
                  dataPayload: state.dataPayload,
                  dataDisplayField: state.dataDisplayField,
                  currentRecordIndex: state.currentRecordIndex,
                };
              }

              // Try to restore from cache first, then fall back to loading from data source
              let dataSourceId: string | null = null;
              let dataSourceName: string | null = null;
              let dataPayload: Record<string, unknown>[] | null = null;
              let dataDisplayField: string | null = null;
              let recordIndex = 0;

              if (newCache[targetTemplateId]) {
                const cached = newCache[targetTemplateId];
                dataSourceId = cached.dataSourceId;
                dataSourceName = cached.dataSourceName;
                dataPayload = cached.dataPayload;
                dataDisplayField = cached.dataDisplayField;
                recordIndex = cached.currentRecordIndex;
              } else if (template?.data_source_id) {
                // Load from template config - auto-fetch data if slug is available
                const config = template?.data_source_config as { displayField?: string; slug?: string; defaultRecordIndex?: number } | null;
                dataSourceId = template.data_source_id;
                dataDisplayField = config?.displayField || null;
                recordIndex = config?.defaultRecordIndex ?? 0;
                const slug = config?.slug || null;

                // If we have a slug, auto-fetch the data
                if (slug) {
                  set({ dataSourceSlug: slug, dataLoading: true });

                  import('@/services/novaEndpointService').then(async ({ fetchEndpointData, getEndpointBySlug }) => {
                    try {
                      const [fetchedData, endpoint] = await Promise.all([
                        fetchEndpointData(slug),
                        getEndpointBySlug(slug)
                      ]);

                      if (fetchedData && fetchedData.length > 0) {
                        const endpointName = endpoint?.name || slug;
                        set((draft) => {
                          draft.dataPayload = fetchedData;
                          draft.dataSourceName = endpointName;
                          draft.dataLastFetched = Date.now();
                          draft.dataLoading = false;
                          draft.dataError = null;

                          draft.templateDataCache[targetTemplateId] = {
                            dataSourceId: dataSourceId!,
                            dataSourceName: endpointName,
                            dataSourceSlug: slug,
                            dataPayload: fetchedData,
                            dataDisplayField: dataDisplayField,
                            currentRecordIndex: recordIndex,
                          };
                        });
                      } else {
                        set({ dataLoading: false, dataError: 'No data returned from endpoint' });
                      }
                    } catch (error) {
                      console.error('[setSelectedElements] Failed to auto-fetch data:', error);
                      set({ dataLoading: false, dataError: 'Failed to fetch data' });
                    }
                  });
                }
              }

              // Check if we're doing async fetch
              const templateConfig = template?.data_source_config as { slug?: string } | null;
              const isAsyncFetch = !!(templateConfig?.slug && !dataPayload);

              set({
                currentTemplateId: targetTemplateId,
                dataSourceId,
                dataSourceName,
                ...(isAsyncFetch ? {} : { dataPayload }),
                dataDisplayField,
                currentRecordIndex: recordIndex,
                templateDataCache: newCache,
              });
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

          // Auto-expand outline to show selected element(s)
          if (expandInOutline && ids.length > 0) {
            get().expandToElement(ids[0]);
          }
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
          set({ animations, isDirty: true });
        },

        // Keyframe operations
        addKeyframe: (animationId, position, properties) => {
          const id = crypto.randomUUID();
          const state = get();

          // Find the animation and element to generate a name
          const animation = state.animations.find(a => a.id === animationId);
          const element = animation
            ? state.elements.find(e => e.id === animation.element_id)
            : null;

          // Count existing keyframes for this animation to determine the number
          const existingKeyframeCount = state.keyframes.filter(
            kf => kf.animation_id === animationId
          ).length;

          // Generate name: ElementName_key_N (or just key_N if no element found)
          const elementName = element?.name || 'element';
          // Clean the element name: remove spaces, special chars, truncate if too long
          const cleanName = elementName
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20);
          const keyframeName = `${cleanName}_key_${existingKeyframeCount + 1}`;

          const newKeyframe: Keyframe = {
            id,
            animation_id: animationId,
            name: keyframeName,
            position,
            properties: properties as Record<string, string | number>,
          };

          set((state) => {
            state.keyframes.push(newKeyframe);
            state.isDirty = true;
          });

          console.log('[Store] Added keyframe:', { id, animationId, name: keyframeName, position, properties });
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

        removeKeyframeProperty: (keyframeId, propertyKey) => {
          set((state) => {
            const index = state.keyframes.findIndex((kf) => kf.id === keyframeId);
            if (index !== -1) {
              const kf = state.keyframes[index];
              const newProperties = { ...kf.properties };
              delete newProperties[propertyKey];

              // If no properties left, delete the entire keyframe
              if (Object.keys(newProperties).length === 0) {
                state.keyframes = state.keyframes.filter((k) => k.id !== keyframeId);
                state.selectedKeyframeIds = state.selectedKeyframeIds.filter((id) => id !== keyframeId);
              } else {
                state.keyframes[index] = {
                  ...kf,
                  properties: newProperties,
                };
              }
              state.isDirty = true;
            }
          });
          console.log('[Store] Removed property from keyframe:', keyframeId, propertyKey);
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
          set({ keyframes, isDirty: true });
        },

        selectKeyframes: (ids) => {
          set({ selectedKeyframeIds: ids });
        },

        // Binding operations
        setBindings: (bindings) => {
          set({ bindings, isDirty: true });
        },

        addBinding: (elementId, bindingKey, targetProperty, bindingType, templateId) => {
          const id = crypto.randomUUID();
          const state = get();

          // Use provided templateId or fall back to currentTemplateId
          const resolvedTemplateId = templateId || state.currentTemplateId;
          if (!resolvedTemplateId) {
            console.error('❌ Cannot add binding: no template ID available');
            return id;
          }

          const newBinding: Binding = {
            id,
            template_id: resolvedTemplateId,
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
            console.log(`🔗 Added binding: ${bindingKey} → ${elementId}, isDirty: ${state.isDirty}`);
          });

          // Trigger debounced autosave for binding changes
          triggerBindingAutosave();

          return id;
        },

        updateBinding: (bindingId, updates) => {
          console.log(`🔧 updateBinding called:`, { bindingId, updates });
          set((state) => {
            const idx = state.bindings.findIndex((b) => b.id === bindingId);
            if (idx !== -1) {
              const oldBinding = state.bindings[idx];
              state.bindings[idx] = { ...state.bindings[idx], ...updates };
              console.log(`🔧 Binding updated:`, {
                before: { formatter_options: oldBinding.formatter_options },
                after: { formatter_options: state.bindings[idx].formatter_options },
                isDirty: state.isDirty,
              });
              state.isDirty = true;
            } else {
              console.warn(`🔧 Binding not found for update:`, bindingId);
            }
          });

          // Trigger debounced autosave for binding changes
          triggerBindingAutosave();
        },

        deleteBinding: (bindingId) => {
          set((state) => {
            state.bindings = state.bindings.filter((b) => b.id !== bindingId);
            state.pendingDeletions.bindings.push(bindingId);
            state.isDirty = true;
            console.log(`🗑️ Deleted binding: ${bindingId}, isDirty: ${state.isDirty}`);
          });

          // Trigger debounced autosave for binding changes
          triggerBindingAutosave();
        },

        // Layer operations
        setLayers: (layers) => {
          set((state) => {
            state.layers = layers;
            // Expand all layers by default
            const expanded = new Set<string>();
            layers.forEach((l) => expanded.add(l.id));
            state.expandedNodes = expanded;
            state.isDirty = true;
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

        reorderTemplate: (templateId, targetIndex) => {
          set((state) => {
            const template = state.templates.find((t) => t.id === templateId);
            if (!template) return;

            // Get sibling templates in the same layer
            const layerId = template.layer_id;
            const siblings = state.templates
              .filter((t) => t.layer_id === layerId && t.id !== templateId)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            // Calculate new sort_order and z_index for all templates in the layer
            let sortOrder = 0;
            let zIndexBase = 10;

            for (let i = 0; i < siblings.length; i++) {
              if (i === targetIndex) {
                // Insert the moved template here
                template.sort_order = sortOrder;
                template.z_index = zIndexBase;
                sortOrder++;
                zIndexBase += 10;
              }
              // Update sibling
              siblings[i].sort_order = sortOrder;
              siblings[i].z_index = zIndexBase;
              sortOrder++;
              zIndexBase += 10;
            }

            // If targetIndex is at or beyond the end, place template last
            if (targetIndex >= siblings.length) {
              template.sort_order = sortOrder;
              template.z_index = zIndexBase;
            }

            state.isDirty = true;
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

        toggleFps: () => {
          set((state) => {
            state.showFps = !state.showFps;
          });
        },

        addGuide: (guide) => {
          set((state) => {
            state.guides.push(guide);
          });
        },

        moveGuide: (id, newPosition) => {
          set((state) => {
            const guide = state.guides.find(g => g.id === id);
            if (guide) {
              guide.position = newPosition;
            }
          });
        },

        removeGuide: (id) => {
          set((state) => {
            state.guides = state.guides.filter(g => g.id !== id);
          });
        },

        clearGuides: () => {
          set((state) => {
            state.guides = [];
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

        setShowEasingEditor: (show) => {
          set({ showEasingEditor: show });
        },

        setPhaseDuration: (phase, duration) => {
          const clampedDuration = Math.max(500, Math.min(300000, duration)); // Min 0.5s, max 5 min
          set((state) => {
            const newPhaseDurations = {
              ...state.phaseDurations,
              [phase]: clampedDuration,
            };
            // Also save to project settings for persistence (immutably)
            const updatedProject = state.project ? {
              ...state.project,
              settings: {
                ...state.project.settings,
                phaseDurations: newPhaseDurations,
              },
            } : state.project;

            return {
              phaseDurations: newPhaseDurations,
              project: updatedProject,
              isDirty: true, // Mark as dirty so it gets saved
            };
          });
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

        endPreviewPlayback: () => {
          // End playback but KEEP template isolated
          // This is called when the animation naturally finishes
          // User can click the button again to exit isolated mode
          set({ isPlaying: false });
        },

        setIsPlayingFullPreview: (value: boolean) => {
          set({ isPlayingFullPreview: value });
        },

        // On-Air controls
        playIn: (templateId, layerId) => {
          console.log('[OnAir] Play IN:', templateId, 'in layer:', layerId);
          set((state) => {
            state.onAirTemplates[layerId] = {
              templateId,
              state: 'in',
              pendingSwitch: undefined,
              timestamp: Date.now(),
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

        // Script play mode
        setScriptPlayMode: (enabled) => {
          set({ isScriptPlayMode: enabled });
        },

        toggleScriptPlayMode: () => {
          set((state) => ({ isScriptPlayMode: !state.isScriptPlayMode }));
        },

        // Outline panel
        setOutlineTab: (tab) => {
          set({ outlineTab: tab });
        },

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

        expandToElement: (elementId) => {
          const state = get();
          const element = state.elements.find(e => e.id === elementId);
          if (!element) return;

          const expanded = new Set(state.expandedNodes);

          // Expand all parent elements in the hierarchy
          let currentElement = element;
          while (currentElement.parent_element_id) {
            expanded.add(currentElement.parent_element_id);
            const parent = state.elements.find(e => e.id === currentElement.parent_element_id);
            if (!parent) break;
            currentElement = parent;
          }

          // Expand the layer containing the element's template
          const template = state.templates.find(t => t.id === element.template_id);
          if (template) {
            expanded.add(template.layer_id);
          }

          set({ expandedNodes: expanded });
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

          // Save to database - pass access token for authenticated RLS
          const accessToken = useAuthStore.getState().accessToken;
          const saved = await saveChatMessage(project.id, {
            role: message.role,
            content: message.content,
            attachments: message.attachments,
            changes_applied: message.changes_applied,
            error: message.error,
            context_template_id: get().currentTemplateId,
            context_element_ids: get().selectedElementIds,
          }, accessToken || undefined);

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

        updateChatMessageContent: (messageId, content) => {
          set((state) => {
            const index = state.chatMessages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              state.chatMessages[index].content = content;
            }
          });
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

        // Data binding operations
        setDataSource: async (id, name, data, displayField, slug) => {
          const { currentTemplateId } = get();

          // Update local state AND update the template record in the local store
          set((draft) => {
            draft.dataSourceId = id;
            draft.dataSourceName = name;
            draft.dataSourceSlug = slug || null;
            draft.dataPayload = data;
            draft.currentRecordIndex = 0;
            draft.dataDisplayField = displayField;
            draft.dataLastFetched = Date.now();
            draft.dataError = null;
            draft.isDirty = true;

            // Also update the template's data_source_id in the local templates array
            // This ensures selectTemplate will hydrate correctly when switching back
            if (currentTemplateId) {
              const template = draft.templates.find(t => t.id === currentTemplateId);
              if (template) {
                template.data_source_id = id;
                template.data_source_config = { displayField, slug };
              }

              // Update the template data cache - this is the resilient storage
              // that persists data even when switching templates
              draft.templateDataCache[currentTemplateId] = {
                dataSourceId: id,
                dataSourceName: name,
                dataSourceSlug: slug || null,
                dataPayload: data,
                dataDisplayField: displayField,
                currentRecordIndex: 0,
              };
            }
          });

          // Persist to template in database via REST API
          if (currentTemplateId) {
            const accessToken = useAuthStore.getState().accessToken;
            console.log(`💾 Saving data source "${id}" to template ${currentTemplateId}...`);
            const result = await directRestUpdate(
              'gfx_templates',
              {
                data_source_id: id,
                data_source_config: { displayField, slug },
              },
              { column: 'id', value: currentTemplateId },
              10000,
              accessToken || undefined
            );
            if (!result.success) {
              console.error('❌ Failed to save data source to template:', result.error);
            } else {
              console.log(`✅ Data source "${id}" saved to template ${currentTemplateId}`);
            }
          }
        },

        refreshDataSource: async () => {
          const { dataSourceSlug, dataSourceId, dataSourceName, dataDisplayField, currentTemplateId } = get();

          if (!dataSourceSlug) {
            console.warn('[designerStore] Cannot refresh: no endpoint slug');
            return;
          }

          set({ dataLoading: true, dataError: null });

          try {
            // Dynamic import to avoid circular dependencies
            const { fetchEndpointData } = await import('@/services/novaEndpointService');
            const data = await fetchEndpointData(dataSourceSlug);

            set((draft) => {
              draft.dataPayload = data;
              draft.dataLastFetched = Date.now();
              draft.dataLoading = false;
              draft.dataError = null;

              // Update cache
              if (currentTemplateId && dataSourceId && dataSourceName) {
                draft.templateDataCache[currentTemplateId] = {
                  dataSourceId,
                  dataSourceName,
                  dataSourceSlug,
                  dataPayload: data,
                  dataDisplayField,
                  currentRecordIndex: draft.currentRecordIndex,
                };
              }
            });

            console.log(`🔄 Data refreshed from ${dataSourceSlug}: ${data.length} records`);
          } catch (err) {
            console.error('[designerStore] Failed to refresh data:', err);
            set({
              dataLoading: false,
              dataError: err instanceof Error ? err.message : 'Failed to refresh data',
            });
          }
        },

        clearDataSource: async () => {
          const { currentTemplateId } = get();

          // Update local state AND update the template record in the local store
          set((draft) => {
            draft.dataSourceId = null;
            draft.dataSourceName = null;
            draft.dataSourceSlug = null;
            draft.dataPayload = null;
            draft.currentRecordIndex = 0;
            draft.dataDisplayField = null;
            draft.dataLastFetched = null;
            draft.dataError = null;
            draft.isDirty = true;

            // Also clear the template's data_source_id in the local templates array
            if (currentTemplateId) {
              const template = draft.templates.find(t => t.id === currentTemplateId);
              if (template) {
                template.data_source_id = null;
                template.data_source_config = null;
              }

              // Also clear from template data cache
              delete draft.templateDataCache[currentTemplateId];
            }
          });

          // Clear from template in database via REST API
          if (currentTemplateId) {
            const accessToken = useAuthStore.getState().accessToken;
            const result = await directRestUpdate(
              'gfx_templates',
              {
                data_source_id: null,
                data_source_config: null,
              },
              { column: 'id', value: currentTemplateId },
              10000,
              accessToken || undefined
            );
            if (!result.success) {
              console.error('Failed to clear data source from template:', result.error);
            }
          }
        },

        setCurrentRecordIndex: (index) => {
          const { dataPayload } = get();
          if (!dataPayload) return;
          const validIndex = Math.max(0, Math.min(index, dataPayload.length - 1));
          set({ currentRecordIndex: validIndex });
        },

        setDefaultRecordIndex: async (index) => {
          const { currentTemplateId, dataDisplayField, templates } = get();
          if (!currentTemplateId) return;

          const template = templates.find(t => t.id === currentTemplateId);
          if (!template) return;

          // Get current config and add defaultRecordIndex
          const currentConfig = (template.data_source_config as { displayField?: string; defaultRecordIndex?: number }) || {};
          const newConfig = {
            ...currentConfig,
            displayField: dataDisplayField || currentConfig.displayField,
            defaultRecordIndex: index,
          };

          // Update template in local state
          set((state) => {
            const idx = state.templates.findIndex(t => t.id === currentTemplateId);
            if (idx !== -1) {
              state.templates[idx] = {
                ...state.templates[idx],
                data_source_config: newConfig,
              };
              state.isDirty = true;
            }
          });

          // Persist to database
          const accessToken = useAuthStore.getState().accessToken;
          const result = await directRestUpdate(
            'gfx_templates',
            { data_source_config: newConfig },
            { column: 'id', value: currentTemplateId },
            10000,
            accessToken || undefined
          );
          if (!result.success) {
            console.error('Failed to save default record index:', result.error);
          } else {
            console.log(`✅ Set default record index to ${index}`);
          }
        },

        nextRecord: () => {
          const { dataPayload, currentRecordIndex } = get();
          if (!dataPayload) return;
          const nextIndex = currentRecordIndex + 1;
          if (nextIndex < dataPayload.length) {
            set({ currentRecordIndex: nextIndex });
          }
        },

        prevRecord: () => {
          const { currentRecordIndex } = get();
          if (currentRecordIndex > 0) {
            set({ currentRecordIndex: currentRecordIndex - 1 });
          }
        },

        // Get data record for a specific template - looks up from cache or loads from data source
        // This allows StageElement to get data for ANY template, not just the current one
        getDataRecordForTemplate: (templateId: string) => {
          const {
            currentTemplateId,
            dataPayload,
            currentRecordIndex,
            templateDataCache,
            templates,
          } = get();

          // If asking for current template's data, use global state (it's always up to date)
          if (templateId === currentTemplateId && dataPayload) {
            return dataPayload[currentRecordIndex] || null;
          }

          // Check template data cache first
          if (templateDataCache[templateId]) {
            const cached = templateDataCache[templateId];
            return cached.dataPayload[cached.currentRecordIndex] || null;
          }

          // No cached data available - data needs to be fetched via refresh
          return null;
        },
      }))
    )
  )
);

