import { useEffect } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    deleteElements,
    selectedElementIds,
    selectAll,
    deselectAll,
    setTool,
    saveProject,
  } = useDesignerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Undo: Ctrl/Cmd + Z
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (isMod && e.key === 's') {
        e.preventDefault();
        saveProject();
        return;
      }

      // Select All: Ctrl/Cmd + A
      if (isMod && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        deselectAll();
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
        e.preventDefault();
        deleteElements(selectedElementIds);
        return;
      }

      // Tool shortcuts
      if (!isMod) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
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
          case 'h':
            setTool('hand');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteElements, selectedElementIds, selectAll, deselectAll, setTool, saveProject]);
}

