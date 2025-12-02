import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast,
  Plus, ZoomIn, ZoomOut, Repeat, Maximize2, Trash2, Diamond, 
  GripHorizontal, Move,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDesignerStore } from '@/stores/designerStore';
import { cn } from '@/lib/utils';
import { FRAME_RATE, FRAME_DURATION, createDefaultAnimation, formatTime } from '@/lib/animation';
import type { AnimationPhase, Keyframe as StoreKeyframe } from '@/types';

// Row height - must match for alignment
const ROW_HEIGHT = 32;

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
    play,
    pause,
    stop,
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
  } = useDesignerStore();

  // Refs
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<AnimationTimeline | null>(null);
  const outlineScrollRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [isLooping, setIsLooping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [editMode, setEditMode] = useState<'keyframes' | 'timeline'>('keyframes');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState('');

  // Playback loop ref
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Keyboard event handler for deleting keyframes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected keyframes with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKeyframeIds.length > 0) {
        // Only handle if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        deleteSelectedKeyframes();
      }
      
      // Escape to deselect keyframes
      if (e.key === 'Escape' && selectedKeyframeIds.length > 0) {
        selectKeyframes([]);
      }
      
      // Space to play/pause (when timeline is focused)
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKeyframeIds, deleteSelectedKeyframes, selectKeyframes, isPlaying, play, pause]);

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
        const timeMs = anim.delay + (kf.position / 100) * anim.duration;
        times.add(Math.round(timeMs));
      });
    });
    
    return Array.from(times).sort((a, b) => a - b);
  }, [currentAnimations, keyframes]);

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
    
    const contentDuration = Math.max(
      1000,
      ...currentAnimations.map((a) => a.delay + a.duration)
    );
    
    const containerWidth = timelineContainerRef.current.clientWidth - 210; // Account for outline
    const targetZoom = containerWidth / (contentDuration * 0.15); // pixels per ms
    
    setZoom(Math.max(0.5, Math.min(5, targetZoom)));
  }, [currentAnimations]);

  // Build timeline model from store data (only for current template)
  const buildTimelineModel = useCallback((): TimelineModel => {
    const rows: TimelineRow[] = templateElements.map((element) => {
      const elementAnims = currentAnimations.filter((a) => a.element_id === element.id);
      
      // Build keyframe groups for this row
      // Each animation becomes a group with its keyframes
      const groups: any[] = [];
      
      elementAnims.forEach((anim) => {
        const animKeyframes = keyframes.filter((kf) => kf.animation_id === anim.id);
        
        // Sort keyframes by position
        const sortedKfs = [...animKeyframes].sort((a, b) => a.position - b.position);
        
        if (sortedKfs.length > 0) {
          // Create keyframes for this group
          const groupKeyframes: TimelineKeyframe[] = sortedKfs.map((kf) => {
            const timeMs = anim.delay + (kf.position / 100) * anim.duration;
            return {
              val: timeMs,
              draggable: true,
              selectable: true,
              data: {
                keyframeId: kf.id,
                animationId: anim.id,
                position: kf.position,
                properties: kf.properties,
              },
              style: {
                shape: 'rhomb',
                width: 14,
                height: 14,
                fillColor: '#FFA500', // Orange for visibility
                strokeColor: '#FF8C00',
                strokeThickness: 2,
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
  }, [templateElements, currentAnimations, keyframes, currentPhase]);

  // Track if component is mounted and visible
  const [isVisible, setIsVisible] = useState(false);
  
  // Check container visibility
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
    
    // Also check on resize
    const observer = new ResizeObserver(checkVisibility);
    observer.observe(container);
    
    return () => observer.disconnect();
  }, []);

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

    const options: TimelineOptions = {
      id: container,
      headerHeight: 30,
      rowsStyle: {
        height: ROW_HEIGHT,
        marginBottom: 0,
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

      // Set initial model
      const model = buildTimelineModel();
      timeline.setModel(model);
      
      // Force redraw after a short delay to ensure proper rendering
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.redraw();
        }
      }, 50);

      // Time changed event
      timeline.onTimeChanged((event: TimelineTimeChangedEvent) => {
        if (event.source === 'user') {
          setPlayhead(event.val);
        }
      });

      // Drag finished - save keyframe positions
      timeline.onDragFinished((event: TimelineDragEvent) => {
        if (event.elements && event.elements.length > 0) {
          const store = useDesignerStore.getState();
          const currentKeyframes = store.keyframes;
          const currentAnimations = store.animations;
          
          const updatedKeyframes = [...currentKeyframes];
          
          event.elements.forEach((draggedEl) => {
            const data = draggedEl.keyframe?.data;
            if (data?.keyframeId && data?.animationId && !data?.isPlaceholder) {
              const anim = currentAnimations.find((a) => a.id === data.animationId);
              if (anim) {
                const newTimeMs = draggedEl.keyframe?.val || 0;
                const localTime = newTimeMs - anim.delay;
                const newPosition = Math.max(0, Math.min(100, (localTime / anim.duration) * 100));
                
                const kfIndex = updatedKeyframes.findIndex((kf) => kf.id === data.keyframeId);
                if (kfIndex !== -1) {
                  updatedKeyframes[kfIndex] = {
                    ...updatedKeyframes[kfIndex],
                    position: Math.round(newPosition),
                  };
                }
              }
            }
          });
          
          store.setKeyframes(updatedKeyframes);
        }
      });

      // Keyframe selection via library event
      timeline.onSelected((event: TimelineSelectedEvent) => {
        const store = useDesignerStore.getState();
        
        if (event.selected && event.selected.length > 0) {
          const selectedIds: string[] = [];
          
          event.selected.forEach((sel) => {
            const data = sel.keyframe?.data;
            if (data?.keyframeId && !data?.isPlaceholder) {
              selectedIds.push(data.keyframeId);
            }
          });
          
          if (selectedIds.length > 0) {
            store.selectKeyframes(selectedIds);
            // Also deselect element when keyframe is selected
            store.selectElements([]);
            const firstSelected = event.selected[0];
            const keyframeTime = firstSelected.keyframe?.val || 0;
            store.setPlayhead(keyframeTime);
          }
        } else {
          store.selectKeyframes([]);
        }
      });
      
      // Manual keyframe selection via canvas click (backup method)
      const canvas = container.querySelector('canvas');
      if (canvas) {
        const handleCanvasClick = (e: MouseEvent) => {
          const store = useDesignerStore.getState();
          const tl = timelineRef.current;
          
          if (!tl) return;
          
          // Get click position relative to canvas
          const rect = canvas.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          
          // Find keyframe near this time position
          const { animations: storeAnimations, keyframes: storeKeyframes, currentPhase: phase } = store;
          const phaseAnimations = storeAnimations.filter(a => a.phase === phase);
          
          let foundKeyframeId: string | null = null;
          let closestDistance = 30; // Pixel tolerance for click detection
          
          phaseAnimations.forEach(anim => {
            const animKeyframes = storeKeyframes.filter(kf => kf.animation_id === anim.id);
            
            animKeyframes.forEach(kf => {
              const kfTime = anim.delay + (kf.position / 100) * anim.duration;
              const kfX = tl.valToPx(kfTime);
              const distance = Math.abs(kfX - clickX);
              
              if (distance < closestDistance) {
                closestDistance = distance;
                foundKeyframeId = kf.id;
              }
            });
          });
          
          if (foundKeyframeId) {
            // Find the element that owns this keyframe
            const kf = storeKeyframes.find(k => k.id === foundKeyframeId);
            if (kf) {
              const anim = storeAnimations.find(a => a.id === kf.animation_id);
              if (anim) {
                // Select both keyframe AND element
                store.selectKeyframes([foundKeyframeId]);
                store.selectElements([anim.element_id]);
              }
            }
          }
        };
        
        canvas.addEventListener('click', handleCanvasClick);
        
        // Store cleanup function to remove listener
        const originalDispose = timeline.dispose?.bind(timeline);
        timeline.dispose = () => {
          canvas.removeEventListener('click', handleCanvasClick);
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
  }, [currentPhase, maxDuration, buildTimelineModel, isVisible]);

  // Update timeline model when data changes
  useEffect(() => {
    if (timelineRef.current) {
      const model = buildTimelineModel();
      timelineRef.current.setModel(model);
      timelineRef.current.redraw();
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
      const newPosition = currentPos + delta;
      
      if (newPosition >= maxDuration) {
        if (isLooping) {
          store.setPlayhead(0);
          timelineRef.current?.setTime(0);
        } else {
          // Set playhead to exact end position BEFORE pausing
          // This ensures the position is set before any re-renders triggered by pause()
          store.setPlayhead(maxDuration);
          timelineRef.current?.setTime(maxDuration);
          store.pause();
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
  }, [isPlaying, maxDuration, isLooping]);

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
    const timeoutId = setTimeout(() => {
      setupTimelineScrollSync();
    }, 100);

    return () => {
      outlineEl.removeEventListener('scroll', handleOutlineScroll);
      timelineContainer.removeEventListener('wheel', handleWheel);
      outlineEl.removeEventListener('wheel', handleWheel);
      clearTimeout(timeoutId);
    };
  }, [isVisible]);

  // Add animation to element
  const handleAddAnimation = useCallback((elementId: string, type: string) => {
    if (!currentTemplateId) return;
    
    const { animation, keyframes: kfs } = createDefaultAnimation(
      elementId,
      currentTemplateId,
      currentPhase,
      type as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'custom'
    );

    const animId = crypto.randomUUID();
    const newAnim = { ...animation, id: animId };
    const newKeyframes: StoreKeyframe[] = kfs.map((kf) => ({
      ...kf,
      id: crypto.randomUUID(),
      animation_id: animId,
      properties: kf.properties || {},
    }));

    // Get current state and update
    const store = useDesignerStore.getState();
    store.setAnimations([...store.animations, newAnim]);
    store.setKeyframes([...store.keyframes, ...newKeyframes]);
  }, [currentTemplateId, currentPhase]);

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

  const animationTypes = [
    { id: 'fade', label: 'Fade' },
    { id: 'slide-left', label: 'Slide Left' },
    { id: 'slide-right', label: 'Slide Right' },
    { id: 'slide-up', label: 'Slide Up' },
    { id: 'slide-down', label: 'Slide Down' },
    { id: 'scale', label: 'Scale' },
  ];

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col bg-card border-t border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
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
                        'text-xs h-7 data-[state=active]:text-white gap-1.5',
                        currentPhase === phase.id && phase.color
                      )}
                    >
                      <span>{phase.label}</span>
                      <span className="opacity-60 text-[10px]">
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
                  {isEditingDuration ? (
                    <Input
                      autoFocus
                      className="h-5 w-16 text-xs px-1 py-0 text-center"
                      value={durationInput}
                      onChange={(e) => setDurationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parsed = parseTimeInput(durationInput);
                          if (parsed !== null) {
                            setPhaseDuration(currentPhase, parsed);
                          }
                          setIsEditingDuration(false);
                        }
                        if (e.key === 'Escape') {
                          setIsEditingDuration(false);
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseTimeInput(durationInput);
                        if (parsed !== null) {
                          setPhaseDuration(currentPhase, parsed);
                        }
                        setIsEditingDuration(false);
                      }}
                      placeholder="e.g. 5s"
                    />
                  ) : (
                    <button
                      className="min-w-[50px] text-left hover:text-foreground hover:bg-muted px-1 py-0.5 rounded cursor-pointer transition-colors"
                      onClick={() => {
                        setDurationInput((phaseDuration / 1000).toFixed(1));
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
          {/* Element List Header - fixed at top */}
          <div
            className="px-3 border-b border-border text-xs font-medium text-muted-foreground flex items-center justify-between bg-muted/30 flex-shrink-0"
            style={{ height: 30 }}
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
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border"
            ref={outlineScrollRef}
            style={{ scrollbarWidth: 'none' }} // Hide scrollbar - we want unified scrolling
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
                        'flex items-center gap-2 px-3 text-xs cursor-pointer hover:bg-muted/50 group border-b border-border/30',
                        isSelected && 'bg-violet-500/20'
                      )}
                      style={{ height: ROW_HEIGHT }}
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
          className="flex-1 bg-neutral-900"
          style={{ minHeight: 150 }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 px-3 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          {selectedKeyframeIds.length > 0 && (
            <span className="text-violet-400">
              {selectedKeyframeIds.length} keyframe{selectedKeyframeIds.length > 1 ? 's' : ''} selected
            </span>
          )}
          {selectedElementIds.length > 0 && selectedKeyframeIds.length === 0 && (
            <span>
              {selectedElementIds.length} element{selectedElementIds.length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 opacity-70">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Del</kbd> Delete keyframe</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> Deselect</span>
        </div>
      </div>
    </div>
  );
}
