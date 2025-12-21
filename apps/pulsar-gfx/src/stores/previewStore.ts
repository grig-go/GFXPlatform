import { create } from 'zustand';

export type PreviewMode = 'isolated' | 'composite';
export type AnimationPhase = 'idle' | 'in' | 'looping' | 'out';

export interface CompositeLayer {
  layerIndex: number;
  pageId?: string;
  templateId?: string;
  isVisible: boolean;
}

interface PreviewStore {
  // Mode
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;

  // Track which project data is currently loaded
  loadedProjectId: string | null;
  setLoadedProjectId: (projectId: string | null) => void;

  // Isolated mode state
  selectedTemplateId: string | null;
  selectedPageId: string | null;
  previewPayload: Record<string, any>;
  animationPhase: AnimationPhase;

  // Data binding state
  dataRecordIndex: number;
  setDataRecordIndex: (index: number) => void;

  // Data source state (from Nova endpoints)
  dataSourceId: string | null;
  dataSourceName: string | null;
  dataSourceSlug: string | null;
  dataPayload: Record<string, unknown>[] | null;
  dataLoading: boolean;
  dataError: string | null;
  setDataSource: (id: string | null, name: string | null, slug: string | null, data: Record<string, unknown>[] | null) => void;
  setDataLoading: (loading: boolean) => void;
  setDataError: (error: string | null) => void;
  clearDataSource: () => void;

  // Composite mode state
  compositeLayers: CompositeLayer[];

  // Selection
  selectTemplate: (templateId: string | null) => void;
  selectPage: (pageId: string | null, payload?: Record<string, any>) => void;

  // Preview payload
  updatePreviewField: (fieldId: string, value: any) => void;
  setPreviewPayload: (payload: Record<string, any>) => void;

  // Animation controls
  playIn: () => Promise<void>;
  playOut: () => Promise<void>;
  playFull: (duration?: number) => Promise<void>;
  stopAnimation: () => void;
  resetPreview: () => void;

  // Composite mode
  setCompositeLayerPage: (layerIndex: number, pageId: string | null) => void;
  setCompositeLayerVisibility: (layerIndex: number, visible: boolean) => void;
  clearCompositeLayers: () => void;

  // Clear all preview state (for project switch)
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  // Initial state
  mode: 'isolated',
  loadedProjectId: null,
  selectedTemplateId: null,
  selectedPageId: null,
  previewPayload: {},
  animationPhase: 'idle',
  dataRecordIndex: 0,
  // Data source state
  dataSourceId: null,
  dataSourceName: null,
  dataSourceSlug: null,
  dataPayload: null,
  dataLoading: false,
  dataError: null,
  compositeLayers: [
    { layerIndex: 0, isVisible: true },
    { layerIndex: 1, isVisible: true },
    { layerIndex: 2, isVisible: true },
    { layerIndex: 3, isVisible: true },
  ],

  setMode: (mode) => set({ mode }),
  setLoadedProjectId: (projectId) => set({ loadedProjectId: projectId }),
  setDataRecordIndex: (index) => set({ dataRecordIndex: index }),

  // Data source methods
  setDataSource: (id, name, slug, data) => set({
    dataSourceId: id,
    dataSourceName: name,
    dataSourceSlug: slug,
    dataPayload: data,
    dataLoading: false,
    dataError: null,
  }),
  setDataLoading: (loading) => set({ dataLoading: loading }),
  setDataError: (error) => set({ dataError: error, dataLoading: false }),
  clearDataSource: () => set({
    dataSourceId: null,
    dataSourceName: null,
    dataSourceSlug: null,
    dataPayload: null,
    dataLoading: false,
    dataError: null,
    dataRecordIndex: 0,
  }),

  selectTemplate: (templateId) => {
    set({
      mode: 'isolated',  // Always switch to isolated mode when selecting a template
      selectedTemplateId: templateId,
      selectedPageId: null,
      previewPayload: {},
      animationPhase: 'idle',
    });
  },

  selectPage: (pageId, payload = {}) => {
    set({
      mode: 'isolated',  // Always switch to isolated mode when selecting a page
      selectedTemplateId: null,  // Clear template selection so page's template is used
      selectedPageId: pageId,
      previewPayload: payload,
      animationPhase: 'idle',
    });
  },

  updatePreviewField: (fieldId, value) => {
    set({
      previewPayload: {
        ...get().previewPayload,
        [fieldId]: value,
      },
    });
  },

  setPreviewPayload: (payload) => {
    set({ previewPayload: payload });
  },

  playIn: async () => {
    // Set phase to IN
    set({ animationPhase: 'in' });

    // TODO: Trigger IN animation in preview engine
    // After IN completes, auto-transition to looping
    // This would be handled by the preview engine callback

    // Simulate for now
    await new Promise((r) => setTimeout(r, 500));
    set({ animationPhase: 'looping' });
  },

  playOut: async () => {
    // Set phase to OUT
    set({ animationPhase: 'out' });

    // TODO: Trigger OUT animation in preview engine
    // After OUT completes, go back to idle

    // Simulate for now
    await new Promise((r) => setTimeout(r, 500));
    set({ animationPhase: 'idle' });
  },

  playFull: async (duration = 5000) => {
    // Play IN
    await get().playIn();

    // Wait for loop duration (total - in - out)
    // For now, simulate with provided duration
    await new Promise((r) => setTimeout(r, duration));

    // Play OUT
    await get().playOut();
  },

  stopAnimation: () => {
    set({ animationPhase: 'idle' });
    // TODO: Stop any running animation
  },

  resetPreview: () => {
    set({
      animationPhase: 'idle',
      previewPayload: {},
    });
    // TODO: Reset preview engine to initial state
  },

  setCompositeLayerPage: (layerIndex, pageId) => {
    set({
      compositeLayers: get().compositeLayers.map((layer) =>
        layer.layerIndex === layerIndex
          ? { ...layer, pageId: pageId || undefined }
          : layer
      ),
    });
  },

  setCompositeLayerVisibility: (layerIndex, visible) => {
    set({
      compositeLayers: get().compositeLayers.map((layer) =>
        layer.layerIndex === layerIndex ? { ...layer, isVisible: visible } : layer
      ),
    });
  },

  clearCompositeLayers: () => {
    set({
      compositeLayers: get().compositeLayers.map((layer) => ({
        ...layer,
        pageId: undefined,
        templateId: undefined,
      })),
    });
  },

  clearPreview: () => {
    set({
      loadedProjectId: null, // Force reload on next project
      selectedTemplateId: null,
      selectedPageId: null,
      previewPayload: {},
      animationPhase: 'idle',
      dataRecordIndex: 0,
      // Clear data source state
      dataSourceId: null,
      dataSourceName: null,
      dataSourceSlug: null,
      dataPayload: null,
      dataLoading: false,
      dataError: null,
      compositeLayers: [
        { layerIndex: 0, isVisible: true },
        { layerIndex: 1, isVisible: true },
        { layerIndex: 2, isVisible: true },
        { layerIndex: 3, isVisible: true },
      ],
    });
  },
}));
