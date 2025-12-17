import { CircularSeatChart } from './CircularSeatChart';
import { StateGrid } from './StateGrid';
import { Building2, Landmark, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import html2canvas from 'html2canvas';
import { analyzeScreenshotWithAI, validateAIVisionSettings } from '../../utils/aiVisionAnalysis';
import { getAllAISettings } from '../../utils/aiSettingsApi';
import { loadGlobalPrompt } from '../../utils/globalPromptApi';
import { toast } from 'sonner@2.0.3';

interface SeatDistributionProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
  setShowAIAnalysisPanel?: (show: boolean) => void;
  setScreenshotImage?: (image: string | null) => void;
  setAIAnalysis?: (analysis: string | null) => void;
  setIsAnalyzingImage?: (analyzing: boolean) => void;
  setAnalysisError?: (error: string | null) => void;
  setCurrentAIFeature?: (feature: 'summary' | 'outliers' | 'correlation' | 'sentiment') => void;
  aiProviderSettings?: any;
}

// Reorder seat colors by ring for proper semicircle rendering
const ringSeatCounts = [13, 23, 33, 43, 53, 63, 73, 83, 51];

const seatColorsLinear = ["#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#ef4444"];

const seatColorsRadial: string[][] = [];
let index = 0;

for (let ringSeats of ringSeatCounts) {
  const slice = seatColorsLinear.slice(index, index + ringSeats);
  seatColorsRadial.unshift(slice); // reverse order if renderer draws inner first
  index += ringSeats;
}

const flattened = seatColorsRadial.flat();

const houseData = {
  democrat: 197,
  republican: 177,
  libertarian: 0,
  independent: 0,
  total: 435,
  votesRemaining: 61,
  seatColors: flattened,
};

const senateData = {
  democrat: 43,
  republican: 25,
  libertarian: 0,
  independent: 11,
  total: 100,
  votesRemaining: 21,
};

export function SeatDistribution({ selectedChambers, setShowAIAnalysisPanel, setScreenshotImage, setAIAnalysis, setIsAnalyzingImage, setAnalysisError, setCurrentAIFeature, aiProviderSettings }: SeatDistributionProps) {
  const bothSelected = selectedChambers.house && selectedChambers.senate;
  const gridClasses = bothSelected ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "flex justify-center";
  
  // Handler to capture screenshot of the summary view and analyze with AI
  const handleCaptureScreenshot = async () => {
    console.log(`🎥 Screenshot capture initiated for seat distribution insights...`);
    
    if (!setShowAIAnalysisPanel || !setScreenshotImage || !setAIAnalysis || !setIsAnalyzingImage || !setAnalysisError || !aiProviderSettings) {
      console.warn('❌ AI analysis not configured');
      toast.error('AI analysis not configured');
      return;
    }

    // Reset previous analysis
    setAIAnalysis(null);
    setAnalysisError(null);

    let capturedImage: string | null = null;

    try {
      // Find the summary view container
      const summaryContainer = document.querySelector('.p-8') as HTMLElement;
      
      if (!summaryContainer) {
        console.error('❌ Summary view container not found in DOM');
        throw new Error('Summary view container not found');
      }
      
      console.log('✅ Found summary view container:', summaryContainer);
      
      // Capture the summary view using html2canvas
      console.log('🎬 Starting screenshot capture...');
      const canvas = await html2canvas(summaryContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Resize if needed to keep file size reasonable
      const maxWidth = 1024;
      let finalCanvas = canvas;
      
      if (canvas.width > maxWidth) {
        const scale = maxWidth / canvas.width;
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = Math.floor(canvas.width * scale);
        resizedCanvas.height = Math.floor(canvas.height * scale);
        const ctx = resizedCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        finalCanvas = resizedCanvas;
      }

      capturedImage = finalCanvas.toDataURL('image/png');
      console.log('✅ Screenshot captured successfully');
      console.log('📦 Image size:', (capturedImage.length / 1024).toFixed(2), 'KB');
      
      setScreenshotImage(capturedImage);
      setShowAIAnalysisPanel(true);
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
      toast.error('Failed to capture screenshot');
      return;
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
  
  return (
    <div className="relative space-y-8">
      {/* Outliers & Anomalies Button - Top Right */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-center w-9 h-9 p-0 border-gray-300 text-gray-400"
          disabled
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>

      {/* Circular Seat Charts */}
      <div className={gridClasses}>
        {selectedChambers.house && (
          <div className={bothSelected ? "" : "max-w-6xl w-full"}>
            <CircularSeatChart
              data={houseData}
              chamber="House"
              type="semicircle"
              title="House of Representatives"
              icon={Building2}
            />
          </div>
        )}
        
        {selectedChambers.senate && (
          <div className={bothSelected ? "" : "max-w-6xl w-full"}>
            <CircularSeatChart
              data={senateData}
              chamber="Senate"
              type="semicircle"
              title="U.S. Senate"
              icon={Landmark}
            />
          </div>
        )}
      </div>

      {/* State Grids - Side by Side */}
      <div className={gridClasses}>
        {selectedChambers.house && (
          <div className={bothSelected ? "" : "max-w-6xl w-full"}>
            <h3 className="mb-4">
              This election: All 435 House seats are up for election
            </h3>
            <StateGrid chamber="house" />
          </div>
        )}

        {selectedChambers.senate && (
          <div className={bothSelected ? "" : "max-w-6xl w-full"}>
            <h3 className="mb-4">
              This election: 23 Republican and 12 Democrat seats are up for election
            </h3>
            <StateGrid chamber="senate" />
          </div>
        )}
      </div>
    </div>
  );
}
