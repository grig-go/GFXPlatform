import React, { useState } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import type mapboxgl from 'mapbox-gl';
import { captureMapScreenshot } from '../utils/mapScreenshot';
import { captureDualMapScreenshot } from '../utils/dualMapScreenshot';
import { analyzeScreenshotWithAI, validateAIVisionSettings } from '../utils/aiVisionAnalysis';
import { getAllAISettings, type AIFeature } from '../utils/aiSettingsApi';
import { loadGlobalPrompt } from '../utils/globalPromptApi';
import { toast } from 'sonner@2.0.3';
import { DisplayResult, ElectionType, CandidateInfo, PartyInfo, CandidateResult } from './elections/data/electionData';
import placeholderPhoto from '../assets/placeholder-candidate.png';
import { motion, AnimatePresence } from 'framer-motion';

interface CountyInfoPanelProps {
  sidebarPosition: 'left' | 'right';
  onClose?: () => void;
  showElections?: boolean;
  isMinimized?: boolean;
  setIsMinimized?: (minimized: boolean) => void;
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  electionMapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  setShowAIAnalysisPanel?: (show: boolean) => void;
  setScreenshotImage?: (image: string | null) => void;
  setAIAnalysis?: (analysis: string | null) => void;
  setIsAnalyzingImage?: (analyzing: boolean) => void;
  setAnalysisError?: (error: string | null) => void;
  setCurrentAIFeature?: (feature: 'summary' | 'outliers' | 'correlation' | 'sentiment') => void;
  aiProviderSettings?: any;
  // Election data props
  displayResult?: DisplayResult | null;
  selectedType?: ElectionType;
  year?: number;
  raceName?: string; // Full race name for display
  stateName?: string;
  countyName?: string;
}

