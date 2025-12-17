import { Image } from 'lucide-react';
import { motion } from 'motion/react';

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

interface MediaMarkerProps {
  asset: MediaAsset;
  onClick: () => void;
  isSelected: boolean;
}

export function MediaMarker({ asset, onClick, isSelected }: MediaMarkerProps) {
  return (
    <motion.div
      className="media-marker cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="safe-scale">
        <div 
          className={`w-12 h-12 rounded-full shadow-lg border-2 overflow-hidden transition-all ${
            isSelected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-white'
          }`}
          style={{
            boxShadow: isSelected 
              ? '0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0,0,0,0.3)' 
              : '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <img 
            src={asset.thumbnail_url} 
            alt={asset.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Show fallback icon if image fails to load
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          {/* Fallback icon if image fails to load */}
          <div 
            className="w-full h-full bg-blue-500 items-center justify-center"
            style={{ display: 'none' }}
          >
            <Image size={24} color="white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}