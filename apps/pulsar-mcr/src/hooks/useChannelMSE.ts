import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { XMLParser } from 'fast-xml-parser';
import { Channel } from './useChannels';

// Default MSE port (host must be explicitly provided from channel config)
const DEFAULT_MSE_PORT = 8595;

// XML Parser configuration - preserves attributes and handles nested elements
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: false, // Keep values as strings
  trimValues: true
});

// Interface for parsed MSE element data
interface ParsedMSEElement {
  elementId: string;
  status: string;
  description?: string;
  label?: string;
  template?: string;
  fields: { name: string; value: string }[];
}

// Interface for parsed active carousel info
interface ParsedActiveCarousel {
  showName: string;
  playlistName: string;
  feed: string;
  activeElement: string;
}

// Parse XML to extract Viz channel info from /storage/ticker/default/channels
// XML structure:
// <entry name="channels">
//   <entry name="Main">
//     <entry name="handler">viz_Main</entry>
//     <entry name="viz">
//       <entry name="host">localhost</entry>
//       <entry name="port">6100</entry>
//     </entry>
//   </entry>
// </entry>
const parseVizChannelsFromXml = (xmlData: string): VizChannelInfo[] => {
  const results: VizChannelInfo[] = [];

  try {
    const cleanXml = xmlData.replace(/\{[0-9]+\}/g, '');
    const parsed = xmlParser.parse(cleanXml);

    // Navigate to the channels entry - could be top-level or nested
    const findChannelsEntry = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null;

      // Direct match
      if (obj['@_name'] === 'channels' && obj.entry) {
        return obj;
      }

      // Check children
      for (const key of Object.keys(obj)) {
        if (key.startsWith('@_') || key === '#text') continue;
        const value = obj[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            const found = findChannelsEntry(item);
            if (found) return found;
          }
        } else if (typeof value === 'object') {
          const found = findChannelsEntry(value);
          if (found) return found;
        }
      }
      return null;
    };

    const channelsEntry = findChannelsEntry(parsed);
    if (!channelsEntry) {
      return results;
    }

    // Get the channel entries (Main, Preview, etc.)
    const channelEntries = Array.isArray(channelsEntry.entry) ? channelsEntry.entry : [channelsEntry.entry];

    for (const channelEntry of channelEntries) {
      if (!channelEntry || !channelEntry['@_name']) continue;

      const channelName = channelEntry['@_name'];
      if (channelName === 'channels') continue; // Skip the parent entry if it appears

      let handler = '';
      let vizHost: string | undefined;
      let vizPort: number | undefined;

      // Get child entries (handler, viz)
      const childEntries = Array.isArray(channelEntry.entry) ? channelEntry.entry : [channelEntry.entry];

      for (const child of childEntries) {
        if (!child) continue;

        // Handler entry contains the viz handler name as text content
        if (child['@_name'] === 'handler') {
          handler = child['#text'] || '';
        }

        // Viz entry contains host/port
        if (child['@_name'] === 'viz' && child.entry) {
          const vizEntries = Array.isArray(child.entry) ? child.entry : [child.entry];
          for (const vizChild of vizEntries) {
            if (vizChild['@_name'] === 'host') {
              vizHost = vizChild['#text'];
            }
            if (vizChild['@_name'] === 'port') {
              vizPort = parseInt(vizChild['#text'], 10);
            }
          }
        }
      }

      if (channelName && handler) {
        results.push({
          name: channelName,
          handler,
          vizHost,
          vizPort
        });
      }
    }

  } catch (err) {
    console.warn('[MSE] Failed to parse Viz channels XML:', err);
  }

  return results;
};

// Parse XML to extract active carousel info (active_Main, active_Preview, etc.)
const parseActiveCarouselsFromXml = (xmlData: string): ParsedActiveCarousel[] => {
  const results: ParsedActiveCarousel[] = [];

  try {
    const cleanXml = xmlData.replace(/\{[0-9]+\}/g, '');
    const parsed = xmlParser.parse(cleanXml);

    // Recursive function to find playlists with active_* attributes
    const findActiveCarousels = (obj: any, showName: string = '', playlistName: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      // Track show name from element with type="show"
      const currentShowName = obj['@_type'] === 'show' && obj['@_name'] ? obj['@_name'] : showName;

      // Track playlist name from element with type="playlist"
      const currentPlaylistName = obj['@_type'] === 'playlist' && obj['@_name'] ? obj['@_name'] : playlistName;

      // Look for active_* attributes (active_Main, active_Preview, etc.)
      for (const key of Object.keys(obj)) {
        if (key.startsWith('@_active_')) {
          const feed = key.replace('@_active_', '');
          const activeElement = obj[key];
          if (activeElement && currentShowName) {
            results.push({
              showName: currentShowName,
              playlistName: currentPlaylistName || 'carousel',
              feed,
              activeElement
            });
          }
        }
      }

      // Recursively check all properties
      for (const key of Object.keys(obj)) {
        if (key.startsWith('@_') || key === '#text') continue;

        const value = obj[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            findActiveCarousels(item, currentShowName, currentPlaylistName);
          }
        } else if (typeof value === 'object') {
          findActiveCarousels(value, currentShowName, currentPlaylistName);
        }
      }
    };

    findActiveCarousels(parsed);

  } catch (err) {
    console.warn('[MSE] Failed to parse XML for active carousels:', err);
  }

  return results;
};

// Parse XML to extract playing elements with their field values
const parseElementsFromXml = (xmlData: string): ParsedMSEElement[] => {
  const results: ParsedMSEElement[] = [];

  try {
    // Clean up the XML data - remove PlainTalk escapes like {N}
    const cleanXml = xmlData.replace(/\{[0-9]+\}/g, '');

    // Try to parse the XML
    const parsed = xmlParser.parse(cleanXml);

    // Recursive function to find all elements with status="pre" or "prequeue"
    const findPlayingElements = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      // If this is an element object with status and name attributes
      if (obj['@_status'] && (obj['@_status'] === 'pre' || obj['@_status'] === 'prequeue')) {
        const elementId = obj['@_name'];
        if (!elementId) return;

        // Skip known container names
        if (/^(INFO_BAR|BACKGROUND|BANNER|BG|carousel)$/i.test(elementId)) {
          return;
        }

        const element: ParsedMSEElement = {
          elementId,
          status: obj['@_status'],
          description: obj['@_description'],
          label: obj['@_label'],
          fields: []
        };

        // Extract template from ref element
        if (obj.ref && Array.isArray(obj.ref)) {
          const templateRef = obj.ref.find((r: any) => r['@_name'] === 'master_template');
          if (templateRef && templateRef['#text']) {
            element.template = templateRef['#text'];
          }
        } else if (obj.ref?.['@_name'] === 'master_template') {
          element.template = obj.ref['#text'];
        }

        // Extract field values from entry/payload/field structure
        const extractFields = (entryObj: any) => {
          if (!entryObj) return;

          // Look for payload with field elements
          const payload = entryObj.payload;
          if (payload?.field) {
            const fields = Array.isArray(payload.field) ? payload.field : [payload.field];
            for (const field of fields) {
              if (field['@_name'] && field['#text']) {
                element.fields.push({
                  name: field['@_name'],
                  value: field['#text']
                });
              }
            }
          }
        };

        // Check for entry directly on element or nested
        if (obj.entry) {
          extractFields(obj.entry);
        }

        results.push(element);
      }

      // Recursively check all properties
      for (const key of Object.keys(obj)) {
        if (key.startsWith('@_') || key === '#text') continue;

        const value = obj[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            findPlayingElements(item, `${path}/${key}`);
          }
        } else if (typeof value === 'object') {
          findPlayingElements(value, `${path}/${key}`);
        }
      }
    };

    findPlayingElements(parsed);

  } catch (err) {
    console.warn('[MSE] Failed to parse XML:', err);
  }

  return results;
};

// Types for MSE state
export interface MSEElementField {
  name: string;
  value: string;
}

export interface MSEPlayingElement {
  channelId: string;
  channelName: string;
  // Viz channel instance (viz_Main, viz_Preview, etc.) - each can have different playing elements
  vizChannel?: string;
  showName: string;
  playlistName: string;
  elementId: string;
  elementPath: string;
  timestamp: number;
  // Field values for matching with LiveView elements
  fields: MSEElementField[];
  template?: string;
  // Key to identify which carousel this element belongs to (for active element tracking)
  // Format: channelId:vizChannel:showName
  carouselKey?: string;
}

// Element that has been set as "next" to play
export interface MSENextElement {
  channelId: string;
  channelName: string;
  vizChannel: string; // The feed/channel this is set as next for (e.g., "Main", "Preview")
  showName: string;   // Carousel/show name
  elementId: string;  // The element path (e.g., "sequence#3/ELEMENT_NAME")
  timestamp: number;
}

// Viz channel info from /storage/ticker/default/channels
// Maps channel name (e.g., "Main") to its Viz handler (e.g., "viz_Main")
export interface VizChannelInfo {
  name: string;        // Channel name (e.g., "Main", "Preview")
  handler: string;     // Viz handler name (e.g., "viz_Main", "viz_Preview")
  vizHost?: string;    // Viz Engine host
  vizPort?: number;    // Viz Engine port
}

export interface MSEChannelConnection {
  channelId: string;
  channelName: string;
  host: string;
  port: number;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  playingElements: Map<string, MSEPlayingElement>;
  // Viz channels discovered from /storage/ticker/default/channels
  vizChannels: Map<string, VizChannelInfo>;
}

