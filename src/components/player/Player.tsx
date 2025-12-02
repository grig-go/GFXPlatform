import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project, Layer, PlaybackState, PlaybackCommand } from '@/types';

interface LayerState {
  layer: Layer;
  playbackState: PlaybackState | null;
  templateHtml: string | null;
  data: Record<string, unknown>;
}

export function Player() {
  const { orgSlug, projectSlug } = useParams<{ orgSlug?: string; projectSlug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [layerStates, setLayerStates] = useState<Map<string, LayerState>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project and subscribe to playback state
  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if projectSlug is a UUID (direct project ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectSlug || '');
        
        let projectData;
        let projectError;
        
        if (isUUID) {
          // Load by ID
          const result = await supabase
            .from('gfx_projects')
            .select('*')
            .eq('id', projectSlug)
            .single();
          projectData = result.data;
          projectError = result.error;
        } else {
          // Load project by slug
          const result = await supabase
            .from('gfx_projects')
            .select('*')
            .eq('slug', projectSlug)
            .single();
          projectData = result.data;
          projectError = result.error;
        }

        if (projectError) throw projectError;
        setProject(projectData);

        // Load layers
        const { data: layersData, error: layersError } = await supabase
          .from('gfx_layers')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('enabled', true)
          .order('z_index', { ascending: true });

        if (layersError) throw layersError;

        // Load playback states
        const { data: statesData, error: statesError } = await supabase
          .from('gfx_playback_state')
          .select('*')
          .eq('project_id', projectData.id);

        if (statesError) throw statesError;

        // Initialize layer states
        const states = new Map<string, LayerState>();
        for (const layer of layersData || []) {
          const playbackState = statesData?.find((s) => s.layer_id === layer.id) || null;
          states.set(layer.id, {
            layer,
            playbackState,
            templateHtml: null,
            data: {},
          });
        }
        setLayerStates(states);

        // Subscribe to realtime playback state changes
        const channel = supabase
          .channel(`playback:${projectData.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'gfx_playback_state',
              filter: `project_id=eq.${projectData.id}`,
            },
            (payload) => {
              console.log('Playback state change:', payload);
              handlePlaybackStateChange(payload.new as PlaybackState);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'gfx_playback_commands',
              filter: `project_id=eq.${projectData.id}`,
            },
            (payload) => {
              console.log('Playback command:', payload);
              handlePlaybackCommand(payload.new as PlaybackCommand);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.error('Error loading player:', err);
        setError(err instanceof Error ? err.message : 'Failed to load player');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectSlug) {
      loadProject();
    }
  }, [orgSlug, projectSlug]);

  const handlePlaybackStateChange = (newState: PlaybackState) => {
    setLayerStates((prev) => {
      const updated = new Map(prev);
      const layerState = updated.get(newState.layer_id);
      if (layerState) {
        updated.set(newState.layer_id, {
          ...layerState,
          playbackState: newState,
          data: (newState.data_override as Record<string, unknown>) || {},
        });
      }
      return updated;
    });
  };

  const handlePlaybackCommand = (command: PlaybackCommand) => {
    // Handle commands like play_in, play_out, update, clear
    console.log('Processing command:', command);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-red-500/80 text-sm">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-white/50 text-sm">Project not found</div>
      </div>
    );
  }

  // Sort layers by z-index for correct stacking
  const sortedLayers = Array.from(layerStates.values()).sort(
    (a, b) => a.layer.z_index - b.layer.z_index
  );

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: project.canvas_width,
        height: project.canvas_height,
        backgroundColor: project.background_color === 'transparent' ? 'transparent' : project.background_color,
      }}
    >
      {/* Render each layer */}
      {sortedLayers.map(({ layer, playbackState, templateHtml, data }) => (
        <PlayerLayer
          key={layer.id}
          layer={layer}
          playbackState={playbackState}
          templateHtml={templateHtml}
          data={data}
        />
      ))}
    </div>
  );
}

interface PlayerLayerProps {
  layer: Layer;
  playbackState: PlaybackState | null;
  templateHtml: string | null;
  data: Record<string, unknown>;
}

function PlayerLayer({ layer, playbackState, templateHtml }: PlayerLayerProps) {
  // Calculate position based on anchor
  const getPosition = () => {
    const anchorPositions: Record<string, React.CSSProperties> = {
      'top-left': { top: layer.position_offset_y, left: layer.position_offset_x },
      'top-center': { top: layer.position_offset_y, left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: layer.position_offset_y, right: -layer.position_offset_x },
      'center-left': { top: '50%', left: layer.position_offset_x, transform: 'translateY(-50%)' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'center-right': { top: '50%', right: -layer.position_offset_x, transform: 'translateY(-50%)' },
      'bottom-left': { bottom: -layer.position_offset_y, left: layer.position_offset_x },
      'bottom-center': { bottom: -layer.position_offset_y, left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: -layer.position_offset_y, right: -layer.position_offset_x },
    };
    return anchorPositions[layer.position_anchor] || {};
  };

  // Always render if layer is marked as "always on"
  const isAlwaysOn = layer.always_on;
  const hasActivePlayback = playbackState && playbackState.state !== 'empty';
  
  // For always-on layers, render even without playback state
  // For regular layers, only render if there's active playback
  if (!isAlwaysOn && !hasActivePlayback) {
    return null;
  }

  return (
    <div
      className="absolute"
      style={{
        ...getPosition(),
        width: layer.width || 'auto',
        height: layer.height || 'auto',
        zIndex: layer.z_index,
      }}
      data-layer-id={layer.id}
      data-layer-type={layer.layer_type}
      data-always-on={isAlwaysOn ? 'true' : 'false'}
      data-playback-state={playbackState?.state || 'empty'}
    >
      {/* Template content would be rendered here */}
      {templateHtml ? (
        <div dangerouslySetInnerHTML={{ __html: templateHtml }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/30 text-sm border border-white/10 rounded">
          {layer.name}
          {isAlwaysOn && !hasActivePlayback && (
            <span className="ml-2 text-xs text-white/20">(Always On)</span>
          )}
        </div>
      )}
    </div>
  );
}

