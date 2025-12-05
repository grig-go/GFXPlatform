import { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Link, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface VideoElementProps {
  content: {
    type: 'video';
    src: string;
    loop?: boolean;
    muted?: boolean;
    autoplay?: boolean;
    poster?: string;
    videoType?: 'file' | 'youtube' | 'vimeo' | 'stream';
  };
  width: number | null;
  height: number | null;
  elementId?: string;
  isSelected?: boolean;
  isPreview?: boolean;
}

export function VideoElement({
  content,
  width,
  height,
  elementId,
  isSelected = false,
  isPreview = false,
}: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(content.autoplay ?? true);
  const [isMuted, setIsMuted] = useState(content.muted ?? true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(content.src || DEFAULT_VIDEO_URL);
  const [error, setError] = useState<string | null>(null);
  
  const updateElement = useDesignerStore((state) => state.updateElement);
  
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
        const params = new URLSearchParams({
          autoplay: isPlaying ? '1' : '0',
          mute: isMuted ? '1' : '0',
          loop: content.loop ? '1' : '0',
          controls: '0', // Hide all controls
          modestbranding: '1', // Hide YouTube logo
          rel: '0', // Don't show related videos
          showinfo: '0', // Hide video info
          fs: '0', // Disable fullscreen button
          iv_load_policy: '3', // Hide annotations
          cc_load_policy: '0', // Hide captions
          disablekb: '1', // Disable keyboard controls
          playsinline: '1', // Play inline on mobile
          enablejsapi: '0', // Disable JS API (cleaner)
          origin: window.location.origin, // Set origin for security
          playlist: content.loop ? videoId : '', // Required for loop
        });
        // Use youtube-nocookie.com for privacy and cleaner embed
        return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
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
          // Hide any YouTube UI elements that might appear
          ...(videoType === 'youtube' && {
            clipPath: 'inset(0)',
          }),
        }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay"
          style={{ 
            pointerEvents: isPreview ? 'auto' : 'none',
            border: 'none',
            // Scale slightly to hide edge UI elements
            ...(videoType === 'youtube' && {
              transform: 'scale(1.02)',
              transformOrigin: 'center center',
            }),
          }}
          // Remove allowFullScreen to prevent fullscreen button
        />
        
        {/* Controls overlay (only in designer, not preview) */}
        {isSelected && !isPreview && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-white/70 capitalize">{videoType}</span>
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
        
        {/* Controls overlay (only in designer, not preview) */}
        {isSelected && !isPreview && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2">
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
      
      {/* Controls overlay (only in designer, not preview) */}
      {isSelected && !isPreview && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2">
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

