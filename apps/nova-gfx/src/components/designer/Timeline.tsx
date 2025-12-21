import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast,
  Plus, ZoomIn, ZoomOut, Repeat, Maximize2, Trash2, Diamond,
  GripHorizontal, Move, MonitorPlay, X, Layers, Clock, ChevronDown, Copy, Spline, Check, Link,
} from 'lucide-react';
import { CurveGraphEditor } from './CurveGraphEditor';
import {
  Timeline as AnimationTimeline,
  TimelineModel,
  TimelineRow,
  TimelineKeyframe,
  TimelineOptions,
  TimelineKeyframeChangedEvent,
  TimelineTimeChangedEvent,
  TimelineDragEvent,
  TimelineSelectedEvent,
} from 'animation-timeline-js';
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
  cn,
} from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { FRAME_RATE, FRAME_DURATION, createDefaultAnimation, formatTime, type AnimationType } from '@/lib/animation';
import { buildKeyframeAddress, buildAnimationAddress } from '@/lib/address';
import type { AnimationPhase, Keyframe as StoreKeyframe } from '@emergent-platform/types';

// Row and header heights - must match for alignment between element list and timeline
const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 31; // 30px content + 1px border

// Parse time input string to milliseconds
// Supports formats: "5" (seconds), "5s" (seconds), "5000ms" (ms), "1:30" (mm:ss), "1:30:15" (mm:ss:ff)
function parseTimeInput(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  // Handle milliseconds: "5000ms"
  if (trimmed.endsWith('ms')) {
    const ms = parseFloat(trimmed.slice(0, -2));
    return isNaN(ms) ? null : ms;
  }
  
  // Handle seconds: "5s" or just "5"
  if (trimmed.endsWith('s') || /^\d+\.?\d*$/.test(trimmed)) {
    const seconds = parseFloat(trimmed.replace('s', ''));
    return isNaN(seconds) ? null : seconds * 1000;
  }
  
  // Handle mm:ss or mm:ss:ff format
  const colonParts = trimmed.split(':');
  if (colonParts.length === 2) {
    // mm:ss
    const [min, sec] = colonParts.map(Number);
    if (isNaN(min) || isNaN(sec)) return null;
    return (min * 60 + sec) * 1000;
  }
  if (colonParts.length === 3) {
    // mm:ss:ff
    const [min, sec, frames] = colonParts.map(Number);
    if (isNaN(min) || isNaN(sec) || isNaN(frames)) return null;
    return (min * 60 + sec) * 1000 + (frames * FRAME_DURATION);
  }
  
  return null;
}

// Phase colors
const PHASE_COLORS: Record<AnimationPhase, string> = {
  in: '#10B981', // emerald-500
  loop: '#8B5CF6', // violet-500
  out: '#F59E0B', // amber-500
};

