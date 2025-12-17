// src/contexts/GridStateContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { ColumnState } from 'ag-grid-community';

// Grid identifiers for the application
export type GridId = 'content' | 'channel-playlists' | 'templates' | 'live-view';

// State structure for expanded rows
export interface GridExpandedStates {
  [key: string]: string[]; // gridId -> array of expanded node IDs
}

// State structure for column states
export interface GridColumnStates {
  [key: string]: ColumnState[]; // gridId -> AG Grid column state array
}

// Combined state for saving/loading
export interface AllGridStates {
  expandedRows: GridExpandedStates;
  columnStates: GridColumnStates;
}

// Context interface
interface GridStateContextType {
  // Expanded rows
  getExpandedRows: (gridId: GridId) => Set<string>;
  setExpandedRows: (gridId: GridId, expandedRows: Set<string>) => void;
  toggleRowExpanded: (gridId: GridId, nodeId: string, expanded: boolean) => void;

  // Column states
  getColumnState: (gridId: GridId) => ColumnState[] | null;
  setColumnState: (gridId: GridId, columnState: ColumnState[]) => void;

  // Persistence
  getAllGridStates: () => AllGridStates;
  loadGridStates: (states: Partial<AllGridStates>) => void;
  isLoaded: boolean;
  markDirty: () => void;
  isDirty: boolean;
  clearDirty: () => void;
}

// Create the context
const GridStateContext = createContext<GridStateContextType | undefined>(undefined);

// Provider props
interface GridStateProviderProps {
  children: ReactNode;
}

export const GridStateProvider: React.FC<GridStateProviderProps> = ({ children }) => {
  // Store expanded rows as Sets for each grid
  const [expandedStates, setExpandedStates] = useState<Map<GridId, Set<string>>>(new Map());
  // Store column states for each grid
  const [columnStates, setColumnStates] = useState<Map<GridId, ColumnState[]>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Use ref to track if we're in the middle of loading to prevent save during load
  const loadingRef = useRef(false);

  // Expanded rows methods
  const getExpandedRows = useCallback((gridId: GridId): Set<string> => {
    return expandedStates.get(gridId) || new Set();
  }, [expandedStates]);

  const setExpandedRows = useCallback((gridId: GridId, expandedRows: Set<string>) => {
    setExpandedStates(prev => {
      const newStates = new Map(prev);
      newStates.set(gridId, expandedRows);
      return newStates;
    });
    if (!loadingRef.current) {
      setIsDirty(true);
    }
  }, []);

  const toggleRowExpanded = useCallback((gridId: GridId, nodeId: string, expanded: boolean) => {
    setExpandedStates(prev => {
      const newStates = new Map(prev);
      const currentSet = new Set(prev.get(gridId) || []);

      if (expanded) {
        currentSet.add(nodeId);
      } else {
        currentSet.delete(nodeId);
      }

      newStates.set(gridId, currentSet);
      return newStates;
    });
    if (!loadingRef.current) {
      setIsDirty(true);
    }
  }, []);

  // Column state methods
  const getColumnState = useCallback((gridId: GridId): ColumnState[] | null => {
    return columnStates.get(gridId) || null;
  }, [columnStates]);

  const setColumnState = useCallback((gridId: GridId, columnState: ColumnState[]) => {
    setColumnStates(prev => {
      const newStates = new Map(prev);
      newStates.set(gridId, columnState);
      return newStates;
    });
    if (!loadingRef.current) {
      setIsDirty(true);
    }
  }, []);

  // Persistence methods
  const getAllGridStates = useCallback((): AllGridStates => {
    const expandedRows: GridExpandedStates = {};
    expandedStates.forEach((set, gridId) => {
      expandedRows[gridId] = Array.from(set);
    });

    const columns: GridColumnStates = {};
    columnStates.forEach((state, gridId) => {
      columns[gridId] = state;
    });

    return {
      expandedRows,
      columnStates: columns,
    };
  }, [expandedStates, columnStates]);

  const loadGridStates = useCallback((states: Partial<AllGridStates>) => {
    loadingRef.current = true;

    // Load expanded rows
    if (states.expandedRows) {
      const newExpandedStates = new Map<GridId, Set<string>>();
      Object.entries(states.expandedRows).forEach(([gridId, nodeIds]) => {
        if (Array.isArray(nodeIds)) {
          newExpandedStates.set(gridId as GridId, new Set(nodeIds));
        }
      });
      setExpandedStates(newExpandedStates);
    }

    // Load column states
    if (states.columnStates) {
      const newColumnStates = new Map<GridId, ColumnState[]>();
      Object.entries(states.columnStates).forEach(([gridId, colState]) => {
        if (Array.isArray(colState)) {
          newColumnStates.set(gridId as GridId, colState);
        }
      });
      setColumnStates(newColumnStates);
    }

    setIsLoaded(true);
    loadingRef.current = false;
  }, []);

  const markDirty = useCallback(() => {
    if (!loadingRef.current) {
      setIsDirty(true);
    }
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  const value: GridStateContextType = {
    getExpandedRows,
    setExpandedRows,
    toggleRowExpanded,
    getColumnState,
    setColumnState,
    getAllGridStates,
    loadGridStates,
    isLoaded,
    markDirty,
    isDirty,
    clearDirty,
  };

  return (
    <GridStateContext.Provider value={value}>
      {children}
    </GridStateContext.Provider>
  );
};

// Custom hook to use the grid state context
export const useGridState = (): GridStateContextType => {
  const context = useContext(GridStateContext);
  if (context === undefined) {
    throw new Error('useGridState must be used within a GridStateProvider');
  }
  return context;
};

// Convenience hook for a specific grid's expanded rows
export const useGridExpandedRows = (gridId: GridId) => {
  const { getExpandedRows, setExpandedRows, toggleRowExpanded } = useGridState();

  return {
    expandedRows: getExpandedRows(gridId),
    setExpandedRows: (rows: Set<string>) => setExpandedRows(gridId, rows),
    toggleRowExpanded: (nodeId: string, expanded: boolean) => toggleRowExpanded(gridId, nodeId, expanded),
  };
};

// Convenience hook for a specific grid's column state
export const useGridColumnState = (gridId: GridId) => {
  const { getColumnState, setColumnState, isLoaded } = useGridState();

  return {
    columnState: getColumnState(gridId),
    setColumnState: (state: ColumnState[]) => setColumnState(gridId, state),
    isLoaded,
  };
};
