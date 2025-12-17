import { X, MapPin, Calendar, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface MediaAsset {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string;
  media_type: string;
  latitude: number;
  longitude: number;
  created_at: string;
  tags: string[];
}

interface MediaInfoPanelProps {
  asset: MediaAsset;
  onClose: () => void;
}

export function MediaInfoPanel({ asset, onClose }: MediaInfoPanelProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine if this is a video based on file_url extension first, then media_type
  const isVideo = asset.file_url.match(/\.(mp4|webm|ogg|mov)$/i) || 
                  asset.media_type.toLowerCase().includes('video');
  
  const isImage = !isVideo && (
    asset.file_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || 
    asset.media_type.toLowerCase().includes('image')
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreen = async () => {
    console.log('Fullscreen button clicked');
    const element = modalRef.current;
    console.log('Modal element:', element);
    if (element) {
      try {
        if (element.requestFullscreen) {
          console.log('Requesting fullscreen...');
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } catch (err) {
        // Fullscreen request failed - permissions policy or user declined
        console.log('Fullscreen error:', err);
      }
    } else {
      console.log('No modal element found');
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ pointerEvents: 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background overlay */}
      <motion.div 
        className="absolute inset-0 bg-black/30"
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Panel */}
      <motion.div 
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ 
          width: '90%',
          maxWidth: '700px',
          maxHeight: '90vh',
          pointerEvents: 'auto'
        }}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ 
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        {/* Header with close button */}
        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <button
              onClick={handleFullscreen}
              onPointerDown={(e) => {
                e.stopPropagation();
                console.log('Maximize button pointer down');
              }}
              style={{ position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize size={20} />
            </button>
            <button
              onClick={onClose}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Media preview - takes up most of the modal */}
          <div className="relative w-full h-full bg-gray-100">
            {isImage ? (
              <img 
                src={asset.file_url} 
                alt={asset.name}
                className="w-full h-full object-contain"
              />
            ) : isVideo ? (
              <video 
                src={asset.file_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
                muted
                loop
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={asset.thumbnail_url} 
                  alt={asset.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Compact content section at bottom */}
        {!isFullscreen && (
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            {/* Title and Type */}
            <div className="mb-3">
              <h3 className="text-gray-900">{asset.name}</h3>
              <p className="text-xs text-gray-500 uppercase mt-0.5">{asset.media_type}</p>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <span>{asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <span>{formatDate(asset.created_at)}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}