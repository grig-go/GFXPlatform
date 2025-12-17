import React from 'react';
import { X } from 'lucide-react';
import { DisplayResult, ElectionType, CandidateInfo, PartyInfo, CandidateResult } from './data/electionData';

interface DataDashboardProps {
  stateName: string;
  countyName?: string;
  stateResult: DisplayResult | null;
  selectedType: ElectionType;
  onClose: () => void;
  sidebarPosition?: 'left' | 'right';
  isSidebarCollapsed?: boolean;
}

export function DataDashboard({ stateName, countyName, stateResult, selectedType, onClose, sidebarPosition = 'left', isSidebarCollapsed = false }: DataDashboardProps) {
  console.log('111ddd');
  if (!stateResult) return null;
  console.log('222ddd');
  console.log(stateResult);

  const isCountyData = stateResult.isCounty;
  const isDistrictData = stateResult.isDistrict;
  const displayTitle = isDistrictData ? countyName : isCountyData ? countyName : stateName;

  // Get candidates and parties from the new format
  const candidates = stateResult.candidates || {};
  const candidateInfo = stateResult.candidateInfo || {};
  const parties = stateResult.parties || {};

  // Sort candidates by votes (descending)
  const sortedCandidates = Object.entries(candidates).sort((a, b) => {
    const aVotes = (a[1] as CandidateResult).votes || 0;
    const bVotes = (b[1] as CandidateResult).votes || 0;
    return bVotes - aVotes;
  });

  // Get winner
  const winnerEntry = sortedCandidates.find(([_, result]) => (result as CandidateResult).winner);
  const winnerId = winnerEntry ? winnerEntry[0] : null;
  const winnerParty = winnerId && candidateInfo[winnerId] ? parties[candidateInfo[winnerId].party_code] : null;

  return (
    <div className={`absolute top-[3rem] z-40 transition-all duration-300 ${
      sidebarPosition === 'right' && !isSidebarCollapsed ? 'right-[calc(1rem+8rem)]' : 'right-4'
    }`}>
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/30 dark:border-gray-600/30 p-6 w-[25rem]">
        <div className="relative mb-4">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-1 rounded-full hover:bg-gray-200/30 dark:hover:bg-gray-700/30 transition-colors z-10"
            aria-label="Close data dashboard"
          >
            <X className="w-7 h-7 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 pr-8">{displayTitle}</h3>
            {(isCountyData || isDistrictData) && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{stateName}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            {sortedCandidates.map(([candidateId, result]) => {
              const candidateResult = result as CandidateResult;
              const candidate = candidateInfo[candidateId];
              const party = candidate ? parties[candidate.party_code] : null;

              if (!candidate || !party) return null;

              // Parse the color - ensure it has # prefix
              const partyColor = party.color.startsWith('#') ? party.color : `#${party.color}`;

              return (
                <div key={candidateId} className="space-y-1">
                  <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {candidate.name}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium" style={{ color: partyColor }}>
                      {party.name}:
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {candidateResult.votes.toLocaleString()} ({candidateResult.percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedType === 'presidential' && !stateResult.isCounty && stateResult.electoralVotes !== undefined && stateResult.electoralVotes > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Electoral Votes:</span>
                <span className="font-bold text-2xl text-gray-900 dark:text-gray-100">{stateResult.electoralVotes}</span>
              </div>
            </div>
          )}

          {winnerParty && winnerParty.name !== 'Unknown' ?
          (<div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Winner:</span>
              {winnerParty ? (
                <span
                  className="px-4 py-2 rounded-full text-lg font-medium"
                  style={{
                    backgroundColor: `${winnerParty.color.startsWith('#') ? winnerParty.color : `#${winnerParty.color}`}20`,
                    color: winnerParty.color.startsWith('#') ? winnerParty.color : `#${winnerParty.color}`
                  }}
                >
                  {winnerParty.name}
                </span>
              ) : (
                <span className="px-4 py-2 rounded-full text-lg font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                  {stateResult.winner || 'Unknown'}
                </span>
              )}
            </div>
          </div>) : ''}
        </div>
      </div>
    </div>
  );
}
