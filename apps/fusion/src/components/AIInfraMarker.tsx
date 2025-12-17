import { Server } from 'lucide-react';
import { motion } from 'motion/react';
import type { AIInfraFeature } from '../utils/aiInfraApi';

interface AIInfraMarkerProps {
  feature: AIInfraFeature;
  onClick: () => void;
  isSelected: boolean;
}

export function AIInfraMarker({ feature, onClick, isSelected }: AIInfraMarkerProps) {
  return (
    <motion.div
      className="ai-infra-marker"
      style={{
        width: 32,
        height: 32,
        backgroundColor: isSelected ? '#7c3aed' : '#8b5cf6',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isSelected 
          ? '0 0 0 3px rgba(139, 92, 246, 0.3), 0 4px 8px rgba(0,0,0,0.3)' 
          : '0 2px 4px rgba(0,0,0,0.2)',
        border: isSelected ? '2px solid white' : 'none',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <Server size={18} color="white" />
    </motion.div>
  );
}