import { X, MapPin, Users, Calendar, Trophy } from 'lucide-react';
import type { WorldCupStadium } from '../utils/worldCupApi';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StadiumPopupProps {
  stadium: WorldCupStadium;
  onClose: () => void;
}

export function StadiumPopup({ stadium, onClose }: StadiumPopupProps) {
  // Extract image URL from either file or gallery
  const imageUrl = stadium.images.file || stadium.images.gallery;
  
  // Get stage summary entries
  const stageSummaryEntries = Object.entries(stadium.stage_summary);

  return (
    <div className="w-[320px] bg-white rounded-xl shadow-2xl overflow-hidden">
      {/* Header with image */}
      <div className="relative h-40 bg-gradient-to-br from-blue-600 to-blue-800">
        {imageUrl && (
          <ImageWithFallback
            src={imageUrl}
            alt={stadium.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 transition-colors shadow-lg"
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>

        {/* Stadium name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h2 className="text-white drop-shadow-lg mb-1 text-[32px]">{stadium.name}</h2>
          <p className="text-white/90 text-xs drop-shadow-md">{stadium.fifa_name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-900">{stadium.city}</p>
            <p className="text-xs text-gray-500">{stadium.address}</p>
          </div>
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-700" />
          <p className="text-sm text-gray-900">
            Capacity: <span className="text-gray-700">{stadium.capacity.toLocaleString()}</span>
          </p>
        </div>

        {/* Match Info */}
        <div className="flex items-start gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-900 mb-1">
              <span className="text-blue-700">{stadium.match_numbers.length}</span> matches
            </p>
            <div className="flex flex-wrap gap-1">
              {stageSummaryEntries.map(([stage, count]) => (
                <span
                  key={stage}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                >
                  {stage}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Matches List */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-blue-700" />
            <p className="text-sm text-gray-700">Scheduled Matches</p>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5">
            {stadium.matches.map((match) => (
              <div
                key={match.number}
                className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5"
              >
                <span className="text-gray-600">Match #{match.number}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{match.date}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    match.stage === 'Final' ? 'bg-yellow-100 text-yellow-700' :
                    match.stage === 'Semifinal' ? 'bg-purple-100 text-purple-700' :
                    match.stage === 'Quarterfinal' ? 'bg-blue-100 text-blue-700' :
                    match.stage === 'Round of 16' ? 'bg-indigo-100 text-indigo-700' :
                    match.stage === 'Round of 32' ? 'bg-cyan-100 text-cyan-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {match.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
