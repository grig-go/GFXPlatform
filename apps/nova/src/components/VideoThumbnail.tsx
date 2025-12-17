import { useState, useEffect, useRef } from 'react';
import { Video } from 'lucide-react';

interface VideoThumbnailProps {
  videoUrl: string;
  alt?: string;
  className?: string;
}

export function VideoThumbnail({ videoUrl, alt = 'Video thumbnail', className = '' }: VideoThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const generateThumbnail = () => {
      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        // Draw the current video frame to canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnailUrl(dataUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error generating video thumbnail:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    const handleLoadedData = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      // Generate thumbnail once seek is complete
      generateThumbnail();
    };

    const handleError = () => {
      console.error('Error loading video for thumbnail');
      setError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Start loading the video
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      
      // Clean up the thumbnail URL
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden video element for thumbnail generation */}
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        className="hidden"
        muted
        playsInline
      />
      
      {/* Hidden canvas for drawing video frame */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Display thumbnail or fallback */}
      {isLoading && !error && (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Video className="w-12 h-12 text-muted-foreground animate-pulse" />
        </div>
      )}
      
      {error && (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Video className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      
      {thumbnailUrl && !isLoading && (
        <>
          <img 
            src={thumbnailUrl} 
            alt={alt}
            className="w-full h-full object-cover"
          />
          {/* Video play indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full p-3">
              <Video className="w-8 h-8 text-white" fill="white" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
