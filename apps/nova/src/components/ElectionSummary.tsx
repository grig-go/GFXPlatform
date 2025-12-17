import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { EditImageDialog } from "./EditImageDialog";
import { Race, getFieldValue, isFieldOverridden, Candidate } from "../types/election";
import { Crown, Building, Home, BarChart3, Camera, User } from "lucide-react";
import { fetchBOPData, getBOPSummary, BOPData } from "../data/bopData";
import * as d3 from "d3";

interface ElectionSummaryProps {
  races: Race[];
  onUpdateRace: (race: Race) => void;
}

export function ElectionSummary({ races, onUpdateRace }: ElectionSummaryProps) {
  const [editingCandidate, setEditingCandidate] = useState<{ candidateId: string; raceId: string } | null>(null);
  const [bopData, setBopData] = useState<BOPData | null>(null);
  const [loadingBOP, setLoadingBOP] = useState(false);

  // Get the current year from races (assuming all races are from the same year)
  const currentYear = useMemo(() => {
    if (races.length > 0) {
      return parseInt(races[0].year);
    }
    return new Date().getFullYear();
  }, [races]);

  // Fetch BOP data when year changes
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoadingBOP(true);
      try {
        const data = await fetchBOPData(currentYear);
        console.log('BOP data received in ElectionSummary:', {
          year: currentYear,
          hasData: !!data,
          senateData: data?.senate,
          houseData: data?.house
        });
        if (mounted) {
          setBopData(data);
        }
      } catch (error) {
        console.error('Failed to fetch BOP data:', error);
      } finally {
        if (mounted) {
          setLoadingBOP(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [currentYear]);

  const summaryData = useMemo(() => {
    const presidentialRaces = races.filter(r => getFieldValue(r.raceType) === 'PRESIDENTIAL');
    const senateRaces = races.filter(r => getFieldValue(r.raceType) === 'SENATE');
    const houseRaces = races.filter(r => getFieldValue(r.raceType) === 'HOUSE');
    const governorRaces = races.filter(r => getFieldValue(r.raceType) === 'GOVERNOR');

    // Get presidential candidates
    const presidentialRace = presidentialRaces[0];
    const demCandidate = presidentialRace?.candidates.find(c => getFieldValue(c.party) === 'Dem');
    const repCandidate = presidentialRace?.candidates.find(c => getFieldValue(c.party) === 'GOP');

    // Calculate race status counts
    const getStatusCounts = (raceList: Race[], raceTypeName?: string) => {
      const called = raceList.filter(r => getFieldValue(r.status) === 'CALLED').length;
      const projected = raceList.filter(r => getFieldValue(r.status) === 'PROJECTED').length;
      const uncalled = raceList.filter(r => getFieldValue(r.status) === 'NOT_CALLED').length;
      const total = raceList.length;
      if (raceTypeName) {
        console.log(`${raceTypeName} status counts:`, { called, projected, uncalled, total });
      }
      return { called, projected, uncalled, total };
    };

    // Calculate party seat counts for Senate and House
    const getSenatePartyCounts = () => {
      // Use BOP data if available
      if (bopData?.senate) {
        const summary = getBOPSummary(bopData.senate);
        console.log('Senate BOP summary:', summary);
        return {
          demSeats: summary.demTotal,
          repSeats: summary.repTotal,
          indSeats: summary.indTotal,
          uncalledSeats: summary.undecided
        };
      }

      // Fallback to calculating from races
      const senateCalledRaces = senateRaces.filter(r => getFieldValue(r.status) === 'CALLED');
      let demSeats = 0, repSeats = 0, indSeats = 0;

      senateCalledRaces.forEach(race => {
        const winner = race.candidates.find(c => getFieldValue(c.votes) === Math.max(...race.candidates.map(candidate => getFieldValue(candidate.votes) || 0)));
        if (winner) {
          const party = getFieldValue(winner.party);
          if (party === 'Dem') demSeats++;
          else if (party === 'GOP') repSeats++;
          else if (party === 'Ind') indSeats++;
        }
      });

      const uncalledSeats = 100 - (demSeats + repSeats + indSeats);
      return { demSeats, repSeats, indSeats, uncalledSeats };
    };

    const getHousePartyCounts = () => {
      // Use BOP data if available
      if (bopData?.house) {
        const summary = getBOPSummary(bopData.house);
        console.log('House BOP summary:', summary);
        return {
          demSeats: summary.demTotal,
          repSeats: summary.repTotal,
          indSeats: summary.indTotal,
          uncalledSeats: summary.undecided
        };
      }

      // Fallback to calculating from races
      const houseCalledRaces = houseRaces.filter(r => getFieldValue(r.status) === 'CALLED');
      let demSeats = 0, repSeats = 0, indSeats = 0;

      houseCalledRaces.forEach(race => {
        const winner = race.candidates.find(c => getFieldValue(c.votes) === Math.max(...race.candidates.map(candidate => getFieldValue(candidate.votes) || 0)));
        if (winner) {
          const party = getFieldValue(winner.party);
          if (party === 'Dem') demSeats++;
          else if (party === 'GOP') repSeats++;
          else if (party === 'Ind') indSeats++;
        }
      });

      const uncalledSeats = 435 - (demSeats + repSeats + indSeats);
      return { demSeats, repSeats, indSeats, uncalledSeats };
    };

    // Calculate Electoral votes for presidential race
    const getElectoralVotes = () => {
      let demVotes = 0, repVotes = 0, uncalledVotes = 0;

      console.log('ppppppppppv')
      console.log(presidentialRaces)

      console.log('Calculating electoral votes for', presidentialRaces.length, 'presidential races');

      presidentialRaces.forEach(race => {
        if (race.state !== 'National') {
          const status = getFieldValue(race.status);
          const stateElectoralVotes = race.electoralVotes || 0; // Total electoral votes for the state
          //console.log(`Race ${race.state}: status=${status}, state electoral=${stateElectoralVotes}`);

          // Check if any candidate has won electoral votes
          let electoralVotesAssigned = false;
          race.candidates.forEach(candidate => {
            const candidateElectoralVotes = candidate.ElectoralVotes || 0;
            if (candidateElectoralVotes > 0) {
              electoralVotesAssigned = true;
              const party = getFieldValue(candidate.party);
              console.log(`  Candidate ${getFieldValue(candidate.name)} (${party}) won ${candidateElectoralVotes} electoral votes`);
              if (party === 'Dem') {
                demVotes += candidateElectoralVotes;
              } else if (party === 'REP' || party === 'GOP') {
                repVotes += candidateElectoralVotes;
              }
            }
          });

          // If no candidate has electoral votes assigned yet, count as uncalled
          if (!electoralVotesAssigned) {
            uncalledVotes += stateElectoralVotes;
          }
        }
      });

      console.log(`Electoral vote totals: DEM=${demVotes}, REP=${repVotes}, UNCALLED=${uncalledVotes}`);
      return { demVotes, repVotes, uncalledVotes };
    };

    const senatePartyCounts = getSenatePartyCounts();
    const housePartyCounts = getHousePartyCounts();
    const electoralVotes = getElectoralVotes();

    return {
      presidential: {
        race: presidentialRace,
        demCandidate,
        repCandidate,
        statusCounts: getStatusCounts(presidentialRaces, 'Presidential'),
        electoralVotes
      },
      senate: {
        statusCounts: getStatusCounts(senateRaces, 'Senate'),
        partyCounts: senatePartyCounts
      },
      house: {
        statusCounts: getStatusCounts(houseRaces, 'House'),
        partyCounts: housePartyCounts
      },
      governor: {
        statusCounts: getStatusCounts(governorRaces, 'Governor')
      }
    };
  }, [races, bopData]);

  const EditableAvatar = ({ 
    candidate, 
    race 
  }: { 
    candidate: Candidate; 
    race: Race;
  }) => {
    const handleImageClick = () => {
      setEditingCandidate({ candidateId: candidate.id, raceId: race.id });
    };

    const handleImageUpdate = (imageUrl: string) => {
      const updatedCandidates = race.candidates.map(c => 
        c.id === candidate.id 
          ? { ...c, headshot: imageUrl }
          : c
      );
      
      const updatedRace = { ...race, candidates: updatedCandidates };
      onUpdateRace(updatedRace);
      setEditingCandidate(null);
    };

    const candidateName = getFieldValue(candidate.name);
    const candidateParty = getFieldValue(candidate.party);
    const candidateHeadshot = getFieldValue(candidate.headshot || '');

    return (
      <>
        <div className="relative group">
          <Avatar className="w-12 h-12 cursor-pointer transition-opacity group-hover:opacity-80" onClick={handleImageClick}>
            <AvatarImage src={candidateHeadshot} alt={candidateName} />
            <AvatarFallback className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <User className="w-6 h-6 opacity-60" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {editingCandidate && editingCandidate.candidateId === candidate.id && (
          <EditImageDialog
            isOpen={true}
            onClose={() => setEditingCandidate(null)}
            candidate={{
              name: candidateName,
              party: candidateParty,
              imageUrl: candidateHeadshot
            }}
            onImageUpdate={handleImageUpdate}
            hasImageOverride={isFieldOverridden(candidate.headshot)}
            hasNameOverride={isFieldOverridden(candidate.name)}
            hasPartyOverride={isFieldOverridden(candidate.party)}
          />
        )}
      </>
    );
  };

  const hasPresidentialRace = summaryData.presidential.race != null;

  console.log('summaryDataaaaaa')
  console.log(summaryData)
  console.log(summaryData.presidential.demCandidate)

  return (
    <div className="space-y-6">
      {/* Presidential Election - Visual D3 Version */}
      {hasPresidentialRace && (
        <PresidentialElectoralChart 
          demVotes={summaryData.presidential.electoralVotes?.demVotes || 0}
          repVotes={summaryData.presidential.electoralVotes?.repVotes || 0}
          uncalledVotes={summaryData.presidential.electoralVotes?.uncalledVotes || 0}
          demCandidate={summaryData.presidential.demCandidate}
          repCandidate={summaryData.presidential.repCandidate}
          race={summaryData.presidential.race}
          status={summaryData.presidential.race.status}
        />
      )}

      {/* Congressional Elections - Visual D3 Version */}
      <div className="grid grid-cols-1 gap-6">
        {/* U.S. Senate */}
        {(summaryData.senate.statusCounts.total > 0) && (
          <CongressionalChart 
            title="U.S. Senate"
            icon={<Building className="w-5 h-5" />}
            demSeats={summaryData.senate.partyCounts.demSeats}
            repSeats={summaryData.senate.partyCounts.repSeats}
            indSeats={summaryData.senate.partyCounts.indSeats}
            uncalledSeats={summaryData.senate.partyCounts.uncalledSeats}
            totalSeats={100}
            majorityThreshold={51}
          />
        )}

        {/* U.S. House */}
        {(summaryData.house.statusCounts.total > 0) && (
          <CongressionalChart 
            title="U.S. House"
            icon={<Home className="w-5 h-5" />}
            demSeats={summaryData.house.partyCounts.demSeats}
            repSeats={summaryData.house.partyCounts.repSeats}
            indSeats={summaryData.house.partyCounts.indSeats}
            uncalledSeats={summaryData.house.partyCounts.uncalledSeats}
            totalSeats={435}
            majorityThreshold={218}
          />
        )}
      </div>

      {/* Race Status Overview - Visual D3 Version */}
      <RaceStatusChart 
        hasPresidentialRace={hasPresidentialRace}
        presidentialCounts={summaryData.presidential.statusCounts}
        senateCounts={summaryData.senate.statusCounts}
        houseCounts={summaryData.house.statusCounts}
        governorCounts={summaryData.governor.statusCounts}
      />
    </div>
  );
}

// D3 Presidential Electoral Chart Component
function PresidentialElectoralChart({ 
  demVotes, 
  repVotes, 
  uncalledVotes,
  demCandidate,
  repCandidate,
  race,
  status
}: {
  demVotes: number;
  repVotes: number;
  uncalledVotes: number;
  demCandidate?: Candidate;
  repCandidate?: Candidate;
  race: Race;
  status: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 120;
    const barHeight = 60;
    const total = 538;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, total])
      .range([0, width]);

    // Data
    const data = [
      { party: 'DEM', votes: demVotes, color: '#2563eb' },
      { party: 'UNCALLED', votes: uncalledVotes, color: '#9ca3af' },
      { party: 'REP', votes: repVotes, color: '#dc2626' }
    ];

    let cumulative = 0;
    const bars = svg.selectAll('rect')
      .data(data)
      .enter()
      .append('g');

    // Draw bars with animation
    bars.append('rect')
      .attr('x', d => {
        const x = xScale(cumulative);
        cumulative += d.votes;
        return x;
      })
      .attr('y', 30)
      .attr('height', barHeight)
      .attr('fill', d => d.color)
      .attr('rx', 6)
      .attr('width', 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 200)
      .attr('width', d => xScale(d.votes));

    // Add 270 threshold line
    const threshold = xScale(270);
    svg.append('line')
      .attr('x1', threshold)
      .attr('x2', threshold)
      .attr('y1', 20)
      .attr('y2', 30 + barHeight + 10)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    svg.append('text')
      .attr('x', threshold)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .attr('opacity', 0)
      .text('270 to win')
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    // Add vote labels
    cumulative = 0;
    bars.append('text')
      .attr('x', d => {
        const x = xScale(cumulative + d.votes / 2);
        cumulative += d.votes;
        return x;
      })
      .attr('y', 30 + barHeight / 2 + 6)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '20px')
      .attr('opacity', 0)
      .text(d => d.votes > 0 ? d.votes : '')
      .transition()
      .duration(500)
      .delay((d, i) => 1000 + i * 100)
      .attr('opacity', 1);

  }, [demVotes, repVotes, uncalledVotes]);

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          President - Electoral College
          {status === 'CALLED' && (
            <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-300">
              CALLED
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          {/* Left - Dem Candidate */}
          <div className="flex items-center gap-3 min-w-[200px]">
            {demCandidate && (
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={demCandidate.headshot} 
                  alt={demCandidate.name} 
                />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <div className="font-semibold">{demCandidate ? getFieldValue(demCandidate.name) : 'Kamala Harris'}</div>
              <div className="text-sm text-blue-600">Democratic</div>
            </div>
          </div>

          {/* Right - Rep Candidate */}
          <div className="flex items-center gap-3 min-w-[200px] justify-end">
            <div className="text-right">
              <div className="font-semibold">{repCandidate ? getFieldValue(repCandidate.name) : 'Donald Trump'}</div>
              <div className="text-sm text-red-600">Republican</div>
            </div>
            {repCandidate && (
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={repCandidate.headshot} 
                  alt={repCandidate.name} 
                />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* D3 Bar Chart */}
        <svg ref={svgRef} width="100%" height="120" />

        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-sm" />
            <span className="text-sm">{demVotes} DEM</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-sm" />
            <span className="text-sm">{uncalledVotes} UNCALLED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-sm" />
            <span className="text-sm">{repVotes} REP</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// D3 Congressional Chart Component (Senate/House)
function CongressionalChart({
  title,
  icon,
  demSeats,
  repSeats,
  indSeats,
  uncalledSeats,
  totalSeats,
  majorityThreshold
}: {
  title: string;
  icon: React.ReactNode;
  demSeats: number;
  repSeats: number;
  indSeats: number;
  uncalledSeats: number;
  totalSeats: number;
  majorityThreshold: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 280;
    const radius = 140;
    const centerX = width / 2;
    const centerY = height / 2 + 20;

    // Create arc generator for semi-circle
    const arc = d3.arc()
      .innerRadius(radius - 40)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(4);

    // Data
    const data = [
      { party: 'DEM', seats: demSeats, color: '#2563eb' },
      { party: 'REP', seats: repSeats, color: '#dc2626' },
      { party: 'IND', seats: indSeats, color: '#9333ea' },
      { party: 'UNCALLED', seats: uncalledSeats, color: '#9ca3af' }
    ];

    const pie = d3.pie<any>()
      .value(d => d.seats)
      .sort(null)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    const arcs = pie(data);

    // Draw arcs
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    g.selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 150)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
        return function(t) {
          return d3.arc()
            .innerRadius(radius - 40)
            .outerRadius(radius)
            .cornerRadius(4)(interpolate(t) as any) || '';
        };
      });

    // Add labels on arcs
    g.selectAll('text.arc-label')
      .data(arcs)
      .enter()
      .append('text')
      .attr('class', 'arc-label')
      .attr('transform', d => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const labelRadius = radius - 20; // Position in middle of arc
        // D3 angles: 0 is at 3 o'clock, π/2 is at 6 o'clock
        // We need to convert to standard coordinates
        const x = Math.sin(angle) * labelRadius;
        const y = -Math.cos(angle) * labelRadius;
        return `translate(${x}, ${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('opacity', 0)
      .text(d => d.data.seats > 0 ? d.data.seats : '')
      .transition()
      .duration(500)
      .delay((d, i) => 1200 + i * 100)
      .attr('opacity', 1);

    // Add center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -15)
      .attr('font-size', '42px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(demSeats + repSeats + indSeats)
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 20)
      .attr('font-size', '14px')
      .attr('fill', '#64748b')
      .attr('opacity', 0)
      .text('seats decided')
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    // Add majority line if applicable
    const controlParty = demSeats >= majorityThreshold ? 'Democratic' : repSeats >= majorityThreshold ? 'Republican' : null;
    
  }, [demSeats, repSeats, indSeats, uncalledSeats, totalSeats]);

  const controlParty = demSeats >= majorityThreshold ? 'Democratic' : repSeats >= majorityThreshold ? 'Republican' : null;

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          {controlParty && (
            <span className={`text-sm font-medium text-${controlParty === 'Republican' ? 'red' : 'blue'}-600`}>
              {controlParty} Control
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Side by side layout: Chart on left, Legend on right */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: D3 Semi-Circle Chart */}
          <div className="flex justify-center">
            <svg ref={svgRef} width="100%" height="280" style={{ maxWidth: '400px' }} />
          </div>

          {/* Right: Legend and Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <span className="text-sm">DEM</span>
              <span className="text-2xl font-bold text-blue-600">{demSeats}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <span className="text-sm">REP</span>
              <span className="text-2xl font-bold text-red-600">{repSeats}</span>
            </div>
            {indSeats > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <span className="text-sm">IND</span>
                <span className="text-2xl font-bold text-purple-600">{indSeats}</span>
              </div>
            )}
            {uncalledSeats > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm">UNCALLED</span>
                <span className="text-2xl font-bold text-gray-600">{uncalledSeats}</span>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground text-center pt-4 border-t">
              {majorityThreshold} seats needed for majority
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// D3 Race Status Chart Component
function RaceStatusChart({
  hasPresidentialRace,
  presidentialCounts,
  senateCounts,
  houseCounts,
  governorCounts
}: {
  hasPresidentialRace: boolean;
  presidentialCounts: { called: number; projected: number; uncalled: number; total: number };
  senateCounts: { called: number; projected: number; uncalled: number; total: number };
  houseCounts: { called: number; projected: number; uncalled: number; total: number };
  governorCounts: { called: number; projected: number; uncalled: number; total: number };
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const raceTypes = [];
  if (hasPresidentialRace) {
    raceTypes.push({ name: 'Presidential', ...presidentialCounts });
  }
  if (senateCounts.total > 0) {
    raceTypes.push({ name: 'Senate', ...senateCounts });
  }
  if (houseCounts.total > 0) {
    raceTypes.push({ name: 'House', ...houseCounts });
  }
  if (governorCounts.total > 0) {
    raceTypes.push({ name: 'Governor', ...governorCounts });
  }

  useEffect(() => {
    if (!svgRef.current || raceTypes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 250;
    const margin = { top: 40, right: 20, bottom: 60, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const x0 = d3.scaleBand()
      .domain(raceTypes.map(d => d.name))
      .range([0, chartWidth])
      .padding(0.2);

    const x1 = d3.scaleBand()
      .domain(['called', 'projected', 'uncalled'])
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(raceTypes, d => Math.max(d.called, d.projected, d.uncalled, d.total)) || 100])
      .nice()
      .range([chartHeight, 0]);

    const colors = {
      called: '#22c55e',
      projected: '#3b82f6',
      uncalled: '#94a3b8'
    };

    // Draw bars
    raceTypes.forEach((race, i) => {
      const raceGroup = g.append('g')
        .attr('transform', `translate(${x0(race.name)}, 0)`);

      ['called', 'projected', 'uncalled'].forEach((type, j) => {
        const value = race[type as keyof typeof race] as number;
        
        raceGroup.append('rect')
          .attr('x', x1(type) || 0)
          .attr('y', chartHeight)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('fill', colors[type as keyof typeof colors])
          .attr('rx', 3)
          .transition()
          .duration(800)
          .delay(i * 200 + j * 100)
          .attr('y', y(value))
          .attr('height', chartHeight - y(value));

        // Add value labels
        if (value > 0) {
          raceGroup.append('text')
            .attr('x', (x1(type) || 0) + x1.bandwidth() / 2)
            .attr('y', y(value) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#64748b')
            .attr('opacity', 0)
            .text(value)
            .transition()
            .duration(500)
            .delay(i * 200 + j * 100 + 800)
            .attr('opacity', 1);
        }
      });
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('font-size', '12px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('font-size', '11px');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width / 2 - 150}, ${height - 30})`);

    ['called', 'projected', 'uncalled'].forEach((type, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(${i * 100}, 0)`);

      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colors[type as keyof typeof colors])
        .attr('rx', 2);

      legendItem.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('font-size', '11px')
        .text(type.charAt(0).toUpperCase() + type.slice(1));
    });

  }, [raceTypes]);

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Race Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} width="100%" height="250" />
      </CardContent>
    </Card>
  );
}