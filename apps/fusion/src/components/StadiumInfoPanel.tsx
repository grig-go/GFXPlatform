import { X, ChevronLeft, ChevronRight, MapPin, Users, Calendar, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { WorldCupStadium } from '../utils/worldCupApi';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';

interface StadiumInfoPanelProps {
  stadium: WorldCupStadium;
  sidebarPosition: 'left' | 'right';
  onClose?: () => void;
}

export function StadiumInfoPanel({ stadium, sidebarPosition, onClose }: StadiumInfoPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Extract image URL
  const imageUrl = stadium.images.file || stadium.images.gallery;
  
  // Get stage summary entries
  const stageSummaryEntries = Object.entries(stadium.stage_summary);

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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
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

              {/* Year badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg shadow-lg mb-4 inline-block"
              >
                <p className="tracking-tight font-bold text-[24px]">World Cup 2026</p>
              </motion.div>

              {/* Stadium image card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="relative h-56 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl overflow-hidden shadow-2xl mb-4"
              >
                {imageUrl && (
                  <ImageWithFallback
                    src={imageUrl}
                    alt={stadium.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                {/* Stadium name overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="text-white drop-shadow-lg tracking-tight text-[32px] font-bold"
                  >
                    {stadium.name}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="text-white/90 drop-shadow-md mt-1"
                  >
                    {stadium.fifa_name}
                  </motion.p>
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
                  <MapPin className="w-5 h-5 text-blue-700 mt-1 flex-shrink-0" />
                  <div>
                    <h2 className="tracking-tight font-bold text-[20px] text-gray-900">{stadium.city}</h2>
                    <p className="text-sm text-gray-600 mt-0.5">{stadium.address}</p>
                  </div>
                </div>
              </motion.div>

              {/* Capacity info card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-xl shadow-lg mb-3 border border-white/30"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-700" />
                  <p className="tracking-tight font-bold text-gray-900">
                    CAPACITY: {stadium.capacity.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              {/* Match summary card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg mb-3 border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="tracking-tight font-bold text-[18px] mb-3 text-gray-900">
                      {stadium.match_numbers.length} MATCHES SCHEDULED
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stageSummaryEntries.map(([stage, count], idx) => (
                        <motion.span
                          key={stage}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + (idx * 0.05), duration: 0.3 }}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md"
                        >
                          {stage}: {count}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Matches List card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/30"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-5 h-5 text-blue-700" />
                  <p className="tracking-tight font-bold text-[18px] text-gray-900">SCHEDULED MATCHES</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {stadium.matches.map((match, idx) => {
                    // Format date to "Month Dayth - 25"
                    const formatDate = (dateStr: string) => {
                      try {
                        const date = new Date(dateStr);
                        const month = date.toLocaleDateString('en-US', { month: 'long' });
                        const day = date.getDate();
                        
                        // Add ordinal suffix (st, nd, rd, th)
                        const getOrdinalSuffix = (n: number) => {
                          const s = ['th', 'st', 'nd', 'rd'];
                          const v = n % 100;
                          return s[(v - 20) % 10] || s[v] || s[0];
                        };
                        
                        return `${month} ${day}${getOrdinalSuffix(day)} - 25`;
                      } catch {
                        return dateStr;
                      }
                    };

                    return (
                      <motion.div
                        key={match.number}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + (idx * 0.03), duration: 0.3 }}
                        className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 border-l-4 border-blue-600 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900">Match #{match.number}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                            match.stage === 'Final' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900' :
                            match.stage === 'Semifinal' ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-purple-900' :
                            match.stage === 'Quarterfinal' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-blue-900' :
                            match.stage === 'Round of 16' ? 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-indigo-900' :
                            match.stage === 'Round of 32' ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-cyan-900' :
                            'bg-gradient-to-r from-blue-400 to-blue-500 text-blue-900'
                          }`}>
                            {match.stage}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(match.date)}</p>
                      </motion.div>
                    );
                  })}
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