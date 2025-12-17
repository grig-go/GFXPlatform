import { useState, useEffect, useCallback, useRef } from 'react';

// Default MSE Connection configuration (used if no per-channel config)
const DEFAULT_MSE_HOST = import.meta.env.VITE_MSE_HOST || '192.168.68.83';
const DEFAULT_MSE_PORT = parseInt(import.meta.env.VITE_MSE_WEBSOCKET_PORT || '8595', 10);

// Configuration options for the hook
export interface MSEConnectionConfig {
  host?: string;
  port?: number;
  enabled?: boolean;
}

// Types for MSE state
export interface MSEPlayingElement {
  showName: string;
  playlistName: string;
  elementId: string;
  elementPath: string;
  timestamp: number;
}

export interface MSEConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  playingElements: Map<string, MSEPlayingElement>; // keyed by full element path
}

// PlainTalk message parser - handles {N} escape sequences
const parsePlainTalkField = (data: string, startIndex: number): { value: string; endIndex: number } | null => {
  let i = startIndex;
  let result = '';

  while (i < data.length) {
    const char = data[i];

    if (char === ' ' || char === '\n' || char === '\r') {
      return { value: result, endIndex: i };
    }

    if (char === '{') {
      // Find closing brace to get byte count
      const closeBrace = data.indexOf('}', i);
      if (closeBrace === -1) return null;

      const byteCount = parseInt(data.substring(i + 1, closeBrace), 10);
      if (isNaN(byteCount)) return null;

      // Read raw bytes
      const rawStart = closeBrace + 1;
      result += data.substring(rawStart, rawStart + byteCount);
      i = rawStart + byteCount;
    } else {
      result += char;
      i++;
    }
  }

  return { value: result, endIndex: i };
};

// Parse PepTalk/TreeTalk messages to extract playing element info
const parseMessage = (message: string): { type: string; data: any } | null => {
  try {
    const trimmed = message.trim();
    if (!trimmed) return null;

    // Parse fields from PlainTalk format
    const fields: string[] = [];
    let i = 0;
    while (i < trimmed.length) {
      // Skip whitespace
      while (i < trimmed.length && (trimmed[i] === ' ' || trimmed[i] === '\r')) i++;
      if (i >= trimmed.length) break;

      const field = parsePlainTalkField(trimmed, i);
      if (!field) break;
      fields.push(field.value);
      i = field.endIndex + 1;
    }

    if (fields.length < 2) return null;

    const [requestId, type, ...rest] = fields;

    // Handle "set" events which indicate attribute changes
    // Format: * set <path> <attr_name> <value>
    if (type === 'set' && rest.length >= 2) {
      const path = rest[0];
      const attrName = rest[1];
      const value = rest.slice(2).join(' ');

      // Look for carousel_status="run" on elements
      if (attrName === 'carousel_status' && value === 'run') {
        return {
          type: 'element_playing',
          data: { path, attrName, value }
        };
      }

      // Look for active_<feed> attributes on carousel nodes
      if (attrName.startsWith('active_')) {
        return {
          type: 'carousel_active',
          data: { path, feed: attrName.replace('active_', ''), activeElement: value }
        };
      }
    }

    // Handle node state messages from TreeTalk
    // Format: * node <parent> <previous> <self> <next> <name> <type> ...
    if (type === 'node' && rest.length >= 6) {
      const [parent, , self, , name, nodeType, ...attrs] = rest;

      // Look for carousel_status attribute in element nodes
      if (nodeType === 'element') {
        for (let j = 0; j < attrs.length - 1; j += 2) {
          if (attrs[j] === 'carousel_status' && attrs[j + 1] === 'run') {
            return {
              type: 'element_playing',
              data: { nodeId: self, name, parent }
            };
          }
        }
      }
    }

    // Handle changed events
    // Format: * changed <node> <attr_name> <old_value>
    if (type === 'changed' && rest.length >= 2) {
      return {
        type: 'changed',
        data: { nodeId: rest[0], attrName: rest[1], oldValue: rest.slice(2).join(' ') }
      };
    }

    // Handle insert events for new elements
    if (type === 'insert' && rest.length >= 2) {
      const path = rest[0];
      return {
        type: 'insert',
        data: { path, xml: rest.slice(2).join(' ') }
      };
    }

    // Handle protocol response
    if (type === 'protocol') {
      return {
        type: 'protocol',
        data: { capabilities: rest }
      };
    }

    // Handle ok responses
    if (type === 'ok') {
      return {
        type: 'ok',
        data: { requestId, extra: rest }
      };
    }

    return { type, data: { requestId, fields: rest } };
  } catch (err) {
    console.error('Error parsing MSE message:', err, message);
    return null;
  }
};

