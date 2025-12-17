import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  IconButton,
  Tooltip,
  Chip,
  Box,
  Switch,
  FormControlLabel,
  Typography,
  CircularProgress,
  Menu,
  MenuItem,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TvIcon from '@mui/icons-material/Tv';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import TuneIcon from '@mui/icons-material/Tune';
import { useChannels } from '../hooks/useChannels';
import { useChannelMSE } from '../hooks/useChannelMSE';
import { isScheduleActive } from '../components/ScheduleCellRenderer';
import { useGridExpandedRows, useGridColumnState } from '../contexts/GridStateContext';

const SUPABASE_URL = import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;

// Types for the hierarchy
interface ElementField {
  name: string;
  value: string;
}

interface LiveElement {
  id: string;
  mseId?: string; // MSE element name/ID - used for tracking playing state via pre/prequeue messages
  fields: ElementField[];
  template?: string;
  duration?: number | null;
  itemName?: string;
}

interface LiveCarousel {
  id: string;
  name: string;
  carouselType?: string;
  carouselName?: string;
  buckets: LiveBucket[];
}

interface LiveBucket {
  id: string;
  name: string;
  contentId?: string;
  elements: LiveElement[];
}

interface LiveChannel {
  id: string;
  name: string;
  channelId?: string;
  channelType?: string;
  carousels: LiveCarousel[];
}

// Tree node for AG Grid
interface TreeNode {
  id: string;
  name: string;
  type: 'channel' | 'carousel' | 'bucket' | 'element' | 'controls';
  treePath: string[];
  // Channel name for tracking fallback mode
  parentChannelName?: string;
  // Channel-specific
  channelType?: string;
  channelId?: string; // Database channel ID for controls
  // Carousel-specific
  carouselType?: string;
  carouselName?: string;
  // Bucket-specific
  bucketContentId?: string;
  // Element-specific
  mseId?: string; // MSE element name/ID - for tracking playing state
  template?: string;
  duration?: number | null;
  fields?: ElementField[];
  fieldsSummary?: string;
  // Controls row specific
  controlsGroups?: CarouselButtonGroup[];
}

// Carousel control button types (from MSE /storage/ticker/default/buttons)
interface CarouselButtonAction {
  ref: string; // Action path like "/storage/ticker/default/carousels/INFO_BAR/actions/Main INFO_BAR in"
}

interface CarouselButton {
  name: string;
  caption: string;
  tag?: string;
  // For on/off buttons
  statePath?: string;
  stateValue?: string;
  stateColor?: string;
  // Actions to trigger
  actions: CarouselButtonAction[];
  // Button type inferred from structure
  buttonType: 'system' | 'carousel' | 'custom';
}

interface CarouselButtonGroup {
  name: string;
  caption: string;
  tag?: string;
  buttons: CarouselButton[];
}