export function Timeline() {
  const {
    currentPhase,
    setPhase,
    playheadPosition,
    setPlayhead,
    phaseDurations,
    setPhaseDuration,
    isPlaying,
    isPlayingFullPreview,
    play,
    pause,
    stop,
    playFullPreview,
    elements,
    animations,
    keyframes,
    currentTemplateId,
    selectedElementIds,
    selectedKeyframeIds,
    setAnimations,
    setKeyframes,
    selectElements,
    selectKeyframes,
    deleteSelectedKeyframes,
    deleteKeyframe,
    removeKeyframeProperty,
    updateKeyframe,
    updateAnimation,
    templates,
    layers,
    selectTemplate,
    playIn,
    showEasingEditor,
    setShowEasingEditor,
  } = useDesignerStore();
  
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Refs
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<AnimationTimeline | null>(null);
  const outlineScrollRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [isLooping, setIsLooping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [editMode, setEditMode] = useState<'keyframes' | 'timeline'>('keyframes');
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTime, setContextMenuTime] = useState<number>(0);
  const [contextMenuElementId, setContextMenuElementId] = useState<string | null>(null);
  const [contextMenuSelectedKeyframes, setContextMenuSelectedKeyframes] = useState<string[]>([]);
  const [contextMenuShowEasing, setContextMenuShowEasing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Curves panel resizing state
  const [curvesPanelHeight, setCurvesPanelHeight] = useState(180);
  const isDraggingDividerRef = useRef(false);
  const dividerDragStartY = useRef(0);
  const dividerDragStartHeight = useRef(0);

  // Easing options for context menu
  const easingOptions = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease', label: 'Ease' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In Out' },
    { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Smooth' },
    { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Bounce' },
  ];

  // Playback loop ref
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Flag to skip model update after drag (prevents keyframe snap-back)
  const skipNextModelUpdateRef = useRef(false);

  // Track if a keyframe drag is in progress (to prevent model updates during drag)
  const isDraggingKeyframeRef = useRef(false);

  // Keyboard event handler for deleting keyframes
  // Use refs to avoid stale closures and ensure the handler always has latest state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get fresh state from store to avoid stale closure issues
      const store = useDesignerStore.getState();
      const currentSelectedKeyframeIds = store.selectedKeyframeIds;

      // Delete selected keyframes with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedKeyframeIds.length > 0) {
        // Only handle if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        console.log('[Timeline] Deleting keyframes:', currentSelectedKeyframeIds);
        store.deleteSelectedKeyframes();
      }

      // Escape to deselect keyframes (but not when in an input field)
      if (e.key === 'Escape' && currentSelectedKeyframeIds.length > 0) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        store.selectKeyframes([]);
      }

      // Space to play/pause (when timeline is focused)
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        if (store.isPlaying) {
          store.pause();
        } else {
          store.play();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty deps - handler gets fresh state from store

  // Curves panel divider drag handlers
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDividerRef.current = true;
    dividerDragStartY.current = e.clientY;
    dividerDragStartHeight.current = curvesPanelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [curvesPanelHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDividerRef.current) return;

      // Dragging up increases height, dragging down decreases
      const deltaY = dividerDragStartY.current - e.clientY;
      const newHeight = Math.max(80, Math.min(400, dividerDragStartHeight.current + deltaY));
      setCurvesPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDraggingDividerRef.current) {
        isDraggingDividerRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Filter elements by current template
  const templateElements = useMemo(() => 
    elements.filter((e) => e.template_id === currentTemplateId),
    [elements, currentTemplateId]
  );

  // Get animations for current phase and current template only
  const currentAnimations = useMemo(() => 
    animations.filter(
      (a) => currentPhase === a.phase && templateElements.some((e) => e.id === a.element_id)
    ), [animations, currentPhase, templateElements]
  );

  // Use phase-specific duration from store
  const phaseDuration = phaseDurations[currentPhase];
  
  // Calculate effective max duration (either user-set or content-based)
  const maxDuration = useMemo(() => {
    const maxAnim = Math.max(
      0,
      ...currentAnimations.map((a) => a.delay + a.duration)
    );
    // Use the phase duration, but ensure it's at least as long as the content
    return Math.max(phaseDuration, maxAnim + 100);
  }, [currentAnimations, phaseDuration]);

  // Get all keyframe times for navigation
  const sortedKeyframeTimes = useMemo(() => {
    const times = new Set<number>();
    times.add(0); // Always include start

    currentAnimations.forEach((anim) => {
      const animKfs = keyframes.filter((kf) => kf.animation_id === anim.id);
      animKfs.forEach((kf) => {
        // Position is stored as absolute milliseconds relative to animation start
        // Add animation delay to get absolute timeline position
        const timeMs = anim.delay + kf.position;
        times.add(Math.round(timeMs));
      });
    });

    return Array.from(times).sort((a, b) => a - b);
  }, [currentAnimations, keyframes, phaseDuration]);

  // Navigation functions
  const goToStart = useCallback(() => {
    stop();
    setPlayhead(0);
    timelineRef.current?.setTime(0);
  }, [stop, setPlayhead]);

  const goToPreviousKeyframe = useCallback(() => {
    const currentTime = playheadPosition;
    const prevTime = sortedKeyframeTimes
      .filter((t) => t < currentTime - 10) // 10ms tolerance
      .pop() ?? 0;
    setPlayhead(prevTime);
    timelineRef.current?.setTime(prevTime);
  }, [playheadPosition, sortedKeyframeTimes, setPlayhead]);

  const goToNextKeyframe = useCallback(() => {
    const currentTime = playheadPosition;
    const nextTime = sortedKeyframeTimes.find((t) => t > currentTime + 10) ?? maxDuration;
    setPlayhead(nextTime);
    timelineRef.current?.setTime(nextTime);
  }, [playheadPosition, sortedKeyframeTimes, maxDuration, setPlayhead]);

  const fitToContent = useCallback(() => {
    if (!timelineRef.current || !timelineContainerRef.current) return;

    // Use maxDuration which includes phase duration + buffer
    // Add 500ms padding to show a bit extra
    const targetDuration = maxDuration + 500;

    // Get the actual timeline content width (subtract the row labels area ~210px)
    const containerWidth = timelineContainerRef.current.clientWidth - 210;

    // Calculate zoom to fit the entire duration in the visible area
    // The timeline uses zoom as a multiplier, where 1 zoom = 100px per second (0.1px per ms)
    // So: containerWidth = targetDuration * 0.1 * zoom
    // Therefore: zoom = containerWidth / (targetDuration * 0.1)
    const targetZoom = containerWidth / (targetDuration * 0.1);

    // Clamp zoom between 0.5 and 5
    setZoom(Math.max(0.5, Math.min(5, targetZoom)));

    // Also scroll to the beginning
    if (timelineRef.current) {
      timelineRef.current.setTime(0);
    }
  }, [maxDuration]);

  // Build timeline model from store data (only for current template)
  const buildTimelineModel = useCallback((): TimelineModel => {
    const rows: TimelineRow[] = templateElements.map((element) => {
      const elementAnims = currentAnimations.filter((a) => a.element_id === element.id);

      // Build keyframe groups for this row
      // Each animation becomes a group with its keyframes
      const groups: any[] = [];

      // Check for map location keyframes
      const isMapElement = element.content && (element.content as any).type === 'map';
      const locationKeyframes = isMapElement ? (element.content as any).locationKeyframes : undefined;
      const hasLocationKeyframes = locationKeyframes && locationKeyframes.length > 0;

      // Add location keyframes for map elements (filtered by current phase)
      if (hasLocationKeyframes) {
        const phaseLocationKeyframes = locationKeyframes.filter(
          (lk: any) => (lk.phase || 'in') === currentPhase
        );

        if (phaseLocationKeyframes.length > 0) {
          const locationKfGroup = phaseLocationKeyframes.map((lk: any, idx: number) => {
            const timeMs = lk.time; // Location keyframes store time in ms directly
            const phase = lk.phase || 'in';
            const phaseColor = PHASE_COLORS[phase as keyof typeof PHASE_COLORS];

            return {
              val: timeMs,
              draggable: false, // Location keyframes are edited in properties panel
              selectable: false,
              data: {
                locationKeyframeId: lk.id,
                elementId: element.id,
                locationName: lk.locationName,
                isLocationKeyframe: true,
                phase: lk.phase || 'in',
              },
              style: {
                shape: 'circle', // Circle shape for location keyframes
                width: 12,
                height: 12,
                fillColor: phaseColor,
                strokeColor: phaseColor,
                strokeThickness: 2,
              },
            };
          });

          groups.push({
            keyframes: locationKfGroup,
            style: {
              fillColor: PHASE_COLORS[currentPhase] + '40',
              strokeColor: PHASE_COLORS[currentPhase],
              height: 4, // Thinner bar for location keyframes
            },
          });
        }
      }

      elementAnims.forEach((anim) => {
        const animKeyframes = keyframes.filter((kf) => kf.animation_id === anim.id);

        // Sort keyframes by position
        const sortedKfs = [...animKeyframes].sort((a, b) => a.position - b.position);

        // Add delay indicator bar if animation has a delay
        if (anim.delay > 0) {
          groups.push({
            keyframes: [
              {
                val: 0,
                draggable: false,
                selectable: false,
                data: { animationId: anim.id, isDelayStart: true },
                style: {
                  shape: 'none', // Invisible start marker
                  width: 0,
                  height: 0,
                },
              },
              {
                val: anim.delay,
                draggable: true,
                selectable: true,
                data: { animationId: anim.id, isDelayEnd: true, delay: anim.delay },
                style: {
                  shape: 'rect',
                  width: 8,
                  height: 16,
                  fillColor: '#64748B', // Slate color for delay handle
                  strokeColor: '#94A3B8',
                  strokeThickness: 1,
                },
              },
            ],
            style: {
              fillColor: '#47556920', // Very transparent slate for delay bar
              strokeColor: '#475569',
              strokeDashArray: '4 2', // Dashed line to distinguish from animation
              height: 4, // Thinner than animation bar
            },
          });
        }

        if (sortedKfs.length > 0) {
          // Create keyframes for this group with visual state based on selection
          // Note: Using 'any' type due to animation-timeline-js library type limitations
          const groupKeyframes = sortedKfs.map((kf) => {
            // Position is stored as absolute milliseconds relative to animation start
            // Add animation delay to get absolute timeline position
            const timeMs = anim.delay + kf.position;
            const isSelected = selectedKeyframeIds.includes(kf.id);
            const propertyCount = Object.keys(kf.properties).length;

            // Different colors based on state:
            // - Selected: RED (clearly visible)
            // - Has many properties: brighter orange
            // - Normal: standard orange
            // - Empty: gray
            let fillColor = '#FFA500'; // Default orange
            let strokeColor = '#FF8C00';
            let size = 14;
            let strokeThickness = 2;

            if (isSelected) {
              fillColor = '#EF4444'; // Red for selected
              strokeColor = '#FCA5A5'; // Light red stroke
              size = 18; // Larger when selected
              strokeThickness = 3;
            } else if (propertyCount >= 3) {
              fillColor = '#FB923C'; // Bright orange for keyframes with many properties
              strokeColor = '#EA580C';
            } else if (propertyCount === 0) {
              fillColor = '#78716C'; // Gray for empty keyframes
              strokeColor = '#57534E';
            }

            return {
              val: timeMs,
              draggable: true,
              selectable: true,
              data: {
                keyframeId: kf.id,
                animationId: anim.id,
                position: kf.position,
                delay: anim.delay,
                properties: kf.properties,
                propertyCount,
                isSelected,
              },
              style: {
                shape: 'rhomb',
                width: size,
                height: size,
                fillColor,
                strokeColor,
                strokeThickness,
              },
            };
          });
          
          // Group with bar style
          groups.push({
            keyframes: groupKeyframes,
            style: {
              // Bar fill between keyframes
              fillColor: PHASE_COLORS[currentPhase] + '60', // Semi-transparent fill
              strokeColor: PHASE_COLORS[currentPhase],
              height: 8, // Height of the bar
            },
          });
        } else {
          // No keyframes - create placeholder group with start/end
          groups.push({
            keyframes: [
              {
                val: anim.delay,
                draggable: false,
                selectable: false,
                data: { animationId: anim.id, position: 0, isPlaceholder: true },
                style: {
                  shape: 'rhomb',
                  width: 10,
                  height: 10,
                  fillColor: PHASE_COLORS[currentPhase] + '80',
                  strokeColor: PHASE_COLORS[currentPhase],
                  strokeThickness: 1,
                },
              },
              {
                val: anim.delay + anim.duration,
                draggable: false,
                selectable: false,
                data: { animationId: anim.id, position: 100, isPlaceholder: true },
                style: {
                  shape: 'rhomb',
                  width: 10,
                  height: 10,
                  fillColor: PHASE_COLORS[currentPhase] + '80',
                  strokeColor: PHASE_COLORS[currentPhase],
                  strokeThickness: 1,
                },
              },
            ],
            style: {
              fillColor: PHASE_COLORS[currentPhase] + '40', // More transparent for placeholder
              strokeColor: PHASE_COLORS[currentPhase],
              height: 6,
            },
          });
        }
      });

      // Flatten all keyframes from all groups into a single array
      const allKeyframes = groups.flatMap(g => g.keyframes);
      
      return {
        keyframes: allKeyframes,
        style: {
          height: ROW_HEIGHT,
          groupFillColor: groups.length > 0 ? groups[0].style?.fillColor : undefined,
          groupStrokeColor: groups.length > 0 ? groups[0].style?.strokeColor : undefined,
        },
        data: { elementId: element.id },
      };
    });

    return { rows };
  }, [templateElements, currentAnimations, keyframes, currentPhase, selectedKeyframeIds, phaseDurations]);

  // Track if component is mounted and visible
  const [isVisible, setIsVisible] = useState(false);

  // Check container visibility and trigger redraws on resize
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const checkVisibility = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setIsVisible(true);
      }
    };

    // Initial check
    checkVisibility();

    // Resize handler - redraw timeline when container size changes
    const handleResize = () => {
      checkVisibility();
      if (timelineRef.current) {
        // Force timeline to recalculate its dimensions
        try {
          // @ts-ignore - resize method
          if (typeof timelineRef.current.resize === 'function') {
            timelineRef.current.resize();
          }
          timelineRef.current.redraw();
        } catch (e) {
          // Ignore errors
        }
      }
    };

    // Also check on resize
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Handle context menu (right-click) on timeline canvas
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();

    const tl = timelineRef.current;
    const container = timelineContainerRef.current;
    if (!tl || !container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click position to time
    const timeAtClick = tl.pxToVal(clickX);

    // Find which element row was clicked (if any)
    const rowIndex = Math.floor((clickY - HEADER_HEIGHT) / ROW_HEIGHT);
    const clickedElement = rowIndex >= 0 && rowIndex < templateElements.length
      ? templateElements[rowIndex]
      : null;

    // Capture current selected keyframes from store (fresh state)
    const store = useDesignerStore.getState();
    let currentSelectedKeyframes = [...store.selectedKeyframeIds];

    // Check if we right-clicked on a keyframe - if so, select it (or add to selection)
    // This handles the case where the user right-clicks directly on a keyframe
    const targetElementId = clickedElement?.id || (store.selectedElementIds.length > 0 ? store.selectedElementIds[0] : null);

    if (targetElementId) {
      const elementAnimations = store.animations.filter(
        a => a.element_id === targetElementId && a.phase === store.currentPhase
      );

      let closestKeyframeId: string | null = null;
      let closestDistance = 25; // Pixel tolerance for right-click detection

      elementAnimations.forEach(anim => {
        const animKeyframes = store.keyframes.filter(kf => kf.animation_id === anim.id);

        animKeyframes.forEach(kf => {
          // Position is stored relative to animation start, add delay for absolute timeline position
          const kfTime = anim.delay + kf.position;
          const kfX = tl.valToPx(kfTime);
          const distance = Math.abs(kfX - clickX);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestKeyframeId = kf.id;
          }
        });
      });

      if (closestKeyframeId) {
        // If the keyframe we clicked on isn't already selected, select it
        if (!currentSelectedKeyframes.includes(closestKeyframeId)) {
          // Clear any lingering isolation state from full preview (without resetting playhead)
          if (store.isPlayingFullPreview) {
            store.pause();
          }

          store.selectKeyframes([closestKeyframeId]);
          currentSelectedKeyframes = [closestKeyframeId];

          // Also select the element that this keyframe belongs to
          // Skip template switching to avoid isolating view
          const kf = store.keyframes.find(k => k.id === closestKeyframeId);
          if (kf) {
            const anim = store.animations.find(a => a.id === kf.animation_id);
            if (anim) {
              store.selectElements([anim.element_id], 'replace', { skipTemplateSwitch: true });
            }
          }
        }
      }
    }

    console.log('[Timeline] Context menu - selected keyframes:', currentSelectedKeyframes);

    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuTime(Math.max(0, timeAtClick));
    setContextMenuElementId(clickedElement?.id || null);
    setContextMenuSelectedKeyframes(currentSelectedKeyframes);
  }, [templateElements]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setContextMenuElementId(null);
    setContextMenuShowEasing(false);
  }, []);

  // Add keyframe at specific time for selected element
  const handleAddKeyframeAtTime = useCallback((timeMs: number, elementId?: string | null) => {
    const store = useDesignerStore.getState();
    const targetElementId = elementId || (store.selectedElementIds.length > 0 ? store.selectedElementIds[0] : null);

    if (!targetElementId || !currentTemplateId) {
      console.log('[Timeline] No element selected to add keyframe');
      return;
    }

    // Find or create animation for this element in current phase
    let anim = store.animations.find(
      a => a.element_id === targetElementId && a.phase === currentPhase
    );

    if (!anim) {
      // Create a new animation for this element
      const { animation, keyframes: kfs } = createDefaultAnimation(
        targetElementId,
        currentTemplateId,
        currentPhase,
        'custom'
      );

      const animId = crypto.randomUUID();
      anim = { ...animation, id: animId };

      store.setAnimations([...store.animations, anim]);
    }

    // Store position as absolute milliseconds (clamped to phase duration)
    // timeMs is the absolute position on the timeline
    const position = Math.max(0, Math.min(phaseDuration, timeMs));

    // Create new keyframe
    const newKeyframe: StoreKeyframe = {
      id: crypto.randomUUID(),
      animation_id: anim.id,
      position: Math.round(position),
      properties: {},
      easing: 'linear',
    };

    store.setKeyframes([...store.keyframes, newKeyframe]);
    store.selectKeyframes([newKeyframe.id]);

    console.log('[Timeline] Added keyframe at', Math.round(position) + 'ms', 'for element', targetElementId);
    closeContextMenu();
  }, [currentTemplateId, currentPhase, phaseDuration, closeContextMenu]);

  // Initialize and reinitialize timeline when phase changes
  useEffect(() => {
    if (!timelineContainerRef.current || !isVisible) return;
    
    const container = timelineContainerRef.current;

    // Dispose existing timeline
    if (timelineRef.current) {
      try {
        timelineRef.current.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
      timelineRef.current = null;
    }

    // Calculate the exact height needed for all rows (to prevent extra scrollable space)
    const calculatedHeight = HEADER_HEIGHT + (templateElements.length * ROW_HEIGHT);

    const options: TimelineOptions = {
      id: container,
      headerHeight: HEADER_HEIGHT,
      // @ts-ignore - fillScreen option helps the timeline render all rows
      fillScreen: false,
      // @ts-ignore - scrollable allows vertical scrolling through rows
      scrollable: true,
      // @ts-ignore - stretchHeight prevents adding extra empty space at the bottom
      stretchHeight: false,
      // @ts-ignore - Set explicit height to match row count
      height: calculatedHeight,
      rowsStyle: {
        height: ROW_HEIGHT,
        marginTop: 0,
        marginBottom: 0,
        // Row separator lines - slightly thicker for visibility
        strokeColor: 'rgba(255, 255, 255, 0.15)',
        strokeThickness: 2,
        keyframesStyle: {
          shape: 'rhomb',
          width: 14,
          height: 14,
          fillColor: '#FFA500',
          strokeColor: '#FF8C00',
          strokeThickness: 2,
          draggable: true,
          selectable: true,
        },
      },
      keyframesStyle: {
        shape: 'rhomb',
        width: 14,
        height: 14,
        fillColor: '#FFA500',
        strokeColor: '#FF8C00',
        strokeThickness: 2,
        draggable: true,
        selectable: true,
      },
      timelineStyle: {
        cursor: 'pointer',
        width: 2,
        fillColor: PHASE_COLORS[currentPhase],
        strokeColor: PHASE_COLORS[currentPhase],
        capStyle: {
          width: 10,
          height: 10,
          fillColor: PHASE_COLORS[currentPhase],
        },
      },
      groupsDraggable: true,
      keyframesDraggable: true,
      keyframesSelectable: true,
      timelineDraggable: true,
      snapEnabled: true,
      snapStep: FRAME_DURATION,
      min: 0,
      max: maxDuration,
      stepVal: 100,
      stepPx: 50,
      zoom: zoom,
      zoomMin: 0.1,
      zoomMax: 10,
    };

    try {
      const timeline = new AnimationTimeline(options);
      timelineRef.current = timeline;

      // Custom time format
      // @ts-ignore
      timeline._formatUnitsText = (val: number): string => {
        const totalMs = Math.abs(val);
        const seconds = Math.floor(totalMs / 1000);
        const frames = Math.round((totalMs % 1000) / FRAME_DURATION);
        
        if (seconds >= 60) {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        if (seconds > 0) {
          return `${seconds}.${Math.floor((totalMs % 1000) / 100)}s`;
        }
        return `${frames}f`;
      };

      timeline.setTime(playheadPosition);

      // Note: Initial model is set by the separate "Update timeline model" useEffect
      // which runs after this effect completes. This prevents timeline reset on keyframe changes.

      // Time changed event
      timeline.onTimeChanged((event: TimelineTimeChangedEvent) => {
        if (event.source === 'user') {
          setPlayhead(event.val);
        }
      });

      // Drag finished - save keyframe positions or delay changes
      timeline.onDragFinished((event: TimelineDragEvent) => {
        if (event.elements && event.elements.length > 0) {
          const store = useDesignerStore.getState();
          const currentKeyframes = store.keyframes;
          const currentAnimations = store.animations;

          const updatedKeyframes = [...currentKeyframes];
          const updatedAnimations = [...currentAnimations];
          let animationsUpdated = false;

          event.elements.forEach((draggedEl) => {
            const data = draggedEl.keyframe?.data;

            // Handle delay end marker drag - updates animation delay
            if (data?.isDelayEnd && data?.animationId) {
              const newDelay = Math.max(0, Math.round(draggedEl.keyframe?.val || 0));
              const animIndex = updatedAnimations.findIndex((a) => a.id === data.animationId);
              if (animIndex !== -1) {
                updatedAnimations[animIndex] = {
                  ...updatedAnimations[animIndex],
                  delay: newDelay,
                };
                animationsUpdated = true;
              }
            }
            // Handle regular keyframe drag
            else if (data?.keyframeId && !data?.isPlaceholder) {
              const newTimeMs = draggedEl.keyframe?.val || 0;
              const animDelay = data?.delay || 0;

              // Timeline shows keyframe at delay + position, so subtract delay to get relative position
              // Store position as milliseconds relative to animation start (clamped to valid range)
              const relativePosition = newTimeMs - animDelay;
              const newPosition = Math.max(0, Math.min(phaseDuration - animDelay, relativePosition));

              const kfIndex = updatedKeyframes.findIndex((kf) => kf.id === data.keyframeId);
              if (kfIndex !== -1) {
                updatedKeyframes[kfIndex] = {
                  ...updatedKeyframes[kfIndex],
                  position: Math.round(newPosition),
                };
              }
            }
          });

          // Set flag to skip the next model update (prevents snap-back)
          skipNextModelUpdateRef.current = true;

          if (animationsUpdated) {
            store.setAnimations(updatedAnimations);
          }
          store.setKeyframes(updatedKeyframes);
        }
      });

      // Keyframe selection via library event
      timeline.onSelected((event: TimelineSelectedEvent) => {
        const store = useDesignerStore.getState();
        console.log('[Timeline] onSelected event fired:', event);

        if (event.selected && event.selected.length > 0) {
          const selectedIds: string[] = [];

          event.selected.forEach((sel) => {
            // Log full selection object to understand structure
            console.log('[Timeline] Full selection object:', sel);
            console.log('[Timeline] Selection keys:', Object.keys(sel));

            // The library may use 'data' directly on the selection item
            const data = sel.keyframe?.data || (sel as any).data;
            console.log('[Timeline] Selected keyframe data:', data);
            if (data?.keyframeId && !data?.isPlaceholder) {
              selectedIds.push(data.keyframeId);
            }
          });

          console.log('[Timeline] Selecting keyframe IDs:', selectedIds);
          if (selectedIds.length > 0) {
            // Clear any lingering isolation state from full preview (without resetting playhead)
            if (store.isPlayingFullPreview) {
              store.pause(); // Use pause instead of stop to preserve playhead position
            }

            // Set flag to skip model rebuild - this prevents drag interruption
            // The library handles selection visually; we only need store state for PropertiesPanel
            skipNextModelUpdateRef.current = true;
            store.selectKeyframes(selectedIds);

            // Also select the element that this keyframe belongs to
            // This ensures the PropertiesPanel shows the element AND the keyframe inspector
            // Use skipTemplateSwitch to avoid isolating view when clicking keyframes
            const firstKeyframeId = selectedIds[0];
            const kf = store.keyframes.find(k => k.id === firstKeyframeId);
            if (kf) {
              const anim = store.animations.find(a => a.id === kf.animation_id);
              if (anim) {
                console.log('[Timeline] Also selecting element:', anim.element_id);
                store.selectElements([anim.element_id], 'replace', { skipTemplateSwitch: true });
              }
              // Don't move playhead when selecting keyframe - keep it at current position
            }
          }
        } else {
          console.log('[Timeline] Clearing keyframe selection');
          store.selectKeyframes([]);
        }
      });
      
      // Manual keyframe selection via canvas click (backup method)
      // IMPORTANT: This should NOT change element selection - only keyframe selection
      // Element selection should only happen via the element list on the left
      const canvas = container.querySelector('canvas');
      if (canvas) {
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        const DRAG_THRESHOLD = 5; // pixels - if mouse moves more than this, it's a drag not a click

        const handleMouseDown = (e: MouseEvent) => {
          isDragging = false;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (dragStartX !== 0 || dragStartY !== 0) {
            const dx = Math.abs(e.clientX - dragStartX);
            const dy = Math.abs(e.clientY - dragStartY);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
              isDragging = true;
            }
          }
        };

        const handleCanvasClick = (e: MouseEvent) => {
          // Don't select keyframes if user was dragging/scrubbing the timeline
          if (isDragging) {
            isDragging = false;
            dragStartX = 0;
            dragStartY = 0;
            return;
          }
          dragStartX = 0;
          dragStartY = 0;

          const store = useDesignerStore.getState();
          const tl = timelineRef.current;

          if (!tl) return;

          // Get click position relative to canvas
          const rect = canvas.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;

          // Calculate which row was clicked based on Y position
          const rowIndex = Math.floor((clickY - HEADER_HEIGHT) / ROW_HEIGHT);

          const {
            animations: storeAnimations,
            keyframes: storeKeyframes,
            currentPhase: phase,
            selectedElementIds,
            phaseDurations
          } = store;

          const phaseDur = phaseDurations[phase];

          // Get elements for current template to determine which row was clicked
          const currentElements = store.elements.filter(el => el.template_id === store.currentTemplateId);
          const clickedElement = rowIndex >= 0 && rowIndex < currentElements.length
            ? currentElements[rowIndex]
            : null;

          // Determine which element's keyframes to search
          // Priority: clicked row's element > selected element > none
          let targetElementId: string | null = null;
          if (clickedElement) {
            targetElementId = clickedElement.id;
          } else if (selectedElementIds.length > 0) {
            targetElementId = selectedElementIds[0];
          }

          if (!targetElementId) {
            console.log('[Timeline] No element to search for keyframes');
            return;
          }

          // Search within the target element's animations
          const targetAnimations = storeAnimations.filter(
            a => a.phase === phase && a.element_id === targetElementId
          );

          let foundKeyframeId: string | null = null;
          let closestDistance = 30; // Pixel tolerance for click detection

          targetAnimations.forEach(anim => {
            const animKeyframes = storeKeyframes.filter(kf => kf.animation_id === anim.id);

            animKeyframes.forEach(kf => {
              // Position is stored relative to animation start, add delay for absolute timeline position
              const kfTime = anim.delay + kf.position;
              const kfX = tl.valToPx(kfTime);
              const distance = Math.abs(kfX - clickX);

              if (distance < closestDistance) {
                closestDistance = distance;
                foundKeyframeId = kf.id;
              }
            });
          });

          if (foundKeyframeId) {
            console.log('[Timeline] Canvas click selecting keyframe:', foundKeyframeId);

            // Clear any lingering isolation state from full preview (without resetting playhead)
            if (store.isPlayingFullPreview) {
              store.pause();
            }

            store.selectKeyframes([foundKeyframeId]);

            // Also select the element that this keyframe belongs to
            // Skip template switching to avoid isolating view
            const kf = storeKeyframes.find(k => k.id === foundKeyframeId);
            if (kf) {
              const anim = store.animations.find(a => a.id === kf.animation_id);
              if (anim) {
                store.selectElements([anim.element_id], 'replace', { skipTemplateSwitch: true });
              }
            }
          } else {
            console.log('[Timeline] No keyframe found near click');
          }
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('contextmenu', handleContextMenu as EventListener);

        // Store cleanup function to remove all listeners
        const originalDispose = timeline.dispose?.bind(timeline);
        timeline.dispose = () => {
          canvas.removeEventListener('mousedown', handleMouseDown);
          canvas.removeEventListener('mousemove', handleMouseMove);
          canvas.removeEventListener('click', handleCanvasClick);
          canvas.removeEventListener('contextmenu', handleContextMenu as EventListener);
          if (originalDispose) originalDispose();
        };
      }
    } catch (error) {
      console.error('Failed to initialize timeline:', error);
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.dispose();
        timelineRef.current = null;
      }
    };
  // Only recreate timeline when phase changes, visibility changes, or row count changes significantly
  // DO NOT include buildTimelineModel - it changes on every keyframe update and would reset the timeline
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, maxDuration, isVisible, handleContextMenu, templateElements.length]);

  // Update timeline model when data changes
  useEffect(() => {
    if (timelineRef.current) {
      // Skip model update if flag is set (after keyframe drag to prevent snap-back)
      if (skipNextModelUpdateRef.current) {
        skipNextModelUpdateRef.current = false;
        // Just redraw without rebuilding the model
        timelineRef.current.redraw();
        return;
      }

      const model = buildTimelineModel();
      timelineRef.current.setModel(model);

      // Update height option to match current row count (prevents extra scrollable space)
      const calculatedHeight = HEADER_HEIGHT + (templateElements.length * ROW_HEIGHT);
      timelineRef.current.setOptions({
        // @ts-ignore
        height: calculatedHeight,
      });

      // Force a resize to recalculate row heights when element count changes
      // This fixes the issue where rows get cut off when there are many elements
      try {
        // @ts-ignore - resize method may exist
        if (typeof timelineRef.current.resize === 'function') {
          timelineRef.current.resize();
        }
        // @ts-ignore - rescale method may exist
        if (typeof timelineRef.current.rescale === 'function') {
          timelineRef.current.rescale();
        }
      } catch (e) {
        // Ignore resize errors
      }

      timelineRef.current.redraw();

      // Additional redraw after a short delay to ensure proper rendering
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.redraw();
        }
      }, 50);
    }
  }, [buildTimelineModel, templateElements, animations, keyframes, currentPhase, currentTemplateId]);

  // Update playhead position
  useEffect(() => {
    if (timelineRef.current && !isPlaying) {
      timelineRef.current.setTime(playheadPosition);
    }
  }, [playheadPosition, isPlaying]);

  // Update zoom and max
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.setOptions({
        zoom: zoom,
        max: maxDuration,
      });
    }
  }, [zoom, maxDuration]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const store = useDesignerStore.getState();
      const currentPos = store.playheadPosition;
      const currentPhaseDuration = store.phaseDurations[store.currentPhase];
      const newPosition = currentPos + delta;

      if (newPosition >= currentPhaseDuration) {
        // Full preview mode plays only the current phase (no phase transitions)
        // It just isolates to the current template
        if (isLooping) {
          store.setPlayhead(0);
          timelineRef.current?.setTime(0);
        } else {
          // Set playhead to exact end position BEFORE stopping
          // This ensures the position is set before any re-renders
          store.setPlayhead(currentPhaseDuration);
          timelineRef.current?.setTime(currentPhaseDuration);
          // If in full preview mode, keep template isolated after playback ends
          if (isPlayingFullPreview) {
            store.endPreviewPlayback();
          } else {
            store.pause();
          }
          return;
        }
      } else {
        store.setPlayhead(newPosition);
        timelineRef.current?.setTime(newPosition);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, maxDuration, isLooping, isPlayingFullPreview]);

  // Sync outline scroll with timeline canvas scroll
  useEffect(() => {
    if (!outlineScrollRef.current || !timelineContainerRef.current) return;

    const outlineEl = outlineScrollRef.current;
    const timelineContainer = timelineContainerRef.current;

    let isSyncing = false;

    // The animation-timeline-js library uses a scroll event internally
    // We need to listen for scroll on the timeline and sync the outline

    // Handle wheel events on both containers to sync scroll
    const handleWheel = (e: WheelEvent) => {
      if (isSyncing) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // Only handle vertical scroll

      isSyncing = true;

      const tl = timelineRef.current;
      if (tl) {
        // Calculate new scroll position
        const currentScroll = outlineEl.scrollTop;
        const maxScroll = outlineEl.scrollHeight - outlineEl.clientHeight;
        const newScrollTop = Math.max(0, Math.min(maxScroll, currentScroll + e.deltaY));

        // Sync outline scroll
        outlineEl.scrollTop = newScrollTop;

        // Sync timeline scroll using its API
        // @ts-ignore - accessing internal scrollTop property
        const scrollContainer = tl._scrollContainer || tl.scrollContainer;
        if (scrollContainer) {
          scrollContainer.scrollTop = newScrollTop;
        }

        // Try the setScrollTop method if available
        // @ts-ignore
        if (typeof tl.setScrollTop === 'function') {
          // @ts-ignore
          tl.setScrollTop(newScrollTop);
        }

        tl.redraw();
      }

      requestAnimationFrame(() => { isSyncing = false; });
    };

    // Sync timeline scroll when outline scrolls
    const handleOutlineScroll = () => {
      if (isSyncing) return;
      isSyncing = true;

      const tl = timelineRef.current;
      if (tl) {
        // @ts-ignore
        const scrollContainer = tl._scrollContainer || tl.scrollContainer;
        if (scrollContainer) {
          scrollContainer.scrollTop = outlineEl.scrollTop;
        }
        // @ts-ignore
        if (typeof tl.setScrollTop === 'function') {
          // @ts-ignore
          tl.setScrollTop(outlineEl.scrollTop);
        }
        tl.redraw();
      }

      requestAnimationFrame(() => { isSyncing = false; });
    };

    // Listen for scroll events on the timeline's scroll container
    const setupTimelineScrollSync = () => {
      const tl = timelineRef.current;
      if (!tl) return;

      // @ts-ignore - accessing internal property
      const scrollContainer = tl._scrollContainer || tl.scrollContainer;
      if (scrollContainer) {
        const handleTimelineScroll = () => {
          if (isSyncing) return;
          isSyncing = true;
          outlineEl.scrollTop = scrollContainer.scrollTop;
          requestAnimationFrame(() => { isSyncing = false; });
        };
        scrollContainer.addEventListener('scroll', handleTimelineScroll);
        return () => scrollContainer.removeEventListener('scroll', handleTimelineScroll);
      }

      // Try using the library's onScroll callback
      // @ts-ignore
      if (typeof tl.onScroll === 'function') {
        // @ts-ignore
        tl.onScroll((e: any) => {
          if (isSyncing) return;
          isSyncing = true;
          outlineEl.scrollTop = e.scrollTop || 0;
          requestAnimationFrame(() => { isSyncing = false; });
        });
      }

      return undefined;
    };

    outlineEl.addEventListener('scroll', handleOutlineScroll);
    timelineContainer.addEventListener('wheel', handleWheel, { passive: true });
    outlineEl.addEventListener('wheel', handleWheel, { passive: true });

    // Setup timeline scroll sync after a short delay to ensure timeline is initialized
    let timelineScrollCleanup: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      timelineScrollCleanup = setupTimelineScrollSync();
    }, 100);

    return () => {
      outlineEl.removeEventListener('scroll', handleOutlineScroll);
      timelineContainer.removeEventListener('wheel', handleWheel);
      outlineEl.removeEventListener('wheel', handleWheel);
      clearTimeout(timeoutId);
      timelineScrollCleanup?.();
    };
  }, [isVisible]);

  // Add animation to element
  const handleAddAnimation = useCallback((elementId: string, type: string) => {
    if (!currentTemplateId) return;

    const { animation, keyframes: kfs } = createDefaultAnimation(
      elementId,
      currentTemplateId,
      currentPhase,
      type as AnimationType
    );

    const animId = crypto.randomUUID();
    const newAnim = { ...animation, id: animId };
    // Convert keyframe positions from percentage (0-100) to absolute milliseconds
    const animDuration = animation.duration;
    const newKeyframes: StoreKeyframe[] = kfs.map((kf) => ({
      ...kf,
      id: crypto.randomUUID(),
      animation_id: animId,
      position: Math.round((kf.position / 100) * animDuration),  // Convert to ms
      properties: kf.properties || {},
    }));

    // Get current state and update
    const store = useDesignerStore.getState();
    store.setAnimations([...store.animations, newAnim]);
    store.setKeyframes([...store.keyframes, ...newKeyframes]);
  }, [currentTemplateId, currentPhase]);

  // Remove animation from element for current phase
  const handleRemoveAnimation = useCallback((elementId: string) => {
    const store = useDesignerStore.getState();

    // Find animations for this element in the current phase
    const animsToRemove = store.animations.filter(
      (a) => a.element_id === elementId && a.phase === currentPhase
    );

    if (animsToRemove.length === 0) return;

    const animIdsToRemove = new Set(animsToRemove.map(a => a.id));

    // Remove animations and their keyframes
    store.setAnimations(store.animations.filter(a => !animIdsToRemove.has(a.id)));
    store.setKeyframes(store.keyframes.filter(kf => !animIdsToRemove.has(kf.animation_id)));
  }, [currentPhase]);

  // Format time display
  const formatTime = (ms: number): string => {
    const seconds = ms / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toFixed(1).padStart(4, '0')}` : `${secs.toFixed(1)}s`;
  };

  const phases: { id: AnimationPhase; label: string; color: string }[] = [
    { id: 'in', label: 'IN', color: 'bg-emerald-500' },
    { id: 'loop', label: 'LOOP', color: 'bg-violet-500' },
    { id: 'out', label: 'OUT', color: 'bg-amber-500' },
  ];

  // Animation types for IN/OUT phases
  const inOutAnimationTypes = [
    { id: 'fade', label: 'Fade' },
    { id: 'slide-left', label: 'Slide Left' },
    { id: 'slide-right', label: 'Slide Right' },
    { id: 'slide-up', label: 'Slide Up' },
    { id: 'slide-down', label: 'Slide Down' },
    { id: 'scale', label: 'Scale' },
  ];

  // Animation types for LOOP phase - designed as perfect loops
  const loopAnimationTypes = [
    { id: 'pulse', label: 'Pulse' },
    { id: 'side-to-side', label: 'Side to Side' },
    { id: 'up-and-down', label: 'Up and Down' },
    { id: 'gentle-twist', label: 'Gentle Twist' },
  ];

  // Get animation types based on current phase
  const animationTypes = currentPhase === 'loop' ? loopAnimationTypes : inOutAnimationTypes;

  // Group templates by layer
  const templatesByLayer = useMemo(() => {
    const grouped = new Map<string, { layer: typeof layers[0]; templates: typeof templates }>();
    layers.forEach((layer) => {
      const layerTemplates = templates.filter(t => t.layer_id === layer.id && t.enabled);
      if (layerTemplates.length > 0) {
        grouped.set(layer.id, { layer, templates: layerTemplates });
      }
    });
    return grouped;
  }, [layers, templates]);

  const currentTemplate = templates.find(t => t.id === currentTemplateId);
  const currentLayer = currentTemplate ? layers.find(l => l.id === currentTemplate.layer_id) : null;

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col bg-card border-t border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        {/* Left side: Template/Layer Selector + Phase Tabs */}
        <div className="flex items-center gap-2">
          {/* Template/Layer Selector */}
          <div className="relative">
            <DropdownMenu open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 min-w-[120px] justify-between"
                >
                  <span className="truncate">
                    {currentTemplate ? currentTemplate.name : currentLayer ? currentLayer.name : 'Select Template'}
                  </span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-y-auto">
                <div className="p-2">
                  {/* Layers and their templates */}
                  {Array.from(templatesByLayer.entries()).map(([layerId, { layer, templates: layerTemplates }]) => (
                    <div key={layerId} className="mb-1">
                      <DropdownMenuItem
                        onClick={() => {
                          // Select first template in this layer
                          if (layerTemplates.length > 0) {
                            selectTemplate(layerTemplates[0].id);
                          }
                          setShowTemplateSelector(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer mb-1",
                          currentLayer?.id === layer.id && layerTemplates.some(t => t.id === currentTemplateId) && "bg-violet-500/20 text-violet-400"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="flex-1">{layer.name}</span>
                        <span className="text-xs text-muted-foreground">{layerTemplates.length}</span>
                      </DropdownMenuItem>
                      
                      {/* Templates in this layer */}
                      <div className={cn("ml-4 space-y-0.5", layerTemplates.length === 1 && "hidden")}>
                        {layerTemplates.map((template) => (
                          <DropdownMenuItem
                            key={template.id}
                            onClick={() => {
                              selectTemplate(template.id);
                              setShowTemplateSelector(false);
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer",
                              currentTemplateId === template.id && "bg-violet-500/20 text-violet-400"
                            )}
                          >
                            <span className="w-3 h-3 flex items-center justify-center">
                              {currentTemplateId === template.id && "✓"}
                            </span>
                            <span className="flex-1">{template.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Phase Tabs with Durations */}
          <Tabs value={currentPhase} onValueChange={(v) => setPhase(v as AnimationPhase)}>
          <TabsList className="h-8">
            {phases.map((phase) => (
              <TooltipProvider key={phase.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={phase.id}
                      className={cn(
                        'text-xs h-7 gap-1.5',
                        currentPhase === phase.id && `${phase.color} text-white`
                      )}
                    >
                      <span>{phase.label}</span>
                      <span className={cn(
                        "text-[10px]",
                        currentPhase === phase.id ? "opacity-80" : "opacity-60"
                      )}>
                        {(phaseDurations[phase.id] / 1000).toFixed(1)}s
                      </span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    {phase.label} Phase ({(phaseDurations[phase.id] / 1000).toFixed(1)}s)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </TabsList>
        </Tabs>
        </div>

        {/* Playback Controls - Proper Order */}
        <TooltipProvider>
          <div className="flex items-center gap-0.5">
            {/* 1. Back to Start */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToStart}
                >
                  <ChevronFirst className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Start</TooltipContent>
            </Tooltip>

            {/* 2. Previous Keyframe */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToPreviousKeyframe}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Keyframe</TooltipContent>
            </Tooltip>

            {/* 3. Play/Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={isPlaying ? pause : play}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
            </Tooltip>

            {/* 3b. Play Full Template Preview (IN → LOOP → OUT) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    currentTemplate && 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10',
                    isPlaying && isPlayingFullPreview && 'bg-violet-500/20'
                  )}
                  disabled={!currentTemplate}
                  onClick={() => {
                    if (isPlaying && isPlayingFullPreview) {
                      // Currently playing - pause it
                      pause();
                    } else {
                      // Not playing (either never started or animation ended) - start/restart
                      playFullPreview();
                    }
                  }}
                >
                  <MonitorPlay className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPlaying && isPlayingFullPreview ? 'Stop Preview' : 'Play Template Preview'}
              </TooltipContent>
            </Tooltip>

            {/* 4. Next Keyframe */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToNextKeyframe}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Keyframe</TooltipContent>
            </Tooltip>

            {/* 5. Loop Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isLooping ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn('h-8 w-8', isLooping && 'bg-violet-500/20 text-violet-400')}
                  onClick={() => setIsLooping(!isLooping)}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLooping ? 'Loop On' : 'Loop Off'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editMode === 'keyframes' ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-7 w-7',
                    editMode === 'keyframes' && 'bg-violet-500/20 text-violet-400'
                  )}
                  onClick={() => setEditMode('keyframes')}
                >
                  <Diamond className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Keyframes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editMode === 'timeline' ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-7 w-7',
                    editMode === 'timeline' && 'bg-amber-500/20 text-amber-400'
                  )}
                  onClick={() => setEditMode('timeline')}
                >
                  <GripHorizontal className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Timeline Duration</TooltipContent>
            </Tooltip>
          </div>

          {/* Delete Selected Keyframes */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  selectedKeyframeIds.length > 0 
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                    : 'text-muted-foreground/50'
                )}
                disabled={selectedKeyframeIds.length === 0}
                onClick={deleteSelectedKeyframes}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedKeyframeIds.length > 0 
                ? `Delete ${selectedKeyframeIds.length} keyframe${selectedKeyframeIds.length > 1 ? 's' : ''} (Del)` 
                : 'Delete Keyframes (Del)'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Time Display & Duration Edit */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-muted-foreground tabular-nums">
                  <span className="min-w-[50px] text-right">{formatTime(playheadPosition)}</span>
                  <span className="mx-1">/</span>
                  {isEditingDuration && (
                    <input
                      key="duration-input"
                      type="text"
                      autoFocus
                      className="h-5 w-16 text-xs px-1 py-0 text-center bg-background border border-input rounded"
                      defaultValue={(phaseDuration / 1000).toFixed(1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          const parsed = parseTimeInput(e.currentTarget.value);
                          if (parsed !== null) {
                            setPhaseDuration(currentPhase, parsed);
                          }
                          setIsEditingDuration(false);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditingDuration(false);
                        }
                      }}
                      onBlur={(e) => {
                        const parsed = parseTimeInput(e.currentTarget.value);
                        if (parsed !== null) {
                          setPhaseDuration(currentPhase, parsed);
                        }
                        setIsEditingDuration(false);
                      }}
                      placeholder="e.g. 5s"
                    />
                  )}
                  {!isEditingDuration && (
                    <button
                      key="duration-button"
                      className="min-w-[50px] text-left hover:text-foreground hover:bg-muted px-1 py-0.5 rounded cursor-pointer transition-colors"
                      onClick={() => {
                        setIsEditingDuration(true);
                      }}
                      title="Click to edit duration"
                    >
                      {formatTime(phaseDuration)}
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click duration to edit</p>
                <p className="text-xs opacity-70">Formats: 5s, 5000ms, 1:30</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.max(0.25, zoom / 1.5))}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.min(8, zoom * 1.5))}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              {/* 6. Fit to Content */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={fitToContent}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to Content</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Timeline Content - Single vertical scrollable container for both panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Element List with header */}
        <div className="w-52 border-r border-border flex flex-col flex-shrink-0">
          {/* Element List Header - fixed at top, must match timeline headerHeight exactly */}
          <div
            className="px-3 border-b border-border text-xs font-medium text-muted-foreground flex items-center justify-between bg-muted/30 flex-shrink-0"
            style={{ height: HEADER_HEIGHT, boxSizing: 'border-box' }}
          >
            <div className="flex items-center gap-2">
              <span>ELEMENTS</span>
              {editMode === 'keyframes' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 flex items-center gap-1">
                  <Diamond className="w-2.5 h-2.5" />
                  Keyframes
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                  <GripHorizontal className="w-2.5 h-2.5" />
                  Timeline
                </span>
              )}
            </div>
            <span className="text-[10px] opacity-60">{FRAME_RATE}fps</span>
          </div>

          {/* Element List - scrollable, synced with timeline */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            ref={outlineScrollRef}
          >
            <div>
              {templateElements.length === 0 ? (
                <div
                  className="px-3 text-xs text-muted-foreground flex items-center"
                  style={{ height: ROW_HEIGHT }}
                >
                  {currentTemplateId ? 'No elements in this template' : 'Select a template'}
                </div>
              ) : (
                templateElements.map((element) => {
                  const elementAnims = currentAnimations.filter(
                    (a) => a.element_id === element.id
                  );
                  const hasAnimation = elementAnims.length > 0;
                  const isSelected = selectedElementIds.includes(element.id);

                  return (
                    <div
                      key={element.id}
                      className={cn(
                        'flex items-center gap-2 px-3 text-xs cursor-pointer hover:bg-muted/50 group border-b border-border/50',
                        isSelected && 'bg-violet-500/20'
                      )}
                      style={{
                        height: ROW_HEIGHT,
                        boxSizing: 'border-box', // Ensure border is included in height
                      }}
                      onClick={() => {
                        // Select element and deselect any keyframes
                        selectElements([element.id]);
                        selectKeyframes([]);
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: hasAnimation ? PHASE_COLORS[currentPhase] : '#444',
                        }}
                      />
                      <span className="flex-1 truncate">{element.name}</span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            title="Add animation"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {animationTypes.map((type) => (
                            <DropdownMenuItem
                              key={type.id}
                              onClick={() => handleAddAnimation(element.id, type.id)}
                            >
                              {type.label}
                            </DropdownMenuItem>
                          ))}
                          {hasAnimation && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemoveAnimation(element.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                Remove Animation
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right side: Timeline Canvas */}
        <div
          ref={timelineContainerRef}
          className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden timeline-canvas-container"
          style={{
            minHeight: 150,
            // Ensure the timeline container matches the element list height
            // This helps the animation-timeline-js library calculate row positions correctly
          }}
        />
      </div>

      {/* Curve Graph Editor Panel - positioned directly below timeline for alignment */}
      {showEasingEditor && (() => {
        // Get animations for selected elements OR from selected keyframes
        const selectedAnims = currentAnimations.filter(a =>
          selectedElementIds.includes(a.element_id)
        );

        // Also check if we have selected keyframes - get their animations
        // Filter to only include animations from the current phase
        const keyframeAnims = selectedKeyframeIds.length > 0
          ? [...new Set(
              keyframes
                .filter(kf => selectedKeyframeIds.includes(kf.id))
                .map(kf => animations.find(a => a.id === kf.animation_id))
                .filter((a): a is typeof animations[0] => a !== undefined && a.phase === currentPhase)
            )]
          : [];

        // Combine and dedupe animations
        const allAnims = [...new Map([...selectedAnims, ...keyframeAnims].map(a => [a.id, a])).values()];

        if (allAnims.length === 0) return null;

        // Get the first animation - prioritize animations from the current phase
        const currentPhaseAnims = allAnims.filter(a => a.phase === currentPhase);
        const firstAnim = currentPhaseAnims.length > 0 ? currentPhaseAnims[0] : allAnims[0];

        // If the animation is from a different phase, don't show the curve editor
        // as it would have mismatched timeline duration
        if (firstAnim.phase !== currentPhase) {
          console.log('[CurveEditor] Skipping - animation phase mismatch:', firstAnim.phase, 'vs', currentPhase);
          return null;
        }

        // Handler to update keyframe property value
        const handleKeyframeUpdate = (keyframeId: string, property: string, value: number) => {
          console.log('[handleKeyframeUpdate] Called with:', { keyframeId, property, value });

          // IMPORTANT: Get the LATEST keyframe from the store, not from the closure
          // This prevents stale data during rapid drag updates
          const currentKeyframes = useDesignerStore.getState().keyframes;
          const kf = currentKeyframes.find(k => k.id === keyframeId);
          if (!kf) {
            console.log('[handleKeyframeUpdate] Keyframe not found:', keyframeId);
            return;
          }

          console.log('[handleKeyframeUpdate] Found keyframe:', kf.id, 'properties:', kf.properties);

          // Update the specific property
          const updates: Partial<StoreKeyframe> = {};

          // Check if it's a typed property
          if (property === 'position_x') updates.position_x = value;
          else if (property === 'position_y') updates.position_y = value;
          else if (property === 'rotation') updates.rotation = value;
          else if (property === 'scale_x') updates.scale_x = value;
          else if (property === 'scale_y') updates.scale_y = value;
          else if (property === 'opacity') updates.opacity = value;
          else if (property === 'filter_blur') updates.filter_blur = value;
          else if (property === 'filter_brightness') updates.filter_brightness = value;
          // Handle transform-derived properties by updating the transform string
          else if (['translateX', 'translateY', 'scale', 'scaleX', 'scaleY', 'rotate'].includes(property)) {
            const currentTransform = (kf.properties.transform as string) || '';
            let newTransform = currentTransform;

            // Helper to update or add a transform function
            const updateTransformFn = (fnName: string, newVal: string, regex: RegExp) => {
              if (regex.test(newTransform)) {
                newTransform = newTransform.replace(regex, `${fnName}(${newVal})`);
              } else {
                newTransform = newTransform ? `${newTransform} ${fnName}(${newVal})` : `${fnName}(${newVal})`;
              }
            };

            if (property === 'translateX') {
              updateTransformFn('translateX', `${value}px`, /translateX\s*\([^)]*\)/i);
            } else if (property === 'translateY') {
              updateTransformFn('translateY', `${value}px`, /translateY\s*\([^)]*\)/i);
            } else if (property === 'scale') {
              // Use negative lookbehind/lookahead to avoid matching scaleX/scaleY
              // Match 'scale(' but not preceded by another letter and not followed by X/Y
              updateTransformFn('scale', `${value}`, /(?<![a-zA-Z])scale\s*\([^)]*\)(?![XY])/i);
            } else if (property === 'scaleX') {
              updateTransformFn('scaleX', `${value}`, /scaleX\s*\([^)]*\)/i);
            } else if (property === 'scaleY') {
              updateTransformFn('scaleY', `${value}`, /scaleY\s*\([^)]*\)/i);
            } else if (property === 'rotate') {
              // Use negative lookbehind to avoid matching rotateX/rotateY/rotateZ
              updateTransformFn('rotate', `${value}deg`, /(?<![a-zA-Z])rotate\s*\([^)]*\)(?![XYZ])/i);
            }

            updates.properties = { ...(kf.properties || {}), transform: newTransform };
          }
          else {
            // Update in properties object
            updates.properties = { ...(kf.properties || {}), [property]: value };
          }

          // Ensure we have something to update
          if (Object.keys(updates).length === 0) {
            console.log('[handleKeyframeUpdate] WARNING: No updates generated for property:', property);
            return;
          }

          console.log('[handleKeyframeUpdate] Updates to apply:', updates);
          updateKeyframe(keyframeId, updates);
          console.log('[handleKeyframeUpdate] updateKeyframe called');
        };

        // Handler to update keyframe easing
        const handleEasingUpdate = (keyframeId: string, easing: string) => {
          updateKeyframe(keyframeId, { easing });
        };

        // Handler to delete a property curve (removes that property from all keyframes)
        const handleDeletePropertyCurve = (property: string, keyframeIds: string[]) => {
          console.log('[Timeline] Deleting property curve:', property, 'from keyframes:', keyframeIds);
          keyframeIds.forEach(kfId => {
            removeKeyframeProperty(kfId, property);
          });
        };

        // Always use the current phase duration to match the main timeline width
        // This ensures the curve editor width aligns with the timeline above
        // DEBUG: Log all relevant values
        console.log('[CurveEditor] DEBUG:', {
          currentPhase,
          phaseDurations,
          'firstAnim.phase': firstAnim.phase,
          'firstAnim.id': firstAnim.id,
          'selectedElementIds': selectedElementIds,
          'selectedKeyframeIds': selectedKeyframeIds,
          'selectedAnims.length': selectedAnims.length,
          'keyframeAnims.length': keyframeAnims.length,
          'allAnims.length': allAnims.length,
        });

        // Use currentPhase duration - but if animation is from different phase, we need to handle that
        const timelineDuration = phaseDurations[currentPhase];

        return (
          <div className="flex flex-col">
            {/* Draggable Divider */}
            <div
              className="h-1.5 bg-border hover:bg-primary/50 cursor-row-resize flex items-center justify-center group transition-colors"
              onMouseDown={handleDividerMouseDown}
            >
              <div className="w-12 h-0.5 bg-muted-foreground/30 group-hover:bg-primary/70 rounded-full transition-colors" />
            </div>
            {/* Curves Panel */}
            <div style={{ height: curvesPanelHeight }}>
              <CurveGraphEditor
                animation={firstAnim}
                keyframes={keyframes}
                phaseDuration={timelineDuration}
                zoom={zoom}
                playheadPosition={playheadPosition}
                onKeyframeUpdate={handleKeyframeUpdate}
                onEasingUpdate={handleEasingUpdate}
                onDeletePropertyCurve={handleDeletePropertyCurve}
              />
            </div>
          </div>
        );
      })()}

      {/* Status Bar with enhanced keyframe info */}
      <div className="h-7 px-3 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          {selectedKeyframeIds.length > 0 && (() => {
            // Get selected keyframe details
            const selectedKfs = keyframes.filter(kf => selectedKeyframeIds.includes(kf.id));
            const totalProps = selectedKfs.reduce((sum, kf) => sum + Object.keys(kf.properties).length, 0);
            const firstKf = selectedKfs[0];
            const anim = firstKf ? animations.find(a => a.id === firstKf.animation_id) : null;

            // Get unique property names being animated
            const propNames = new Set<string>();
            selectedKfs.forEach(kf => {
              Object.keys(kf.properties).forEach(key => propNames.add(key));
            });
            const propList = Array.from(propNames);

            // Format property name for display (camelCase to readable)
            const formatPropName = (name: string) => {
              return name
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
            };

            return (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Diamond className="w-3 h-3 fill-amber-400" />
                  {selectedKfs.length === 1 && firstKf?.name ? (
                    <span className="font-medium">{firstKf.name}</span>
                  ) : (
                    <span>{selectedKeyframeIds.length} keyframe{selectedKeyframeIds.length > 1 ? 's' : ''}</span>
                  )}
                </span>
                {selectedKfs.length === 1 && firstKf && (
                  <>
                    <span className="text-muted-foreground">at</span>
                    <span className="font-mono text-foreground">{firstKf.position}%</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-violet-400">{totalProps} prop{totalProps !== 1 ? 's' : ''}</span>
                    {propList.length > 0 && (
                      <>
                        <span className="text-muted-foreground">:</span>
                        <div className="flex items-center gap-1 flex-wrap max-w-[300px]">
                          {propList.slice(0, 5).map((propKey) => (
                            <span
                              key={propKey}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 group/prop"
                            >
                              <span className="text-[10px]">{formatPropName(propKey)}</span>
                              <button
                                className="opacity-0 group-hover/prop:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeKeyframeProperty(firstKf.id, propKey);
                                }}
                                title={`Remove ${formatPropName(propKey)}`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          {propList.length > 5 && (
                            <span className="text-emerald-400/60 text-[10px]">+{propList.length - 5}</span>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
                {selectedKfs.length > 1 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-violet-400">{totalProps} total props</span>
                    {propList.length > 0 && (
                      <>
                        <span className="text-muted-foreground">:</span>
                        <div className="flex items-center gap-1 flex-wrap max-w-[300px]">
                          {propList.slice(0, 5).map((propKey) => (
                            <span
                              key={propKey}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]"
                              title={`Property: ${formatPropName(propKey)}`}
                            >
                              {formatPropName(propKey)}
                            </span>
                          ))}
                          {propList.length > 5 && (
                            <span className="text-emerald-400/60 text-[10px]">+{propList.length - 5}</span>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          {selectedElementIds.length > 0 && selectedKeyframeIds.length === 0 && (() => {
            // Get animations for selected elements
            const selectedAnims = currentAnimations.filter(a =>
              selectedElementIds.includes(a.element_id)
            );

            // Get all keyframes for these animations
            const selectedKfs = keyframes.filter(kf =>
              selectedAnims.some(a => a.id === kf.animation_id)
            );

            // Collect all animated properties
            const animatedProps = new Set<string>();
            selectedKfs.forEach(kf => {
              Object.keys(kf.properties).forEach(key => animatedProps.add(key));
            });
            const propList = Array.from(animatedProps);

            // Format property name for display
            const formatPropName = (name: string) => {
              return name
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
            };

            // Calculate total duration for selected elements
            const maxDur = selectedAnims.length > 0
              ? Math.max(...selectedAnims.map(a => a.delay + a.duration))
              : 0;

            return (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Layers className="w-3 h-3" />
                  {selectedElementIds.length} element{selectedElementIds.length > 1 ? 's' : ''}
                </span>
                {selectedAnims.length > 0 ? (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Diamond className="w-2.5 h-2.5 fill-amber-400" />
                      {selectedKfs.length} keyframe{selectedKfs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono text-foreground">{maxDur}ms</span>
                    {propList.length > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-violet-400">{propList.length} prop{propList.length !== 1 ? 's' : ''}</span>
                        <span className="text-muted-foreground">:</span>
                        <div className="flex items-center gap-1 flex-wrap max-w-[350px]">
                          {propList.slice(0, 6).map((propKey) => {
                            // Find all keyframes that have this property
                            const kfsWithProp = selectedKfs.filter(kf =>
                              Object.keys(kf.properties).includes(propKey)
                            );
                            return (
                              <span
                                key={propKey}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] group/prop"
                                title={`Animated: ${formatPropName(propKey)} (${kfsWithProp.length} keyframe${kfsWithProp.length !== 1 ? 's' : ''})`}
                              >
                                <span>{formatPropName(propKey)}</span>
                                <button
                                  className="opacity-0 group-hover/prop:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove property from ALL keyframes that have it
                                    kfsWithProp.forEach(kf => {
                                      removeKeyframeProperty(kf.id, propKey);
                                    });
                                  }}
                                  title={`Remove ${formatPropName(propKey)} from all ${kfsWithProp.length} keyframe${kfsWithProp.length !== 1 ? 's' : ''}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            );
                          })}
                          {propList.length > 6 && (
                            <span className="text-emerald-400/60 text-[10px]">+{propList.length - 6}</span>
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground/60 italic">No animations</span>
                )}
              </div>
            );
          })()}
          {selectedKeyframeIds.length === 0 && selectedElementIds.length === 0 && (
            <span className="opacity-60">Click a keyframe to select • Drag to move</span>
          )}
        </div>
        <div className="flex items-center gap-3 opacity-70">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Space</kbd> Play</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Del</kbd> Delete</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> Deselect</span>
          {/* Curve Graph Toggle */}
          {(() => {
            // Get animations for selected elements OR from selected keyframes
            const selectedAnims = currentAnimations.filter(a =>
              selectedElementIds.includes(a.element_id)
            );

            // Also check if we have selected keyframes - get their animations
            const keyframeAnims = selectedKeyframeIds.length > 0
              ? [...new Set(
                  keyframes
                    .filter(kf => selectedKeyframeIds.includes(kf.id))
                    .map(kf => animations.find(a => a.id === kf.animation_id))
                    .filter(Boolean)
                )] as typeof animations
              : [];

            // Combine and dedupe animations
            const allAnims = [...new Map([...selectedAnims, ...keyframeAnims].map(a => [a.id, a])).values()];

            if (allAnims.length === 0) return null;

            return (
              <button
                onClick={() => setShowEasingEditor(!showEasingEditor)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded transition-colors',
                  showEasingEditor ? 'bg-violet-500/30 text-violet-300' : 'hover:bg-muted/50'
                )}
                title="Toggle Curve Graph Editor"
              >
                <Spline className="w-3 h-3" />
                <span>Curves</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Context Menu (right-click menu) */}
      {contextMenuPosition && (() => {
        // Get selected keyframe details for the context menu
        const selectedKf = contextMenuSelectedKeyframes.length === 1
          ? keyframes.find(kf => kf.id === contextMenuSelectedKeyframes[0])
          : null;
        const selectedKfAnim = selectedKf
          ? animations.find(a => a.id === selectedKf.animation_id)
          : null;
        const selectedKfElement = selectedKfAnim
          ? elements.find(e => e.id === selectedKfAnim.element_id)
          : null;
        const selectedKfTimeMs = selectedKf && selectedKfAnim
          ? selectedKfAnim.delay + selectedKf.position  // Absolute timeline position = delay + relative position
          : 0;
        const selectedKfPropCount = selectedKf
          ? Object.keys(selectedKf.properties).length
          : 0;
        const currentEasing = selectedKf?.easing || 'linear';
        const currentEasingLabel = easingOptions.find(e => e.value === currentEasing)?.label || currentEasing;

        // Build keyframe address for "Copy Address" feature
        const keyframeName = selectedKf?.name || `key_${selectedKf?.position || 0}`;
        const keyframeAddress = selectedKf && selectedKfElement && selectedKfAnim
          ? buildKeyframeAddress(selectedKfElement.name, selectedKfAnim.phase, keyframeName)
          : null;

        return (
          <>
            {/* Backdrop to close menu on click outside */}
            <div
              className="fixed inset-0 z-50"
              onClick={closeContextMenu}
              onContextMenu={(e) => {
                e.preventDefault();
                closeContextMenu();
              }}
            />
            {/* Context menu - opens upward to avoid being cut off */}
            <div
              className="fixed z-50 min-w-[220px] max-w-[280px] bg-popover border border-border rounded-md shadow-lg py-1 text-sm"
              style={{
                left: contextMenuPosition.x,
                bottom: window.innerHeight - contextMenuPosition.y,
              }}
            >
              {/* Keyframe Info Header - only shows when single keyframe selected */}
              {selectedKf && (
                <>
                  <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Diamond className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <input
                        type="text"
                        defaultValue={selectedKf.name || `key_${selectedKf.position}`}
                        className="text-xs font-medium text-amber-400 bg-transparent border-none outline-none hover:bg-amber-500/10 focus:bg-amber-500/20 px-1 py-0.5 rounded -ml-1 flex-1 min-w-0"
                        onBlur={(e) => {
                          const newName = e.target.value.trim();
                          if (newName && newName !== selectedKf.name) {
                            updateKeyframe(selectedKf.id, { name: newName });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-mono text-amber-300">{formatTime(selectedKfTimeMs)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Position:</span>
                        <span className="font-mono text-amber-300">{selectedKf.position}%</span>
                      </div>
                      <div className="flex items-center justify-between col-span-2">
                        <span className="text-muted-foreground">Properties:</span>
                        <span className="font-mono text-violet-400">{selectedKfPropCount}</span>
                      </div>
                    </div>
                    {/* Property list preview */}
                    {selectedKfPropCount > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-amber-500/20">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(selectedKf.properties).slice(0, 4).map(key => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-[9px] text-emerald-400"
                            >
                              {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          ))}
                          {selectedKfPropCount > 4 && (
                            <span className="px-1.5 py-0.5 text-[9px] text-muted-foreground">
                              +{selectedKfPropCount - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Easing Selector */}
                  <div className="relative">
                    <button
                      className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                      onClick={() => setContextMenuShowEasing(!contextMenuShowEasing)}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 20 C 8 20, 8 4, 22 4" />
                        </svg>
                        <span>Easing: <span className="text-blue-400">{currentEasingLabel}</span></span>
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", contextMenuShowEasing && "rotate-180")} />
                    </button>
                    {contextMenuShowEasing && (
                      <div className="border-t border-border bg-muted/30">
                        {/* Edit Curve Button */}
                        <button
                          onClick={() => {
                            // Select the element for this keyframe and open easing editor
                            if (selectedKfAnim) {
                              selectElements([selectedKfAnim.element_id]);
                            }
                            setShowEasingEditor(true);
                            closeContextMenu();
                          }}
                          className="w-full px-6 py-1.5 text-xs text-left hover:bg-violet-500/20 transition-colors flex items-center gap-2 border-b border-border/50"
                        >
                          <Spline className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-violet-400">Edit Curve...</span>
                        </button>
                        {easingOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateKeyframe(selectedKf.id, { easing: option.value });
                              setContextMenuShowEasing(false);
                            }}
                            className={cn(
                              "w-full px-6 py-1 text-xs text-left hover:bg-muted/50 transition-colors",
                              currentEasing === option.value && "bg-blue-500/20 text-blue-400"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit Easing Curve - prominent button */}
                  <button
                    onClick={() => {
                      if (selectedKfAnim) {
                        selectElements([selectedKfAnim.element_id]);
                      }
                      setShowEasingEditor(true);
                      closeContextMenu();
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-violet-500/20 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Spline className="w-4 h-4 text-violet-400" />
                      <span className="text-violet-400 font-medium">Edit Easing Curve...</span>
                    </span>
                  </button>

                  {/* Separator */}
                  <div className="h-px bg-border my-1" />
                </>
              )}

              {/* Delete Selected Keyframes */}
              <button
                className={cn(
                  "w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors",
                  contextMenuSelectedKeyframes.length === 0 && "opacity-50 cursor-not-allowed"
                )}
                disabled={contextMenuSelectedKeyframes.length === 0}
                onClick={() => {
                  if (contextMenuSelectedKeyframes.length > 0) {
                    deleteSelectedKeyframes();
                    closeContextMenu();
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete Keyframe{contextMenuSelectedKeyframes.length > 1 ? 's' : ''}</span>
                </span>
                <span className="text-xs text-muted-foreground">Del</span>
              </button>

              {/* Duplicate Keyframe - only for single selection */}
              {selectedKf && (
                <button
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    // Create a duplicate keyframe at a slightly different position
                    // Duplicate keyframe 100ms after the original, clamped to phase duration
                    const newPosition = Math.min(phaseDuration, selectedKf.position + 100);
                    const newKeyframe = {
                      id: crypto.randomUUID(),
                      animation_id: selectedKf.animation_id,
                      position: newPosition,
                      easing: selectedKf.easing,
                      properties: { ...selectedKf.properties },
                    };
                    setKeyframes([...keyframes, newKeyframe]);
                    selectKeyframes([newKeyframe.id]);
                    closeContextMenu();
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-violet-400" />
                    <span>Duplicate Keyframe</span>
                  </span>
                </button>
              )}

              {/* Copy Address - only for single selection with valid address */}
              {keyframeAddress && (
                <button
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(keyframeAddress);
                      setCopiedAddress(true);
                      console.log('[Address] Copied keyframe address:', keyframeAddress);
                      setTimeout(() => setCopiedAddress(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy address:', err);
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    {copiedAddress ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Link className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className={copiedAddress ? 'text-emerald-400' : ''}>
                      {copiedAddress ? 'Address Copied!' : 'Copy Address'}
                    </span>
                  </span>
                  {!copiedAddress && (
                    <code className="text-[9px] font-mono text-emerald-400/60 truncate max-w-[100px]">
                      {keyframeAddress}
                    </code>
                  )}
                </button>
              )}

              {/* Separator */}
              <div className="h-px bg-border my-1" />

              {/* Add Keyframe Here */}
              <button
                className={cn(
                  "w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors",
                  (!contextMenuElementId && selectedElementIds.length === 0) && "opacity-50 cursor-not-allowed"
                )}
                disabled={!contextMenuElementId && selectedElementIds.length === 0}
                onClick={() => handleAddKeyframeAtTime(contextMenuTime, contextMenuElementId)}
              >
                <span className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-amber-400" />
                  <span>Add Keyframe at {formatTime(contextMenuTime)}</span>
                </span>
              </button>

              {/* Add Keyframe at Playhead */}
              <button
                className={cn(
                  "w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors",
                  (!contextMenuElementId && selectedElementIds.length === 0) && "opacity-50 cursor-not-allowed"
                )}
                disabled={!contextMenuElementId && selectedElementIds.length === 0}
                onClick={() => handleAddKeyframeAtTime(playheadPosition, contextMenuElementId)}
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-violet-400" />
                  <span>Add Keyframe at Playhead</span>
                </span>
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
