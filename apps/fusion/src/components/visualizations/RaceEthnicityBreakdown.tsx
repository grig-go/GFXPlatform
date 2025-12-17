import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Building2, Landmark, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { fetchRaceData } from '../../utils/api';

interface RaceEthnicityBreakdownProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
}

const democratData = [
  { name: 'White', value: 66, percentage: 66, color: '#1e3a8a' },
  { name: 'Black', value: 15, percentage: 15, color: '#f59e0b' },
  { name: 'Hispanic/Latino', value: 10, percentage: 10, color: '#fef3c7' },
  { name: 'Asian/Pacific Islander/Native Hawaiian', value: 6, percentage: 6, color: '#8b5cf6' },
  { name: 'Other', value: 1, percentage: 1, color: '#10b981' },
  { name: 'American Indian/Alaska Native', value: 1, percentage: 1, color: '#ef4444' },
  { name: 'Multiracial', value: 1, percentage: 1, color: '#ec4899' },
];

const republicanData = [
  { name: 'White', value: 93, percentage: 93, color: '#1e3a8a' },
  { name: 'Black', value: 2, percentage: 2, color: '#f59e0b' },
  { name: 'Hispanic/Latino', value: 3, percentage: 3, color: '#fef3c7' },
  { name: 'Asian/Pacific Islander/Native Hawaiian', value: 1, percentage: 1, color: '#8b5cf6' },
  { name: 'Other', value: 1, percentage: 1, color: '#10b981' },
];

// All race/ethnicity categories for unified legend
const allCategories = [
  { name: 'White', color: '#1e3a8a' },
  { name: 'Black', color: '#f59e0b' },
  { name: 'Hispanic/Latino', color: '#fef3c7' },
  { name: 'Asian/Pacific Islander/Native Hawaiian', color: '#8b5cf6' },
  { name: 'Other', color: '#10b981' },
  { name: 'American Indian/Alaska Native', color: '#ef4444' },
  { name: 'Multiracial', color: '#ec4899' },
];

export function RaceEthnicityBreakdown({ selectedChambers }: RaceEthnicityBreakdownProps) {
  const houseSvgRef = useRef<SVGSVGElement>(null);
  const senateSvgRef = useRef<SVGSVGElement>(null);
  const [houseData, setHouseData] = useState<typeof democratData>(democratData);
  const [senateData, setSenateData] = useState<typeof republicanData>(republicanData);
  const [loading, setLoading] = useState(true);

  const showBoth = selectedChambers.house && selectedChambers.senate;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseResponse, senateResponse] = await Promise.all([
          fetchRaceData('house'),
          fetchRaceData('senate'),
        ]);
        
        if (houseResponse.data) setHouseData(houseResponse.data);
        if (senateResponse.data) setSenateData(senateResponse.data);
      } catch (error) {
        console.error('Failed to load race data, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && selectedChambers.house && houseSvgRef.current) {
      renderPieChart(houseSvgRef.current, houseData, 'House', '#4A5F8C');
    }
  }, [selectedChambers.house, houseData, loading]);

  useEffect(() => {
    if (!loading && selectedChambers.senate && senateSvgRef.current) {
      renderPieChart(senateSvgRef.current, senateData, 'Senate', '#D66969');
    }
  }, [selectedChambers.senate, senateData, loading]);

  const renderPieChart = (
    svgElement: SVGSVGElement,
    data: typeof democratData,
    chamber: string,
    chamberColor: string
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
      .attr('fill', d => d.data.name === 'Hispanic/Latino' ? '#374151' : 'white')
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
      .attr('dy', '0.35em')
      .attr('fill', chamberColor)
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(chamber)
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);
  };

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
      <h2 className="text-center mb-8 text-[36px] font-bold text-[rgba(10,10,10,0.72)]">Race and ethnicity breakdown by chamber</h2>
      
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
        <div className="text-sm text-gray-600 text-[24px] font-bold">Race/Ethnicity Categories</div>
        <div className="flex flex-wrap justify-center gap-6">
          {allCategories.map((category) => (
            <div key={category.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm text-gray-700 font-bold text-[16px]">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
