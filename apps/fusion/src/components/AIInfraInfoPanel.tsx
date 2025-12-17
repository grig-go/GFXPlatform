import { X, ChevronLeft, ChevronRight, MapPin, Building2, Calendar, Zap, Cpu, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { AIInfraFeature } from '../utils/aiInfraApi';
import { motion, AnimatePresence } from 'motion/react';

interface AIInfraInfoPanelProps {
  feature: AIInfraFeature;
  sidebarPosition: 'left' | 'right';
  onClose?: () => void;
}

export function AIInfraInfoPanel({ feature, sidebarPosition, onClose }: AIInfraInfoPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const { properties } = feature;

  return (
    <div
      className={`absolute top-0 bottom-0 ${
        sidebarPosition === 'left' ? 'right-0' : 'left-0'
      } w-[520px] z-10 pointer-events-none overflow-hidden`}
    >
      <AnimatePresence mode="wait">
        {!isMinimized && (
          <motion.div
            key={`expanded-${sidebarPosition}`}
            initial={{ opacity: 0, x: sidebarPosition === 'left' ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ 
              opacity: 0, 
              x: sidebarPosition === 'left' ? 100 : -100,
              transition: {
                duration: 0.4,
                ease: [0.6, 0, 0.8, 1]
              }
            }}
            transition={{ 
              duration: 0.5, 
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.3 }
            }}
            className="absolute inset-0 pointer-events-auto"
          >
            {/* Glassmorphism background with gradient border glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5" />
            <div className={`absolute inset-y-0 w-[2px] bg-gradient-to-b from-transparent via-white/50 to-transparent ${
              sidebarPosition === 'left' ? 'right-0' : 'left-0'
            }`} />
            
            {/* Bottom gradient mask */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/80 via-white/40 to-transparent pointer-events-none z-20" />
            
            {/* Content with stagger animation */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="relative h-full overflow-y-auto px-8 pt-8 pb-24"
            >
              {/* Close button */}
              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
                onClick={onClose}
                className="absolute top-4 right-4 hover:bg-white/80 bg-white/60 backdrop-blur-sm rounded-full p-2 transition-all hover:scale-110 shadow-lg z-30"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-gray-700" />
              </motion.button>

              {/* AI Infrastructure badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg shadow-lg mb-4 inline-block"
              >
                <p className="tracking-tight font-bold text-[24px]">AI Infrastructure</p>
              </motion.div>

              {/* Facility name card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="relative bg-gradient-to-br from-purple-600 to-indigo-800 rounded-xl overflow-hidden shadow-2xl mb-4 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-indigo-500/20" />
                <div className="relative flex items-start gap-3">
                  <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                    <Cpu className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.4 }}
                      className="text-white drop-shadow-lg tracking-tight text-[32px] font-bold"
                    >
                      {properties.name}
                    </motion.h1>
                  </div>
                </div>
              </motion.div>

              {/* Location info card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg mb-3 border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-700 mt-1 flex-shrink-0" />
                  <div>
                    <h2 className="tracking-tight font-bold text-[20px] text-gray-900">Location</h2>
                    <p className="text-sm text-gray-600 mt-0.5">{properties.location}</p>
                  </div>
                </div>
              </motion.div>

              {/* Companies card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg mb-3 border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="tracking-tight font-bold text-[18px] mb-2 text-gray-900">Companies</p>
                    <div className="text-sm text-gray-700 leading-relaxed">{properties.companies}</div>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Launch Date */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-700" />
                    <span className="text-sm text-gray-600">Launch Date</span>
                  </div>
                  <div className="tracking-tight font-bold text-gray-900">{properties.launch_date}</div>
                </motion.div>
                
                {/* Power */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-gray-600">Power</span>
                  </div>
                  <div className="tracking-tight font-bold text-gray-900">{properties.power}</div>
                </motion.div>
              </div>
              
              {/* Hardware card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg mb-3 border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="tracking-tight font-bold text-[18px] mb-2 text-gray-900">Hardware</p>
                    <div className="text-sm text-gray-700 leading-relaxed">{properties.hardware}</div>
                  </div>
                </div>
              </motion.div>
              
              {/* Details card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="tracking-tight font-bold text-[18px] mb-2 text-gray-900">Details</p>
                    <div className="text-sm text-gray-700 leading-relaxed">{properties.details}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {isMinimized && (
          <motion.div
            key={`minimized-${sidebarPosition}`}
            initial={{ opacity: 0, x: sidebarPosition === 'left' ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ 
              opacity: 0,
              x: sidebarPosition === 'left' ? 100 : -100,
              transition: {
                duration: 0.3
              }
            }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-auto"
          >
            <div className="absolute inset-0 bg-white/30 backdrop-blur-md" />
            <div className="relative h-full flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMinimized(false)}
                className="hover:bg-white/60 bg-white/40 backdrop-blur-sm rounded-full p-3 transition-all shadow-lg"
                aria-label="Expand panel"
              >
                {sidebarPosition === 'left' ? (
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}