export const useMSEConnection = (config: MSEConnectionConfig | boolean = true) => {
  // Normalize config - support both boolean (legacy) and config object
  const normalizedConfig: MSEConnectionConfig = typeof config === 'boolean'
    ? { enabled: config }
    : config;

  const {
    host = DEFAULT_MSE_HOST,
    port = DEFAULT_MSE_PORT,
    enabled = true
  } = normalizedConfig;

  const [state, setState] = useState<MSEConnectionState>({
    status: 'disconnected',
    error: null,
    playingElements: new Map()
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdRef = useRef<number>(1);
  const protocolInitializedRef = useRef<boolean>(false);
  const currentHostRef = useRef<string>(host);
  const currentPortRef = useRef<number>(port);

  // Send a PepTalk command
  const sendCommand = useCallback((command: string): number => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msgId = messageIdRef.current++;
      const fullCommand = `${msgId} ${command}`;
      console.log('MSE Sending:', fullCommand);
      wsRef.current.send(fullCommand);
      return msgId;
    }
    return -1;
  }, []);

  // Extract element ID from a path like /storage/shows/SHOW/playlists/PLAYLIST/.../elements/ELEMENT_ID
  const extractElementIdFromPath = useCallback((path: string): string | null => {
    // Match element ID from path - could be in various formats
    const elementsMatch = path.match(/\/elements\/([^/\s]+)/);
    if (elementsMatch) {
      return elementsMatch[1];
    }
    // Also match direct element paths
    const directMatch = path.match(/\/([^/]+)$/);
    return directMatch ? directMatch[1] : null;
  }, []);

  // Connect to MSE WebSocket
  const connect = useCallback(() => {
    if (!enabled || !host) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Update refs to track current connection params
    currentHostRef.current = host;
    currentPortRef.current = port;

    protocolInitializedRef.current = false;
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const ws = new WebSocket(`ws://${host}:${port}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('MSE WebSocket connected');
        setState(prev => ({ ...prev, status: 'connected', error: null }));

        // Initialize PepTalk protocol with events enabled
        // We want to receive events for carousel_status changes
        sendCommand('protocol peptalk');
      };

      ws.onmessage = (event) => {
        const message = event.data as string;

        // Handle multiple messages in one packet (separated by newlines)
        const messages = message.split('\n').filter(m => m.trim());

        for (const msg of messages) {
          const parsed = parseMessage(msg);
          if (!parsed) continue;

          console.log('MSE Received:', parsed.type, parsed.data);

          // Handle protocol response - now we can query for current state
          if (parsed.type === 'protocol' && !protocolInitializedRef.current) {
            protocolInitializedRef.current = true;
            // Query for shows/playlists to find currently playing elements
            // The carousel handler sets carousel_status="run" on playing elements
            sendCommand('get /storage/shows 2');
          }

          // Handle element_playing events (carousel_status="run")
          if (parsed.type === 'element_playing') {
            const { path, nodeId, name } = parsed.data;
            const elementPath = path || name;
            const elementId = extractElementIdFromPath(elementPath) || name || nodeId;

            if (elementId) {
              // Parse show and playlist from path
              const showMatch = elementPath?.match(/\/shows\/([^/]+)/);
              const playlistMatch = elementPath?.match(/\/playlists\/([^/]+)/);

              const playingElement: MSEPlayingElement = {
                showName: showMatch?.[1] || 'unknown',
                playlistName: playlistMatch?.[1] || 'unknown',
                elementId,
                elementPath: elementPath || '',
                timestamp: Date.now()
              };

              setState(prev => {
                const newPlayingElements = new Map(prev.playingElements);
                newPlayingElements.set(elementId, playingElement);
                return { ...prev, playingElements: newPlayingElements };
              });
            }
          }

          // Handle carousel_active events (active_<feed> attribute changes)
          if (parsed.type === 'carousel_active') {
            const { path, feed, activeElement } = parsed.data;

            if (activeElement) {
              const showMatch = path?.match(/\/shows\/([^/]+)/);
              const playlistMatch = path?.match(/\/playlists\/([^/]+)/);

              const playingElement: MSEPlayingElement = {
                showName: showMatch?.[1] || 'unknown',
                playlistName: playlistMatch?.[1] || 'unknown',
                elementId: activeElement,
                elementPath: `${path}/elements/${activeElement}`,
                timestamp: Date.now()
              };

              // Key by carousel path + feed to track multiple feeds
              const key = `${path}:${feed}`;
              setState(prev => {
                const newPlayingElements = new Map(prev.playingElements);
                newPlayingElements.set(key, playingElement);
                return { ...prev, playingElements: newPlayingElements };
              });
            }
          }

          // Handle changed events - might indicate carousel_status changed
          if (parsed.type === 'changed') {
            const { nodeId, attrName } = parsed.data;
            // If carousel_status changed away from "run", we might need to clear it
            if (attrName === 'carousel_status') {
              // The element is no longer playing, remove from our map
              setState(prev => {
                const newPlayingElements = new Map(prev.playingElements);
                // Find and remove any entry with this nodeId
                for (const [key, value] of newPlayingElements) {
                  if (value.elementId === nodeId || key === nodeId) {
                    newPlayingElements.delete(key);
                  }
                }
                return { ...prev, playingElements: newPlayingElements };
              });
            }
          }
        }
      };

      ws.onerror = (error) => {
        console.error('MSE WebSocket error:', error);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'WebSocket connection error'
        }));
      };

      ws.onclose = (event) => {
        console.log('MSE WebSocket closed:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          status: 'disconnected',
          error: event.code !== 1000 ? 'Connection closed unexpectedly' : null
        }));

        // Attempt to reconnect after 5 seconds if enabled
        if (enabled && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

    } catch (err) {
      console.error('Error creating MSE WebSocket:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to connect'
      }));
    }
  }, [enabled, host, port, sendCommand, extractElementIdFromPath]);

  // Disconnect from MSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setState({
      status: 'disconnected',
      error: null,
      playingElements: new Map()
    });
  }, []);

  // Get currently playing element ID for a specific show/playlist
  const getPlayingElementId = useCallback((showName: string, playlistName?: string): string | null => {
    // Search through playing elements to find matching show/playlist
    for (const [, element] of state.playingElements) {
      if (element.showName === showName) {
        if (!playlistName || element.playlistName === playlistName) {
          return element.elementId;
        }
      }
    }
    return null;
  }, [state.playingElements]);

  // Check if a specific element ID is currently playing
  const isElementPlaying = useCallback((elementId: string): boolean => {
    for (const [, element] of state.playingElements) {
      if (element.elementId === elementId) {
        return true;
      }
    }
    return false;
  }, [state.playingElements]);

  // Get all currently playing element IDs
  const getAllPlayingElementIds = useCallback((): Set<string> => {
    const ids = new Set<string>();
    state.playingElements.forEach(element => {
      ids.add(element.elementId);
    });
    return ids;
  }, [state.playingElements]);

  // Connect on mount, disconnect on unmount, and reconnect when host/port changes
  useEffect(() => {
    if (enabled && host) {
      // Check if we need to reconnect due to host/port change
      if (currentHostRef.current !== host || currentPortRef.current !== port) {
        disconnect();
      }
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, host, port, connect, disconnect]);

  return {
    status: state.status,
    error: state.error,
    playingElements: state.playingElements,
    host: currentHostRef.current,
    port: currentPortRef.current,
    connect,
    disconnect,
    sendCommand,
    getPlayingElementId,
    isElementPlaying,
    getAllPlayingElementIds
  };
};

export default useMSEConnection;
