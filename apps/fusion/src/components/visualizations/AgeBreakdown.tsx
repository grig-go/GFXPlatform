import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Building2, Landmark, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { fetchAgeData } from '../../utils/api';

interface AgeBreakdownProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
}

// Color mapping for age groups
const ageColors: Record<string, string> = {
  '50-59': '#8B6F47',
  '60-69': '#6B4423',
  '40-49': '#C19A6B',
  '70-79': '#B8A4D4',
  '30-39': '#8DB48C',
  '80-89': '#64748B',
  '20-29': '#B8D4B8',
  '90+': '#1E293B',
};

const houseAgeData = [
  { name: '50-59', value: 104, percentage: 23.9, color: ageColors['50-59'] },
  { name: '60-69', value: 114, percentage: 26.2, color: ageColors['60-69'] },
  { name: '40-49', value: 96, percentage: 22.1, color: ageColors['40-49'] },
  { name: '70-79', value: 71, percentage: 16.3, color: ageColors['70-79'] },
  { name: '30-39', value: 35, percentage: 8.05, color: ageColors['30-39'] },
  { name: '20-29', value: 13, percentage: 2.99, color: ageColors['20-29'] },
];

const senateAgeData = [
  { name: '60-69', value: 33, percentage: 33, color: ageColors['60-69'] },
  { name: '70-79', value: 27, percentage: 27, color: ageColors['70-79'] },
  { name: '50-59', value: 21, percentage: 21, color: ageColors['50-59'] },
  { name: '40-49', value: 10, percentage: 10, color: ageColors['40-49'] },
  { name: '80-89', value: 5, percentage: 5, color: ageColors['80-89'] },
  { name: '30-39', value: 2, percentage: 2, color: ageColors['30-39'] },
  { name: '20-29', value: 1, percentage: 1, color: ageColors['20-29'] },
  { name: '90+', value: 1, percentage: 1, color: ageColors['90+'] },
];

// All age groups for unified legend
const allAgeGroups = [
  { name: '50-59', color: ageColors['50-59'] },
  { name: '60-69', color: ageColors['60-69'] },
  { name: '40-49', color: ageColors['40-49'] },
  { name: '70-79', color: ageColors['70-79'] },
  { name: '30-39', color: ageColors['30-39'] },
  { name: '80-89', color: ageColors['80-89'] },
  { name: '20-29', color: ageColors['20-29'] },
  { name: '90+', color: ageColors['90+'] },
];

export function AgeBreakdown({ selectedChambers }: AgeBreakdownProps) {
  const houseSvgRef = useRef<SVGSVGElement>(null);
  const senateSvgRef = useRef<SVGSVGElement>(null);
  const [houseData, setHouseData] = useState<typeof houseAgeData>(houseAgeData);
  const [senateData, setSenateData] = useState<typeof senateAgeData>(senateAgeData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseResponse, senateResponse] = await Promise.all([
          fetchAgeData('house'),
          fetchAgeData('senate'),
        ]);
        
        if (houseResponse.data) setHouseData(houseResponse.data);
        if (senateResponse.data) setSenateData(senateResponse.data);
      } catch (error) {
        console.error('Failed to load age data, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && selectedChambers.house && houseSvgRef.current) {
      renderPieChart(houseSvgRef.current, houseData, 'House', '57.3');
    }
  }, [selectedChambers.house, houseData, loading]);

  useEffect(() => {
    if (!loading && selectedChambers.senate && senateSvgRef.current) {
      renderPieChart(senateSvgRef.current, senateData, 'Senate', '64.0');
    }
  }, [selectedChambers.senate, senateData, loading]);

  const renderPieChart = (
    svgElement: SVGSVGElement,
    data: typeof houseAgeData,
    chamber: string,
    averageAge: string
  ) => {
    // Clear previous content
    d3.select(svgElement).selectAll('*').remove();

    const width = 520;
    const height = 390;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.5;

    const svg = d3.select(svgElement);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create pie generator
    const pie = d3.pie<typeof data[0]>()
      .value(d => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Create arcs with animation
    const arcs = g
      .selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    // Animate arcs
    arcs
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .ease(d3.easeCubicOut)
      .style('opacity', 1)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t)) || '';
        };
      });

    // Add labels on pie slices (only for slices >= 5%)
    const labelArc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(radius * 0.75)
      .outerRadius(radius * 0.75);

    const labels = g
      .selectAll('text.slice-label')
      .data(pie(data).filter(d => d.data.percentage >= 5))
      .enter()
      .append('text')
      .attr('class', 'slice-label')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .style('opacity', 0);

    // Add count on first line
    labels
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '-0.3em')
      .text(d => d.data.value);

    // Add percentage on second line
    labels
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .text(d => `${d.data.percentage}%`);

    // Animate labels
    labels
      .transition()
      .duration(500)
      .delay(800)
      .style('opacity', 1);

    // Add center text - chamber name
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#374151')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(chamber)
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    // Add center text - average age
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .attr('opacity', 0)
      .text(`Average age: ${averageAge}`)
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);
  };

  const showBoth = selectedChambers.house && selectedChambers.senate;

  return (
    <div className="relative">
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

      {/* Main Title */}
      <h2 className="text-center mb-8 text-[36px] font-bold text-[rgba(10,10,10,0.72)]">Number of voting members in each age group</h2>
      
      <div className={`grid grid-cols-1 ${showBoth ? 'lg:grid-cols-2' : ''} gap-12 mb-8 mt-12`}>
        {selectedChambers.house && (
          <div className={showBoth ? '' : 'max-w-[600px] mx-auto'}>
            {/* Title with Icon */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-gray-700" />
              <h3 className="text-gray-900 text-[32px] font-bold">House of Representatives</h3>
            </div>

            {/* Pie Chart */}
            <svg
              ref={houseSvgRef}
              viewBox="0 0 520 390"
              className="w-full h-auto"
            />
          </div>
        )}

        {selectedChambers.senate && (
          <div className={showBoth ? '' : 'max-w-[600px] mx-auto'}>
            {/* Title with Icon */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Landmark className="h-6 w-6 text-gray-700" />
              <h3 className="text-gray-900 text-[32px] font-bold">U.S. Senate</h3>
            </div>

            {/* Pie Chart */}
            <svg
              ref={senateSvgRef}
              viewBox="0 0 520 390"
              className="w-full h-auto"
            />
          </div>
        )}
      </div>

      {/* Unified Legend Below Charts */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm text-gray-600 text-[24px] font-bold">Age Groups</div>
        <div className="flex flex-wrap justify-center gap-6">
          {allAgeGroups.map((group) => (
            <div key={group.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-sm text-gray-700 font-bold text-[16px]">{group.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