const LiveViewPage: React.FC = () => {
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const { channelPlaylists, channels, loading: channelsLoading } = useChannels();
  const [rowData, setRowData] = useState<TreeNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { expandedRows, toggleRowExpanded } = useGridExpandedRows('live-view');
  const { columnState, setColumnState, isLoaded: isGridStateLoaded } = useGridColumnState('live-view');
  const [hasInitializedExpand, setHasInitializedExpand] = useState<boolean>(false);
  const columnStateRestoredRef = useRef(false);

  // Ref to prevent concurrent loadLiveData calls
  const isLoadingRef = useRef<boolean>(false);
  // Track if MSE connected while we were loading - if so, we need to reload
  const mseConnectedDuringLoadRef = useRef<boolean>(false);

  // Refs to access latest values without causing useCallback recreation
  const channelPlaylistsRef = useRef(channelPlaylists);
  const channelsRef = useRef(channels);
  const currentTimeRef = useRef(currentTime);

  // Update refs when values change
  channelPlaylistsRef.current = channelPlaylists;
  channelsRef.current = channels;
  currentTimeRef.current = currentTime;

  // MSE connections for monitoring currently playing elements (per Vizrt channel)
  const {
    connectionStatus: mseStatus,
    connections: mseConnections,
    isElementPlaying,
    getAllPlayingElementIds,
    getPlayingElements,
    getNextElements,
    isElementNext,
    reconnectAll: reconnectMSE,
    isChannelConnected,
    fetchShowContent,
    lastConnectedAt,
    getChannelConnection,
    sendCommand,
    connectChannel,
    // Carousel on/off state from real-time MSE updates
    carouselStates: mseCarouselStates,
    isCarouselOn
  } = useChannelMSE(channels);

  // Ref for MSE functions that may change on each render
  const isChannelConnectedRef = useRef(isChannelConnected);
  const fetchShowContentRef = useRef(fetchShowContent);
  isChannelConnectedRef.current = isChannelConnected;
  fetchShowContentRef.current = fetchShowContent;
  const playingElementIds = useMemo(() => getAllPlayingElementIds(), [getAllPlayingElementIds]);
  const playingElements = useMemo(() => getPlayingElements(), [getPlayingElements]);
  const nextElements = useMemo(() => getNextElements(), [getNextElements]);


  // Track which channels are using fallback mode (vizrt-ticker XML instead of MSE)
  const [fallbackChannels, setFallbackChannels] = useState<Set<string>>(new Set());

  // Set As Next menu state
  const [setAsNextAnchorEl, setSetAsNextAnchorEl] = useState<null | HTMLElement>(null);

  // MSE reconnect menu state
  const [mseReconnectAnchorEl, setMseReconnectAnchorEl] = useState<null | HTMLElement>(null);

  // Carousel control panel state - per channel
  const [expandedControlsChannels, setExpandedControlsChannels] = useState<Set<string>>(new Set());
  const [channelButtonsMap, setChannelButtonsMap] = useState<Map<string, CarouselButtonGroup[]>>(new Map());
  const [loadingButtonsChannels, setLoadingButtonsChannels] = useState<Set<string>>(new Set());
  // Carousel state from MSE - tracks which carousels are "On" (have <L>Lon</L>)
  // Key format: "channelId:carouselName", value: true if "On"
  const [carouselStates, setCarouselStates] = useState<Map<string, boolean>>(new Map());

  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log('[LiveView] Component MOUNTED');
    return () => {
      console.log('[LiveView] Component UNMOUNTED');
    };
  }, []);

  // Update currentTime every minute for schedule checking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Parse MSE show content into LiveChannel structure
  // This is used when we have a direct MSE connection to the Vizrt channel
  //
  // MSE hierarchy for shows:
  // /storage/shows/<carousel>/playlists/elements/<sequence>/<element>
  // - carousel = show name (e.g., "INFO_BAR", "LIVE")
  // - sequence = bucket (contains multiple elements)
  // - element = individual graphic element with fields
  const parseMSEContent = async (
    _channelPlaylistId: string,
    channelId: string,
    channelName: string,
    channelType?: string
  ): Promise<LiveChannel | null> => {
    try {
      const parser = new DOMParser();

      // Step 1: Get carousel names from /storage/shows (depth=1 for just names)
      // Use ref to get latest fetchShowContent function
      const showsXml = await fetchShowContentRef.current(channelId, '/storage/shows', 1);
      if (!showsXml) {
        console.log(`[MSE] No shows data for channel ${channelName}`);
        return null;
      }

      const showsDoc = parser.parseFromString(showsXml, 'application/xml');
      const entryElements = showsDoc.querySelectorAll('entry[name]');
      const carouselNames: string[] = [];
      entryElements.forEach(el => {
        const name = el.getAttribute('name');
        if (name && name !== 'shows') {
          carouselNames.push(name);
        }
      });

      if (carouselNames.length === 0) {
        console.log(`[MSE] No carousels found for channel ${channelName}`);
        return null;
      }

      console.log(`[MSE] Found ${carouselNames.length} carousels for channel ${channelName}: ${carouselNames.join(', ')}`);

      const carousels: LiveCarousel[] = [];

      // Step 2: For each carousel, fetch the playlists/carousel/elements path
      for (const carouselName of carouselNames) {
        // Fetch /storage/shows/<carousel>/playlists/carousel/elements with depth for sequences and elements
        const elementsPath = `/storage/shows/${carouselName}/playlists/carousel/elements`;
        const elementsXml = await fetchShowContentRef.current(channelId, elementsPath, 5);

        if (!elementsXml) {
          console.log(`[MSE] No elements data for carousel ${carouselName}`);
          continue;
        }

        const elementsDoc = parser.parseFromString(elementsXml, 'application/xml');

        // Find sequences (buckets) - they are direct children under the root
        // MSE structure: <elements ...><sequence name="sequence#N">...</sequence></elements>
        // The root is <elements>, not <entry name="elements">
        const rootElement = elementsDoc.querySelector('elements') || elementsDoc.documentElement;
        const sequenceElements = rootElement.querySelectorAll(':scope > sequence');
        const liveBuckets: LiveBucket[] = [];

        sequenceElements.forEach((seqEl) => {
          // Get the sequence's actual name attribute for building the full path
          // MSE names sequences as "sequence#N" but some may not have a name attribute
          // Unnamed sequences are referenced as just "sequence" by MSE
          const sequenceId = seqEl.getAttribute('name') || 'sequence';
          // Use description for display name, fall back to name if not available
          const sequenceName = seqEl.getAttribute('description') || sequenceId;
          const elements: LiveElement[] = [];

          // Find element children within the sequence
          const elementNodes = seqEl.querySelectorAll(':scope > element');
          elementNodes.forEach(elemEl => {
            const elemName = elemEl.getAttribute('name') || '';
            const description = elemEl.getAttribute('description') || '';

            // Extract template from <ref name="master_template"> child element
            // Full path: /storage/shows/INFO_BAR/mastertemplates/ONE_LINE
            // We only want the final part: ONE_LINE
            let template = '';
            const templateRef = elemEl.querySelector('ref[name="master_template"]');
            if (templateRef) {
              const fullPath = templateRef.textContent || '';
              template = fullPath.split('/').pop() || fullPath;
            }

            // Build the full MSE path for unique identification
            // Format: /storage/shows/<carousel>/playlists/carousel/elements/<sequence>/<element>
            // But we store just the relative part after /elements/ for matching
            const mseFullPath = `${sequenceId}/${elemName}`;

            // Extract fields from <entry name="data"> children
            const fields: { name: string; value: string }[] = [];
            const dataEntry = elemEl.querySelector('entry[name="data"]');
            if (dataEntry) {
              const fieldEntries = dataEntry.querySelectorAll(':scope > entry[name]');
              fieldEntries.forEach(fieldEl => {
                const fieldName = fieldEl.getAttribute('name') || '';
                const fieldValue = fieldEl.textContent || '';
                if (fieldName && fieldValue) {
                  fields.push({ name: fieldName, value: fieldValue });
                }
              });
            }

            // Determine display name - use just the element name portion for display
            // Extract the last part after any backslashes or hashes for cleaner display
            const displayElemName = elemName.split(/[\\/#]/).pop() || elemName;
            const firstFieldValue = fields.length > 0 ? fields[0].value : null;
            const displayName = firstFieldValue && firstFieldValue.length < 50
              ? firstFieldValue
              : (description || template || displayElemName);

            elements.push({
              id: `${channelName}-${carouselName}-${sequenceId}-${elemName}`,
              mseId: mseFullPath, // Store the full path for unique matching
              fields,
              template,
              itemName: displayName
            });
          });

          if (elements.length > 0) {
            liveBuckets.push({
              id: `${channelName}-${carouselName}-${sequenceId}`,
              name: sequenceName,
              elements
            });
          }
        });

        if (liveBuckets.length > 0) {
          carousels.push({
            id: `${channelName}-${carouselName}`,
            name: carouselName,
            carouselName: carouselName,
            buckets: liveBuckets
          });
          console.log(`[MSE] ✓ Carousel ${carouselName}: ${liveBuckets.length} buckets, ${liveBuckets.reduce((sum, b) => sum + b.elements.length, 0)} elements`);
        }
      }

      if (carousels.length === 0) return null;

      return {
        id: channelName,
        name: channelName,
        channelId,
        channelType,
        carousels
      };
    } catch (err) {
      console.error(`[MSE] Error parsing MSE content for channel ${channelName}:`, err);
      return null;
    }
  };

  // Parse carousel buttons XML from /storage/ticker/default/buttons
  // Actual XML structure from MSE:
  // <entry name="buttons">
  //   <entry caption="Group Caption" tag="Tag" name="group_name">
  //     <entry caption="On" statecolor="#008000" statepath="/path" statevalue="on" name="on">
  //       <ref actionid="action name">/path/to/action</ref>
  //     </entry>
  //   </entry>
  // </entry>
  const parseCarouselButtonsXml = (xmlString: string): CarouselButtonGroup[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const groups: CarouselButtonGroup[] = [];

    // The root is <entry name="buttons">, find all direct child entries (groups)
    const buttonsRoot = doc.querySelector('entry[name="buttons"]');
    if (!buttonsRoot) {
      console.log('[MSE] No buttons root element found');
      return groups;
    }

    // Each direct child entry is a button group
    const groupEntries = buttonsRoot.querySelectorAll(':scope > entry');
    console.log(`[MSE] Found ${groupEntries.length} button groups`);

    groupEntries.forEach((groupEntry) => {
      const groupName = groupEntry.getAttribute('name') || '';
      const caption = groupEntry.getAttribute('caption') || '';
      const tag = groupEntry.getAttribute('tag') || '';
      const buttons: CarouselButton[] = [];

      // Find all button entries within this group (direct children with caption attribute)
      const buttonEntries = groupEntry.querySelectorAll(':scope > entry[caption]');

      buttonEntries.forEach((buttonEntry) => {
        const buttonName = buttonEntry.getAttribute('name') || '';
        const btnCaption = buttonEntry.getAttribute('caption') || '';
        const statePath = buttonEntry.getAttribute('statepath') || '';
        const stateValue = buttonEntry.getAttribute('statevalue') || '';
        const stateColor = buttonEntry.getAttribute('statecolor') || '';
        const actions: CarouselButtonAction[] = [];

        // Get all action refs
        const actionRefs = buttonEntry.querySelectorAll(':scope > ref');
        actionRefs.forEach((actionRef) => {
          const refPath = actionRef.textContent?.trim();
          if (refPath) {
            actions.push({ ref: refPath });
          }
        });

        // Determine button type based on caption/context
        let buttonType: 'system' | 'carousel' | 'custom' = 'custom';
        const lowerCaption = btnCaption.toLowerCase();
        const lowerGroupCaption = caption.toLowerCase();
        if (lowerGroupCaption.includes('ticker system') || lowerGroupCaption.includes('program')) {
          buttonType = 'system';
        } else if (lowerCaption === 'on' || lowerCaption === 'off') {
          buttonType = 'carousel';
        }

        buttons.push({
          name: buttonName,
          caption: btnCaption,
          statePath: statePath || undefined,
          stateValue: stateValue || undefined,
          stateColor: stateColor || undefined,
          actions,
          buttonType
        });
      });

      if (buttons.length > 0) {
        groups.push({
          name: groupName,
          caption,
          tag: tag || undefined,
          buttons
        });
      }
    });

    return groups;
  };

  // Parse carousel state XML from /storage/ticker/default/state/Main/carousels
  // XML structure:
  // <entry name="carousels">
  //   <entry backing="transient" name="INFO_BAR">
  //     <entry name="current"><P>Pon</P><L>Lon</L></entry>
  //   </entry>
  // </entry>
  // If <L>Lon</L> exists for a carousel, it is "On"
  const parseCarouselStatesXml = (xmlString: string): Map<string, boolean> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const states = new Map<string, boolean>();

    console.log('[MSE] Parsing carousel states XML:', xmlString.substring(0, 500));

    // Find all carousel entries (direct children of carousels root)
    const carouselsRoot = doc.querySelector('entry[name="carousels"]');
    if (!carouselsRoot) {
      // Maybe the root itself is a single carousel entry, try finding any entry with current/L
      console.log('[MSE] No carousels root element found, checking for direct entries');
      const allEntries = doc.querySelectorAll('entry[name]');
      console.log(`[MSE] Found ${allEntries.length} entries in XML`);
      allEntries.forEach((entry) => {
        const name = entry.getAttribute('name');
        console.log(`[MSE] Entry: ${name}, innerHTML: ${entry.innerHTML.substring(0, 200)}`);
      });
      return states;
    }

    // Each direct child entry is a carousel
    const carouselEntries = carouselsRoot.querySelectorAll(':scope > entry[name]');
    console.log(`[MSE] Found ${carouselEntries.length} carousel entries`);

    carouselEntries.forEach((carouselEntry) => {
      const carouselName = carouselEntry.getAttribute('name');
      if (!carouselName) return;

      // Look for the "current" entry and check if <L> element exists
      // If <L> element exists at all, the carousel is ON
      // (real-time updates show "Lon", but depth queries show "0 element, 1 text")
      const currentEntry = carouselEntry.querySelector('entry[name="current"]');
      const lElement = currentEntry?.querySelector('L');
      const isOn = lElement !== null;
      states.set(carouselName, isOn);
      console.log(`[MSE] Carousel ${carouselName}: currentEntry=${!!currentEntry}, L exists=${isOn}, isOn=${isOn}`);
    });

    return states;
  };

  // Parse vizrt-ticker XML response into LiveChannel structure
  const parseTickerXml = (xmlString: string, channelName: string, channelType?: string): LiveChannel | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parse error for channel', channelName, parseError.textContent);
      return null;
    }

    const playlists = doc.querySelectorAll('playlist');
    if (playlists.length === 0) return null;

    const carousels: LiveCarousel[] = [];

    playlists.forEach((playlist, playlistIdx) => {
      const carouselName = playlist.getAttribute('name') || `Carousel ${playlistIdx + 1}`;
      const carouselType = playlist.getAttribute('type') || undefined;

      // Use :scope > to get only direct child groups of playlist
      const groups = playlist.querySelectorAll(':scope > group');
      const liveBuckets: LiveBucket[] = [];

      groups.forEach((group, groupIdx) => {
        const descriptionEl = group.querySelector(':scope > description');
        const bucketName = descriptionEl?.textContent || `Group ${groupIdx + 1}`;
        const contentId = group.getAttribute('use_existing') || undefined;

        // Get elements container, then get element children
        const elementsContainer = group.querySelector(':scope > elements');
        const elementsEl = elementsContainer
          ? elementsContainer.querySelectorAll(':scope > element')
          : group.querySelectorAll(':scope > element');
        const elements: LiveElement[] = [];

        elementsEl.forEach((element, elementIdx) => {
          const templateEl = element.querySelector(':scope > template');
          const durationEl = element.querySelector(':scope > duration');
          const idEl = element.querySelector(':scope > id');

          const fields: ElementField[] = [];
          element.querySelectorAll(':scope > field').forEach(field => {
            const name = field.getAttribute('name');
            const value = field.textContent || '';
            if (name) {
              fields.push({ name, value });
            }
          });

          // Use first field value as element name, or template, or generic name
          const firstFieldValue = fields.length > 0 ? fields[0].value : null;
          const elementName = firstFieldValue && firstFieldValue.length < 50
            ? firstFieldValue
            : (templateEl?.textContent || `Element ${elementIdx + 1}`);

          elements.push({
            id: idEl?.textContent || `${channelName}-${playlistIdx}-${groupIdx}-${elementIdx}`,
            fields,
            template: templateEl?.textContent || undefined,
            duration: durationEl ? parseInt(durationEl.textContent || '0', 10) : null,
            itemName: elementName
          });
        });

        if (elements.length > 0) {
          liveBuckets.push({
            id: contentId || `${channelName}-${playlistIdx}-${groupIdx}`,
            name: bucketName,
            contentId,
            elements
          });
        }
      });

      if (liveBuckets.length > 0) {
        carousels.push({
          id: `${channelName}-${playlistIdx}`,
          name: carouselName,
          carouselType,
          carouselName,
          buckets: liveBuckets
        });
      }
    });

    if (carousels.length === 0) return null;

    return {
      id: channelName,
      name: channelName,
      channelType,
      carousels
    };
  };

  const loadLiveData = useCallback(async () => {
    // Use refs to get latest values without dependency on state
    const currentChannelPlaylists = channelPlaylistsRef.current;
    const currentChannels = channelsRef.current;
    const currentTimeValue = currentTimeRef.current;

    console.log('[LiveView] loadLiveData called, channelPlaylists:', currentChannelPlaylists?.length, 'channels:', currentChannels?.length);

    if (!currentChannelPlaylists || currentChannelPlaylists.length === 0) {
      console.log('[LiveView] loadLiveData early return - no channelPlaylists');
      return;
    }

    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('[LiveView] Skipping loadLiveData - already loading');
      return;
    }

    isLoadingRef.current = true;

    setLoading(true);
    const newFallbackChannels = new Set<string>();

    try {
      // Build channel type and info maps
      const channelTypeMap = new Map<string, string>();
      const channelInfoMap = new Map<string, { id: string; type: string; mse_host?: string }>();
      currentChannels.forEach(channel => {
        channelTypeMap.set(channel.id, channel.type);
        channelInfoMap.set(channel.id, { id: channel.id, type: channel.type, mse_host: channel.mse_host });
      });

      // Get all active channels (type='channel')
      const activeChannels = currentChannelPlaylists.filter(
        cp => cp.type === 'channel' && isScheduleActive(cp.schedule, currentTimeValue)
      );

      const liveChannels: LiveChannel[] = [];

      // Fetch data for each active channel
      // Strategy: For Vizrt channels with MSE connected, try MSE first, then fall back to vizrt-ticker XML
      for (const channelPlaylist of activeChannels) {
        try {
          const channelType = channelPlaylist.channel_id ? channelTypeMap.get(channelPlaylist.channel_id) : undefined;
          const channelInfo = channelPlaylist.channel_id ? channelInfoMap.get(channelPlaylist.channel_id) : undefined;

          let liveChannel: LiveChannel | null = null;
          let usedFallback = false;

          // For Vizrt channels with MSE configured and connected, try MSE first
          const mseConnected = channelInfo?.id ? isChannelConnectedRef.current(channelInfo.id) : false;
          console.log(`[LiveView] Channel ${channelPlaylist.name}: type=${channelType}, mse_host=${channelInfo?.mse_host}, id=${channelInfo?.id}, connected=${mseConnected}`);

          if (channelType === 'Vizrt' && channelInfo?.mse_host && channelInfo.id && mseConnected) {
            console.log(`[LiveView] Trying MSE for channel ${channelPlaylist.name}...`);
            liveChannel = await parseMSEContent(
              channelPlaylist.id,
              channelInfo.id,
              channelPlaylist.name,
              channelType
            );

            if (liveChannel) {
              console.log(`[LiveView] ✓ Loaded ${channelPlaylist.name} from MSE (${liveChannel.carousels.length} carousels)`);
            } else {
              console.log(`[LiveView] MSE returned no data for ${channelPlaylist.name}, falling back to vizrt-ticker XML`);
              usedFallback = true;
            }
          } else {
            // No MSE connection available, use fallback
            usedFallback = true;
          }

          // Fall back to vizrt-ticker XML if MSE didn't provide data
          if (!liveChannel) {
            const tickerUrl = `${SUPABASE_URL}/functions/v1/vizrt-ticker/${encodeURIComponent(channelPlaylist.name)}?includeIds=true`;

            const response = await fetch(tickerUrl);
            if (!response.ok) {
              console.warn(`Failed to fetch ticker for channel ${channelPlaylist.name}: ${response.status}`);
              continue;
            }

            const xmlText = await response.text();
            liveChannel = parseTickerXml(xmlText, channelPlaylist.name, channelType);

            if (liveChannel) {
              console.log(`[LiveView] ✓ Loaded ${channelPlaylist.name} from vizrt-ticker XML (${liveChannel.carousels.length} carousels)`);
            }
          }

          if (liveChannel) {
            // Mark the channel ID (for tracking purposes) based on whether fallback was used
            if (usedFallback) {
              newFallbackChannels.add(channelPlaylist.name);
            }
            liveChannels.push(liveChannel);
          }
        } catch (err) {
          console.error(`Error fetching data for channel ${channelPlaylist.name}:`, err);
          newFallbackChannels.add(channelPlaylist.name);
        }
      }

      // Update fallback channels state
      setFallbackChannels(newFallbackChannels);

      // Convert to tree nodes
      const treeNodes = buildTreeNodes(liveChannels);
      console.log('[LiveView] loadLiveData complete, liveChannels:', liveChannels.length, 'treeNodes:', treeNodes.length);
      setRowData(treeNodes);
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;

      // Check if MSE connected while we were loading - if so, reload to get fresh data
      if (mseConnectedDuringLoadRef.current) {
        console.log('[LiveView] MSE connected during load, triggering reload...');
        mseConnectedDuringLoadRef.current = false;
        // Use setTimeout to avoid immediate recursion
        setTimeout(() => {
          loadLiveData();
        }, 50);
      }
    }
    // No dependencies - we use refs to access latest values
    // This ensures loadLiveData is stable and doesn't cause useEffect re-runs
  }, []);

  // Load live data on initial mount only
  // We use a ref to track if initial load has happened
  const hasInitialLoadRef = useRef(false);
  const lastConnectedAtRef = useRef(lastConnectedAt);
  useEffect(() => {
    console.log('[LiveView] Initial load effect running, hasInitialLoad:', hasInitialLoadRef.current, 'channelPlaylists:', channelPlaylists?.length);
    if (!hasInitialLoadRef.current && channelPlaylists && channelPlaylists.length > 0) {
      console.log('[LiveView] Initial load triggered');
      hasInitialLoadRef.current = true;
      loadLiveData();
    }
  }, [channelPlaylists, loadLiveData]);

  // Reload when MSE connection is established/re-established
  // This ensures we fetch fresh data using MSE after reconnecting
  // Only trigger if lastConnectedAt actually changed (not on initial render)
  useEffect(() => {
    if (lastConnectedAt > 0 && lastConnectedAt !== lastConnectedAtRef.current) {
      console.log('[LiveView] MSE connection established, isLoading=', isLoadingRef.current);
      lastConnectedAtRef.current = lastConnectedAt;

      if (isLoadingRef.current) {
        // Mark that MSE connected during load - loadLiveData will check this and reload
        console.log('[LiveView] MSE connected during load, will reload after current load completes');
        mseConnectedDuringLoadRef.current = true;
      } else {
        // Not currently loading, reload immediately
        console.log('[LiveView] MSE connection established, reloading data...');
        loadLiveData();
      }
    }
  }, [lastConnectedAt, loadLiveData]);

  // Auto-refresh: combines schedule-based refresh (currentTime) and auto-refresh interval
  // Only ONE interval that handles all periodic refreshes
  useEffect(() => {
    if (!autoRefresh) return;

    // Single interval for auto-refresh (60 seconds)
    const interval = setInterval(() => {
      loadLiveData();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadLiveData]);

  // Build tree nodes for AG Grid
  const buildTreeNodes = (liveChannels: LiveChannel[]): TreeNode[] => {
    const nodes: TreeNode[] = [];

    for (const channel of liveChannels) {
      // Add channel node
      nodes.push({
        id: channel.id,
        name: channel.name,
        type: 'channel',
        treePath: [channel.name],
        parentChannelName: channel.name,
        channelType: channel.channelType,
        channelId: channel.channelId // Database channel ID for controls
      });

      for (const carousel of channel.carousels) {
        const carouselDisplayName = carousel.carouselName || carousel.name;
        // Add carousel node
        nodes.push({
          id: carousel.id,
          name: carouselDisplayName,
          type: 'carousel',
          treePath: [channel.name, carouselDisplayName],
          parentChannelName: channel.name,
          carouselType: carousel.carouselType,
          carouselName: carousel.carouselName
        });

        for (const bucket of carousel.buckets) {
          // Skip empty buckets
          if (bucket.elements.length === 0) continue;

          // Add bucket node
          nodes.push({
            id: bucket.id,
            name: bucket.name,
            type: 'bucket',
            treePath: [channel.name, carouselDisplayName, bucket.name],
            parentChannelName: channel.name,
            carouselName: carousel.carouselName, // Store carousel name for MSE commands
            bucketContentId: bucket.contentId
          });

          for (const element of bucket.elements) {
            // Build fields summary
            const fieldsSummary = element.fields
              .slice(0, 3)
              .map(f => `${f.name}: ${truncate(f.value, 30)}`)
              .join(' | ');

            // Add element node under bucket
            // IMPORTANT: Use element.id in treePath to ensure uniqueness
            // Multiple elements can have the same name (e.g., "Fri" appearing multiple times)
            // The treePath must be unique for each row in ag-grid tree data
            nodes.push({
              id: element.id,
              name: element.itemName || element.template || 'Element',
              type: 'element',
              treePath: [channel.name, carouselDisplayName, bucket.name, element.id],
              parentChannelName: channel.name,
              carouselName: carousel.carouselName, // Store carousel name for MSE commands
              mseId: element.mseId, // MSE element name for playing state tracking
              template: element.template,
              duration: element.duration,
              fields: element.fields,
              fieldsSummary: fieldsSummary || 'No fields'
            });
          }
        }
      }
    }

    return nodes;
  };

  const truncate = (str: string, maxLength: number): string => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  const getDataPath = useCallback((data: TreeNode) => {
    return data.treePath;
  }, []);

  const getRowId = useCallback((params: any) => {
    return params.data.id;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLiveData();
    setIsRefreshing(false);
  };

  const onSelectionChanged = useCallback(() => {
    if (gridRef.current?.api) {
      const selected = gridRef.current.api.getSelectedRows();
      setSelectedNode(selected.length === 1 ? selected[0] : null);
    }
  }, []);

  // Track row expand/collapse for persistence
  const onRowGroupOpened = useCallback((event: any) => {
    const { node } = event;
    if (!node.data || !node.data.id) return;

    // Use toggleRowExpanded from context for persistence
    toggleRowExpanded(node.data.id, node.expanded);
  }, [toggleRowExpanded]);

  // Restore expanded state when data changes
  const restoreExpandedState = useCallback(() => {
    if (!gridRef.current?.api) return;

    // If no saved state, expand all by default (original behavior)
    if (expandedRows.size === 0 && !hasInitializedExpand) {
      gridRef.current.api.forEachNode((node: any) => {
        if (node.group) {
          node.setExpanded(true);
        }
      });
      setHasInitializedExpand(true);
      return;
    }

    // Restore from saved state
    setTimeout(() => {
      gridRef.current.api.forEachNode((node: any) => {
        if (node.data && node.data.id && expandedRows.has(node.data.id)) {
          node.setExpanded(true);
        }
      });
    }, 50);
  }, [expandedRows, hasInitializedExpand]);

  // Restore expanded rows whenever the grid data changes
  useEffect(() => {
    if (gridRef.current?.api && rowData.length > 0) {
      restoreExpandedState();
    }
  }, [rowData, restoreExpandedState]);

  // Get the channel ID for the selected node (needed for MSE commands)
  const getSelectedChannelId = useCallback(() => {
    if (!selectedNode?.parentChannelName) return null;
    // Find the channel in our channels list that matches the name
    const channel = channels.find(c => c.name === selectedNode.parentChannelName);
    return channel?.id || null;
  }, [selectedNode, channels]);

  // Get available vizChannels for the selected element's channel
  const selectedChannelVizChannels = useMemo(() => {
    const channelId = getSelectedChannelId();
    if (!channelId) return [];
    const conn = getChannelConnection(channelId);
    if (!conn?.vizChannels) return [];
    return Array.from(conn.vizChannels.values());
  }, [getSelectedChannelId, getChannelConnection]);

  // Handle Set As Next menu
  const handleSetAsNextClick = (event: React.MouseEvent<HTMLElement>) => {
    setSetAsNextAnchorEl(event.currentTarget);
  };

  const handleSetAsNextClose = () => {
    setSetAsNextAnchorEl(null);
  };

  // Execute Set As Next command for the selected element/bucket
  const handleSetAsNext = useCallback((vizChannelName: string) => {
    handleSetAsNextClose();

    if (!selectedNode) return;

    const channelId = getSelectedChannelId();
    if (!channelId) {
      console.error('[MSE] No channel ID found for selected node');
      return;
    }

    // Get the carousel name from the tree path
    // Tree path for element: [channelName, carouselName, bucketName, elementId]
    // Tree path for bucket: [channelName, carouselName, bucketName]
    const carouselName = selectedNode.carouselName || selectedNode.treePath[1];
    if (!carouselName) {
      console.error('[MSE] Could not determine carousel name');
      return;
    }

    // Determine the element path to set as next
    let elementPath: string;
    if (selectedNode.type === 'element' && selectedNode.mseId) {
      // For elements, use the mseId which is "sequenceId/elementName"
      elementPath = selectedNode.mseId;
    } else if (selectedNode.type === 'bucket') {
      // For buckets, use the bucket's id which should be the sequence name
      // Extract just the sequence part from the bucket id
      // Bucket id format: "channelName-carouselName-sequenceId"
      const parts = selectedNode.id.split('-');
      elementPath = parts[parts.length - 1]; // Get last part which is sequenceId
    } else {
      console.error('[MSE] Selected node is not an element or bucket');
      return;
    }

    // Build the PepTalk command using the tickersystem set_as_next logic
    // Format: schedule /logic/tickersystem/playlist/set_as_next {0} schedule 0 {0} set_as_next_path <elementPath> carouselname <carouselName> output_channel <vizChannelName>
    const command = `schedule /logic/tickersystem/playlist/set_as_next {0} schedule 0 {0} set_as_next_path ${elementPath} carouselname ${carouselName} output_channel ${vizChannelName}`;

    console.log(`[MSE] Set As Next: ${command}`);
    sendCommand(channelId, command);
  }, [selectedNode, getSelectedChannelId, sendCommand]);

  // Handle MSE reconnect menu
  const handleMseReconnectClick = (event: React.MouseEvent<HTMLElement>) => {
    setMseReconnectAnchorEl(event.currentTarget);
  };

  const handleMseReconnectClose = () => {
    setMseReconnectAnchorEl(null);
  };

  // Reconnect a specific channel's MSE connection
  const handleMseReconnectChannel = useCallback((channelId: string) => {
    handleMseReconnectClose();
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      connectChannel(channel);
    }
  }, [channels, connectChannel]);

  // Reconnect all MSE connections
  const handleMseReconnectAll = useCallback(() => {
    handleMseReconnectClose();
    reconnectMSE();
  }, [reconnectMSE]);

  // Get list of Vizrt channels with MSE configured for the reconnect menu
  const mseChannels = useMemo(() => {
    return channels.filter(c => c.type === 'Vizrt' && c.mse_host);
  }, [channels]);

  // Fetch carousel states for a specific channel (On/Off status)
  const fetchChannelCarouselStates = useCallback(async (channelId: string) => {
    try {
      const channel = mseChannels.find(c => c.id === channelId);
      if (!channel || !isChannelConnectedRef.current(channelId)) {
        return;
      }

      console.log(`[MSE] Fetching carousel states from channel ${channel.name}...`);
      const statesXml = await fetchShowContentRef.current(channelId, '/storage/ticker/default/state/Main/carousels', 3);

      if (statesXml) {
        const parsedStates = parseCarouselStatesXml(statesXml);
        console.log(`[MSE] Loaded ${parsedStates.size} carousel states for ${channel.name}`);

        // Update carousel states with channelId prefix
        setCarouselStates(prev => {
          const newMap = new Map(prev);
          parsedStates.forEach((isOn, carouselName) => {
            newMap.set(`${channelId}:${carouselName}`, isOn);
          });
          return newMap;
        });
      }
    } catch (err) {
      console.error('[MSE] Error fetching carousel states:', err);
    }
  }, [mseChannels]);

  // Fetch carousel buttons for a specific channel
  const fetchChannelButtons = useCallback(async (channelId: string) => {
    // Mark this channel as loading
    setLoadingButtonsChannels(prev => new Set(prev).add(channelId));

    try {
      const channel = mseChannels.find(c => c.id === channelId);
      if (!channel || !isChannelConnectedRef.current(channelId)) {
        console.log(`[MSE] Channel ${channelId} not connected, skipping button fetch`);
        return;
      }

      console.log(`[MSE] Fetching buttons from channel ${channel.name} (${channelId})...`);

      // Fetch both buttons and carousel states in parallel
      const [buttonsXml] = await Promise.all([
        fetchShowContentRef.current(channelId, '/storage/ticker/default/buttons', 5),
        fetchChannelCarouselStates(channelId)
      ]);

      if (buttonsXml) {
        const parsedGroups = parseCarouselButtonsXml(buttonsXml);
        console.log(`[MSE] Loaded ${parsedGroups.length} button groups for ${channel.name}`, parsedGroups);

        setChannelButtonsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(channelId, parsedGroups);
          return newMap;
        });
      } else {
        console.log(`[MSE] No buttons XML returned for ${channel.name}`);
      }
    } catch (err) {
      console.error('[MSE] Error fetching carousel buttons:', err);
    } finally {
      setLoadingButtonsChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  }, [mseChannels, fetchChannelCarouselStates]);

  // Handle carousel button action (sends schedule command to MSE)
  const handleCarouselButtonClick = useCallback((channelId: string, button: CarouselButton) => {
    // Execute all actions for this button
    for (const action of button.actions) {
      // Action ref format: "/storage/ticker/default/channels/Main/actions/Main ticker system on"
      // PepTalk schedule format: schedule action feedback-basepath description loglevel environment
      // - action: the path to schedule (PlainTalk escaped if contains spaces)
      // - feedback-basepath: {0} for no feedback
      // - description: {0} empty
      // - loglevel: 0 (not used without feedback)
      // - environment: {0} empty
      const pathBytes = new TextEncoder().encode(action.ref);
      const command = `schedule {${pathBytes.length}}${action.ref} {0} {0} 0 {0}`;
      console.log(`[MSE] Carousel button: ${button.caption} -> ${command}`);
      sendCommand(channelId, command);
    }

    // NOTE: We no longer need to manually fetch carousel states after button click
    // because we receive real-time state updates via WebSocket subscription to
    // /storage/ticker/default/state - the mseCarouselStates map is updated automatically
  }, [sendCommand]);

  // Toggle controls visibility for a specific channel
  const handleToggleChannelControls = useCallback((channelId: string) => {
    setExpandedControlsChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
        // Fetch buttons if not already loaded
        if (!channelButtonsMap.has(channelId)) {
          fetchChannelButtons(channelId);
        }
      }
      return newSet;
    });
    // Reset row heights after state update
    setTimeout(() => {
      gridRef.current?.api?.resetRowHeights();
    }, 50);
  }, [channelButtonsMap, fetchChannelButtons]);

  // Reset row heights when channel buttons are loaded
  useEffect(() => {
    if (channelButtonsMap.size > 0) {
      gridRef.current?.api?.resetRowHeights();
    }
  }, [channelButtonsMap]);

  // Save column state when columns are resized, moved, or visibility changes
  const saveColumnState = useCallback(() => {
    if (gridRef.current?.api) {
      const state = gridRef.current.api.getColumnState();
      setColumnState(state);
    }
  }, [setColumnState]);

  // Restore column state when grid is ready
  const onGridReady = useCallback(() => {
    if (gridRef.current?.api) {
      // Restore column state if available and loaded
      if (isGridStateLoaded && columnState && columnState.length > 0) {
        gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
        columnStateRestoredRef.current = true;
      }
    }
  }, [columnState, isGridStateLoaded]);

  // Restore column state when it becomes available (handles async loading from DB)
  useEffect(() => {
    if (isGridStateLoaded && columnState && columnState.length > 0 && gridRef.current?.api && !columnStateRestoredRef.current) {
      gridRef.current.api.applyColumnState({ state: columnState, applyOrder: true });
      columnStateRestoredRef.current = true;
    }
  }, [isGridStateLoaded, columnState]);

  // Column definitions
  const columnDefs = useMemo((): any[] => [
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      cellRenderer: (params: any) => {
        if (!params.data) return null;
        const type = params.value;
        let color = 'default';
        if (type === 'channel') color = 'primary';
        else if (type === 'carousel') color = 'secondary';
        else if (type === 'bucket') color = 'warning';
        else if (type === 'element') color = 'success';

        return (
          <Chip
            label={type}
            size="small"
            color={color as any}
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'mseId',
      headerName: 'MSE ID',
      width: 150,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.type !== 'element' || !params.value) return null;
        return (
          <Tooltip title={params.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {params.value}
              </Typography>
            </Box>
          </Tooltip>
        );
      }
    },
    {
      field: 'template',
      headerName: 'Template',
      width: 180,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.type !== 'element' || !params.value) return null;
        return (
          <Chip
            label={params.value}
            size="small"
            color="info"
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.type !== 'element') return null;
        return params.value ? `${params.value}s` : '—';
      }
    },
    {
      field: 'fieldsSummary',
      headerName: 'Fields Preview',
      flex: 1,
      minWidth: 300,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.type !== 'element') return null;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {params.value || '—'}
            </Typography>
          </Box>
        );
      }
    }
  ], []);

  const autoGroupColumnDef = useMemo(() => ({
    headerName: 'Name',
    minWidth: 300,
    flex: 1,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    // Make controls row span all columns
    colSpan: (params: any) => {
      if (params.data?.type === 'controls') {
        // Span all columns (Name + Type + MSE ID + Template + Duration + Fields Preview = 6 columns)
        return 6;
      }
      return 1;
    },
    cellRendererParams: {
      suppressCount: true,
      checkbox: false,
      innerRenderer: (params: any) => {
        const data = params.data;
        if (!data) return null;

        // Get playing state from context (passed via AG Grid context prop)
        // This allows us to avoid putting these in useMemo dependencies
        const ctx = params.context || {};
        const ctxPlayingElementIds: Set<string> = ctx.playingElementIds || new Set();
        const ctxIsElementPlaying: (id: string) => boolean = ctx.isElementPlaying || (() => false);
        const ctxPlayingElements: any[] = ctx.playingElements || [];
        const ctxFallbackChannels: Set<string> = ctx.fallbackChannels || new Set();

        // Check if this channel is using fallback mode (vizrt-ticker XML instead of MSE)
        // If so, we disable tracking indicators since we can't reliably track playing elements
        const isInFallbackMode = data.parentChannelName && ctxFallbackChannels.has(data.parentChannelName);

        // Check if this element is currently playing
        // Only check if NOT in fallback mode - tracking is disabled for fallback channels
        // IMPORTANT: Only ONE element per carousel should show as playing
        // We use mseId matching which is the authoritative source from MSE
        let isPlaying = false;
        let matchedVizChannel: string | undefined;
        if (data.type === 'element' && !isInFallbackMode && data.mseId) {
          // Direct match by mseId
          isPlaying = ctxPlayingElementIds.has(data.mseId) || ctxIsElementPlaying(data.mseId);

          // If no direct match, check if any playing element ID ends with our mseId
          // This handles cases where MSE sends "sequence#N/ELEMENT_NAME" format
          if (!isPlaying) {
            for (const playingId of ctxPlayingElementIds) {
              if (playingId.endsWith(`/${data.mseId}`)) {
                isPlaying = true;
                break;
              }
            }
          }

          // Find matching playing element to get vizChannel
          // Try multiple matching strategies:
          // 1. Direct mseId match
          // 2. elementId ends with mseId
          // 3. Field value matching (for scheduler_state elements)
          // NOTE: Don't break immediately on match - keep searching if vizChannel not found

          for (const playingEl of ctxPlayingElements) {
            let foundMatch = false;

            // Direct mseId match - check both directions
            // MSE can send either "MY_ELEMENT" or "sequence#3/MY_ELEMENT"
            // LiveView mseId is typically "sequence#3/MY_ELEMENT"
            if (playingEl.elementId === data.mseId ||
                playingEl.elementId.endsWith(`/${data.mseId}`) ||
                data.mseId.endsWith(`/${playingEl.elementId}`)) {
              foundMatch = true;
              isPlaying = true;
            }

            // Field value matching - scheduler_state elements have field values
            // Match if any field value from playingEl matches any field value from data
            if (!foundMatch && playingEl.fields && playingEl.fields.length > 0 && data.fields && data.fields.length > 0) {
              for (const playingField of playingEl.fields) {
                for (const dataField of data.fields) {
                  if (playingField.value && dataField.value && playingField.value === dataField.value) {
                    foundMatch = true;
                    isPlaying = true;
                    break;
                  }
                }
                if (foundMatch) break;
              }
            }

            // If we found a match and this element has vizChannel, use it
            if (foundMatch && playingEl.vizChannel && !matchedVizChannel) {
              matchedVizChannel = playingEl.vizChannel.replace(/^viz_/, '');
            }

            // Only break if we have both isPlaying AND matchedVizChannel
            // This ensures we keep searching for vizChannel even if we found a match without it
            if (isPlaying && matchedVizChannel) break;
          }
        }

        // Check if element is set as "next"
        let isNext = false;
        let nextVizChannel: string | null = null;

        if (data.type === 'element' && data.mseId) {
          const ctxIsElementNext = params.context?.isElementNext;
          if (ctxIsElementNext) {
            const nextEl = ctxIsElementNext(data.mseId);
            if (nextEl) {
              isNext = true;
              nextVizChannel = nextEl.vizChannel;
            }
          }
        }

        // Special rendering for controls row
        if (data.type === 'controls') {
          const isLoading = ctx.loadingButtonsChannels?.has(data.channelId);
          const groups = data.controlsGroups || [];

          if (isLoading) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, height: '100%' }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Loading controls...</Typography>
              </Box>
            );
          }

          if (groups.length === 0) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, height: '100%' }}>
                <Typography variant="body2" color="text.secondary">No controls available</Typography>
              </Box>
            );
          }

          return (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.5,
              pl: 1,
              pr: 1,
              py: 0.5,
              height: '100%',
              width: '100%',
              overflow: 'hidden'
            }}>
              {groups.map((group: CarouselButtonGroup, index: number) => (
                <Box
                  key={group.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.5,
                    bgcolor: 'transparent',
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.25,
                    flexShrink: 0,
                    width: '100%',
                    borderBottom: index < groups.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      textAlign: 'left'
                    }}
                  >
                    {group.caption || group.tag || group.name}:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, minWidth: 500, justifyContent: 'flex-end' }}>
                    {group.buttons.map((button: CarouselButton) => {
                      // Determine button type - prioritize caption over stateValue
                      // (stateValue can be misleading due to inversestate attribute)
                      const captionLower = button.caption.toLowerCase();
                      const isOnButton = captionLower === 'on' || (captionLower !== 'off' && button.stateValue === 'on');
                      const isOffButton = captionLower === 'off' || (captionLower !== 'on' && button.stateValue === 'off');

                      // Extract carousel name from button's statePath for state lookup
                      // statePath formats:
                      // - Carousels: /storage/ticker/default/state/Main/carousels/INFO_BAR/current/L -> "INFO_BAR"
                      // - Ticker System: /storage/ticker/default/state/Main/system/current -> "system"
                      // - Program: /storage/ticker/default/state/Main/program/current -> "program"
                      let carouselName = group.tag || group.name;
                      if (button.statePath) {
                        const carouselMatch = button.statePath.match(/\/carousels\/([^/]+)\//);
                        const systemProgramMatch = button.statePath.match(/\/state\/[^/]+\/(system|program)\/current$/);
                        if (carouselMatch) {
                          carouselName = carouselMatch[1]; // e.g., "INFO_BAR"
                        } else if (systemProgramMatch) {
                          carouselName = systemProgramMatch[1]; // "system" or "program"
                        }
                      }
                      const carouselStateKey = `${data.channelId}:${carouselName}`;

                      // First check real-time MSE carousel states (from WebSocket subscription)
                      // Then fall back to locally fetched carousel states
                      const mseState = ctx.mseCarouselStates?.get(carouselStateKey);
                      const localState = ctx.carouselStates?.get(carouselStateKey);
                      const isCarouselOn = mseState?.isOn ?? localState === true;

                      // Determine if this button should show as active:
                      // - "On" button is active when carousel is On
                      // - "Off" button is active when carousel is Off
                      const isActive = isOnButton ? isCarouselOn : (isOffButton ? !isCarouselOn : false);

                      // Determine button color - prioritize explicit stateColor over inferred isOnButton/isOffButton
                      let color: 'success' | 'error' | 'inherit' = 'inherit';
                      if (button.stateColor === '#008000' || button.stateColor === 'green') {
                        color = 'success';
                      } else if (button.stateColor === '#FF0000' || button.stateColor === 'red') {
                        color = 'error';
                      } else if (isOnButton) {
                        color = 'success';
                      } else if (isOffButton) {
                        color = 'error';
                      }

                      return (
                        <Button
                          key={button.name}
                          size="small"
                          variant={isActive ? 'contained' : 'outlined'}
                          color={color}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            ctx.onCarouselButtonClick?.(data.channelId, button);
                          }}
                          startIcon={(isOnButton || isOffButton) ? <PowerSettingsNewIcon sx={{ fontSize: 12 }} /> : undefined}
                          sx={{
                            minWidth: 'auto',
                            minHeight: 24,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            textTransform: 'none',
                            px: 1,
                            py: 0.25,
                            '& .MuiButton-startIcon': {
                              marginRight: 0.25,
                              marginLeft: 0
                            }
                          }}
                        >
                          {button.caption}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          );
        }

        let icon = null;
        if (data.type === 'channel') {
          icon = <TvIcon style={{ fontSize: 18, marginRight: 8, color: 'var(--icon-primary)' }} />;
        } else if (data.type === 'carousel') {
          icon = <ViewCarouselIcon style={{ fontSize: 18, marginRight: 8, color: 'var(--icon-secondary)' }} />;
        } else if (data.type === 'bucket') {
          icon = <FolderIcon style={{ fontSize: 18, marginRight: 8, color: 'var(--icon-warning)' }} />;
        } else if (data.type === 'element') {
          icon = <ArticleIcon style={{ fontSize: 18, marginRight: 8, color: 'var(--icon-success)' }} />;
        }

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Playing indicator arrow - only shown when NOT in fallback mode */}
            {isPlaying && (
              <PlayArrowIcon
                style={{
                  fontSize: 20,
                  marginRight: 4,
                  color: '#4caf50',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            )}
            {/* Next indicator arrow - yellow, shown when element is set as next */}
            {isNext && !isPlaying && (
              <SkipNextIcon
                style={{
                  fontSize: 20,
                  marginRight: 4,
                  color: '#ff9800'
                }}
              />
            )}
            {icon}
            <span style={{ fontWeight: isPlaying || isNext ? 600 : 400 }}>{data.name}</span>
            {data.type === 'channel' && data.channelType && (
              <Chip
                label={data.channelType}
                size="small"
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
            {/* Show MSE connection status for Vizrt channels */}
            {data.type === 'channel' && data.channelType === 'Vizrt' && (
              <Chip
                label={isInFallbackMode ? 'Disconnected' : 'Connected'}
                size="small"
                variant="outlined"
                color={isInFallbackMode ? 'default' : 'success'}
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: '0.65rem',
                  ...(isInFallbackMode ? {
                    color: 'text.secondary',
                    borderColor: 'text.secondary'
                  } : {})
                }}
              />
            )}
            {/* Controls toggle button for connected Vizrt channels */}
            {data.type === 'channel' && data.channelType === 'Vizrt' && !isInFallbackMode && data.channelId && (
              <Tooltip title={ctx.expandedControlsChannels?.has(data.channelId) ? "Hide Controls" : "Show Controls"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.onToggleChannelControls?.(data.channelId);
                  }}
                  sx={{
                    ml: 1,
                    padding: '2px',
                    color: ctx.expandedControlsChannels?.has(data.channelId) ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <TuneIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {data.type === 'carousel' && data.carouselType && (
              <Chip
                label={data.carouselType}
                size="small"
                variant="outlined"
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
            {/* Playing badge for elements - only shown when NOT in fallback mode */}
            {isPlaying && (
              <Chip
                label={matchedVizChannel || 'LIVE'}
                size="small"
                color="success"
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            )}
            {/* Next badge for elements - shown when element is set as next (but not playing) */}
            {isNext && !isPlaying && (
              <Chip
                label={nextVizChannel || 'NEXT'}
                size="small"
                color="warning"
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700
                }}
              />
            )}
          </Box>
        );
      }
    }
  }), []); // No dependencies - playing state comes from context

  const defaultColDef = useMemo(() => ({
    sortable: false,
    filter: false,
    resizable: true
  }), []);

  // Flatten rows for display (tree data), injecting controls rows after expanded channels
  const flattenedRows = useMemo(() => {
    if (expandedControlsChannels.size === 0) return rowData;

    const result: TreeNode[] = [];
    for (const row of rowData) {
      result.push(row);

      // If this is an expanded channel, inject controls rows after it
      if (row.type === 'channel' && row.channelId && expandedControlsChannels.has(row.channelId)) {
        const buttonGroups = channelButtonsMap.get(row.channelId) || [];
        const isLoading = loadingButtonsChannels.has(row.channelId);

        // Add a single controls row that will render all button groups
        result.push({
          id: `${row.id}-controls`,
          name: isLoading ? 'Loading controls...' : (buttonGroups.length === 0 ? 'No controls available' : 'Controls'),
          type: 'controls',
          treePath: [row.name, '__controls__'],
          parentChannelName: row.name,
          channelId: row.channelId,
          controlsGroups: buttonGroups
        });
      }
    }
    return result;
  }, [rowData, expandedControlsChannels, channelButtonsMap, loadingButtonsChannels]);


  return (
    (<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div className="toolbar">
        <div className="toolbar-left">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Set As Next button - shown when element or bucket is selected */}
            {selectedNode && (selectedNode.type === 'element' || selectedNode.type === 'bucket') && selectedChannelVizChannels.length > 0 ? (
              <>
                <Tooltip title="Set As Next">
                  <IconButton
                    size="small"
                    onClick={handleSetAsNextClick}
                    sx={{
                      color: 'var(--primary-blue)',
                      border: '1px solid var(--primary-blue)',
                      borderRadius: 1,
                      padding: '4px 8px',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    <SkipNextIcon fontSize="small" />
                    <ArrowDropDownIcon fontSize="small" sx={{ ml: -0.5 }} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={setAsNextAnchorEl}
                  open={Boolean(setAsNextAnchorEl)}
                  onClose={handleSetAsNextClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                >
                  {selectedChannelVizChannels.map((vc) => (
                    <MenuItem
                      key={vc.name}
                      onClick={() => handleSetAsNext(vc.name)}
                    >
                      {vc.name}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : null}
            {/* MSE Reconnect Button with dropdown */}
            {mseStatus !== 'no_channels' && (
              <>
                <Tooltip title={`MSE: ${mseConnections.size} connection(s)${playingElementIds.size > 0 ? ` - ${playingElementIds.size} playing` : ''}`}>
                  <IconButton
                    size="small"
                    onClick={handleMseReconnectClick}
                    sx={{
                      color: mseStatus === 'all_connected' ? 'success.main'
                        : mseStatus === 'partial' ? 'warning.main'
                        : 'text.secondary',
                      border: '1px solid',
                      borderColor: mseStatus === 'all_connected' ? 'success.main'
                        : mseStatus === 'partial' ? 'warning.main'
                        : 'divider',
                      borderRadius: 1,
                      padding: '4px 8px',
                      '&:hover': {
                        backgroundColor: mseStatus === 'all_connected' ? 'rgba(76, 175, 80, 0.08)'
                          : mseStatus === 'partial' ? 'rgba(255, 152, 0, 0.08)'
                          : 'action.hover'
                      }
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                    <ArrowDropDownIcon fontSize="small" sx={{ ml: -0.5 }} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={mseReconnectAnchorEl}
                  open={Boolean(mseReconnectAnchorEl)}
                  onClose={handleMseReconnectClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                >
                  {mseChannels.map((channel) => {
                    const conn = mseConnections.get(channel.id);
                    const isConnected = conn?.status === 'connected';
                    return (
                      <MenuItem
                        key={channel.id}
                        onClick={() => handleMseReconnectChannel(channel.id)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: isConnected ? 'success.main' : 'error.main'
                            }}
                          />
                          {channel.name}
                        </Box>
                      </MenuItem>
                    );
                  })}
                  {mseChannels.length > 1 && (
                    <MenuItem onClick={handleMseReconnectAll} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                      Reconnect All
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Auto-refresh every minute">
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={<Typography variant="body2">Auto</Typography>}
              sx={{ mr: 0 }}
            />
          </Tooltip>
          <Tooltip title="Refresh Now">
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={loading || isRefreshing || channelsLoading}
                className="toolbar-button"
                color="primary"
              >
                <RefreshIcon style={{
                  animation: (isRefreshing || loading) ? 'spin 1.5s linear infinite' : 'none'
                }} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
      <div
        ref={containerRef}
        className="ag-theme-alpine"
        style={{
          flex: 1,
          overflow: 'auto',
          height: '100%',
          position: 'relative'
        }}
      >
        {(loading || channelsLoading) && rowData.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: 'var(--bg-white)',
              zIndex: 10
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              Loading live data...
            </Typography>
          </Box>
        )}
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={flattenedRows}
          columnDefs={columnDefs as any}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef as any}
          context={{
            playingElementIds,
            isElementPlaying,
            playingElements,
            fallbackChannels,
            nextElements,
            isElementNext,
            expandedControlsChannels,
            onToggleChannelControls: handleToggleChannelControls,
            channelButtonsMap,
            loadingButtonsChannels,
            // Use MSE real-time carousel states, falling back to local state for initial load
            carouselStates,
            mseCarouselStates,
            isCarouselOn,
            onCarouselButtonClick: handleCarouselButtonClick
          }}
          treeData={true}
          getDataPath={getDataPath}
          getRowId={getRowId}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            enableClickSelection: true
          }}
          selectionColumnDef={{ hide: true } as any}
          onSelectionChanged={onSelectionChanged}
          onGridReady={onGridReady}
          onColumnResized={saveColumnState}
          onColumnMoved={saveColumnState}
          onColumnVisible={saveColumnState}
          animateRows={true}
          groupDefaultExpanded={0}
          onRowGroupOpened={onRowGroupOpened}
          getRowHeight={(params: any) => {
            // Controls rows need more height to fit button groups (1 group per row)
            if (params.data?.type === 'controls') {
              const groups = params.data.controlsGroups || [];
              if (groups.length === 0) return 50;

              // Each button group takes one row
              const numRows = groups.length;

              // Each row is ~34px (button height ~26px + gap 4px + margin 4px)
              // Plus 24px top/bottom padding total for safety
              const rowHeight = 34;
              const padding = 24;
              return Math.max(50, padding + numRows * rowHeight);
            }
            return 40;
          }}
          tooltipShowDelay={1500}
          tooltipShowMode="whenTruncated"
          suppressContextMenu={true}
          popupParent={document.body}
        />
      </div>
      {/* Selected element details panel */}
      {selectedNode && selectedNode.type === 'element' && selectedNode.fields && (
        <Box sx={{
          borderTop: '1px solid var(--border-gray)',
          p: 2,
          maxHeight: '250px',
          overflow: 'auto',
          bgcolor: 'var(--bg-light-gray)',
          position: 'relative'
        }}>
          <IconButton
            size="small"
            onClick={() => setSelectedNode(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'var(--text-secondary)',
              '&:hover': {
                color: 'var(--text-primary)',
                bgcolor: 'var(--bg-white)'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap', pr: 4 }}>
            <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)' }}>
              Element Fields
            </Typography>
            <Chip
              label={selectedNode.name}
              size="small"
              color="success"
              variant="outlined"
            />
            {selectedNode.mseId && (
              <Tooltip title="MSE Element ID - used for playing state tracking">
                <Chip
                  label={`MSE: ${selectedNode.mseId}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            {selectedNode.template && (
              <Chip
                label={selectedNode.template}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Box>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              '& th, & td': {
                textAlign: 'left',
                py: 0.75,
                px: 1.5,
                borderBottom: '1px solid var(--border-gray)'
              },
              '& th': {
                fontWeight: 600,
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '180px'
              },
              '& td': {
                fontSize: '0.875rem',
                wordBreak: 'break-word',
                color: 'var(--text-primary)'
              },
              '& tr:last-child td, & tr:last-child th': {
                borderBottom: 'none'
              }
            }}
          >
            <tbody>
              {selectedNode.fields.map((field, idx) => (
                <Box component="tr" key={idx}>
                  <Box component="th">{field.name}</Box>
                  <Box component="td">{field.value || <Typography component="span" sx={{ color: 'var(--text-disabled)' }}>—</Typography>}</Box>
                </Box>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </div>)
  );
};

export default LiveViewPage;
