import { X, Users, UserCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { StateInfo } from '../utils/stateData';
import { motion, AnimatePresence } from 'motion/react';

interface StateInfoPanelProps {
  stateInfo: StateInfo;
  sidebarPosition: 'left' | 'right';
  onClose?: () => void;
}

export function StateInfoPanel({ stateInfo, sidebarPosition, onClose }: StateInfoPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'democrat':
        return '#60a5fa';
      case 'republican':
        return '#ef4444';
      case 'independent':
        return '#a855f7';
      default:
        return '#d1d5db';
    }
  };

  const totalVoters = stateInfo.registeredVoters.total;
  const democratPct = ((stateInfo.registeredVoters.democrat / totalVoters) * 100).toFixed(1);
  const republicanPct = ((stateInfo.registeredVoters.republican / totalVoters) * 100).toFixed(1);
  const independentPct = ((stateInfo.registeredVoters.independent / totalVoters) * 100).toFixed(1);
  const otherPct = ((stateInfo.registeredVoters.other / totalVoters) * 100).toFixed(1);

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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5" />
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

              {/* Combined State name and Demographics header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="relative bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl overflow-hidden shadow-2xl mb-4 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 via-transparent to-slate-800/20" />
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="text-white drop-shadow-lg tracking-tight text-[32px] font-bold"
                  >
                    {stateInfo.name}
                  </motion.h1>
                  <div className="flex items-center gap-2 text-white/80">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Demographics</span>
                  </div>
                </div>
              </motion.div>

              {/* Total Population card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-5 rounded-xl shadow-lg mb-4 border border-white/30"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-500 rounded-lg p-2.5 flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="tracking-tight font-bold text-[18px] text-gray-900 mb-1">Total Population</h2>
                    <p className="text-[24px] text-indigo-950 leading-none">{formatNumber(stateInfo.population)}</p>
                  </div>
                </div>
              </motion.div>

              {/* Registered Voters card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-5 rounded-xl shadow-lg mb-4 border border-white/30"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-emerald-500 rounded-lg p-2.5 flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="tracking-tight font-bold text-[18px] text-gray-900 mb-1">Registered Voters</h2>
                    <p className="text-[24px] text-emerald-950 leading-none">{formatNumber(totalVoters)}</p>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="flex h-4 rounded-full overflow-hidden mb-4 shadow-md border border-gray-200">
                  <div
                    className="transition-all"
                    style={{
                      width: `${democratPct}%`,
                      backgroundColor: getPartyColor('democrat')
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${republicanPct}%`,
                      backgroundColor: getPartyColor('republican')
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${independentPct}%`,
                      backgroundColor: getPartyColor('independent')
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${otherPct}%`,
                      backgroundColor: getPartyColor('other')
                    }}
                  />
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-blue-50/80 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-4 h-4 rounded-md shadow-sm"
                        style={{ backgroundColor: getPartyColor('democrat') }}
                      />
                      <span className="text-blue-900">Democrat</span>
                    </div>
                    <span className="text-blue-950 font-bold">{democratPct}%</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-50/80 border border-red-100 rounded-lg p-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-4 h-4 rounded-md shadow-sm"
                        style={{ backgroundColor: getPartyColor('republican') }}
                      />
                      <span className="text-red-900">Republican</span>
                    </div>
                    <span className="text-red-950 font-bold">{republicanPct}%</span>
                  </div>
                  <div className="flex items-center justify-between bg-purple-50/80 border border-purple-100 rounded-lg p-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-4 h-4 rounded-md shadow-sm"
                        style={{ backgroundColor: getPartyColor('independent') }}
                      />
                      <span className="text-purple-900">Independent</span>
                    </div>
                    <span className="text-purple-950 font-bold">{independentPct}%</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50/80 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-4 h-4 rounded-md shadow-sm"
                        style={{ backgroundColor: getPartyColor('other') }}
                      />
                      <span className="text-gray-700">Other</span>
                    </div>
                    <span className="text-gray-900 font-bold">{otherPct}%</span>
                  </div>
                </div>
              </motion.div>

              {/* Age Distribution card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="bg-white/60 backdrop-blur-md px-6 py-5 rounded-xl shadow-lg border border-white/30"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-cyan-500 rounded-lg p-2.5 flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="tracking-tight font-bold text-[18px] text-gray-900">Age Distribution</h2>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(stateInfo.ageBreakdown).map(([ageRange, percentage]) => (
                    <div key={ageRange}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">{ageRange}</span>
                        <span className="text-cyan-900 font-bold px-3 py-1 bg-cyan-50 rounded-lg">{percentage}%</span>
                      </div>
                      <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-200">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all shadow-sm"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}