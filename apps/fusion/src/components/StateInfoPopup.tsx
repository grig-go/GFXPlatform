import { X, Users, UserCheck, TrendingUp } from 'lucide-react';
import type { StateInfo } from '../utils/stateData';

interface StateInfoPopupProps {
  stateInfo: StateInfo;
  onClose: () => void;
}

export function StateInfoPopup({ stateInfo, onClose }: StateInfoPopupProps) {
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

  const getPartyGradient = (party: string) => {
    switch (party) {
      case 'democrat':
        return 'from-blue-400 to-blue-600';
      case 'republican':
        return 'from-red-400 to-red-600';
      case 'independent':
        return 'from-purple-400 to-purple-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const totalVoters = stateInfo.registeredVoters.total;
  const democratPct = ((stateInfo.registeredVoters.democrat / totalVoters) * 100).toFixed(1);
  const republicanPct = ((stateInfo.registeredVoters.republican / totalVoters) * 100).toFixed(1);
  const independentPct = ((stateInfo.registeredVoters.independent / totalVoters) * 100).toFixed(1);
  const otherPct = ((stateInfo.registeredVoters.other / totalVoters) * 100).toFixed(1);

  return (
    <div className="w-[360px] rounded-lg shadow-2xl overflow-hidden border border-gray-200">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-4 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        <div className="flex items-center justify-between relative">
          <div>
            <h3 className="text-white mb-0.5 drop-shadow-md">{stateInfo.name}</h3>
            <div className="flex items-center gap-1.5 text-slate-200 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>State Demographics</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white p-4">
        {/* Population */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-lg p-3 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="bg-indigo-500 rounded-md p-1.5">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-indigo-900">Total Population</span>
          </div>
          <div className="text-2xl text-indigo-950 ml-1">{formatNumber(stateInfo.population)}</div>
        </div>

        {/* Registered Voters Breakdown */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-500 rounded-md p-1.5">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-gray-600">Registered Voters</div>
              <div className="text-sm text-gray-900">{formatNumber(totalVoters)}</div>
            </div>
          </div>
          
          {/* Bar Chart with shadow */}
          <div className="flex h-3 rounded-full overflow-hidden mb-3 shadow-sm border border-gray-200">
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

          {/* Legend with gradients */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md p-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded bg-gradient-to-br ${getPartyGradient('democrat')} shadow-sm`} />
                <span className="text-blue-900">Democrat</span>
              </div>
              <span className="text-blue-950">{democratPct}%</span>
            </div>
            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-md p-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded bg-gradient-to-br ${getPartyGradient('republican')} shadow-sm`} />
                <span className="text-red-900">Republican</span>
              </div>
              <span className="text-red-950">{republicanPct}%</span>
            </div>
            <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-md p-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded bg-gradient-to-br ${getPartyGradient('independent')} shadow-sm`} />
                <span className="text-purple-900">Independent</span>
              </div>
              <span className="text-purple-950">{independentPct}%</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded bg-gradient-to-br ${getPartyGradient('other')} shadow-sm`} />
                <span className="text-gray-700">Other</span>
              </div>
              <span className="text-gray-900">{otherPct}%</span>
            </div>
          </div>
        </div>

        {/* Age Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-cyan-500 rounded-md p-1.5">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-gray-600">Age Distribution</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(stateInfo.ageBreakdown).map(([ageRange, percentage]) => (
              <div key={ageRange}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700">{ageRange}</span>
                  <span className="text-cyan-900 px-2 py-0.5 bg-cyan-50 rounded">{percentage}%</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all shadow-sm"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
