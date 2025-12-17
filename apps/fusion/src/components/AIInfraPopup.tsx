import { MapPin, Building2, Calendar, Zap, Cpu, FileText } from 'lucide-react';
import type { AIInfraFeature } from '../utils/aiInfraApi';

interface AIInfraPopupProps {
  feature: AIInfraFeature;
}

export function AIInfraPopup({ feature }: AIInfraPopupProps) {
  const { properties } = feature;
  
  return (
    <div className="min-w-[320px] max-w-[380px] overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-4 py-4 text-white">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white mb-1 leading-tight">{properties.name}</h3>
            <div className="flex items-center gap-1.5 text-purple-100 text-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{properties.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-4 space-y-3">
        {/* Companies */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-900">Companies</span>
          </div>
          <div className="text-sm text-purple-950">{properties.companies}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Launch Date */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-800">Launch Date</span>
            </div>
            <div className="text-sm text-blue-950">{properties.launch_date}</div>
          </div>
          
          {/* Power */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-800">Power</span>
            </div>
            <div className="text-sm text-amber-950">{properties.power}</div>
          </div>
        </div>
        
        {/* Hardware */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-900">Hardware</span>
          </div>
          <div className="text-sm text-emerald-950">{properties.hardware}</div>
        </div>
        
        {/* Details */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Details</span>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">{properties.details}</div>
        </div>
      </div>
    </div>
  );
}
