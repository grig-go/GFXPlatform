import { SeatDistribution } from './visualizations/SeatDistribution';
import { AgeBreakdown } from './visualizations/AgeBreakdown';
import { RaceEthnicityBreakdown } from './visualizations/RaceEthnicityBreakdown';
import { EducationBreakdown } from './visualizations/EducationBreakdown';
import { YearsInOffice } from './visualizations/YearsInOffice';
import type { ViewType } from '../App';

interface SummaryViewProps {
  selectedView: ViewType;
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
  selectedDataOptions: any;
  setShowAIAnalysisPanel?: (show: boolean) => void;
  setScreenshotImage?: (image: string | null) => void;
  setAIAnalysis?: (analysis: string | null) => void;
  setIsAnalyzingImage?: (analyzing: boolean) => void;
  setAnalysisError?: (error: string | null) => void;
  setCurrentAIFeature?: (feature: 'summary' | 'outliers' | 'correlation' | 'sentiment') => void;
  aiProviderSettings?: any;
}

export function SummaryView({ selectedView, selectedChambers, selectedDataOptions, setShowAIAnalysisPanel, setScreenshotImage, setAIAnalysis, setIsAnalyzingImage, setAnalysisError, setCurrentAIFeature, aiProviderSettings }: SummaryViewProps) {
  return (
    <div className="p-8">
      {selectedView === 'balanceOfPower' && (
        <section>
          <SeatDistribution 
            selectedChambers={selectedChambers}
            setShowAIAnalysisPanel={setShowAIAnalysisPanel}
            setScreenshotImage={setScreenshotImage}
            setAIAnalysis={setAIAnalysis}
            setIsAnalyzingImage={setIsAnalyzingImage}
            setAnalysisError={setAnalysisError}
            setCurrentAIFeature={setCurrentAIFeature}
            aiProviderSettings={aiProviderSettings}
          />
        </section>
      )}

      {selectedView === 'ageBreakdown' && (
        <section>
          <AgeBreakdown selectedChambers={selectedChambers} />
        </section>
      )}

      {selectedView === 'raceDiversity' && (
        <section>
          <RaceEthnicityBreakdown selectedChambers={selectedChambers} />
        </section>
      )}

      {selectedView === 'education' && (
        <section>
          <EducationBreakdown selectedChambers={selectedChambers} />
        </section>
      )}

      {selectedView === 'yearsInOffice' && (
        <section>
          <YearsInOffice selectedChambers={selectedChambers} />
        </section>
      )}
    </div>
  );
}