// Carousel on/off state (from /storage/ticker/default/state/{vizChannel}/carousels)
export interface CarouselState {
  channelId: string;      // Database channel ID
  vizChannel: string;     // e.g., "Main", "Preview"
  carouselName: string;   // e.g., "INFO_BAR", "LOWER_THIRD"
  isOn: boolean;
  timestamp: number;
}

interface MSEConnectionsState {
  connections: Map<string, MSEChannelConnection>;
  allPlayingElements: Map<string, MSEPlayingElement>;
  allNextElements: Map<string, MSENextElement>;
  // Carousel on/off states: key = "channelId:carouselName", value = CarouselState
  carouselStates: Map<string, CarouselState>;
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
      const closeBrace = data.indexOf('}', i);
      if (closeBrace === -1) return null;

      const byteCount = parseInt(data.substring(i + 1, closeBrace), 10);
      if (isNaN(byteCount)) return null;

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

// Parse PepTalk/TreeTalk messages
// Message formats from MSE:
// * set attribute /path attrName value
// * set text /path value
// 1 protocol peptalk noaliases
const parseMessage = (message: string): { type: string; data: any } | null => {
  try {
    const trimmed = message.trim();
    if (!trimmed) return null;

    const fields: string[] = [];
    let i = 0;
    while (i < trimmed.length) {
      while (i < trimmed.length && (trimmed[i] === ' ' || trimmed[i] === '\r')) i++;
      if (i >= trimmed.length) break;

      const field = parsePlainTalkField(trimmed, i);
      if (!field) break;
      fields.push(field.value);
      i = field.endIndex + 1;
    }

    if (fields.length < 2) return null;

    const [_requestId, type, ...rest] = fields;

    // Handle "* set attribute /path attrName value" format
    // This is the main format for status updates from MSE
    if (type === 'set' && rest[0] === 'attribute' && rest.length >= 3) {
      const path = rest[1];
      const attrName = rest[2];
      const value = rest.slice(3).join(' ');

      // Track status changes for elements - "pre", "prequeue", "cued", empty status
      // Path format: /storage/shows/SHOWNAME/playlists/carousel/elements/ELEMENT_ID
      // Element IDs can be UUIDs (8995d91b-0ba4-42c4-85a7-509f946ea588) or path-like (sequence#3/ONLINE_2019\N12\MASTER_CONTROL\WEATHER_CITIES)
      if (attrName === 'status' && path.includes('/elements/')) {
        // Extract element ID - capture everything after /elements/ to end of path
        // Handles both UUID format and path-like format (sequence#3/ONLINE_2019\N12\MASTER_CONTROL\WEATHER_CITIES)
        const elementIdMatch = path.match(/\/elements\/(.+)$/);
        if (elementIdMatch) {
          const elementId = elementIdMatch[1];
          const statusValue = value.replace(/^\{[0-9]+\}/, '').trim(); // Remove {N} prefix if present

          // "pre" or "prequeue" means element is about to play / playing
          if (statusValue === 'pre' || statusValue === 'prequeue') {
            return {
              type: 'element_playing',
              data: { path, elementId, status: statusValue }
            };
          }
          // Empty status or other value means element stopped
          if (statusValue === '' || statusValue === 'cued') {
            return {
              type: 'element_stopped',
              data: { path, elementId, status: statusValue }
            };
          }
        }
      }

      // Track active_Main attribute - indicates currently active element
      // Format: * set attribute /storage/shows/INFO_BAR/playlists/carousel/elements active_Main elementName
      if (attrName.startsWith('active_')) {
        const feed = attrName.replace('active_', '');
        return {
          type: 'carousel_active',
          data: { path, feed, activeElement: value }
        };
      }

      // Track schedule_next_* attribute - indicates element set as next
      // Format: * set attribute /storage/shows/INFO_BAR/playlists/carousel schedule_next_Main elementPath
      if (attrName.startsWith('schedule_next_')) {
        const feed = attrName.replace('schedule_next_', '');
        const showMatch = path.match(/\/shows\/([^/]+)/);
        const showName = showMatch?.[1] || 'unknown';
        const elementPath = value.replace(/^\{[0-9]+\}/, '').trim();
        return {
          type: 'schedule_next',
          data: { path, feed, showName, elementId: elementPath }
        };
      }

      return null;
    }

    // Handle carousel state changes from ticker system
    // Path format: /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L
    // "* set text /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L Lon" means INFO_BAR is ON on Main
    if (type === 'set' && rest[0] === 'text' && rest.length >= 2) {
      const path = rest[1];
      const value = rest.slice(2).join(' ');

      // Check for carousel state change (L = Layer state, Lon = Layer on)
      // Path: /storage/ticker/default/state/{vizChannel}/carousels/{carouselName}/current/L
      const carouselStateMatch = path.match(/\/storage\/ticker\/default\/state\/([^/]+)\/carousels\/([^/]+)\/current\/L$/);
      if (carouselStateMatch) {
        const vizChannel = carouselStateMatch[1]; // e.g., "Main"
        const carouselName = carouselStateMatch[2]; // e.g., "INFO_BAR"
        const cleanValue = value.replace(/^\{[0-9]+\}/, '').trim();
        const isOn = cleanValue === 'Lon';

        return {
          type: 'carousel_state_change',
          data: { vizChannel, carouselName, isOn }
        };
      }

      // Check for system/program state change
      // Path: /storage/ticker/default/state/{vizChannel}/system/current or /storage/ticker/default/state/{vizChannel}/program/current
      // Value "on" means ON, empty means OFF
      const systemProgramMatch = path.match(/\/storage\/ticker\/default\/state\/([^/]+)\/(system|program)\/current$/);
      if (systemProgramMatch) {
        const vizChannel = systemProgramMatch[1]; // e.g., "Main"
        const stateType = systemProgramMatch[2]; // "system" or "program"
        const cleanValue = value.replace(/^\{[0-9]+\}/, '').trim();
        const isOn = cleanValue === 'on';
        // Use the stateType directly ("system" or "program") to match button group tag/name
        const carouselName = stateType;

        console.log(`[MSE] Real-time ${stateType} state change:`, { path, value, cleanValue, isOn });
        return {
          type: 'carousel_state_change',
          data: { vizChannel, carouselName, isOn }
        };
      }

      // Extract element ID and field name from path
      // Element ID can be UUID or path-like format
      // Path format: /storage/shows/.../elements/ELEMENT_ID/entry/payload/field[@name='FIELDNAME']
      const elementIdMatch = path.match(/\/elements\/(.+?)(?:\/entry|$)/);
      const fieldNameMatch = path.match(/field\[@name='([^']+)'\]/);

      if (elementIdMatch && fieldNameMatch) {
        return {
          type: 'element_field',
          data: {
            elementId: elementIdMatch[1],
            fieldName: fieldNameMatch[1],
            value: value.replace(/^\{[0-9]+\}/, '').trim()
          }
        };
      }

      // Also capture template name from entry/name path
      // Path format: /storage/shows/.../elements/ELEMENT_ID/entry/name
      if (elementIdMatch && path.endsWith('/entry/name')) {
        return {
          type: 'element_template',
          data: {
            elementId: elementIdMatch[1],
            template: value.replace(/^\{[0-9]+\}/, '').trim()
          }
        };
      }

      // Capture field values from scheduler path
      // Path format: /scheduler/viz_Main/state/background/.../layer_node_data/data/FIELDNAME
      // Example: /scheduler/viz_Main/state/background/ONLINE_2019/N12/MASTER_CONTROL/Default/INFO_BAR/layer_node_data/data/01
      const schedulerFieldMatch = path.match(/\/scheduler\/[^/]+\/state\/background\/.*\/layer_node_data\/data\/([^/]+)$/);
      if (schedulerFieldMatch) {
        const fieldName = schedulerFieldMatch[1];
        const fieldValue = value.replace(/^\{[0-9]+\}/, '').trim();
        // Extract show name from path (e.g., INFO_BAR)
        const showMatch = path.match(/\/([^/]+)\/layer_node_data/);
        return {
          type: 'scheduler_field',
          data: {
            showName: showMatch?.[1] || 'unknown',
            fieldName,
            value: fieldValue,
            path
          }
        };
      }

      // Capture template from scheduler path
      // Path format: /scheduler/viz_Main/state/background/.../template
      const schedulerTemplateMatch = path.match(/\/scheduler\/[^/]+\/state\/background\/.*\/([^/]+)\/template$/);
      if (schedulerTemplateMatch) {
        const showName = schedulerTemplateMatch[1];
        const template = value.replace(/^\{[0-9]+\}/, '').trim();
        return {
          type: 'scheduler_template',
          data: {
            showName,
            template,
            path
          }
        };
      }

      // Capture current state XML from scheduler
      // Path format: /scheduler/viz_Main/state/background/.../current
      // Contains: STATE_<entry name="INFO_BAR">...<entry type="richtext" name="01">VALUE</entry>...</entry>
      // The viz channel name (viz_Main, viz_Preview, etc.) tells us which Viz instance this is for
      if (path.includes('/state/background/') && path.endsWith('/current')) {
        const stateXml = value.replace(/^\{[0-9]+\}/, '').trim();
        // Extract Viz channel name from path (e.g., "viz_Main" from /scheduler/viz_Main/...)
        const vizChannelMatch = path.match(/\/scheduler\/([^/]+)\//);
        const vizChannel = vizChannelMatch?.[1] || 'viz_Main';
        // Extract show name from the STATE_ XML
        const showNameMatch = stateXml.match(/<entry name="([^"]+)">/);
        // Extract field entries
        const fieldEntries: { name: string; value: string }[] = [];
        const entryMatches = stateXml.matchAll(/<entry[^>]*name="(\d+)"[^>]*>([^<]*)<\/entry>/g);
        for (const match of entryMatches) {
          if (match[1] && match[2]) {
            fieldEntries.push({ name: match[1], value: match[2] });
          }
        }
        if (showNameMatch && fieldEntries.length > 0) {
          return {
            type: 'scheduler_state',
            data: {
              vizChannel, // The Viz instance (viz_Main, viz_Preview, etc.)
              showName: showNameMatch[1],
              fields: fieldEntries,
              xml: stateXml
            }
          };
        }
      }
    }

    // Handle protocol response
    // Format: 1 protocol peptalk noaliases
    if (type === 'protocol') {
      return { type: 'protocol', data: { capabilities: rest } };
    }

    // Handle "* added /path" - element added to show
    // Format: * added /storage/shows/SHOWNAME/playlists/carousel/elements/ELEMENT_ID
    if (type === 'added' && rest.length >= 1) {
      const path = rest[0];
      if (path.includes('/storage/shows/') && path.includes('/elements/')) {
        const showMatch = path.match(/\/shows\/([^/]+)/);
        return {
          type: 'show_element_added',
          data: { path, showName: showMatch?.[1] || 'unknown' }
        };
      }
    }

    // Handle "* delete /path" or "* deleted /path" - element deleted from show
    // Format: * delete /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L
    // Format: * deleted /storage/shows/SHOWNAME/playlists/carousel/elements/ELEMENT_ID
    if ((type === 'delete' || type === 'deleted') && rest.length >= 1) {
      const path = rest[0];

      // Check for carousel state deletion (carousel turned OFF)
      // Path: /storage/ticker/default/state/{vizChannel}/carousels/{carouselName}/current/L
      // "* delete /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L" means INFO_BAR is OFF on Main
      const carouselStateMatch = path.match(/\/storage\/ticker\/default\/state\/([^/]+)\/carousels\/([^/]+)\/current\/L$/);
      if (carouselStateMatch) {
        const vizChannel = carouselStateMatch[1]; // e.g., "Main"
        const carouselName = carouselStateMatch[2]; // e.g., "INFO_BAR"

        return {
          type: 'carousel_state_change',
          data: { vizChannel, carouselName, isOn: false }
        };
      }

      // Check for system/program state deletion (turned OFF)
      // Path: /storage/ticker/default/state/{vizChannel}/system/current or /storage/ticker/default/state/{vizChannel}/program/current
      const systemProgramMatch = path.match(/\/storage\/ticker\/default\/state\/([^/]+)\/(system|program)\/current$/);
      if (systemProgramMatch) {
        const vizChannel = systemProgramMatch[1]; // e.g., "Main"
        const stateType = systemProgramMatch[2]; // "system" or "program"
        // Use the stateType directly ("system" or "program") to match button group tag/name
        const carouselName = stateType;

        console.log(`[MSE] Real-time ${stateType} DELETE (OFF):`, { path });
        return {
          type: 'carousel_state_change',
          data: { vizChannel, carouselName, isOn: false }
        };
      }

      if (path.includes('/storage/shows/') && path.includes('/elements/')) {
        const showMatch = path.match(/\/shows\/([^/]+)/);
        return {
          type: 'show_element_deleted',
          data: { path, showName: showMatch?.[1] || 'unknown' }
        };
      }
    }

    // Handle "ok" responses from get commands - may contain element XML data
    // Use proper XML parsing to extract nested elements with their field values
    if (type === 'ok' && rest.length > 0) {
      const xmlData = rest.join(' ');

      // Debug: log all "ok" responses that might contain system/program
      if (xmlData.includes('system') || xmlData.includes('program')) {
        console.log('[MSE] OK response with system/program:', xmlData.substring(0, 800));
      }

      // Check if this is a system or program state response
      // Response format: <entry backing="transient" name="system"><entry name="current">on</entry></entry> (ON)
      // Or: <entry backing="transient" name="system"><entry name="current"/></entry> (OFF)
      // Use a simpler approach: look for name="system" or name="program" and then find the current entry value
      const systemProgramNameMatch = xmlData.match(/name="(system|program)"/);
      if (systemProgramNameMatch && !xmlData.includes('name="channels"') && !xmlData.includes('name="buttons"')) {
        const stateType = systemProgramNameMatch[1]; // "system" or "program"
        // Look for <entry name="current">VALUE</entry> where VALUE is the state
        const currentValueMatch = xmlData.match(/<entry name="current"[^>]*>([^<]*)<\/entry>/);
        // Also check for empty current entry: <entry name="current"/>
        const hasEmptyCurrent = xmlData.includes('<entry name="current"/>');
        const isOn = currentValueMatch ? currentValueMatch[1].trim() === 'on' : false;
        console.log(`[MSE] Initial ${stateType} state from XML:`, { currentValueMatch, hasEmptyCurrent, isOn, xmlData: xmlData.substring(0, 300) });
        // Use stateType directly as carousel name to match button group tag/name
        return {
          type: 'carousel_state_change',
          data: { vizChannel: 'Main', carouselName: stateType, isOn }
        };
      }

      // Check if this is a carousels state response from /storage/ticker/default/state/Main/carousels
      // Response format: <entry name="carousels"><entry backing="transient" name="INFO_BAR"><entry name="current"><L>Lon</L></entry></entry>...</entry>
      if (xmlData.includes('name="carousels"') && !xmlData.includes('name="channels"') && !xmlData.includes('name="buttons"')) {
        console.log('[MSE] Carousels state response (full):', xmlData);
        // Parse all carousel states from the XML
        const carouselStates: Array<{ carouselName: string; isOn: boolean }> = [];

        // Simpler approach: find all entry elements with backing="transient" (these are carousels)
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<root>${xmlData}</root>`, 'application/xml');

        // Debug: log all entries found
        const allEntries = doc.querySelectorAll('entry');
        console.log(`[MSE] Found ${allEntries.length} total entry elements`);
        allEntries.forEach((entry, i) => {
          const name = entry.getAttribute('name');
          const backing = entry.getAttribute('backing');
          console.log(`[MSE] Entry ${i}: name="${name}" backing="${backing}" innerHTML="${entry.innerHTML.substring(0, 100)}"`);
        });

        const carouselEntries = doc.querySelectorAll('entry[backing="transient"]');
        console.log(`[MSE] Found ${carouselEntries.length} carousel entries with backing="transient"`);

        carouselEntries.forEach((entry) => {
          const name = entry.getAttribute('name');
          if (name && name !== 'carousels') {
            const lElement = entry.querySelector('L');
            // If <L> element exists at all, the carousel is ON
            // (real-time updates show "Lon", but depth queries show "0 element, 1 text")
            const isOn = lElement !== null;
            console.log(`[MSE] Initial carousel state: ${name} = ${isOn ? 'ON' : 'OFF'} (L exists: ${isOn})`);
            carouselStates.push({ carouselName: name, isOn });
          }
        });

        if (carouselStates.length > 0) {
          return {
            type: 'initial_carousel_states',
            data: { carouselStates }
          };
        }
      }

      // Check if this is a Viz channels response from /storage/ticker/default/channels
      // This contains the mapping of channel names (Main, Preview) to handlers (viz_Main, viz_Preview)
      if (xmlData.includes('name="channels"') && xmlData.includes('name="handler"')) {
        const vizChannels = parseVizChannelsFromXml(xmlData);
        if (vizChannels.length > 0) {
          return {
            type: 'viz_channels',
            data: { vizChannels }
          };
        }
      }

      // Check if this looks like XML with elements
      if (xmlData.includes('<element')) {
        // First, extract active carousel info (active_Main, etc.) - this tells us THE active element
        const activeCarousels = parseActiveCarouselsFromXml(xmlData);

        // Also extract preloaded elements for metadata
        const parsedElements = parseElementsFromXml(xmlData);

        // If we found active carousels, return them as the primary data
        // These are more important because they tell us which element is ACTUALLY playing
        if (activeCarousels.length > 0) {
          return {
            type: 'initial_state',
            data: {
              activeCarousels,
              preloadedElements: parsedElements.map(el => ({
                elementId: el.elementId,
                status: el.status,
                description: el.description,
                label: el.label,
                template: el.template,
                extractedFields: el.fields
              }))
            }
          };
        }

        // Fallback: if no active carousels found but we have preloaded elements
        if (parsedElements.length > 0) {
          return {
            type: 'element_data_batch',
            data: {
              elements: parsedElements.map(el => ({
                elementId: el.elementId,
                status: el.status,
                description: el.description,
                label: el.label,
                template: el.template,
                extractedFields: el.fields,
                xml: '(parsed via XML parser)'
              }))
            }
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};


/**
 * Hook to manage MSE connections for Vizrt channels.
 * Automatically connects to all Vizrt channels that have MSE host configured.
 * Provides aggregated playing element state across all channels.
 */
export const useChannelMSE = (channels: Channel[]) => {
  const [state, setState] = useState<MSEConnectionsState>({
    connections: new Map(),
    allPlayingElements: new Map(),
    allNextElements: new Map(),
    carouselStates: new Map()
  });

  // Track when connections are established/re-established
  // Consumers can watch this to trigger data reloads on reconnect
  const [lastConnectedAt, setLastConnectedAt] = useState<number>(0);

  // Track when show content changes (elements added/deleted)
  // Consumers can watch this to trigger data reloads when shows change
  const [lastShowChangeAt, setLastShowChangeAt] = useState<number>(0);

  const wsRefs = useRef<Map<string, WebSocket>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messageIdRefs = useRef<Map<string, number>>(new Map());

  // Ref to store pending state updates - batched and applied on animation frame
  // This prevents constant re-renders from rapid MSE WebSocket messages
  const pendingStateUpdateRef = useRef<MSEConnectionsState | null>(null);
  const updateScheduledRef = useRef(false);

  // Ref to accumulate carousel state changes across multiple WebSocket messages
  // Changes are debounced and applied together after a short delay
  const pendingCarouselChangesRef = useRef<Map<string, { channelId: string; vizChannel: string; carouselName: string; isOn: boolean }>>(new Map());
  const carouselUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to always have access to current state (avoids stale closure issues)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Batched setState - accumulates changes and applies them on animation frame
  // Uses refs to avoid dependency on state, making this callback stable
  // NOTE: This has issues with multiple rapid updates in the same tick - use React's
  // setState directly for carousel state changes
  const scheduleStateUpdate = useCallback((
    updater: (prev: MSEConnectionsState) => MSEConnectionsState
  ) => {
    // Get current state from ref (either pending or from React state)
    const currentState = pendingStateUpdateRef.current || {
      connections: new Map(stateRef.current.connections),
      allPlayingElements: new Map(stateRef.current.allPlayingElements),
      allNextElements: new Map(stateRef.current.allNextElements),
      carouselStates: new Map(stateRef.current.carouselStates)
    };

    // Apply the updater to get new state
    const newState = updater({
      connections: currentState.connections,
      allPlayingElements: currentState.allPlayingElements,
      allNextElements: currentState.allNextElements,
      carouselStates: currentState.carouselStates
    });

    // Store as pending
    pendingStateUpdateRef.current = newState;

    // Schedule the actual setState if not already scheduled
    if (!updateScheduledRef.current) {
      updateScheduledRef.current = true;
      requestAnimationFrame(() => {
        if (pendingStateUpdateRef.current) {
          setState(pendingStateUpdateRef.current);
          pendingStateUpdateRef.current = null;
        }
        updateScheduledRef.current = false;
      });
    }
  }, []); // No dependencies - uses refs for state access

  // Get Vizrt channels with MSE host configured
  // We memoize based on a stable key (channel IDs + hosts) to prevent reconnects
  // when the channels array reference changes but content is the same
  const channelsKey = useMemo(() => {
    return channels
      .filter(ch => ch.type === 'Vizrt' && ch.mse_host)
      .map(ch => `${ch.id}:${ch.mse_host}:${ch.mse_port || DEFAULT_MSE_PORT}`)
      .sort()
      .join('|');
  }, [channels]);

  const vizrtChannels = useMemo(() => {
    const vizrt = channels.filter(ch => ch.type === 'Vizrt' && ch.mse_host);
    return vizrt;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelsKey]);

  // Send command to a specific channel's MSE
  // PepTalk protocol requires newline at end of each message
  const sendCommand = useCallback((channelId: string, command: string): number => {
    const ws = wsRefs.current.get(channelId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msgId = (messageIdRefs.current.get(channelId) || 0) + 1;
      messageIdRefs.current.set(channelId, msgId);
      const fullCmd = `${msgId} ${command}\n`;
      ws.send(fullCmd);
      return msgId;
    }
    return -1;
  }, []);

  // Connect to a specific channel's MSE
  const connectChannel = useCallback((channel: Channel) => {
    if (!channel.mse_host) return;

    const channelId = channel.id;
    const host = channel.mse_host;
    const port = channel.mse_port || DEFAULT_MSE_PORT;


    // Clean up existing connection
    const existingWs = wsRefs.current.get(channelId);
    if (existingWs) {
      existingWs.close();
      wsRefs.current.delete(channelId);
    }

    // Clear any pending reconnect
    const existingTimeout = reconnectTimeoutsRef.current.get(channelId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      reconnectTimeoutsRef.current.delete(channelId);
    }

    // Update state to connecting
    setState(prev => {
      const newConnections = new Map(prev.connections);
      newConnections.set(channelId, {
        channelId,
        channelName: channel.name,
        host,
        port,
        status: 'connecting',
        error: null,
        playingElements: new Map(),
        vizChannels: new Map()
      });
      return { ...prev, connections: newConnections };
    });

    try {
      const ws = new WebSocket(`ws://${host}:${port}`);
      // Explicitly set binary type to handle both text and binary messages
      ws.binaryType = 'arraybuffer';
      wsRefs.current.set(channelId, ws);

      ws.onopen = () => {
        // Connected successfully
        setState(prev => {
          const newConnections = new Map(prev.connections);
          const conn = newConnections.get(channelId);
          if (conn) {
            newConnections.set(channelId, { ...conn, status: 'connected', error: null });
          }
          return { ...prev, connections: newConnections };
        });

        // Update lastConnectedAt to signal consumers that a connection was established
        // This allows LiveViewPage to reload data when MSE reconnects
        setLastConnectedAt(Date.now());

        // Initialize PepTalk protocol - send directly on the ws instance
        // PepTalk protocol requires newline at end of each message
        const msgId = (messageIdRefs.current.get(channelId) || 0) + 1;
        messageIdRefs.current.set(channelId, msgId);
        const cmd = `${msgId} protocol peptalk\n`;
        ws.send(cmd);
      };

      ws.onmessage = (event) => {
        // Handle both ArrayBuffer (binary) and string data
        let rawData: string;
        if (event.data instanceof ArrayBuffer) {
          rawData = new TextDecoder('utf-8').decode(event.data);
        } else if (typeof event.data === 'string') {
          rawData = event.data;
        } else {
          return;
        }

        const messages = rawData.split('\n').filter(m => m.trim());

        for (const msg of messages) {
          const parsed = parseMessage(msg);
          if (!parsed) continue;

          // Handle protocol response
          if (parsed.type === 'protocol') {
            // Subscribe to /scheduler to receive real-time state updates (STATE_ messages)
            // This is the primary source for currently playing element data
            sendCommand(channelId, 'subscribe /scheduler');
            // Also subscribe to /storage/shows for element status and active_Main changes
            sendCommand(channelId, 'subscribe /storage/shows');
            // Subscribe to ticker state for carousel on/off state changes
            sendCommand(channelId, 'subscribe /storage/ticker/default/state');
            // Query Viz channels (viz_Main, viz_Preview, etc.) - each can have different playing elements
            // This is queried once on connect to understand available Viz instances
            sendCommand(channelId, 'get /storage/ticker/default/channels 2');
            // Query current state with depth to see what's already playing
            // PepTalk syntax: get <path> [<depth>] - depth is a number, not key:value
            sendCommand(channelId, 'get /storage/shows 10');
            // Query initial ticker system and program states
            // These are separate from carousel states and need to be queried explicitly
            console.log('[MSE] Querying initial system and program states...');
            sendCommand(channelId, 'get /storage/ticker/default/state/Main/system 2');
            sendCommand(channelId, 'get /storage/ticker/default/state/Main/program 2');
            // Query initial carousel states (depth 4 to get /carousels/NAME/current/L and its content)
            sendCommand(channelId, 'get /storage/ticker/default/state/Main/carousels 4');
          }

          // Handle viz_channels response - update the connection's vizChannels map
          // This maps channel names (Main, Preview) to Viz handlers (viz_Main, viz_Preview)
          if (parsed.type === 'viz_channels') {
            const { vizChannels } = parsed.data;

            setState(prev => {
              const newConnections = new Map(prev.connections);
              const conn = newConnections.get(channelId);
              if (conn) {
                const newVizChannels = new Map<string, VizChannelInfo>();
                for (const vc of vizChannels) {
                  // Store by handler name for quick lookup from scheduler paths
                  newVizChannels.set(vc.handler, vc);
                }
                newConnections.set(channelId, { ...conn, vizChannels: newVizChannels });
              }
              return { ...prev, connections: newConnections };
            });
          }

          // Handle show element added/deleted - trigger refresh for consumers
          if (parsed.type === 'show_element_added' || parsed.type === 'show_element_deleted') {
            setLastShowChangeAt(Date.now());
          }

          // Handle element_playing events (status = "pre" or "prequeue")
          if (parsed.type === 'element_playing') {
            const { path, elementId } = parsed.data;

            // Skip container/show level status changes - we only want individual elements
            // Real element paths contain /elements/ followed by UUID or sequence path
            // Container paths are like /storage/shows/INFO_BAR or /storage/shows/INFO_BAR/playlists/carousel
            if (!path?.includes('/elements/')) {
              continue;
            }

            // Skip if elementId looks like a known show/container name
            // Real element IDs are UUIDs (8995d91b-0ba4-42c4-...) or sequence paths (sequence#5/...)
            if (/^(INFO_BAR|BACKGROUND|BANNER|BG|carousel)$/i.test(elementId)) {
              continue;
            }

            const showMatch = path?.match(/\/shows\/([^/]+)/);
            const playlistMatch = path?.match(/\/playlists\/([^/]+)/);
            const showName = showMatch?.[1] || 'unknown';
            const playlistName = playlistMatch?.[1] || 'unknown';

            // Create carousel key for tracking active element per carousel
            // Default to Main feed since that's the most common
            const carouselKey = `${channelId}:${showName}:Main`;

            const playingElement: MSEPlayingElement = {
              channelId,
              channelName: channel.name,
              showName,
              playlistName,
              elementId,
              elementPath: path || '',
              timestamp: Date.now(),
              fields: [], // Will be populated when we get element details
              carouselKey
            };

            // Request element details to get field values for matching
            // PepTalk syntax: get <path> [<depth>] - depth is a number, not key:value
            if (path) {
              sendCommand(channelId, `get ${path} 5`);
            }

            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              // Remove any existing element for this carousel before adding new one
              for (const [key, el] of newAllPlaying) {
                if (el.carouselKey === carouselKey && el.elementId !== elementId) {
                  newAllPlaying.delete(key);
                }
              }

              const conn = newConnections.get(channelId);
              if (conn) {
                const newChannelPlaying = new Map(conn.playingElements);
                // Also clean up old elements in channel's map
                for (const [key, el] of newChannelPlaying) {
                  if (el.carouselKey === carouselKey && el.elementId !== elementId) {
                    newChannelPlaying.delete(key);
                  }
                }
                newChannelPlaying.set(elementId, playingElement);
                newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });
              }

              newAllPlaying.set(`${channelId}:${elementId}`, playingElement);

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }

          // Handle element_stopped events (status = "" or "cued")
          // NOTE: We intentionally do NOT remove elements here.
          // The arrow should stay on the current element until a NEW element gets pre/prequeue status.
          // Elements are only replaced when:
          // 1. A new element_playing event comes in (handled above)
          // 2. A carousel_active event comes in with a different element (handled below)
          if (parsed.type === 'element_stopped') {
            // Just log for debugging - don't remove the element
            // Element stopped - don't log, just note we're keeping arrow until next pre/prequeue
          }

          // Handle carousel_active events - THIS IS THE KEY EVENT
          // When active_Main changes, the previous element is no longer playing
          // Only the element specified in active_Main is currently on-air
          // The feed (e.g., "Main" from active_Main) IS the vizChannel
          if (parsed.type === 'carousel_active') {
            const { path, feed, activeElement } = parsed.data;

            if (activeElement) {
              // Extract show name from path for keying
              const showMatch = path?.match(/\/shows\/([^/]+)/);
              const playlistMatch = path?.match(/\/playlists\/([^/]+)/);
              const showName = showMatch?.[1] || 'unknown';
              const playlistName = playlistMatch?.[1] || 'carousel';
              const carouselKey = `${channelId}:${showName}:${feed}`;

              // Log when active element changes (user triggers "next")
              console.log(`[MSE] ${feed}: ${showName}/${activeElement}`);

              // Create the new active element
              // feed is the vizChannel name (e.g., "Main" from active_Main)
              const playingElement: MSEPlayingElement = {
                channelId,
                channelName: channel.name,
                vizChannel: `viz_${feed}`, // Store as viz_Main format for consistency
                showName,
                playlistName,
                elementId: activeElement,
                elementPath: `${path}/elements/${activeElement}`,
                timestamp: Date.now(),
                fields: [], // Will be populated when we get element details
                carouselKey
              };

              // Request element details to get field values for matching
              if (path) {
                sendCommand(channelId, `get ${path}/elements/${activeElement} 5`);
              }

              // Remove old elements for this carousel and ADD the new active one
              // Also clear any "next" element for this carousel since it's now playing
              scheduleStateUpdate(prev => {
                const newConnections = new Map(prev.connections);
                const newAllPlaying = new Map(prev.allPlayingElements);
                const newNextElements = new Map(prev.allNextElements);

                // Remove old elements for this carousel
                for (const [key, el] of newAllPlaying) {
                  if (el.carouselKey === carouselKey && el.elementId !== activeElement) {
                    newAllPlaying.delete(key);
                  }
                }

                // Add the new active element
                newAllPlaying.set(`${channelId}:${activeElement}`, playingElement);

                // Also update channel's playing elements
                const conn = newConnections.get(channelId);
                if (conn) {
                  const newChannelPlaying = new Map(conn.playingElements);
                  for (const [key, el] of newChannelPlaying) {
                    if (el.carouselKey === carouselKey && el.elementId !== activeElement) {
                      newChannelPlaying.delete(key);
                    }
                  }
                  // Add new element
                  newChannelPlaying.set(activeElement, playingElement);
                  newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });
                }

                // Clear the "next" element for this carousel since it's now playing
                const nextKey = `${channelId}:${showName}:${feed}`;
                if (newNextElements.has(nextKey)) {
                  const nextEl = newNextElements.get(nextKey);
                  // Only clear if the active element matches or contains the next element
                  if (nextEl && (activeElement === nextEl.elementId || activeElement.includes(nextEl.elementId) || nextEl.elementId.includes(activeElement))) {
                    newNextElements.delete(nextKey);
                  }
                }

                return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: newNextElements, carouselStates: prev.carouselStates };
              });
            }
          }

          // Handle schedule_next events - track elements set as next
          // When an element is set as next, add it to nextElements
          // When it becomes active (carousel_active), remove it from nextElements
          if (parsed.type === 'schedule_next') {
            const { feed, showName, elementId } = parsed.data;

            if (elementId) {
              console.log(`[MSE] Set as next: ${showName}/${elementId} for ${feed}`);

              const nextElement: MSENextElement = {
                channelId,
                channelName: channel.name,
                vizChannel: feed,
                showName,
                elementId,
                timestamp: Date.now()
              };

              scheduleStateUpdate(prev => {
                const newNextElements = new Map(prev.allNextElements);
                // Key by channelId:showName:feed to ensure one next element per carousel per feed
                const key = `${channelId}:${showName}:${feed}`;
                newNextElements.set(key, nextElement);
                return { ...prev, allNextElements: newNextElements };
              });
            }
          }

          // Handle carousel_state_change events - carousel turned on/off
          // From: "* set text /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L Lon" (ON)
          // From: "* delete /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L" (OFF)
          // Accumulate changes in ref and debounce the state update
          if (parsed.type === 'carousel_state_change') {
            const { vizChannel, carouselName, isOn } = parsed.data;
            const key = `${channelId}:${carouselName}`;
            console.log(`[MSE] Carousel state change received: key="${key}" isOn=${isOn}`);

            // Store in pending changes map (keyed to deduplicate rapid updates for same carousel)
            pendingCarouselChangesRef.current.set(key, { channelId, vizChannel, carouselName, isOn });

            // Clear any existing timeout and schedule a new one
            if (carouselUpdateTimeoutRef.current) {
              clearTimeout(carouselUpdateTimeoutRef.current);
            }

            // Apply all pending changes after 50ms of no new changes
            carouselUpdateTimeoutRef.current = setTimeout(() => {
              const changes = pendingCarouselChangesRef.current;
              if (changes.size > 0) {
                console.log(`[MSE] Applying ${changes.size} carousel state changes`);
                setState(prev => {
                  const newCarouselStates = new Map(prev.carouselStates);
                  const timestamp = Date.now();
                  for (const [stateKey, change] of changes) {
                    const carouselState: CarouselState = {
                      channelId: change.channelId,
                      vizChannel: change.vizChannel,
                      carouselName: change.carouselName,
                      isOn: change.isOn,
                      timestamp
                    };
                    newCarouselStates.set(stateKey, carouselState);
                    console.log(`[MSE] Carousel state applied: key="${stateKey}" isOn=${change.isOn}`);
                  }
                  return { ...prev, carouselStates: newCarouselStates };
                });
                pendingCarouselChangesRef.current.clear();
              }
              carouselUpdateTimeoutRef.current = null;
            }, 50);
          }

          // Handle initial_carousel_states - batch response from querying /storage/ticker/default/state/Main/carousels
          if (parsed.type === 'initial_carousel_states') {
            const { carouselStates } = parsed.data;
            console.log(`[MSE] Applying ${carouselStates.length} initial carousel states`);

            setState(prev => {
              const newCarouselStates = new Map(prev.carouselStates);
              const timestamp = Date.now();

              for (const { carouselName, isOn } of carouselStates) {
                const key = `${channelId}:${carouselName}`;
                const carouselState: CarouselState = {
                  channelId,
                  vizChannel: 'Main',
                  carouselName,
                  isOn,
                  timestamp
                };
                newCarouselStates.set(key, carouselState);
              }

              return { ...prev, carouselStates: newCarouselStates };
            });
          }

          // Handle element_field events - update field values for a playing element
          if (parsed.type === 'element_field') {
            const { elementId, fieldName, value } = parsed.data;


            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              // Update in channel's playing elements
              const conn = newConnections.get(channelId);
              if (conn) {
                const existing = conn.playingElements.get(elementId);
                if (existing) {
                  const newFields = [...existing.fields.filter(f => f.name !== fieldName), { name: fieldName, value }];
                  const updated = { ...existing, fields: newFields };
                  const newChannelPlaying = new Map(conn.playingElements);
                  newChannelPlaying.set(elementId, updated);
                  newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });

                  // Also update in allPlayingElements
                  const key = `${channelId}:${elementId}`;
                  if (newAllPlaying.has(key)) {
                    newAllPlaying.set(key, updated);
                  }
                }
              }

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }

          // Handle element_template events - update template for a playing element
          if (parsed.type === 'element_template') {
            const { elementId, template } = parsed.data;


            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              // Update in channel's playing elements
              const conn = newConnections.get(channelId);
              if (conn) {
                const existing = conn.playingElements.get(elementId);
                if (existing) {
                  const updated = { ...existing, template };
                  const newChannelPlaying = new Map(conn.playingElements);
                  newChannelPlaying.set(elementId, updated);
                  newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });

                  // Also update in allPlayingElements
                  const key = `${channelId}:${elementId}`;
                  if (newAllPlaying.has(key)) {
                    newAllPlaying.set(key, updated);
                  }
                }
              }

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }

          // Helper function to process element data - ONLY updates existing elements
          // We don't add elements from element_data_batch because status="pre" just means
          // the element is preloaded in carousel, not that it's THE active element.
          // Active elements are only tracked via:
          // 1. element_playing events (real-time status changes)
          // 2. carousel_active events (active_Main attribute)
          const processElementData = (elementData: {
            elementId: string;
            status: string;
            description?: string;
            label?: string;
            template?: string;
            extractedFields?: { name: string; value: string }[];
            xml?: string;
          }, addIfNew: boolean = false) => {
            const { elementId, status, description, label, template, extractedFields } = elementData;

            // Create or update the playing element with description and extracted fields
            const fields: MSEElementField[] = [];
            if (description) {
              fields.push({ name: 'description', value: description });
            }
            if (label) {
              fields.push({ name: 'label', value: label });
            }
            // Add any extracted field values from the XML payload
            if (extractedFields && extractedFields.length > 0) {
              for (const ef of extractedFields) {
                // Avoid duplicates
                if (!fields.some(f => f.name === ef.name)) {
                  fields.push(ef);
                }
              }
            }

            // Extract show name from element ID path if available
            // Element ID format: sequence#N/SHOW_PATH or UUID
            const showFromPath = elementId.match(/\/([^/]+)$/)?.[1] || elementId.split('/').pop();

            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              const conn = newConnections.get(channelId);
              if (conn) {
                const newChannelPlaying = new Map(conn.playingElements);
                const existing = newChannelPlaying.get(elementId);

                if (existing) {
                  // Update existing element with new fields
                  const mergedFields = [...existing.fields];
                  for (const field of fields) {
                    if (!mergedFields.some(f => f.name === field.name)) {
                      mergedFields.push(field);
                    }
                  }
                  const merged = {
                    ...existing,
                    fields: mergedFields,
                    template: template || existing.template,
                    showName: description || existing.showName
                  };
                  newChannelPlaying.set(elementId, merged);
                  newAllPlaying.set(`${channelId}:${elementId}`, merged);
                  newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });

                } else if (addIfNew && (status === 'pre' || status === 'prequeue')) {
                  // Only add if explicitly requested (from element_playing events, not batch)
                  const playingElement: MSEPlayingElement = {
                    channelId,
                    channelName: channel.name,
                    showName: description || label || showFromPath || 'unknown',
                    playlistName: 'carousel',
                    elementId,
                    elementPath: '',
                    timestamp: Date.now(),
                    fields,
                    template
                  };
                  newChannelPlaying.set(elementId, playingElement);
                  newAllPlaying.set(`${channelId}:${elementId}`, playingElement);
                  newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });
                }
              }

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          };

          // Handle element_data events - only UPDATE existing elements, don't add new ones
          // Elements are only added via element_playing (real-time) or carousel_active events
          if (parsed.type === 'element_data') {
            // addIfNew = false - only update existing elements
            processElementData(parsed.data, false);
          }

          // Handle batch element_data from XML - these come from initial get response
          // We DON'T add these because status="pre" just means preloaded, not active
          // We only log them for debugging - they'll be used to update elements
          // that were already added via carousel_active events
          if (parsed.type === 'element_data_batch') {
            const { elements } = parsed.data;
            // Only update existing elements, don't add new ones
            for (const elementData of elements) {
              processElementData(elementData, false);
            }
          }

          // Handle initial_state - contains active carousels AND preloaded elements
          // This is the key handler for setting up initial state with THE active element per carousel
          if (parsed.type === 'initial_state') {
            const { activeCarousels, preloadedElements } = parsed.data;


            // Create a map of preloaded elements for quick lookup by ID
            const preloadedMap = new Map<string, any>();
            for (const el of preloadedElements) {
              preloadedMap.set(el.elementId, el);
            }

            // Process each active carousel - these are THE elements that are currently playing
            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              const conn = newConnections.get(channelId);
              if (!conn) return prev;

              const newChannelPlaying = new Map(conn.playingElements);

              for (const carousel of activeCarousels) {
                const { showName, playlistName, feed, activeElement } = carousel;
                const carouselKey = `${channelId}:${showName}:${feed}`;

                // Remove any existing element for this carousel (ensure only one per carousel)
                for (const [key, el] of newAllPlaying) {
                  if (el.carouselKey === carouselKey && el.elementId !== activeElement) {
                    newAllPlaying.delete(key);
                  }
                }
                for (const [key, el] of newChannelPlaying) {
                  if (el.carouselKey === carouselKey && el.elementId !== activeElement) {
                    newChannelPlaying.delete(key);
                  }
                }

                // Look up the preloaded element data to get description/fields
                const preloaded = preloadedMap.get(activeElement);

                // Note: preloaded data may not exist for all active elements

                // Build fields array from preloaded data
                const fields: MSEElementField[] = [];
                if (preloaded?.description) {
                  fields.push({ name: 'description', value: preloaded.description });
                }
                if (preloaded?.label) {
                  fields.push({ name: 'label', value: preloaded.label });
                }
                if (preloaded?.extractedFields) {
                  for (const ef of preloaded.extractedFields) {
                    if (!fields.some(f => f.name === ef.name)) {
                      fields.push(ef);
                    }
                  }
                }

                // Use description as the displayable showName for matching purposes
                // The carousel showName (like "INFO_BAR") is just for keying, not matching
                const displayShowName = preloaded?.description || preloaded?.label || showName;

                const playingElement: MSEPlayingElement = {
                  channelId,
                  channelName: channel.name,
                  vizChannel: `viz_${feed}`, // The feed (Main, Preview) IS the vizChannel
                  showName: displayShowName, // Use description for matching, not carousel name
                  playlistName,
                  elementId: activeElement,
                  elementPath: `/storage/shows/${showName}/playlists/${playlistName}/elements/${activeElement}`,
                  timestamp: Date.now(),
                  fields,
                  template: preloaded?.template,
                  carouselKey
                };

                // Add to maps
                newChannelPlaying.set(activeElement, playingElement);
                newAllPlaying.set(`${channelId}:${activeElement}`, playingElement);
              }

              // Reduced logging - only log count

              newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });
              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }

          // Handle scheduler_state events - THE MAIN SOURCE OF TRUTH for currently playing element data
          // This comes from: * set text /scheduler/viz_Main/state/background/.../INFO_BAR/current {N}STATE_<entry...>
          // It contains the actual field values being displayed on-air
          // Each Viz channel (viz_Main, viz_Preview, etc.) can have different playing elements
          if (parsed.type === 'scheduler_state') {
            const { vizChannel, showName, fields } = parsed.data;

            // Create a unique key for this Viz channel + show/layer combination
            // Each Viz instance (viz_Main, viz_Preview) tracks its own playing elements
            const carouselKey = `${channelId}:${vizChannel}:${showName}`;

            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              const conn = newConnections.get(channelId);
              if (!conn) return prev;

              const newChannelPlaying = new Map(conn.playingElements);

              // Update any existing elements for this showName with the vizChannel
              // This correlates pre/prequeue elements with their vizChannel from scheduler_state
              for (const [key, el] of newAllPlaying) {
                if (el.channelId === channelId && el.showName === showName && !el.vizChannel) {
                  const updated = { ...el, vizChannel, fields: fields.map((f: {name: string; value: string}) => ({ name: f.name, value: f.value })) };
                  newAllPlaying.set(key, updated);
                }
              }
              for (const [key, el] of newChannelPlaying) {
                if (el.showName === showName && !el.vizChannel) {
                  const updated = { ...el, vizChannel, fields: fields.map((f: {name: string; value: string}) => ({ name: f.name, value: f.value })) };
                  newChannelPlaying.set(key, updated);
                }
              }

              // Remove any existing element for this specific carousel key
              for (const [key, el] of newAllPlaying) {
                if (el.carouselKey === carouselKey) {
                  newAllPlaying.delete(key);
                }
              }
              for (const [key, el] of newChannelPlaying) {
                if (el.carouselKey === carouselKey) {
                  newChannelPlaying.delete(key);
                }
              }

              // Create a new playing element with the field values from scheduler state
              // Include vizChannel to distinguish between different Viz instances
              const elementKey = `${vizChannel}:${showName}:live`;
              const playingElement: MSEPlayingElement = {
                channelId,
                channelName: channel.name,
                vizChannel, // The Viz instance (viz_Main, viz_Preview, etc.)
                showName, // The layer name like INFO_BAR
                playlistName: 'carousel',
                elementId: elementKey,
                elementPath: '',
                timestamp: Date.now(),
                fields: fields.map((f: {name: string; value: string}) => ({ name: f.name, value: f.value })),
                carouselKey
              };

              newChannelPlaying.set(elementKey, playingElement);
              newAllPlaying.set(`${channelId}:${elementKey}`, playingElement);
              newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }

          // Handle changed events (legacy - keeping for backwards compatibility)
          if (parsed.type === 'changed' && parsed.data.attrName === 'carousel_status') {
            const { nodeId } = parsed.data;

            scheduleStateUpdate(prev => {
              const newConnections = new Map(prev.connections);
              const newAllPlaying = new Map(prev.allPlayingElements);

              const conn = newConnections.get(channelId);
              if (conn) {
                const newChannelPlaying = new Map(conn.playingElements);
                for (const [key, value] of newChannelPlaying) {
                  if (value.elementId === nodeId || key === nodeId) {
                    newChannelPlaying.delete(key);
                  }
                }
                newConnections.set(channelId, { ...conn, playingElements: newChannelPlaying });
              }

              for (const [key, value] of newAllPlaying) {
                if (value.channelId === channelId && (value.elementId === nodeId || key.includes(nodeId))) {
                  newAllPlaying.delete(key);
                }
              }

              return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
            });
          }
        }
        // Carousel state changes are now handled via debounced ref-based batching above
      };

      ws.onerror = (error) => {
        console.error(`[MSE] ✗ WebSocket error for "${channel.name}":`, error);
        setState(prev => {
          const newConnections = new Map(prev.connections);
          const conn = newConnections.get(channelId);
          if (conn) {
            newConnections.set(channelId, { ...conn, status: 'error', error: 'WebSocket error' });
          }
          return { ...prev, connections: newConnections };
        });
      };

      ws.onclose = (event) => {
        const reason = event.reason || (event.code === 1000 ? 'Normal closure' : `Code ${event.code}`);
        // Connection closed
        setState(prev => {
          const newConnections = new Map(prev.connections);
          const conn = newConnections.get(channelId);
          if (conn) {
            newConnections.set(channelId, {
              ...conn,
              status: 'disconnected',
              error: event.code !== 1000 ? `Disconnected (${reason})` : null
            });
          }
          return { ...prev, connections: newConnections };
        });

        // Attempt to reconnect after 5 seconds
        if (event.code !== 1000) {
          // Will attempt reconnect in 5 seconds
          const timeout = setTimeout(() => {
            connectChannel(channel);
          }, 5000);
          reconnectTimeoutsRef.current.set(channelId, timeout);
        }
      };

    } catch (err) {
      console.error(`Error creating MSE WebSocket for channel ${channel.name}:`, err);
      setState(prev => {
        const newConnections = new Map(prev.connections);
        newConnections.set(channelId, {
          channelId,
          channelName: channel.name,
          host,
          port,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to connect',
          playingElements: new Map(),
          vizChannels: new Map()
        });
        return { ...prev, connections: newConnections };
      });
    }
  }, [sendCommand, scheduleStateUpdate]);

  // Disconnect a specific channel
  const disconnectChannel = useCallback((channelId: string) => {
    const ws = wsRefs.current.get(channelId);
    if (ws) {
      ws.close(1000, 'User disconnected');
      wsRefs.current.delete(channelId);
    }

    const timeout = reconnectTimeoutsRef.current.get(channelId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeoutsRef.current.delete(channelId);
    }

    setState(prev => {
      const newConnections = new Map(prev.connections);
      newConnections.delete(channelId);

      const newAllPlaying = new Map(prev.allPlayingElements);
      for (const [key, value] of newAllPlaying) {
        if (value.channelId === channelId) {
          newAllPlaying.delete(key);
        }
      }

      return { connections: newConnections, allPlayingElements: newAllPlaying, allNextElements: prev.allNextElements, carouselStates: prev.carouselStates };
    });
  }, []);

  // Connect/disconnect based on channels
  useEffect(() => {
    const currentChannelIds = new Set(vizrtChannels.map(ch => ch.id));
    const connectedChannelIds = new Set(wsRefs.current.keys());

    // Connect new channels
    for (const channel of vizrtChannels) {
      if (!connectedChannelIds.has(channel.id)) {
        connectChannel(channel);
      }
    }

    // Disconnect removed channels
    for (const channelId of connectedChannelIds) {
      if (!currentChannelIds.has(channelId)) {
        disconnectChannel(channelId);
      }
    }
  }, [vizrtChannels, connectChannel, disconnectChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const [channelId] of wsRefs.current) {
        disconnectChannel(channelId);
      }
    };
  }, [disconnectChannel]);

  // Check if an element is playing (across all channels)
  const isElementPlaying = useCallback((elementId: string): boolean => {
    for (const [, element] of state.allPlayingElements) {
      if (element.elementId === elementId) {
        return true;
      }
    }
    return false;
  }, [state.allPlayingElements]);

  // Get all playing element IDs
  const getAllPlayingElementIds = useCallback((): Set<string> => {
    const ids = new Set<string>();
    state.allPlayingElements.forEach(element => {
      ids.add(element.elementId);
    });
    return ids;
  }, [state.allPlayingElements]);

  // Check if a LiveView element matches any playing MSE element by field values
  // This is the key matching function for the UI to determine which elements are playing
  const isElementPlayingByFields = useCallback((
    elementFields: { name: string; value: string }[],
    elementTemplate?: string,
    showName?: string // Optional: filter by show name (e.g., "BG", "BANNER")
  ): boolean => {
    for (const [, playingElement] of state.allPlayingElements) {
      // If showName filter is provided, only match elements from that show
      if (showName && playingElement.showName !== showName) {
        continue;
      }

      // Match by template if both have it
      if (elementTemplate && playingElement.template) {
        // Template names might include path, compare just the final component
        const liveTemplate = elementTemplate.split('/').pop()?.toLowerCase();
        const mseTemplate = playingElement.template.split('/').pop()?.toLowerCase();
        if (liveTemplate && mseTemplate && liveTemplate !== mseTemplate) {
          continue; // Templates don't match, skip this element
        }
      }

      // Match by field values - check if any field value matches
      // We look for fields with the same name and matching values
      if (elementFields.length > 0 && playingElement.fields.length > 0) {
        let matchCount = 0;
        for (const liveField of elementFields) {
          const mseField = playingElement.fields.find(
            f => f.name.toLowerCase() === liveField.name.toLowerCase()
          );
          if (mseField && mseField.value === liveField.value) {
            matchCount++;
          }
        }

        // Consider it a match if at least one field matches
        // For stronger matching, you could require all fields to match
        if (matchCount > 0) {
          return true;
        }
      }

      // Also try matching the first field value against the MSE element's showName/description
      // This handles the case where vizrt-ticker fields don't have "description" name
      if (elementFields.length > 0 && playingElement.showName) {
        const firstFieldValue = elementFields[0].value;
        if (firstFieldValue && firstFieldValue === playingElement.showName) {
          return true;
        }
      }

      // Try matching ANY LiveView field value against the MSE element's description field
      // This catches cases where the field names differ but values match
      // MSE descriptions are often concatenated field values like "City1 50°F/City2 48°F/City3 52°F"
      if (elementFields.length > 0) {
        const mseDescription = playingElement.fields.find(f => f.name === 'description')?.value;
        if (mseDescription) {
          for (const liveField of elementFields) {
            // Exact match
            if (liveField.value === mseDescription) {
              return true;
            }
            // Check if LiveView field value is contained in MSE description (for concatenated descriptions)
            // The description format is often "value1/value2/value3"
            if (liveField.value && mseDescription.includes(liveField.value)) {
              return true;
            }
          }
        }
      }

      // Reverse matching: check if MSE showName matches or contains ANY LiveView field value
      // This handles cases where MSE showName (from description attribute) matches element content
      if (elementFields.length > 0 && playingElement.showName && playingElement.showName !== 'unknown') {
        for (const liveField of elementFields) {
          if (liveField.value) {
            // Exact match
            if (liveField.value === playingElement.showName) {
              return true;
            }
            // Check if LiveView field value is contained in MSE showName
            if (playingElement.showName.includes(liveField.value)) {
              return true;
            }
          }
        }
      }

      // If no fields to compare but templates matched, consider it a match
      if (elementFields.length === 0 && playingElement.fields.length === 0) {
        if (elementTemplate && playingElement.template) {
          return true;
        }
      }
    }

    // Log failed match if there are playing elements but no match found
    if (state.allPlayingElements.size > 0 && elementFields.length > 0) {
      // No match found
    }

    return false;
  }, [state.allPlayingElements]);

  // Get all playing elements (for more detailed matching in UI)
  const getPlayingElements = useCallback((): MSEPlayingElement[] => {
    return Array.from(state.allPlayingElements.values());
  }, [state.allPlayingElements]);

  // Get all next elements (elements that have been set as next)
  const getNextElements = useCallback((): MSENextElement[] => {
    return Array.from(state.allNextElements.values());
  }, [state.allNextElements]);

  // Check if an element is set as next
  // Matching requires FULL path match to avoid false positives with same-named elements
  // LiveView mseId format: "sequence#N/ELEMENT_NAME"
  // MSE next elementId format: typically "sequence#N/ELEMENT_NAME" or full path
  const isElementNext = useCallback((elementId: string): MSENextElement | null => {
    for (const nextEl of state.allNextElements.values()) {
      // Exact match - most reliable
      if (nextEl.elementId === elementId) {
        return nextEl;
      }

      // Check if one ends with the other (handles full path vs relative path)
      // e.g., "sequence#3/MY_ELEMENT" should match "/shows/CAROUSEL/elements/sequence#3/MY_ELEMENT"
      // But "WEATHER" should NOT match "WEATHER#2"
      if (nextEl.elementId.endsWith('/' + elementId) || elementId.endsWith('/' + nextEl.elementId)) {
        return nextEl;
      }

      // Check if both have the same sequence prefix AND element name
      // Only match by element name if BOTH have sequence prefixes and they match
      const nextElParts = nextEl.elementId.split('/');
      const elemParts = elementId.split('/');

      // Both must have at least 2 parts (sequence/element) to do a reliable comparison
      if (nextElParts.length >= 2 && elemParts.length >= 2) {
        // Compare the last two parts (sequence and element name)
        const nextSeq = nextElParts[nextElParts.length - 2];
        const nextName = nextElParts[nextElParts.length - 1];
        const elemSeq = elemParts[elemParts.length - 2];
        const elemName = elemParts[elemParts.length - 1];

        if (nextSeq === elemSeq && nextName === elemName) {
          return nextEl;
        }
      }
    }
    return null;
  }, [state.allNextElements]);

  // Reconnect all Vizrt channels
  const reconnectAll = useCallback(() => {
    // Reconnecting all channels
    for (const channel of vizrtChannels) {
      connectChannel(channel);
    }
  }, [vizrtChannels, connectChannel]);

  // Get connection status summary
  const connectionStatus = useMemo(() => {
    const statuses = Array.from(state.connections.values());
    const connected = statuses.filter(s => s.status === 'connected').length;
    const total = statuses.length;

    if (total === 0) return 'no_channels';
    if (connected === total) return 'all_connected';
    if (connected > 0) return 'partial';
    return 'disconnected';
  }, [state.connections]);

  // Check if a specific channel has an active MSE connection
  // Uses WebSocket ref directly to avoid stale state from batched updates
  const isChannelConnected = useCallback((channelId: string): boolean => {
    const ws = wsRefs.current.get(channelId);
    return ws?.readyState === WebSocket.OPEN;
  }, []);

  // Get MSE connection info for a channel
  const getChannelConnection = useCallback((channelId: string) => {
    return state.connections.get(channelId);
  }, [state.connections]);

  // Fetch show content from MSE using get command with depth
  // Returns a Promise that resolves with the XML content or null on error
  //
  // MSE PlainTalk protocol for large responses:
  // - After sending "get" command, MSE responds with chunks
  // - Each chunk has format: "msgId ok {byteCount}content..."
  // - Chunks of exactly 4096 bytes indicate more data follows
  // - A chunk with byteCount != 4096 is the final chunk
  // - Accumulate all chunks and combine into complete XML
  const fetchShowContent = useCallback((channelId: string, showPath: string, depth: number = 10): Promise<string | null> => {
    return new Promise((resolve) => {
      const ws = wsRefs.current.get(channelId);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Channel not connected
        resolve(null);
        return;
      }

      const msgId = (messageIdRefs.current.get(channelId) || 0) + 1;
      messageIdRefs.current.set(channelId, msgId);


      // Accumulate content chunks across multiple messages
      // MSE sends 4096-byte chunks until final chunk which is smaller
      const accumulatedContent: string[] = [];
      let responseReceived = false;
      let foundFirstChunk = false;

      const handleMessage = (event: MessageEvent) => {
        // Already got our complete response, ignore further messages
        if (responseReceived) return;

        let rawData: string;
        if (event.data instanceof ArrayBuffer) {
          rawData = new TextDecoder('utf-8').decode(event.data);
        } else if (typeof event.data === 'string') {
          rawData = event.data;
        } else {
          return;
        }

        // Ignore unrelated messages that might be injected between chunks
        // Skip unrelated messages (subscription updates, other command responses)
        if (!foundFirstChunk) {
          const unrelatedMessagePattern = /^(\d+|\*)\s+(set|get|protocol|ok|error|subscribe|deleted|added|changed)/;
          const startsWithOurMsgId = rawData.startsWith(`${msgId} `);

          if (unrelatedMessagePattern.test(rawData.trim()) && !startsWithOurMsgId) {
            return;
          }
        }

        // Check for error response first
        if (rawData.includes(`${msgId} error`) || rawData.includes('inexistant')) {
          responseReceived = true;
          ws.removeEventListener('message', handleMessage);
          resolve(null);
          return;
        }

        // First chunk: Look for "msgId ok {byteCount}content..."
        if (!foundFirstChunk) {
          const responsePattern = new RegExp(`^${msgId} ok \\{(\\d+)\\}`);
          const match = rawData.match(responsePattern);

          if (match) {
            const byteCount = parseInt(match[1], 10);
            const headerEnd = rawData.indexOf('}') + 1;
            const content = rawData.substring(headerEnd);

            foundFirstChunk = true;
            accumulatedContent.push(content);

            // If byteCount is NOT 4096, this is a single-chunk response
            if (byteCount !== 4096) {
              responseReceived = true;
              ws.removeEventListener('message', handleMessage);
              const cleanedXml = content.replace(/\{\d+\}/g, '');
              resolve(cleanedXml);
              return;
            }
          }
        } else {
          // Continuation chunks
          accumulatedContent.push(rawData);

          // Find ALL {N} patterns in this chunk to check for final marker
          const byteCountMatches = [...rawData.matchAll(/\{(\d+)\}/g)];

          if (byteCountMatches.length > 0) {
            for (const match of byteCountMatches) {
              const byteCount = parseInt(match[1], 10);
              if (byteCount !== 4096) {
                // Final chunk
                responseReceived = true;
                ws.removeEventListener('message', handleMessage);
                const combined = accumulatedContent.join('');
                const cleanedXml = combined.replace(/\{\d+\}/g, '');
                resolve(cleanedXml);
                return;
              }
            }
          }
        }
      };

      ws.addEventListener('message', handleMessage);

      const cmd = `${msgId} get ${showPath} ${depth}\n`;
      ws.send(cmd);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!responseReceived) {
          ws.removeEventListener('message', handleMessage);
          if (foundFirstChunk && accumulatedContent.length > 0) {
            const partial = accumulatedContent.join('');
            const cleanedPartial = partial.replace(/\{\d+\}/g, '');
            resolve(cleanedPartial);
          } else {
            resolve(null);
          }
        }
      }, 30000);
    });
  }, []);

  // Parse MSE show XML to extract elements with their paths
  const parseMSEShowXml = useCallback((xmlString: string, _showName: string): {
    elements: Array<{
      id: string;
      path: string;
      description?: string;
      template?: string;
      fields: { name: string; value: string }[];
      status?: string;
    }>;
    activeElements: Map<string, string>; // feed -> elementId
  } | null => {
    try {
      const parsed = xmlParser.parse(xmlString);
      const elements: Array<{
        id: string;
        path: string;
        description?: string;
        template?: string;
        fields: { name: string; value: string }[];
        status?: string;
      }> = [];
      const activeElements = new Map<string, string>();

      // Recursive function to find elements and active attributes
      const findElements = (obj: any, currentPath: string = '') => {
        if (!obj || typeof obj !== 'object') return;

        // Check for active_* attributes (indicates currently playing element)
        for (const key of Object.keys(obj)) {
          if (key.startsWith('@_active_')) {
            const feed = key.replace('@_active_', '');
            activeElements.set(feed, obj[key]);
          }
        }

        // Check if this is an element node
        if (obj['@_name'] && (obj['@_status'] || obj['@_description'] !== undefined)) {
          const elementId = obj['@_name'];
          const status = obj['@_status'];
          const description = obj['@_description'];
          const label = obj['@_label'];

          // Extract fields from payload/field structure
          const fields: { name: string; value: string }[] = [];
          const extractFieldsFromPayload = (payload: any) => {
            if (payload?.field) {
              const fieldArray = Array.isArray(payload.field) ? payload.field : [payload.field];
              for (const f of fieldArray) {
                if (f['@_name'] && f['#text']) {
                  fields.push({ name: f['@_name'], value: f['#text'] });
                }
              }
            }
          };

          // Look for entry > payload structure
          if (obj.entry) {
            const entries = Array.isArray(obj.entry) ? obj.entry : [obj.entry];
            for (const entry of entries) {
              if (entry.payload) {
                extractFieldsFromPayload(entry.payload);
              }
            }
          }

          // Extract template from ref element
          let template: string | undefined;
          if (obj.ref) {
            const refs = Array.isArray(obj.ref) ? obj.ref : [obj.ref];
            const templateRef = refs.find((r: any) => r['@_name'] === 'master_template');
            if (templateRef && templateRef['#text']) {
              template = templateRef['#text'];
            }
          }

          elements.push({
            id: elementId,
            path: `${currentPath}/${elementId}`,
            description: description || label,
            template,
            fields,
            status
          });
        }

        // Recursively check children
        for (const key of Object.keys(obj)) {
          if (key.startsWith('@_') || key === '#text') continue;
          const child = obj[key];
          const childPath = key === 'element' ? currentPath : `${currentPath}/${key}`;
          if (Array.isArray(child)) {
            for (const item of child) {
              findElements(item, childPath);
            }
          } else if (typeof child === 'object') {
            findElements(child, childPath);
          }
        }
      };

      findElements(parsed);
      return { elements, activeElements };
    } catch (err) {
      console.error('[MSE] Error parsing show XML:', err);
      return null;
    }
  }, []);

  // Get carousel state (on/off) by channelId and carouselName
  const getCarouselState = useCallback((channelId: string, carouselName: string): CarouselState | undefined => {
    const key = `${channelId}:${carouselName}`;
    return state.carouselStates.get(key);
  }, [state.carouselStates]);

  // Check if a carousel is on
  const isCarouselOn = useCallback((channelId: string, carouselName: string): boolean => {
    const carouselState = getCarouselState(channelId, carouselName);
    return carouselState?.isOn ?? false;
  }, [getCarouselState]);

  return {
    connections: state.connections,
    allPlayingElements: state.allPlayingElements,
    allNextElements: state.allNextElements,
    // Carousel on/off states
    carouselStates: state.carouselStates,
    connectionStatus,
    isElementPlaying,
    isElementPlayingByFields,
    getAllPlayingElementIds,
    getPlayingElements,
    // Next element tracking (elements set as next to play)
    getNextElements,
    isElementNext,
    // Carousel on/off state tracking
    getCarouselState,
    isCarouselOn,
    connectChannel,
    disconnectChannel,
    reconnectAll,
    // New functions for direct MSE content fetching
    isChannelConnected,
    getChannelConnection,
    fetchShowContent,
    parseMSEShowXml,
    // Send a raw PepTalk command to a channel's MSE
    sendCommand,
    // Timestamp updated when any channel connects/reconnects
    // Consumers can watch this to trigger data reloads
    lastConnectedAt,
    // Timestamp updated when show content changes (elements added/deleted)
    // Consumers can watch this to trigger data reloads when shows change
    lastShowChangeAt
  };
};

export default useChannelMSE;
