import { useEffect, useCallback, useState, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import {
  loadShortcuts,
  saveShortcuts,
  resetShortcuts,
  eventToKeyCombo,
  findShortcutByCombo,
  type KeyboardShortcut,
} from '@/lib/keyboardShortcuts';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onShowShortcuts } = options;
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => loadShortcuts());
  const shortcutsRef = useRef(shortcuts);

  // Keep ref in sync with state
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const {
    setTool,
    selectedElementIds,
    selectElements,
    elements,
    updateElement,
    deleteElements,
    duplicateElements,
    copyElements,
    pasteElements,
    undo,
    redo,
    saveProject,
    zoom,
    setZoom,
    panX,
    panY,
    setPan,
    currentPhase,
    setCurrentPhase,
    timelinePosition,
    setTimelinePosition,
    isTimelinePlaying,
    setTimelinePlaying,
    phaseDurations,
    project,
    playIn,
    playOut,
    clearOnAir,
    onAirTemplates,
    templates,
    currentTemplateId,
  } = useDesignerStore();

  // Update a shortcut's keys
  const updateShortcut = useCallback((id: string, newKeys: string[]) => {
    setShortcuts(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, keys: newKeys } : s
      );
      saveShortcuts(updated);
      return updated;
    });
  }, []);

  // Reset all shortcuts to defaults
  const resetAllShortcuts = useCallback(() => {
    const reset = resetShortcuts();
    setShortcuts(reset);
  }, []);

  // Handle shortcut actions
  const handleAction = useCallback((action: string) => {
    // Check if we're in an input field
    const activeElement = document.activeElement;
    const isInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true';

    // Some shortcuts should work even in input fields
    const globalShortcuts = ['save', 'escape', 'showShortcuts'];

    if (isInputField && !globalShortcuts.includes(action)) {
      return false;
    }

    switch (action) {
      // General
      case 'save':
        saveProject();
        return true;

      case 'undo':
        undo();
        return true;

      case 'redo':
        redo();
        return true;

      case 'showShortcuts':
        onShowShortcuts?.();
        return true;

      case 'escape':
        selectElements([], 'replace');
        setTool('select');
        return true;

      // Tools
      case 'tool-select':
        setTool('select');
        return true;

      case 'tool-hand':
        setTool('hand');
        return true;

      case 'tool-zoom':
        setTool('zoom');
        return true;

      case 'tool-text':
        setTool('text');
        return true;

      case 'tool-rectangle':
        setTool('rectangle');
        return true;

      case 'tool-ellipse':
        setTool('ellipse');
        return true;

      case 'tool-image':
        setTool('image');
        return true;

      case 'tool-video':
        setTool('video');
        return true;

      case 'tool-icon':
        setTool('icon');
        return true;

      case 'tool-svg':
        setTool('svg');
        return true;

      case 'tool-chart':
        setTool('chart');
        return true;

      case 'tool-map':
        setTool('map');
        return true;

      case 'tool-ticker':
        setTool('ticker');
        return true;

      case 'tool-table':
        setTool('table');
        return true;

      // Editing
      case 'copy':
        if (selectedElementIds.length > 0) {
          copyElements();
          return true;
        }
        return false;

      case 'cut':
        if (selectedElementIds.length > 0) {
          copyElements();
          deleteElements(selectedElementIds);
          return true;
        }
        return false;

      case 'paste':
        pasteElements();
        return true;

      case 'duplicate':
        if (selectedElementIds.length > 0) {
          duplicateElements(selectedElementIds);
          return true;
        }
        return false;

      case 'delete':
        if (selectedElementIds.length > 0) {
          deleteElements(selectedElementIds);
          return true;
        }
        return false;

      case 'selectAll':
        if (currentTemplateId) {
          const templateElements = elements.filter(e => e.template_id === currentTemplateId);
          selectElements(templateElements.map(e => e.id), 'replace');
          return true;
        }
        return false;

      case 'deselectAll':
        selectElements([], 'replace');
        return true;

      case 'toggleLock':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element) {
              updateElement(id, { locked: !element.locked });
            }
          });
          return true;
        }
        return false;

      case 'toggleVisibility':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element) {
              updateElement(id, { visible: element.visible === false ? true : false });
            }
          });
          return true;
        }
        return false;

      // Nudge
      case 'nudgeUp':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_y: element.position_y - 1 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeDown':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_y: element.position_y + 1 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeLeft':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_x: element.position_x - 1 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeRight':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_x: element.position_x + 1 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeUpBig':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_y: element.position_y - 10 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeDownBig':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_y: element.position_y + 10 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeLeftBig':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_x: element.position_x - 10 });
            }
          });
          return true;
        }
        return false;

      case 'nudgeRightBig':
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => {
            const element = elements.find(e => e.id === id);
            if (element && !element.locked) {
              updateElement(id, { position_x: element.position_x + 10 });
            }
          });
          return true;
        }
        return false;

      // Hierarchy Navigation
      case 'selectParent':
        if (selectedElementIds.length === 1) {
          const selectedElement = elements.find(e => e.id === selectedElementIds[0]);
          console.log('[Shortcuts] selectParent - selected element:', selectedElement?.name, 'parent:', selectedElement?.parent_element_id);
          if (selectedElement?.parent_element_id) {
            // Select the parent element (the group)
            selectElements([selectedElement.parent_element_id], 'replace');
            return true;
          }
        }
        return false;

      case 'selectChild':
        if (selectedElementIds.length === 1) {
          const selectedElement = elements.find(e => e.id === selectedElementIds[0]);
          // Find children of the selected element (elements that have this element as parent)
          const children = elements.filter(e => e.parent_element_id === selectedElementIds[0]);
          console.log('[Shortcuts] selectChild - selected element:', selectedElement?.name, 'type:', selectedElement?.element_type, 'children count:', children.length);
          if (children.length > 0) {
            // Select the first child (sorted by sort_order if available)
            const sortedChildren = [...children].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            selectElements([sortedChildren[0].id], 'replace');
            // Also expand the group node so the child is visible in the outline
            const { toggleNode, expandedNodes } = useDesignerStore.getState();
            if (!expandedNodes.has(selectedElementIds[0])) {
              toggleNode(selectedElementIds[0]);
            }
            return true;
          }
        }
        return false;

      // View
      case 'zoomIn':
        setZoom(Math.min(zoom * 1.25, 4));
        return true;

      case 'zoomOut':
        setZoom(Math.max(zoom * 0.8, 0.1));
        return true;

      case 'zoomFit':
        // Reset to fit - this would need canvas dimensions
        setZoom(0.5);
        setPan(0, 0);
        return true;

      case 'zoom100':
        setZoom(1);
        return true;

      // Timeline
      case 'timelinePlayPause':
        setTimelinePlaying(!isTimelinePlaying);
        return true;

      case 'timelineStop':
        setTimelinePlaying(false);
        setTimelinePosition(0);
        return true;

      case 'timelineStart':
        setTimelinePosition(0);
        return true;

      case 'timelineEnd':
        setTimelinePosition(phaseDurations[currentPhase]);
        return true;

      case 'timelineFrameNext':
        setTimelinePosition(Math.min(timelinePosition + 33, phaseDurations[currentPhase]));
        return true;

      case 'timelineFramePrev':
        setTimelinePosition(Math.max(timelinePosition - 33, 0));
        return true;

      case 'phaseIn':
        setCurrentPhase('in');
        return true;

      case 'phaseLoop':
        setCurrentPhase('loop');
        return true;

      case 'phaseOut':
        setCurrentPhase('out');
        return true;

      // Playback
      case 'playIn':
        if (currentTemplateId) {
          const template = templates.find(t => t.id === currentTemplateId);
          if (template) {
            playIn(currentTemplateId, template.layer_id);
          }
        }
        return true;

      case 'playOut':
        // Play out all on-air templates
        Object.entries(onAirTemplates).forEach(([layerId, onAir]) => {
          if (onAir && (onAir.state === 'in' || onAir.state === 'loop')) {
            playOut(layerId);
          }
        });
        return true;

      default:
        return false;
    }
  }, [
    selectedElementIds,
    elements,
    currentTemplateId,
    templates,
    onAirTemplates,
    zoom,
    timelinePosition,
    currentPhase,
    phaseDurations,
    isTimelinePlaying,
    setTool,
    selectElements,
    updateElement,
    deleteElements,
    duplicateElements,
    copyElements,
    pasteElements,
    undo,
    redo,
    saveProject,
    setZoom,
    setPan,
    setTimelinePosition,
    setCurrentPhase,
    setTimelinePlaying,
    playIn,
    playOut,
    onShowShortcuts,
  ]);

  // Keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in a dialog input that's not a shortcut input
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-shortcut-input]') ||
        target.closest('[role="dialog"]')?.querySelector('input:focus, textarea:focus')
      ) {
        return;
      }

      const combo = eventToKeyCombo(e);
      const shortcut = findShortcutByCombo(combo, shortcutsRef.current);

      if (shortcut) {
        const handled = handleAction(shortcut.action);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleAction]);

  return {
    shortcuts,
    updateShortcut,
    resetAllShortcuts,
    handleAction,
  };
}
