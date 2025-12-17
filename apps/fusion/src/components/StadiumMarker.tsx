import type { WorldCupStadium } from '../utils/worldCupApi';

interface StadiumMarkerProps {
  stadium: WorldCupStadium;
  onClick: () => void;
  isSelected?: boolean;
}

export function StadiumMarker({ stadium, onClick, isSelected = false }: StadiumMarkerProps) {
  return (
    <div
      className="cursor-pointer transition-transform"
      onClick={onClick}
    >
      <div className="safe-scale">
        <div className={`w-12 h-12 rounded-full shadow-lg border-2 overflow-hidden transition-colors ${
          isSelected ? 'border-yellow-400' : 'border-white'
        }`}>
          <img 
            src={stadium.images?.file || ''} 
            alt={stadium.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="stadium-label absolute top-full mt-1 whitespace-nowrap bg-black px-2 py-1 rounded shadow-md text-xs text-white pointer-events-none">
        {stadium.name}
      </div>
    </div>
  );
}