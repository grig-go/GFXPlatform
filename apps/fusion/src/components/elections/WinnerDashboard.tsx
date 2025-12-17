import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ElectionData, GeoResult, ElectionYear, getWinnerPartyName } from './data/electionData';
import { PresidentialElectionNationalData } from './data/presidentialElectionNationalData';

interface WinnerDashboardProps {
  currentElection: ElectionData;
  currentNationalElection: PresidentialElectionNationalData | null;
  currentResults: { [geoId: string]: GeoResult };
  selectedYear: ElectionYear;
  onClose?: () => void;
  sidebarPosition?: 'left' | 'right';
  isSidebarCollapsed?: boolean;
}

export function WinnerDashboard({ currentElection, currentNationalElection, currentResults, selectedYear, onClose, sidebarPosition = 'left', isSidebarCollapsed = false }: WinnerDashboardProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Reset visibility when year changes or when component remounts
  useEffect(() => {
    setIsVisible(true);
  }, [selectedYear, currentElection]);

  const republicanEV = Object.values(currentResults)
    .filter(result => getWinnerPartyName(result, currentElection.candidates, currentElection.parties) === currentElection.parties['GOP']?.name)
    .reduce((sum, result) => sum + ((result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0), 0);
  const democraticEV = Object.values(currentResults)
    .filter(result => getWinnerPartyName(result, currentElection.candidates, currentElection.parties) === currentElection.parties['Dem']?.name)
    .reduce((sum, result) => sum + ((result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0), 0);

  console.log(currentElection)

  const finalWinner = republicanEV >= 270 ? currentElection.parties['GOP']?.name : democraticEV >= 270 ? currentElection.parties['Dem']?.name : null;

  // Find the winner candidate by party
  let winnerCandidate = null;
  let winnerPartyCode = null;
  if (finalWinner && currentElection.candidates) {
    for (const [candidateId, candidate] of Object.entries(currentElection.candidates)) {
      const party = currentElection.parties[candidate.party_code];
      if (party && party.name === finalWinner) {
        winnerCandidate = candidate.name;
        winnerPartyCode = candidate.party_code;
        break;
      }
    }
  }

  // Get party color, fallback to hardcoded colors if not available
  const winnerPartyColor = winnerPartyCode && currentElection.parties[winnerPartyCode]?.color;
  const isGOP = finalWinner === currentElection.parties['GOP']?.name;
  const fallbackColor = isGOP ? '#DC2626' : '#2563EB'; // red-600 : blue-600
  const partyColor = winnerPartyColor || fallbackColor;

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Generate lighter background colors with proper opacity
  const bgColorLight = hexToRgba(partyColor, 0.08);
  const bgColorDark = hexToRgba(partyColor, 0.2);

  if (!finalWinner || !isVisible) return null;

  if (!currentElection.winnerImg) {
    if (winnerCandidate === 'Donald Trump')
      currentElection.winnerImg = "https://bidenwhitehouse.archives.gov/wp-content/uploads/2021/01/45_donald_trump.jpg";
    else if (winnerCandidate === 'Joe Biden')
      currentElection.winnerImg = "https://image.cnbcfm.com/api/v1/image/106878527-1620223837055-106748412-1602881184740-biden.jpg?v=1620224062";
    else if (winnerCandidate === 'Barack Obama')
      currentElection.winnerImg = "https://hips.hearstapps.com/hmg-prod/images/barack-obama-white-house-portrait-644fccf590557.jpg?crop=1xw:1xh;center,top";
  }

  return (
    <div className={`absolute top-[3rem] z-40 transition-all duration-300 ${
      sidebarPosition === 'right' && !isSidebarCollapsed ? 'right-[calc(1rem+8rem)]' : 'right-4'
    }`}>
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-600/50 p-8 w-96">
        <button
          onClick={() => {
            console.log('❌ WinnerDashboard close button clicked');
            setIsVisible(false);
            if (onClose) {
              onClose();
            }
          }}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          aria-label="Close winner box"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="text-center">
          <div className="mb-3">
            <img
              src={currentElection.winnerImg}
              alt={`${winnerCandidate} - President`}
              className="w-36 h-36 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
            />
          </div>
          <div className="text-base font-medium text-gray-600 dark:text-gray-300 mb-3">
            Election Winner
          </div>
          <div className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">
            {winnerCandidate}
          </div>
          <div className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200">
            {finalWinner}
          </div>
          <div className="rounded-lg p-6 relative overflow-hidden">
            {/* Light mode background */}
            <div
              className="absolute inset-0 dark:hidden"
              style={{ backgroundColor: bgColorLight }}
            />
            {/* Dark mode background */}
            <div
              className="absolute inset-0 hidden dark:block"
              style={{ backgroundColor: bgColorDark }}
            />
            <div className="relative">
              <div
                className="text-4xl font-bold"
                style={{ color: partyColor }}
              >
                {finalWinner === currentElection.parties['GOP']?.name ? republicanEV : democraticEV}
              </div>
              <div className="text-base text-gray-600 dark:text-gray-300">
                Electoral Votes
              </div>
            </div>
          </div>
          {currentNationalElection && currentNationalElection.results && (
              <div className="mt-3 pt-4 dark:border-gray-700">
                {Object.entries(currentNationalElection.results).map(([candidateId, result]) => {
                  if (typeof result === 'object' && result !== null && 'winner' in result && result.winner && 'votes' in result && 'percent' in result) {
                    return (
                      <div key={candidateId} className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {result.votes?.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Popular Votes <b>({result.percent?.toFixed(1)}%)</b>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