export function CountyInfoPanel({
  sidebarPosition,
  onClose,
  showElections = true,
  isMinimized: isMinimizedProp,
  setIsMinimized: setIsMinimizedProp,
  mapRef,
  electionMapRef,
  setShowAIAnalysisPanel,
  setScreenshotImage,
  setAIAnalysis,
  setIsAnalyzingImage,
  setAnalysisError,
  setCurrentAIFeature,
  aiProviderSettings,
  displayResult = null,
  selectedType = 'presidential',
  year = 2024,
  raceName = '',
  stateName = '',
  countyName = ''
}: CountyInfoPanelProps) {
  const [isMinimizedInternal, setIsMinimizedInternal] = useState(true);

  // DEBUG: Log what we receive
  console.log('🔍 CountyInfoPanel received props:', {
    year,
    raceName,
    stateName,
    countyName,
    displayResult: displayResult ? 'present' : 'null'
  });

  // Use prop value if provided, otherwise use internal state
  const isMinimized = isMinimizedProp !== undefined ? isMinimizedProp : isMinimizedInternal;
  const setIsMinimized = setIsMinimizedProp || setIsMinimizedInternal;

  // Use displayResult from MapView (already processed by getDisplayResult)
  console.log('CountyInfoPanellllllll')
  console.log(displayResult);
  console.log('🔍 candidateResults FULL:', JSON.stringify(displayResult?.candidates, null, 2));
  console.log('🔍 candidateInfo FULL:', JSON.stringify(displayResult?.candidateInfo, null, 2));
  const candidates = displayResult?.candidateInfo || {};
  const parties = displayResult?.parties || {};
  const candidateResults = displayResult?.candidates || {};
  const percentReporting = displayResult?.percent_reporting || 0;

  // Sort candidates by votes (descending) and take top 4
  const sortedCandidates = Object.entries(candidateResults)
    // REMOVED FILTER - Show ALL candidates even with 0 votes
    .sort((a, b) => {
      const votesA = (a[1] as CandidateResult).votes || 0;
      const votesB = (b[1] as CandidateResult).votes || 0;
      return votesB - votesA;
    }).slice(0, 6); // Take top 6 only

  console.log('🔍 sortedCandidates length:', sortedCandidates.length);
  console.log('🔍 sortedCandidates:', sortedCandidates);

  const getPartyColor = (partyCode: string) => {
    const party = parties[partyCode];
    if (!party) return 'bg-gray-400';
    const color = party.color.startsWith('#') ? party.color : `#${party.color}`;

    // Convert hex to Tailwind-compatible class or use inline style
    return color;
  };

  const formatVotes = (votes: number) => {
    return votes.toLocaleString();
  };

  // Handler to capture map screenshot and analyze with AI (using fullscreen insights)
  const handleCaptureScreenshot = async () => {
    console.log(`🎥 Screenshot capture initiated for fullscreen insights...`);

    if (!mapRef || !mapRef.current) {
      console.warn('❌ Map reference not available');
      toast.error('Map reference not available');
      return;
    }

    if (!setShowAIAnalysisPanel || !setScreenshotImage || !setAIAnalysis || !setIsAnalyzingImage || !setAnalysisError || !aiProviderSettings) {
      console.warn('❌ AI analysis not configured');
      toast.error('AI analysis not configured');
      return;
    }

    // Reset previous analysis
    setAIAnalysis(null);
    setAnalysisError(null);

    let capturedImage: string | null = null;

    // Check if we have both maps for dual-map capture
    const hasElectionMap = electionMapRef && electionMapRef.current;
    const mapViewMap = mapRef.current;

    try {
      if (hasElectionMap) {
        // Use dual-map capture (MapView + MapContainer + election panels)
        console.log('🎬 Starting dual-map capture (MapView + MapContainer)...');
        const imageBase64 = await captureDualMapScreenshot(
          mapViewMap,
          electionMapRef.current,
          {
            backdropSelector: '.modal-backdrop, .overlay-dim',
            excludeSelector: '.sidebar, .header',
            maxWidth: 1024
          }
        );

        console.log('imageBase64444444444444444444 CountyInfoPanel')
        console.log(imageBase64)

        console.log('✅ Dual-map screenshot captured successfully');
        console.log('📦 Image size:', (imageBase64.length / 1024).toFixed(2), 'KB');

        capturedImage = imageBase64;
        setScreenshotImage(imageBase64);
        setShowAIAnalysisPanel(true);
      } else {
        // Single map capture fallback
        const map = mapRef.current;
        const mainContent = document.getElementById('main-content') as HTMLElement;

        if (!mainContent) {
          console.error('❌ #main-content element not found in DOM');
          throw new Error('#main-content element not found');
        }

        console.log('✅ Found main-content element:', mainContent);
        console.log('📐 Main content dimensions:', mainContent.clientWidth, 'x', mainContent.clientHeight);

        // Capture everything in main-content (maps + panels) except sidebar
        console.log('🎬 Starting screenshot capture...');
        const imageBase64 = await captureMapScreenshot(map, {
          frameEl: mainContent,
          backdropSelector: '.modal-backdrop, .overlay-dim',
          excludeSelector: '.sidebar, .header, #user-menu',
          maxWidth: 1024
        });

        console.log('✅ Screenshot captured successfully');
        console.log('📦 Image size:', (imageBase64.length / 1024).toFixed(2), 'KB');

        capturedImage = imageBase64;
        setScreenshotImage(imageBase64);
        setShowAIAnalysisPanel(true);
      }
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);

      // Fallback to simple WebGL canvas capture if composite capture fails
      try {
        console.log('🔄 Attempting fallback capture (WebGL canvas only)...');
        const map = mapRef.current;
        if (map) {
          const canvas = map.getCanvas();
          await new Promise(requestAnimationFrame);

          const maxWidth = 1024;
          const scale = Math.min(1, maxWidth / canvas.width);

          if (scale < 1) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.floor(canvas.width * scale);
            tempCanvas.height = Math.floor(canvas.height * scale);
            const ctx = tempCanvas.getContext('2d')!;
            ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            capturedImage = tempCanvas.toDataURL('image/png');
            setScreenshotImage(capturedImage);
          } else {
            capturedImage = canvas.toDataURL('image/png');
            setScreenshotImage(capturedImage);
          }

          console.log('✅ Fallback capture successful');
          setShowAIAnalysisPanel(true);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback screenshot also failed:', fallbackError);
        toast.error('Failed to capture screenshot');
        return;
      }
    }

    // After screenshot is captured, analyze it with AI
    if (capturedImage) {
      console.log('🤖 Starting AI analysis with fullscreen insights...');
      
      // Validate AI settings first
      const validation = validateAIVisionSettings(aiProviderSettings);
      if (!validation.isValid) {
        console.warn('⚠️ AI settings not configured:', validation.error);
        setAnalysisError(validation.error || 'AI settings not configured');
        toast.error(validation.error || 'AI settings not configured');
        return;
      }
      
      setIsAnalyzingImage(true);
      
      try {
        // Get the fullscreen insights prompt and global prompt
        const aiSettings = await getAllAISettings();
        const aiSettingsMap = aiSettings.reduce((acc: any, setting: any) => {
          acc[setting.feature] = setting;
          return acc;
        }, {});
        
        const fullscreenPrompt = aiSettingsMap['fullscreen']?.prompt_template || null;
        const globalPrompt = await loadGlobalPrompt();
        
        console.log(`🔍 Using fullscreen insights prompt:`, fullscreenPrompt || '(default)');
        console.log('🌐 Using global prompt:', globalPrompt || '(none)');
        
        const analysis = await analyzeScreenshotWithAI(
          capturedImage, 
          aiProviderSettings, 
          globalPrompt,
          fullscreenPrompt || undefined
        );
        console.log('✅ AI analysis completed');
        setAIAnalysis(analysis);
        toast.success('AI analysis completed');
      } catch (error: any) {
        console.error('❌ AI analysis failed:', error);
        const errorMessage = error?.message || 'Failed to analyze image with AI';
        setAnalysisError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsAnalyzingImage(false);
      }
    }
  };

  if (!showElections) {
    return null;
  }

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
              exit={{ 
                opacity: 0, 
                y: -20,
                transition: { duration: 0.3, ease: [0.6, 0, 0.8, 1] }
              }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative top-8 mx-8 bg-white/90 backdrop-blur-md shadow-2xl rounded-lg overflow-hidden border border-white/20"
            >
              {/* Year box */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ 
                  opacity: 0, 
                  y: -15,
                  transition: { duration: 0.2, ease: [0.6, 0, 0.8, 1] }
                }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="bg-gradient-to-r from-black via-gray-900 to-black text-white px-6 py-1.5"
              >
                <p className="tracking-tight font-bold text-[24px]">{raceName || year}</p>
              </motion.div>

              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ 
                  opacity: 0, 
                  y: -15,
                  transition: { duration: 0.2, delay: 0.05, ease: [0.6, 0, 0.8, 1] }
                }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="bg-gradient-to-br from-gray-200/90 to-gray-300/90 backdrop-blur-sm px-6 py-3.5 relative"
              >
                <h1 className="tracking-tight text-[32px] font-bold">{stateName || 'NATIONAL'}</h1>
                {countyName && <h2 className="mt-1 text-[18px]">{countyName.toUpperCase()} {displayResult?.isDistrict ? '' : 'COUNTY'}</h2>}
                {selectedType === 'presidential' && stateName && !countyName && <h2 className="mt-1 text-[18px]">Electoral Votes: {displayResult?.electoralVotes}</h2>}
              </motion.div>

              {/* Reporting percentage */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ 
                  opacity: 0, 
                  y: -15,
                  transition: { duration: 0.2, delay: 0.1, ease: [0.6, 0, 0.8, 1] }
                }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="bg-gradient-to-br from-gray-300/90 to-gray-400/90 backdrop-blur-sm px-6 py-2"
              >
                <p className="tracking-tight font-bold text-[rgba(10,10,10,0.76)]">
                  {percentReporting.toFixed(1)}% OF ESTIMATED VOTES
                </p>
              </motion.div>

              {/* Candidates */}
              <div className="bg-gradient-to-br from-gray-100/80 to-gray-200/80 backdrop-blur-sm">
                {sortedCandidates.map(([candidateId, totals], index) => {
                  const candidate = candidates[candidateId];
                  const party = candidate ? parties[candidate.party_code] : null;

                  if (!candidate || !party) return null;

                  // Parse the color - ensure it has # prefix
                  const partyColor = party.color.startsWith('#') ? party.color : `#${party.color}`;
                  const partyCode = candidate.party_code;
                  
                  console.log(`🎨 [CountyInfoPanel] Candidate: ${candidate.name}, Party: ${partyCode}, Color: ${partyColor}`);

                  return (
                    <motion.div 
                      key={candidateId}
                      initial={{ opacity: 0, x: sidebarPosition === 'left' ? 30 : -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: sidebarPosition === 'left' ? 30 : -30,
                        scale: 0.95,
                        transition: { 
                          duration: 0.25, 
                          delay: 0.15 + ((sortedCandidates.length - 1 - index) * 0.05),
                          ease: [0.6, 0, 0.8, 1]
                        }
                      }}
                      transition={{ 
                        delay: 0.45 + (index * 0.08), 
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      className="border-b-2 border-white/30 last:border-b-0 hover:bg-white/20 transition-all duration-300"
                    >
                      <div className="grid grid-cols-[130px_70px_1fr]">
                        {/* Photo */}
                        <div className="h-[152px] bg-gray-300/50 backdrop-blur-sm overflow-hidden">
                          <img
                            src={candidate.img || 'https://bgkjcngrslxyqjitksim.supabase.co/storage/v1/object/public/election-images/default-images/default_candidate.jpg'}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://bgkjcngrslxyqjitksim.supabase.co/storage/v1/object/public/election-images/default-images/default_candidate.jpg';
                            }}
                          />
                        </div>

                        {/* Party badge */}
                        <div
                          className="h-[152px] flex flex-col items-center justify-center text-white relative"
                          style={{ backgroundColor: partyColor }}
                        >
                          {totals.winner && (
                            <motion.div 
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ 
                                delay: 0.6 + (index * 0.08),
                                type: "spring",
                                stiffness: 200,
                                damping: 15
                              }}
                              className="bg-white rounded-full p-2 mb-1 shadow-lg"
                            >
                              <Check className="w-8 h-8 stroke-[3]" style={{ color: partyColor }} />
                            </motion.div>
                          )}
                          <span className="text-[2.5rem]">({partyCode.substring(0, 1)})</span>
                        </div>

                        {/* Name and results */}
                        <div className="grid grid-rows-[auto_1fr_auto]">
                          {/* Name bar */}
                          <div className="px-4 py-2 text-white relative overflow-hidden h-[52px] flex items-center" style={{ backgroundColor: partyColor }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <p className="tracking-tight leading-tight font-bold text-[24px] relative z-10">
                              {candidate.name}
                            </p>
                          </div>

                          {/* Percentage */}
                          <div className="bg-gradient-to-br from-gray-100/80 to-white/80 backdrop-blur-sm px-4 flex items-center justify-start">
                            <p className="text-[2.5rem] leading-none tracking-tight">
                              {totals.percent.toFixed(1)}%
                            </p>
                          </div>

                          {/* Vote count */}
                          <div className="bg-gradient-to-r from-black via-gray-900 to-black text-white px-4 py-3 h-[48px] flex items-center">
                            <p className="text-[1rem] tracking-tight">{formatVotes(totals.votes)} VOTES</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Outliers & Anomalies Button - Bottom Left */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: 15,
                  transition: { duration: 0.2, delay: 0.35, ease: [0.6, 0, 0.8, 1] }
                }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="bg-gradient-to-br from-gray-100/80 to-gray-200/80 backdrop-blur-sm px-6 py-4"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center w-9 h-9 p-0 border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:scale-110 transition-all duration-300 backdrop-blur-sm bg-white/50"
                  onClick={handleCaptureScreenshot}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}