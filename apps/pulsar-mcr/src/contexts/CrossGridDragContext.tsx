// src/contexts/CrossGridDragContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { GridApi } from 'ag-grid-community';

// Data structure for dragged bucket from ContentPage
export interface DraggedBucket {
  id: string;
  name: string;
  schedule?: any;
  type: 'bucket';
}

// Drop handler type
export type BucketDropHandler = (buckets: DraggedBucket[], targetPlaylistId: string) => Promise<void>;

// Context interface
interface CrossGridDragContextType {
  // Register the ChannelPlaylistsPage grid API and container
  channelPlaylistsGridApi: GridApi | null;
  channelPlaylistsContainer: HTMLElement | null;
  setChannelPlaylistsGrid: (api: GridApi | null, container: HTMLElement | null) => void;

  // Handler for when buckets are dropped on a playlist
  bucketDropHandler: React.MutableRefObject<BucketDropHandler | null>;
  setBucketDropHandler: (handler: BucketDropHandler | null) => void;

  // Track registered drop zones for cleanup
  registeredDropZones: Map<string, any>;
}

// Create the context
const CrossGridDragContext = createContext<CrossGridDragContextType | undefined>(undefined);

// Provider props
interface CrossGridDragProviderProps {
  children: ReactNode;
}

export const CrossGridDragProvider: React.FC<CrossGridDragProviderProps> = ({ children }) => {
  const [channelPlaylistsGridApi, setChannelPlaylistsGridApi] = useState<GridApi | null>(null);
  const [channelPlaylistsContainer, setChannelPlaylistsContainer] = useState<HTMLElement | null>(null);
  const bucketDropHandlerRef = useRef<BucketDropHandler | null>(null);
  const registeredDropZones = useRef<Map<string, any>>(new Map());

  const setChannelPlaylistsGrid = useCallback((api: GridApi | null, container: HTMLElement | null) => {
    setChannelPlaylistsGridApi(api);
    setChannelPlaylistsContainer(container);
  }, []);

  const setBucketDropHandler = useCallback((handler: BucketDropHandler | null) => {
    bucketDropHandlerRef.current = handler;
  }, []);

  const value: CrossGridDragContextType = {
    channelPlaylistsGridApi,
    channelPlaylistsContainer,
    setChannelPlaylistsGrid,
    bucketDropHandler: bucketDropHandlerRef,
    setBucketDropHandler,
    registeredDropZones: registeredDropZones.current,
  };

  return (
    <CrossGridDragContext.Provider value={value}>
      {children}
    </CrossGridDragContext.Provider>
  );
};

// Hook to use the context
export const useCrossGridDrag = (): CrossGridDragContextType => {
  const context = useContext(CrossGridDragContext);
  if (!context) {
    throw new Error('useCrossGridDrag must be used within a CrossGridDragProvider');
  }
  return context;
};
