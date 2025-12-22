import { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Link, AlertCircle } from 'lucide-react';
import { Button, Input } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';

// Default video URL
const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=bImk2wEVVCc';

// Video type detection
type VideoType = 'youtube' | 'vimeo' | 'file' | 'stream' | 'unknown';

function detectVideoType(url: string): VideoType {
  if (!url) return 'unknown';
  
  // YouTube detection
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  
  // Vimeo detection
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  
  // Supabase storage detection (Nova media and other Supabase projects)
  if (url.includes('supabase.co/storage')) {
    return 'file';
  }
  
  // Direct file detection - check anywhere in the URL path
  if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)/i)) {
    return 'file';
  }
  
  // Stream detection (HLS, DASH)
  if (url.match(/\.(m3u8|mpd)(\?|$)/i)) {
    return 'stream';
  }
  
  // If it's an HTTP URL, try treating it as a file (might be a direct video link)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it looks like a video storage URL
    if (url.includes('/video/') || url.includes('/media/') || url.includes('/storage/')) {
      return 'file';
    }
  }
  
  return 'unknown';
}

// Extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
    /youtube\.com\/shorts\/([^&?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Vimeo video ID
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// Animated media properties that can be controlled via keyframes
export interface AnimatedMediaProps {
  media_time?: number;      // Video currentTime in seconds
  media_playing?: number;   // 0 = paused, 1 = playing
  media_volume?: number;    // 0 to 1
  media_muted?: number;     // 0 = unmuted, 1 = muted
  media_speed?: number;     // Playback rate (0.25 to 4)
}

interface VideoElementProps {
  content: {
    type: 'video';
    src: string;
    loop?: boolean;
    muted?: boolean;
    autoplay?: boolean;
    poster?: string;
    videoType?: 'file' | 'youtube' | 'vimeo' | 'stream';
    controls?: boolean;  // Show controls overlay in designer
  };
  width: number | null;
  height: number | null;
  elementId?: string;
  isSelected?: boolean;
  isPreview?: boolean;
  animatedMediaProps?: AnimatedMediaProps;  // Keyframe-controlled media properties
  isPlaying?: boolean;  // Timeline playing state
  calculatedSpeed?: number;  // Calculated playback speed from keyframes (video duration / timeline duration)
}

export function VideoElement({
  content,
  width,
  height,
  elementId,
  isSelected = false,
  isPreview = true, // Default to true (hide overlay) unless explicitly in designer
  animatedMediaProps,
  isPlaying: timelinePlaying = false,
  calculatedSpeed = 1,
}: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(content.autoplay ?? true);
  const [localIsMuted, setLocalIsMuted] = useState(content.muted ?? true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(content.src || DEFAULT_VIDEO_URL);
  const [error, setError] = useState<string | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef<boolean>(false); // Track previous timeline playing state

  const updateElement = useDesignerStore((state) => state.updateElement);

  // Check if we have media_time keyframes - this overrides autoplay/loop
  const hasMediaTimeKeyframes = animatedMediaProps?.media_time !== undefined;

  // If autoplay AND loop are both enabled AND there are no media_time keyframes, let video play naturally
  // If there are media_time keyframes, keyframe control takes precedence
  const isAutoplayLoopMode = (content.autoplay ?? true) && (content.loop ?? true) && !hasMediaTimeKeyframes;

  // Determine if we're using keyframe control
  // Keyframe control is enabled when there are animated media props AND we're not in autoplay+loop mode
  const hasKeyframeControl = !isAutoplayLoopMode && animatedMediaProps && (
    animatedMediaProps.media_time !== undefined ||
    animatedMediaProps.media_playing !== undefined ||
    animatedMediaProps.media_volume !== undefined ||
    animatedMediaProps.media_muted !== undefined ||
    animatedMediaProps.media_speed !== undefined
  );

  // Debug logging
  console.log('[Video] Control mode:', {
    hasMediaTimeKeyframes,
    isAutoplayLoopMode,
    hasKeyframeControl,
    autoplay: content.autoplay ?? true,
    loop: content.loop ?? true,
    calculatedSpeed
  });

  // Use animated values when keyframe-controlled, otherwise use local state
  const isPlaying = hasKeyframeControl && animatedMediaProps?.media_playing !== undefined
    ? animatedMediaProps.media_playing >= 0.5
    : localIsPlaying;
  const isMuted = hasKeyframeControl && animatedMediaProps?.media_muted !== undefined
    ? animatedMediaProps.media_muted >= 0.5
    : localIsMuted;
  
  // Detect video type
  const videoType = useMemo(() => 
    content.videoType || detectVideoType(content.src || DEFAULT_VIDEO_URL),
    [content.src, content.videoType]
  );
  
  const videoSrc = content.src || DEFAULT_VIDEO_URL;
  
  // Get embed URL for YouTube/Vimeo
  const embedUrl = useMemo(() => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(videoSrc);
      if (videoId) {
        // Build params for YouTube embed
        const params = new URLSearchParams({
          autoplay: isPlaying ? '1' : '0',
          mute: isMuted ? '1' : '0',
          loop: content.loop ? '1' : '0',
          controls: '0', // Hide player controls
          rel: '0', // Don't show related videos at end
          modestbranding: '1', // Reduce YouTube branding
          fs: '0', // Disable fullscreen button
          iv_load_policy: '3', // Hide annotations
          disablekb: '1', // Disable keyboard controls
          playsinline: '1', // Play inline on mobile
          enablejsapi: '1', // Enable JS API for control
          origin: window.location.origin, // Required for some embeds
          playlist: content.loop ? videoId : '', // Required for loop to work
        });
        // Use standard youtube.com embed (youtube-nocookie.com can have stricter requirements)
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
      }
    }
    
    if (videoType === 'vimeo') {
      const videoId = getVimeoId(videoSrc);
      if (videoId) {
        const params = new URLSearchParams({
          autoplay: isPlaying ? '1' : '0',
          muted: isMuted ? '1' : '0',
          loop: content.loop ? '1' : '0',
          controls: '0',
          title: '0',
          byline: '0',
          portrait: '0',
        });
        return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
      }
    }
    
    return null;
  }, [videoSrc, videoType, isPlaying, isMuted, content.loop]);
  
  // Handle video controls for native video
  useEffect(() => {
    if (videoRef.current && videoType === 'file') {
      if (isPlaying) {
        videoRef.current.play().catch(() => setError('Failed to play video'));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoType]);

  useEffect(() => {
    if (videoRef.current && videoType === 'file') {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, videoType]);

  // Store the media_time at the moment playback starts
  const startMediaTimeRef = useRef<number | null>(null);

  // Handle timeline play/pause transitions
  // When timeline starts playing: seek to current position and play at calculated speed
  // When timeline stops: pause the video
  useEffect(() => {
    const video = videoRef.current;
    console.log('[Video] Playback effect:', {
      hasVideo: !!video,
      videoType,
      hasKeyframeControl,
      timelinePlaying,
      wasPlaying: wasPlayingRef.current,
      calculatedSpeed
    });
    if (!video || videoType !== 'file' || !hasKeyframeControl) return;

    if (timelinePlaying && !wasPlayingRef.current) {
      // Timeline just started playing - capture the current media_time and seek there
      const startTime = animatedMediaProps?.media_time ?? 0;
      startMediaTimeRef.current = startTime;
      video.currentTime = startTime;
      // Use calculated speed from keyframes (video duration / timeline duration)
      video.playbackRate = calculatedSpeed;
      console.log('[Video] Started playback at', startTime, 'with speed', calculatedSpeed);
      video.play().catch(() => {});
    } else if (!timelinePlaying && wasPlayingRef.current) {
      // Timeline just stopped - pause video and clear start time
      video.pause();
      startMediaTimeRef.current = null;
    }

    wasPlayingRef.current = timelinePlaying;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelinePlaying, hasKeyframeControl, videoType, calculatedSpeed]);
  // Note: intentionally NOT including animatedMediaProps.media_time in deps
  // We only want to capture it once when playback starts

  // Apply animated media properties from keyframes
  // Only seek during scrubbing (when timeline is NOT playing)
  // During playback, let video play naturally at the calculated speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoType !== 'file' || !hasKeyframeControl) return;

    // Only apply media_time when scrubbing (not playing)
    // During playback, the video plays naturally from the start position at calculated speed
    if (!timelinePlaying && animatedMediaProps?.media_time !== undefined) {
      const targetTime = animatedMediaProps.media_time;
      const timeDiff = Math.abs(video.currentTime - targetTime);
      if (timeDiff > 0.05) {
        video.currentTime = targetTime;
        lastTimeRef.current = targetTime;
      }
    }

    // Apply media_volume (can apply anytime)
    if (animatedMediaProps?.media_volume !== undefined) {
      video.volume = Math.max(0, Math.min(1, animatedMediaProps.media_volume));
    }
  }, [animatedMediaProps, hasKeyframeControl, videoType, timelinePlaying]);
  
  // Update element when URL changes
  const handleUrlSubmit = () => {
    if (elementId && urlInput !== content.src) {
      const newType = detectVideoType(urlInput);
      updateElement(elementId, {
        content: {
          ...content,
          src: urlInput,
          videoType: newType === 'unknown' ? 'file' : newType,
        },
      });
      setError(null);
    }
    setShowUrlInput(false);
  };
  
  const elementWidth = width || 1920;
  const elementHeight = height || 1080;
  
  // Show URL input overlay when selected and no video or error
  if (showUrlInput || (!content.src && isSelected)) {
    return (
      <div 
        className="relative flex flex-col items-center justify-center bg-neutral-900 rounded-lg overflow-hidden"
        style={{ width: elementWidth, height: elementHeight }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10" />
        <div className="relative z-10 p-6 max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <Link className="w-5 h-5 text-violet-400" />
            <span className="text-white font-medium">Enter Video URL</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="YouTube, Vimeo, or direct video URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              className="flex-1 bg-neutral-800 border-neutral-700 text-white"
              autoFocus
            />
            <Button onClick={handleUrlSubmit} size="sm">
              Apply
            </Button>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Supports YouTube, Vimeo, and direct MP4/WebM URLs
          </p>
          {error && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Render YouTube/Vimeo iframe
  if (embedUrl && (videoType === 'youtube' || videoType === 'vimeo')) {
    return (
      <div
        className="relative overflow-hidden"
        style={{
          width: elementWidth,
          height: elementHeight,
        }}
      >
        {/* Wrapper to scale and clip iframe to hide YouTube UI elements */}
        <div
          style={{
            position: 'absolute',
            // Expand slightly beyond container to hide edge UI (title, branding)
            top: videoType === 'youtube' ? '-4%' : 0,
            left: videoType === 'youtube' ? '-4%' : 0,
            width: videoType === 'youtube' ? '108%' : '100%',
            height: videoType === 'youtube' ? '108%' : '100%',
            overflow: 'hidden',
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              pointerEvents: isPreview ? 'auto' : 'none',
              border: 'none',
            }}
          />
        </div>

        {/* Minimal URL change button - only show when selected in designer and controls enabled */}
        {isSelected && !isPreview && elementId && content.controls && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 h-7 text-xs bg-black/50 hover:bg-black/70 text-white z-50"
            onClick={() => setShowUrlInput(true)}
          >
            <Link className="w-3 h-3 mr-1" />
            Change URL
          </Button>
        )}
      </div>
    );
  }
  
  // Render native video
  if (videoType === 'file' || videoType === 'stream') {
    return (
      <div 
        className="relative overflow-hidden"
        style={{ width: elementWidth, height: elementHeight }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          crossOrigin="anonymous"
          loop={content.loop ?? true}
          muted={isMuted}
          autoPlay={content.autoplay ?? true}
          playsInline
          poster={content.poster}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={() => setError('Failed to load video')}
        />
        
        {/* Controls overlay (only in designer when selected, controls enabled, never in preview) */}
        {isSelected && !isPreview && elementId && content.controls && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 z-50">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={() => setLocalIsPlaying(!localIsPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={() => setLocalIsMuted(!localIsMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white hover:bg-white/20"
              onClick={() => setShowUrlInput(true)}
            >
              <Link className="w-3 h-3 mr-1" />
              Change URL
            </Button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-white">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-white"
                onClick={() => setShowUrlInput(true)}
              >
                Try another URL
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // For unknown video type, try to render as native video anyway
  // This handles cases where the URL format isn't recognized but is still a valid video
  return (
    <div 
      className="relative overflow-hidden"
      style={{ width: elementWidth, height: elementHeight }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        crossOrigin="anonymous"
        loop={content.loop ?? true}
        muted={isMuted}
        autoPlay={content.autoplay ?? true}
        playsInline
        poster={content.poster}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={() => setError('Failed to load video. Check the URL format.')}
      />
      
      {/* Controls overlay (only in designer when selected, controls enabled, never in preview) */}
      {isSelected && !isPreview && elementId && content.controls && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 z-50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-white hover:bg-white/20"
            onClick={() => setShowUrlInput(true)}
          >
            <Link className="w-3 h-3 mr-1" />
            Change URL
          </Button>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-white">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-white"
              onClick={() => setShowUrlInput(true)}
            >
              Try another URL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Default video content creator
export function createDefaultVideoContent(): VideoElementProps['content'] {
  return {
    type: 'video',
    src: DEFAULT_VIDEO_URL,
    loop: true,
    muted: true,
    autoplay: true,
    videoType: 'youtube',
  };
}

