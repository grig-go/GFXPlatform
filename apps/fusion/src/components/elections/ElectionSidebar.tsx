import React from 'react';
import {
  Card,
  Tag,
  Callout,
  H2,
  H4,
  Icon,
} from '@blueprintjs/core';
import { ElectionData, GeoResult, getWinnerPartyName, BopSummary } from './data/electionData';

interface ElectionSidebarProps {
  currentElection: ElectionData;
  currentDistrictElection: ElectionData;
  currentResults: { [geoId: string]: GeoResult };
  electionType: 'presidential' | 'senate' | 'house';
  selectedYear: number;
  bopData?: BopSummary;
  sidebarPosition?: 'left' | 'right';
  isSidebarCollapsed?: boolean;
  selectedState?: string | null; // Add selected state prop
  selectedStateCode?: string | null; // Add selected state code prop
}

interface Stats {
  republicanStates: number;
  democraticStates: number;
  republicanEV: number;
  democraticEV: number;
  totalElectoralVotes: number;
  republicanSenateSeats: number;
  democraticSenateSeats: number;
  republicanHouseSeats: number;
  democraticHouseSeats: number;
}

export function ElectionSidebar({ currentElection, currentDistrictElection, currentResults, electionType, selectedYear, bopData: propBopData, sidebarPosition = 'left', isSidebarCollapsed = false, selectedState, selectedStateCode }: ElectionSidebarProps) {
  // Use the bopData from props if provided, otherwise default to empty object
  const bopData = propBopData || {};
  const loadingBop = false; // Since we're getting data from props, we don't need loading state
  
  // If a state is selected, get its specific results
  const stateResult = React.useMemo(() => {
    if (!selectedStateCode || !currentResults) return null;
    return currentResults[selectedStateCode] || null;
  }, [selectedStateCode, currentResults]);

  // Calculate state-specific candidate data
  const stateCandidates = React.useMemo(() => {
    if (!stateResult) return null;
    
    const candidates: Array<{
      id: string;
      name: string;
      party: string;
      partyColor: string;
      votes: number;
      percent: number;
      winner: boolean;
    }> = [];

    // Iterate through result to find candidates
    Object.entries(stateResult).forEach(([key, value]: [string, any]) => {
      if (key === 'stateElectoralVote' || key === 'stateElectoralVotes') return;
      
      const candidateInfo = currentElection.candidates[key];
      if (candidateInfo && value.votes !== undefined) {
        const partyInfo = currentElection.parties[candidateInfo.party_code];
        candidates.push({
          id: key,
          name: candidateInfo.name || 'Unknown',
          party: partyInfo?.name || 'Unknown',
          partyColor: partyInfo?.color || '#6B7280',
          votes: value.votes || 0,
          percent: value.percent || 0,
          winner: value.winner || false
        });
      }
    });

    // Sort by votes descending
    return candidates.sort((a, b) => b.votes - a.votes);
  }, [stateResult, currentElection]);
  
  const stats: Stats = React.useMemo(() => {
    let republicanStates = 0;
    let democraticStates = 0;
    let republicanEV = 0;
    let democraticEV = 0;
    let totalElectoralVotes = 0;

    console.log('EelctionSidebarrrrrrrr')
    console.log(currentResults);

    // Count states and Electoral votes by finding winners
    Object.values(currentResults).forEach(result => {
      const winnerParty = getWinnerPartyName(result, currentElection.candidates, currentElection.parties);
      const electoralVotes = (result as any).stateElectoralVote || (result as any).stateElectoralVotes || 0;
      const parties = currentElection.parties;

      if (winnerParty === parties['GOP']?.name) {
        republicanStates++;
        republicanEV += electoralVotes;
      } else if (winnerParty === parties['Dem']?.name) {
        democraticStates++;
        democraticEV += electoralVotes;
      }

      totalElectoralVotes += electoralVotes;
    });

    return {
      republicanStates,
      democraticStates,
      republicanEV,
      democraticEV,
      totalElectoralVotes,
      republicanSenateSeats: 0,
      democraticSenateSeats: 0,
      republicanHouseSeats: 0,
      democraticHouseSeats: 0
    };
  }, [currentResults, currentElection]);

  const finalWinner = React.useMemo(() => {
    console.log('finalWinnerrrrrrr')
    console.log(stats)
    if (stats.republicanEV >= 270) return 'Republican';
    if (stats.democraticEV >= 270) return 'Democratic';
    return null;
  }, [stats.republicanEV, stats.democraticEV]);

  return (
    <div className="mt-[3rem] w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div>
          <H2 className="mb-2 text-gray-900 dark:text-gray-100">{currentElection.year} {electionType === 'presidential' ? 'Presidential' : electionType === 'senate' ? 'Senate' : 'House'} Results</H2>
          <p className="text-gray-800 dark:text-gray-200 text-sm">
            {currentElection.description}
          </p>
        </div>

        {/* State-Specific Results - Show when a state is selected */}
        {selectedState && stateCandidates && stateCandidates.length > 0 && (
          <Callout
            intent="success"
            title={`State Results: ${selectedState}`}
          >
            <div className="space-y-3 mt-2">
              {stateCandidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {candidate.winner && (
                      <span className="text-lg">✓</span>
                    )}
                    <div>
                      <div className="font-medium" style={{ color: candidate.partyColor }}>
                        {candidate.party}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {candidate.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{candidate.votes.toLocaleString()}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {candidate.percent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Callout>
        )}

        {electionType === 'presidential' ? (
          <Callout
            intent="primary"
            title="Election Overview"
          >
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: currentElection.parties['GOP']?.color || '#DC2626' }}
                >
                  {stats.republicanEV}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200">Republican EVs</div>
              </div>
              <div className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: currentElection.parties['Dem']?.color || '#2563EB' }}
                >
                  {stats.democraticEV}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200">Democratic EVs</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm text-gray-800 dark:text-gray-200">
                Need 270 to win • Total: {stats.totalElectoralVotes}
              </div>
            </div>
            <div className="w-[70%] flex justify-between items-center pt-3 border-t mt-3">
              <span className="font-medium text-gray-900 dark:text-gray-100">Winner:</span>
              <Tag
                intent="none"
                style={{
                  backgroundColor: finalWinner === 'Republican'
                    ? (currentElection.parties['GOP']?.color || '#DC2626')
                    : (currentElection.parties['Dem']?.color || '#2563EB'),
                  color: '#FFFFFF'
                }}
              >
                {finalWinner}
              </Tag>
            </div>
          </Callout>
        ) : electionType === 'senate' ? (
          <Callout
            intent="primary"
            title="Senate Balance of Power"
          >
            <div className="space-y-4">
              {loadingBop ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                  Loading seat data...
                </div>
              ) : Object.keys(bopData).length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.entries(bopData).map(([partyCode, seats]) => {
                      const partyInfo = currentElection.parties[partyCode];
                      const partyName = partyInfo?.name || partyCode;
                      const partyColor = partyInfo?.color || '#6B7280';
                      const displayColor = partyColor.startsWith('#') ? partyColor : `#${partyColor}`;

                      if (seats > 0) {
                        if (partyCode === 'GOP' && seats >= 51)
                          currentElection.senateControl = 'Republican';
                        else if (partyCode === 'Dem' && seats >= 51)
                          currentElection.senateControl = 'Democratic';

                        return (
                          <div key={partyCode} className="text-center">
                            <div
                              className="text-2xl font-bold"
                              style={{ color: displayColor }}
                            >
                              {seats}
                            </div>
                            <div className="text-sm text-gray-800 dark:text-gray-200">{partyName}</div>
                          </div>
                        );
                      }
                    })}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      Need 51 to control • Total: 100 members
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: currentElection.parties['GOP']?.color || '#DC2626' }}
                    >
                      {stats.republicanSenateSeats}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Republican Seats</div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: currentElection.parties['Dem']?.color || '#2563EB' }}
                    >
                      {stats.democraticSenateSeats}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Democratic Seats</div>
                  </div>
                </div>
              )}
            </div>
          </Callout>
        ) : (
          <Callout
            intent="primary"
            title="House Balance of Power"
          >
            <div className="space-y-4">
              {loadingBop ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                  Loading seat data...
                </div>
              ) : Object.keys(bopData).length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.entries(bopData).map(([partyCode, seats]) => {
                      const partyInfo = currentDistrictElection?.parties[partyCode];
                      const partyName = partyInfo?.name || partyCode;
                      const partyColor = partyInfo?.color || '#6B7280';
                      const displayColor = partyColor.startsWith('#') ? partyColor : `#${partyColor}`;

                      if (seats > 0) {
                        if (partyCode === 'GOP' && seats >= 218)
                          currentElection.houseControl = 'Republican';
                        else if (partyCode === 'Dem' && seats >= 218)
                          currentElection.houseControl = 'Democratic';

                        return (
                          <div key={partyCode} className="text-center">
                            <div
                              className="text-2xl font-bold"
                              style={{ color: displayColor }}
                            >
                              {seats}
                            </div>
                            <div className="text-sm text-gray-800 dark:text-gray-200">{partyName}</div>
                          </div>
                        );
                      }
                    })}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      Need 218 to control • Total: 435 members
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: currentElection.parties['GOP']?.color || '#DC2626' }}
                    >
                      {stats.republicanHouseSeats}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Republican Seats</div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: currentElection.parties['Dem']?.color || '#2563EB' }}
                    >
                      {stats.democraticHouseSeats}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">Democratic Seats</div>
                  </div>
                </div>
              )}
            </div>
          </Callout>
        )}

        {(electionType === 'senate' && currentElection.senateControl) && (
          <Callout intent="none" title="">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[0.9rem] text-gray-900 dark:text-gray-100">Senate Control:</span>
              <Tag
                intent="none"
                style={{
                  backgroundColor: currentElection.senateControl === 'Republican'
                    ? (currentElection.parties['GOP']?.color || '#DC2626')
                    : (currentElection.parties['Dem']?.color || '#2563EB'),
                  color: '#FFFFFF'
                }}
              >
                {currentElection.senateControl}
              </Tag>
            </div>
          </Callout>
        )}

        {(electionType === 'house' && currentElection.houseControl) && (
          <Callout intent="none" title="">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[0.9rem] text-gray-900 dark:text-gray-100">House Control:</span>
              <Tag
                intent="none"
                style={{
                  backgroundColor: currentElection.houseControl === 'Republican'
                    ? (currentElection.parties['GOP']?.color || '#DC2626')
                    : (currentElection.parties['Dem']?.color || '#2563EB'),
                  color: '#FFFFFF'
                }}
              >
                {currentElection.houseControl}
              </Tag>
            </div>
          </Callout>
        )}

        {electionType !== 'house' &&
          (<Card>
            <H4>State Count</H4>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentElection.parties['GOP']?.color || '#EF4444' }}
                  ></div>
                  Republican States
                </span>
                <Tag
                  intent="none"
                  minimal
                  style={{
                    backgroundColor: currentElection.parties['GOP']?.color || '#DC2626',
                    color: '#FFFFFF'
                  }}
                >
                  {stats.republicanStates}
                </Tag>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentElection.parties['Dem']?.color || '#3B82F6' }}
                  ></div>
                  Democratic States
                </span>
                <Tag
                  intent="none"
                  minimal
                  style={{
                    backgroundColor: currentElection.parties['Dem']?.color || '#2563EB',
                    color: '#FFFFFF'
                  }}
                >
                  {stats.democraticStates}
                </Tag>
              </div>
            </div>
          </Card>)}

        {(electionType === 'presidential') && currentElection.candidates && stats.totalElectoralVotes && (
          <Card>
            <H4>Candidates</H4>
            <div className="mt-2 space-y-2">
              {Object.entries(currentElection.candidates).map(([candidateId, candidate]) => {
                const party = currentElection.parties[candidate.party_code];
                if (!party) return null;

                // Use party color if available, otherwise fall back to hardcoded colors
                const defaultColor = party.name === currentElection.parties['GOP']?.name
                  ? '#B91C1C'
                  : party.name === currentElection.parties['Dem']?.name
                  ? '#1D4ED8'
                  : '#374151';
                const candidateColor = party.color || defaultColor;

                // Tag background color
                const defaultTagBgColor = party.name === currentElection.parties['GOP']?.name
                  ? '#DC2626'
                  : party.name === currentElection.parties['Dem']?.name
                  ? '#2563EB'
                  : '#6B7280';
                const tagBgColor = party.color || defaultTagBgColor;

                return (
                  <div key={candidateId} className="flex items-center justify-between">
                    <span
                      className="font-medium"
                      style={{ color: candidateColor }}
                    >
                      {candidate.name}
                    </span>
                    <Tag
                      intent="none"
                      style={{
                        backgroundColor: tagBgColor,
                        color: '#FFFFFF'
                      }}
                    >
                      {party.name}
                    </Tag>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Callout intent="none" className="text-sm">
          <div className="text-gray-900 dark:text-gray-100">
            <Icon icon="info-sign" className="mr-2" />
            {electionType === 'presidential' 
              ? 'Click on states for detailed results. Double-click states to see county results.'
              : electionType === 'senate'
              ? 'Click on states for detailed Senate results. Double-click states to see county results.'
              : 'Click on states for detailed House results. Double-click states to see district results.'
            }
          </div>
        </Callout>
      </div>
    </div>
  );
}