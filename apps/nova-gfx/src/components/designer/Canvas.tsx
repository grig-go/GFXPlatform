import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize, Grid3X3, Ruler, Undo, Redo,
  MousePointer, RotateCw, Type, Image, Square, Circle, Hand, BarChart3, Loader2, MapPin, Video, ScrollText, Tag, FileCode, Sparkles, Table2, Minus, Timer,
} from 'lucide-react';
import { Button, Separator, cn } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { uploadMedia, type UploadProgress } from '@/services/storageService';
import { Stage } from '@/components/canvas/Stage';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';
import { SVGPickerDialog } from '@/components/dialogs/SVGPickerDialog';
import { IconPickerDialog } from '@/components/dialogs/IconPickerDialog';
import { loadFonts, SYSTEM_FONTS } from '@/lib/fonts';

type DrawState = {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null;

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawState, setDrawState] = useState<DrawState>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerPosition, setMediaPickerPosition] = useState({ x: 100, y: 100 });
  const [showSvgPicker, setShowSvgPicker] = useState(false);
  const [svgPickerElementId, setSvgPickerElementId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerPosition, setIconPickerPosition] = useState({ x: 100, y: 100 });

  const {
    project,
    currentTemplateId,
    elements,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    fitToScreen,
    tool,
    setTool,
    showGrid,
    showSafeArea,
    toggleGrid,
    toggleSafeArea,
    addElement,
    deselectAll,
    saveProject,
    isDirty,
    undo,
    redo,
    history,
    historyIndex,
  } = useDesignerStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Load fonts used by elements automatically
  useEffect(() => {
    if (elements.length === 0) return;

    // Extract unique font families from all elements
    const fontFamilies = new Set<string>();
    const systemFontFamilies = new Set(SYSTEM_FONTS.map(f => f.family));

    elements.forEach(element => {
      // Check element.styles.fontFamily
      const fontFamily = element.styles?.fontFamily;
      if (fontFamily && typeof fontFamily === 'string') {
        // Handle font family strings like "'Inter', sans-serif" - extract the first font
        const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        if (primaryFont && !systemFontFamilies.has(primaryFont)) {
          fontFamilies.add(primaryFont);
        }
      }

      // Check chart options for font families
      if (element.content?.type === 'chart' && element.content.options) {
        const chartFont = (element.content.options as Record<string, unknown>).fontFamily;
        if (chartFont && typeof chartFont === 'string' && !systemFontFamilies.has(chartFont)) {
          fontFamilies.add(chartFont);
        }
      }

      // Check table content for font families
      if (element.content?.type === 'table') {
        const tableContent = element.content as Record<string, unknown>;
        const headerFont = tableContent.headerFontFamily;
        if (headerFont && typeof headerFont === 'string' && !systemFontFamilies.has(headerFont)) {
          fontFamilies.add(headerFont);
        }
      }

      // Check ticker config for font families
      if (element.content?.type === 'ticker' && element.content.config) {
        const tickerConfig = element.content.config as unknown as Record<string, unknown>;
        const tickerFont = tickerConfig.fontFamily;
        if (tickerFont && typeof tickerFont === 'string' && !systemFontFamilies.has(tickerFont)) {
          fontFamilies.add(tickerFont);
        }
      }
    });

    if (fontFamilies.size > 0) {
      const fontsToLoad = Array.from(fontFamilies);
      console.log('[Canvas] Loading fonts:', fontsToLoad);
      loadFonts(fontsToLoad);
    }
  }, [elements]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left - panX) / zoom,
        y: (screenY - rect.top - panY) / zoom,
      };
    },
    [zoom, panX, panY]
  );

  // Wheel handler for zoom/pan
  // Default: scroll = zoom, Shift+scroll = pan vertically, Ctrl+scroll = pan horizontally
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      
      // Get mouse position relative to container for zoom centering
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (e.shiftKey) {
        // Shift + scroll = pan horizontally
        setPan(panX - e.deltaY, panY);
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + scroll = pan vertically
        setPan(panX, panY - e.deltaY);
      } else {
        // Default scroll = zoom toward mouse cursor
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
        
        // Calculate new pan to zoom toward mouse position
        const zoomRatio = newZoom / zoom;
        const newPanX = mouseX - (mouseX - panX) * zoomRatio;
        const newPanY = mouseY - (mouseY - panY) * zoomRatio;
        
        setZoom(newZoom);
        setPan(newPanX, newPanY);
      }
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Track if we've done the initial fit for the current project
  const initialFitDoneRef = useRef<string | null>(null);

  // Auto-fit canvas when project is loaded (same as clicking "Fit" button)
  useEffect(() => {
    // Only fit if we have a project and haven't done the initial fit for this project yet
    if (project && project.id !== initialFitDoneRef.current) {
      // Use requestAnimationFrame to ensure container is rendered and has dimensions
      requestAnimationFrame(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          fitToScreen(rect.width, rect.height);
          initialFitDoneRef.current = project.id;
        }
      });
    }
  }, [project, fitToScreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty) {
          saveProject();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'q':
          setTool('rotate');
          break;
        case 't':
          setTool('text');
          break;
        case 'r':
          setTool('rectangle');
          break;
        case 'e':
          setTool('ellipse');
          break;
        case 'i':
          setTool('image');
          break;
        case 'c':
          setTool('chart');
          break;
        case 'h':
        case ' ':
          setTool('hand');
          break;
        case 'k':
          setTool('ticker');
          break;
        case 'g':
          setTool('topic-badge');
          break;
        case 'y':
          setTool('countdown');
          break;
        case 'm':
          setTool('map');
          break;
        case 'b':
          setTool('video');
          break;
        case 's':
          setTool('svg');
          break;
        case 'escape':
          setTool('select');
          deselectAll();
          break;
        case 'delete':
        case 'backspace':
          // Delete selected elements (handled by Stage)
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, deselectAll, saveProject, isDirty]);

  // Mouse down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentTemplateId) return;

    // Middle mouse button (button === 1) - always pan regardless of tool
    if (e.button === 1) {
      e.preventDefault(); // Prevent default middle-click behavior (auto-scroll)
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    // Only process left click (button === 0) for other actions
    if (e.button !== 0) return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY);

    // Hand tool - start panning with left click
    if (tool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    // Drawing tools - start drawing
    if (tool === 'rectangle' || tool === 'ellipse') {
      setDrawState({
        isDrawing: true,
        startX: canvasPos.x,
        startY: canvasPos.y,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      });
      return;
    }
  };

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      return;
    }

    // Drawing preview
    if (drawState?.isDrawing) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDrawState({
        ...drawState,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      });
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Complete drawing
    if (drawState?.isDrawing) {
      const width = Math.abs(drawState.currentX - drawState.startX);
      const height = Math.abs(drawState.currentY - drawState.startY);
      const x = Math.min(drawState.startX, drawState.currentX);
      const y = Math.min(drawState.startY, drawState.currentY);

      // Only create if dragged a minimum size
      if (width > 10 && height > 10) {
        if (tool === 'rectangle') {
          const id = addElement('shape', { x, y });
          // Update with actual dimensions
          useDesignerStore.getState().updateElement(id, {
            width,
            height,
            content: { type: 'shape', shape: 'rectangle', fill: '#3B82F6' },
          });
        } else if (tool === 'ellipse') {
          const id = addElement('shape', { x, y });
          useDesignerStore.getState().updateElement(id, {
            width,
            height,
            content: { type: 'shape', shape: 'ellipse', fill: '#8B5CF6' },
            styles: { borderRadius: '50%' },
          });
        }
      }

      setDrawState(null);
      setTool('select'); // Switch back to select after drawing
    }
  };

  // Click handler for point tools
  const handleClick = (e: React.MouseEvent) => {
    if (!currentTemplateId) return;
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);

    // Image tool - open media picker dialog (works anywhere on canvas)
    if (tool === 'image') {
      setMediaPickerPosition({ x: canvasPos.x, y: canvasPos.y });
      setShowMediaPicker(true);
      return;
    }

    // SVG tool - create SVG element and open picker
    if (tool === 'svg') {
      const id = addElement('svg', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 200,
        height: 200,
        content: {
          type: 'svg',
          svgContent: '',
          preserveAspectRatio: 'xMidYMid meet',
        },
      });
      setSvgPickerElementId(id);
      setShowSvgPicker(true);
      setTool('select');
      return;
    }

    // Icon tool - open icon picker dialog for user to choose icon
    if (tool === 'icon') {
      setIconPickerPosition({ x: canvasPos.x, y: canvasPos.y });
      setShowIconPicker(true);
      return;
    }

    // Table tool - create table element
    if (tool === 'table') {
      const id = addElement('table', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 600,
        height: 300,
        content: {
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
            { id: 'row4', team: 'Team D', wins: 4, losses: 8, pct: 0.333 },
          ],
          showHeader: true,
          striped: true,
          bordered: true,
          compact: false,
        },
      });
      setTool('select');
      return;
    }

    // Chart tool - create chart on click (works anywhere on canvas)
    if (tool === 'chart') {
      const id = addElement('d3-chart', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 400,
        height: 300,
      });
      setTool('select');
      return;
    }

    // Map tool - create map on click (works anywhere on canvas)
    if (tool === 'map') {
      const id = addElement('map', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 500,
        height: 350,
        content: {
          type: 'map',
          mapStyle: 'dark',
          center: [-74.006, 40.7128], // New York City default
          zoom: 12,
          pitch: 0,
          bearing: 0,
          markers: [],
          animateLocation: true, // Enable location animation by default
          animationDuration: 2000,
          animationEasing: 'ease-in-out',
        },
      });
      setTool('select');
      return;
    }

    // Video tool - create video on click (works anywhere on canvas)
    if (tool === 'video') {
      const id = addElement('video', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 1920,
        height: 1080,
        content: {
          type: 'video',
          src: 'https://www.youtube.com/watch?v=bImk2wEVVCc', // Default video
          loop: true,
          muted: true,
          autoplay: true,
          videoType: 'youtube',
        },
      });
      setTool('select');
      return;
    }

    // Ticker tool - create ticker on click
    if (tool === 'ticker') {
      const id = addElement('ticker', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 1920,
        height: 50,
        content: {
          type: 'ticker',
          items: [
            { id: 'item-1', content: '🔴 BREAKING NEWS: Your headline goes here', topic: 'breaking' },
            { id: 'item-2', content: 'Add more news items using the Content tab in Properties', topic: 'news' },
            { id: 'item-3', content: 'Configure speed, direction, and mode in ticker settings', topic: 'news' },
          ],
          config: {
            mode: 'scroll',
            direction: 'left',
            speed: 80,
            pauseOnHover: true,
            delay: 3000,
            gap: 80,
            loop: true,
            gradient: false,
            gradientWidth: 50,
          },
        },
        styles: {
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
          fontWeight: '600',
          fontSize: '18px',
        },
      });
      setTool('select');
      return;
    }

    // Topic Badge tool - create topic badge on click
    if (tool === 'topic-badge') {
      const id = addElement('topic-badge', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 180,
        height: 40,
        content: {
          type: 'topic-badge',
          defaultTopic: 'news',
          showIcon: true,
          animated: true,
        },
        styles: {
          borderRadius: '4px',
        },
      });
      setTool('select');
      return;
    }

    // Countdown tool - create countdown on click
    if (tool === 'countdown') {
      const id = addElement('countdown', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 300,
        height: 80,
      });
      setTool('select');
      return;
    }

    // Text tool - create text on click (allow clicking anywhere on canvas)
    if (tool === 'text') {
      addElement('text', { x: canvasPos.x, y: canvasPos.y });
      setTool('select');
      return;
    }

    // Line tool - create line on click
    if (tool === 'line') {
      const id = addElement('line', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        width: 200,
        height: 2,
        content: {
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
        },
      });
      setTool('select');
      return;
    }

    // Rectangle tool - create rectangle on click
    if (tool === 'rectangle') {
      addElement('shape', { x: canvasPos.x, y: canvasPos.y });
      setTool('select');
      return;
    }

    // Ellipse tool - create ellipse on click
    if (tool === 'ellipse') {
      const id = addElement('shape', { x: canvasPos.x, y: canvasPos.y });
      useDesignerStore.getState().updateElement(id, {
        content: {
          type: 'shape',
          shape: 'ellipse',
          fill: '#3B82F6',
        },
      });
      setTool('select');
      return;
    }

    // For select tool, only trigger deselect on canvas background (not on elements)
    if (e.target !== e.currentTarget) return;

    // Select tool - click on background deselects
    if (tool === 'select') {
      deselectAll();
    }
  };

  // Handle media selection from picker
  const handleMediaSelect = useCallback((url: string, asset?: { media_type?: string }) => {
    if (!currentTemplateId) return;
    
    setTool('select');
    setShowMediaPicker(false);
    
    // Check if it's a video based on asset type or URL
    const isVideo = asset?.media_type === 'video' || 
      url.match(/\.(mp4|webm|ogg|mov|avi|mkv)/i) ||
      (url.includes('/video/') && url.includes('supabase'));
    
    if (isVideo) {
      // Create a video element
      const id = addElement('video', mediaPickerPosition);
      useDesignerStore.getState().updateElement(id, {
        width: 640,
        height: 360,
        content: { 
          type: 'video', 
          src: url, 
          loop: true,
          muted: true,
          autoplay: true,
          videoType: 'file',
        },
      });
      return;
    }
    
    // Handle image
    const img = new window.Image();
    img.onload = () => {
      const nativeWidth = img.width;
      const nativeHeight = img.height;
      const nativeAspectRatio = nativeWidth / nativeHeight;
      const maxWidth = 600;
      const width = Math.min(nativeWidth, maxWidth);
      const height = width / nativeAspectRatio;
      
      const id = addElement('image', mediaPickerPosition);
      useDesignerStore.getState().updateElement(id, {
        width,
        height,
        content: { 
          type: 'image', 
          src: url, 
          fit: 'cover',
          nativeWidth,
          nativeHeight,
          nativeAspectRatio,
          aspectRatioLocked: true, // Lock aspect ratio by default for media
        },
      });
    };
    img.onerror = () => {
      // Fallback if we can't get dimensions
      const id = addElement('image', mediaPickerPosition);
      useDesignerStore.getState().updateElement(id, {
        width: 400,
        height: 300,
        content: { type: 'image', src: url, fit: 'cover' },
      });
    };
    img.src = url;
  }, [currentTemplateId, addElement, mediaPickerPosition, setTool]);

  // Handle icon selection from picker
  const handleIconSelect = useCallback((
    library: 'lucide' | 'fontawesome' | 'lottie' | 'weather',
    iconName: string,
    weight?: 'solid' | 'regular' | 'brands',
    lottieUrl?: string,
    lottieJson?: string
  ) => {
    if (!currentTemplateId) return;

    setTool('select');
    setShowIconPicker(false);

    const id = addElement('icon', iconPickerPosition);

    if (library === 'lottie') {
      useDesignerStore.getState().updateElement(id, {
        width: 96,
        height: 96,
        content: {
          type: 'icon',
          library: 'lottie',
          iconName: iconName,
          size: 48,
          color: '#FFFFFF',
          lottieUrl: lottieUrl,
          lottieJson: lottieJson,
          lottieLoop: true,
          lottieAutoplay: true,
        },
      });
    } else {
      useDesignerStore.getState().updateElement(id, {
        width: 96,
        height: 96,
        content: {
          type: 'icon',
          library: library,
          iconName: iconName,
          size: 48,
          color: '#FFFFFF',
          weight: weight,
        },
      });
    }
  }, [currentTemplateId, addElement, iconPickerPosition, setTool]);

  // Handle image file selection (legacy file input)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTemplateId) return;

    // Get project ID for storage
    const projectId = project?.id;
    
    // Reset input early
    e.target.value = '';
    setTool('select');

    // If we have a project ID (real UUID), upload to Supabase
    if (projectId && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });
      
      try {
        const result = await uploadMedia(file, projectId, setUploadProgress);
        
        // Get image dimensions
        const img = new window.Image();
        img.onload = () => {
          const nativeWidth = img.width;
          const nativeHeight = img.height;
          const nativeAspectRatio = nativeWidth / nativeHeight;
          const maxWidth = 600;
          const width = Math.min(nativeWidth, maxWidth);
          const height = width / nativeAspectRatio;
          
          const id = addElement('image', { x: 100, y: 100 });
          useDesignerStore.getState().updateElement(id, {
            width,
            height,
            content: { 
              type: 'image', 
              src: result.url, 
              fit: 'cover',
              nativeWidth,
              nativeHeight,
              nativeAspectRatio,
              aspectRatioLocked: true,
            },
          });
        };
        img.onerror = () => {
          // Fallback if we can't get dimensions
          const id = addElement('image', { x: 100, y: 100 });
          useDesignerStore.getState().updateElement(id, {
            width: 400,
            height: 300,
            content: { type: 'image', src: result.url, fit: 'cover' },
          });
        };
        img.src = result.url;
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Fallback to data URL if upload fails
        fallbackToDataUrl(file);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    } else {
      // For demo/local projects, use data URL
      fallbackToDataUrl(file);
    }
  };

  // Fallback to data URL for local/demo projects
  const fallbackToDataUrl = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        const nativeWidth = img.width;
        const nativeHeight = img.height;
        const nativeAspectRatio = nativeWidth / nativeHeight;
        const maxWidth = 600;
        const width = Math.min(nativeWidth, maxWidth);
        const height = width / nativeAspectRatio;
        
        const id = addElement('image', { x: 100, y: 100 });
        useDesignerStore.getState().updateElement(id, {
          width,
          height,
          content: { 
            type: 'image', 
            src: dataUrl, 
            fit: 'cover',
            nativeWidth,
            nativeHeight,
            nativeAspectRatio,
            aspectRatioLocked: true,
          },
        });
      };
      img.onerror = () => {
        const id = addElement('image', { x: 100, y: 100 });
        useDesignerStore.getState().updateElement(id, {
          width: 400,
          height: 300,
          content: { type: 'image', src: dataUrl, fit: 'cover' },
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };


  // Calculate draw preview rect
  const getDrawRect = () => {
    if (!drawState) return null;
    const width = Math.abs(drawState.currentX - drawState.startX);
    const height = Math.abs(drawState.currentY - drawState.startY);
    const x = Math.min(drawState.startX, drawState.currentX);
    const y = Math.min(drawState.startY, drawState.currentY);
    return { x, y, width, height };
  };

  const drawRect = getDrawRect();

  const tools = [
    { id: 'select', icon: MousePointer, title: 'Select (V)', shortcut: 'V' },
    { id: 'rotate', icon: RotateCw, title: 'Rotate (Q)', shortcut: 'Q' },
    { id: 'text', icon: Type, title: 'Text (T)', shortcut: 'T' },
    { id: 'line', icon: Minus, title: 'Line (L)', shortcut: 'L' },
    { id: 'rectangle', icon: Square, title: 'Rectangle (R)', shortcut: 'R' },
    { id: 'ellipse', icon: Circle, title: 'Ellipse (E)', shortcut: 'E' },
    { id: 'image', icon: Image, title: 'Image (I)', shortcut: 'I' },
    { id: 'svg', icon: FileCode, title: 'SVG (S)', shortcut: 'S' },
    { id: 'icon', icon: Sparkles, title: 'Icon (O)', shortcut: 'O' },
    { id: 'table', icon: Table2, title: 'Table (U)', shortcut: 'U' },
    { id: 'chart', icon: BarChart3, title: 'Chart (C)', shortcut: 'C' },
    { id: 'map', icon: MapPin, title: 'Map (M)', shortcut: 'M' },
    { id: 'video', icon: Video, title: 'Video (B)', shortcut: 'B' },
    { id: 'ticker', icon: ScrollText, title: 'Ticker (K)', shortcut: 'K' },
    { id: 'topic-badge', icon: Tag, title: 'Topic Badge (G)', shortcut: 'G' },
    { id: 'countdown', icon: Timer, title: 'Countdown (Y)', shortcut: 'Y' },
  ] as const;

  // Get cursor based on tool
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    switch (tool) {
      case 'hand':
        return 'grab';
      case 'rotate':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'rectangle':
      case 'ellipse':
        return 'crosshair';
      case 'image':
      case 'chart':
        return 'copy';
      default:
        return 'default';
    }
  };

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col bg-muted/30 overflow-hidden">
      {/* Hidden file input for image/video/audio */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={handleMediaSelect}
        mediaType="all"
        title="Add Media"
      />

      {/* SVG Picker Dialog */}
      <SVGPickerDialog
        open={showSvgPicker}
        onOpenChange={(open) => {
          setShowSvgPicker(open);
          if (!open) {
            setSvgPickerElementId(null);
          }
        }}
        onSelect={(svgContent, src, pattern) => {
          if (svgPickerElementId) {
            const element = useDesignerStore.getState().elements.find(e => e.id === svgPickerElementId);
            if (element && element.content.type === 'svg') {
              // Extract dimensions from SVG if possible
              const parser = new DOMParser();
              const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
              const svgElement = svgDoc.querySelector('svg');
              
              let width = element.width || 200;
              let height = element.height || 200;
              
              if (svgElement) {
                const viewBox = svgElement.getAttribute('viewBox');
                const widthAttr = svgElement.getAttribute('width');
                const heightAttr = svgElement.getAttribute('height');
                
                if (viewBox) {
                  const [, , vbWidth, vbHeight] = viewBox.split(/\s+|,/).map(parseFloat);
                  if (vbWidth && vbHeight) {
                    width = vbWidth;
                    height = vbHeight;
                  }
                } else if (widthAttr && heightAttr) {
                  width = parseFloat(widthAttr) || 200;
                  height = parseFloat(heightAttr) || 200;
                }
              }

              // Scale to reasonable size
              const maxSize = 600;
              if (width > maxSize || height > maxSize) {
                const ratio = width / height;
                if (width > height) {
                  width = maxSize;
                  height = maxSize / ratio;
                } else {
                  height = maxSize;
                  width = maxSize * ratio;
                }
              }

              useDesignerStore.getState().updateElement(svgPickerElementId, {
                width: Math.round(width),
                height: Math.round(height),
                content: {
                  type: 'svg',
                  svgContent: svgContent,
                  src: src,
                  preserveAspectRatio: 'xMidYMid meet',
                  pattern: pattern,
                },
              });
            }
          }
          setShowSvgPicker(false);
          setSvgPickerElementId(null);
        }}
        currentSrc={svgPickerElementId ? useDesignerStore.getState().elements.find(e => e.id === svgPickerElementId)?.content.type === 'svg' ? (useDesignerStore.getState().elements.find(e => e.id === svgPickerElementId)?.content as any).src : undefined : undefined}
        currentSvgContent={svgPickerElementId ? useDesignerStore.getState().elements.find(e => e.id === svgPickerElementId)?.content.type === 'svg' ? (useDesignerStore.getState().elements.find(e => e.id === svgPickerElementId)?.content as any).svgContent : undefined : undefined}
      />

      {/* Icon Picker Dialog */}
      <IconPickerDialog
        open={showIconPicker}
        onOpenChange={setShowIconPicker}
        onSelect={handleIconSelect}
      />

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <div className="text-sm text-foreground">Uploading media...</div>
            {uploadProgress && (
              <div className="w-48">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center mt-1">
                  {uploadProgress.percentage}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {tools.map((t) => (
            <Button
              key={t.id}
              variant={tool === t.id ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'h-8 w-8',
                tool === t.id && 'bg-violet-500/20 text-violet-400'
              )}
              onClick={() => setTool(t.id)}
              title={t.title}
            >
              <t.icon className="w-4 h-4" />
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant={tool === 'hand' ? 'secondary' : 'ghost'}
            size="icon"
            className={cn(
              'h-8 w-8',
              tool === 'hand' && 'bg-violet-500/20 text-violet-400'
            )}
            onClick={() => setTool('hand')}
            title="Hand (H)"
          >
            <Hand className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-0.5">
          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={toggleGrid}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={showSafeArea ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={toggleSafeArea}
            title="Toggle Safe Area"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1" title="Scroll to zoom • Shift+Scroll to pan">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.max(0.1, zoom * 0.8))}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span 
            className="text-xs text-muted-foreground w-12 text-center tabular-nums cursor-default"
            title="Scroll wheel to zoom"
          >
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.min(5, zoom * 1.25))}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              // Get actual container dimensions for accurate fit
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                fitToScreen(rect.width, rect.height);
              } else {
                fitToScreen();
              }
            }}
            title="Fit canvas to screen"
          >
            Fit
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-neutral-950/50"
        style={{
          cursor: getCursor(),
          backgroundImage: `
            radial-gradient(circle at center, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false);
          setDrawState(null);
        }}
        onAuxClick={(e) => e.preventDefault()} // Prevent middle-click paste/scroll
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu during pan
      >
        {/* No template selected */}
        {!currentTemplateId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-400/10 flex items-center justify-center mx-auto mb-4">
                <Ruler className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">Select a template from the outline panel to edit</p>
            </div>
          </div>
        )}

        {/* Zoom/Pan Container */}
        {currentTemplateId && (
          <div
            className="absolute"
            data-canvas-content
            data-scale={zoom}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <Stage />

            {/* Draw preview */}
            {drawState && drawRect && (
              <div
                className="absolute border-2 border-dashed pointer-events-none"
                style={{
                  left: drawRect.x,
                  top: drawRect.y,
                  width: drawRect.width,
                  height: drawRect.height,
                  borderColor: tool === 'ellipse' ? '#8B5CF6' : '#3B82F6',
                  backgroundColor:
                    tool === 'ellipse'
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(59, 130, 246, 0.1)',
                  borderRadius: tool === 'ellipse' ? '50%' : '4px',
                }}
              />
            )}
          </div>
        )}

        {/* Tool hint */}
        {currentTemplateId && tool !== 'select' && tool !== 'hand' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full">
            {tool === 'rotate' && 'Click and drag on elements to rotate (Shift to snap)'}
            {tool === 'text' && 'Click to add text'}
            {tool === 'line' && 'Click to add line'}
            {tool === 'rectangle' && 'Click and drag to draw rectangle'}
            {tool === 'ellipse' && 'Click and drag to draw ellipse'}
            {tool === 'image' && 'Click to add image'}
            {tool === 'chart' && 'Click to add chart'}
            {tool === 'map' && 'Click to add map'}
            {tool === 'video' && 'Click to add video'}
            {tool === 'ticker' && 'Click to add ticker'}
            {tool === 'topic-badge' && 'Click to add topic badge'}
            {tool === 'countdown' && 'Click to add countdown'}
            {tool === 'icon' && 'Click to select and add icon'}
            {tool === 'svg' && 'Click to add SVG'}
            {tool === 'table' && 'Click to add table'}
          </div>
        )}
      </div>
    </div>
  );
}
