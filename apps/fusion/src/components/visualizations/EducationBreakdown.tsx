import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Building2, Landmark, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { fetchEducationData } from '../../utils/api';

interface EducationBreakdownProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
}

// Color mapping for universities
const universityColors: Record<string, string> = {
  'Other': '#F4C430',
  'Harvard': '#2D1B52',
  'Stanford': '#E57A3C',
  'Stanford U.': '#D2691E',
  'U. of California, Los Angeles': '#2D9CDB',
  'Brigham Young U.': '#4A9B8E',
  'Georgetown': '#C04848',
  'Cornell U.': '#E67E3C',
  'U. of Virginia': '#E87722',
  'U. of Texas': '#5FA8D3',
  'U. of Florida': '#32A467',
  'Dartmouth College': '#00693E',
  'U. of North Carolina': '#13294B',
  'Harvard U.': '#2D1B52',
  'Ohio State U.': '#1F4E78',
  'Yale': '#C8102E',
  'Yale U.': '#C8102E',
  'Wisconsin': '#8B4789',
  'Georgetown U.': '#6BA3D0',
};

const houseEducationData = [
  { name: 'Other', value: 195, percentage: 44.8, color: universityColors['Other'] },
  { name: 'Harvard', value: 48, percentage: 11.0, color: universityColors['Harvard'] },
  { name: 'U. of California, Los Angeles', value: 20, percentage: 4.6, color: universityColors['U. of California, Los Angeles'] },
  { name: 'Stanford', value: 18, percentage: 4.1, color: universityColors['Stanford'] },
  { name: 'Georgetown', value: 16, percentage: 3.7, color: universityColors['Georgetown'] },
  { name: 'Brigham Young U.', value: 15, percentage: 3.4, color: universityColors['Brigham Young U.'] },
  { name: 'Cornell U.', value: 14, percentage: 3.2, color: universityColors['Cornell U.'] },
  { name: 'U. of Virginia', value: 13, percentage: 3.0, color: universityColors['U. of Virginia'] },
  { name: 'U. of Texas', value: 12, percentage: 2.8, color: universityColors['U. of Texas'] },
  { name: 'U. of Florida', value: 11, percentage: 2.5, color: universityColors['U. of Florida'] },
  { name: 'Dartmouth College', value: 10, percentage: 2.3, color: universityColors['Dartmouth College'] },
  { name: 'U. of North Carolina', value: 9, percentage: 2.1, color: universityColors['U. of North Carolina'] },
  { name: 'Yale', value: 8, percentage: 1.8, color: universityColors['Yale'] },
  { name: 'Ohio State U.', value: 7, percentage: 1.6, color: universityColors['Ohio State U.'] },
];

const senateEducationData = [
  { name: 'Other', value: 38, percentage: 38.0, color: universityColors['Other'] },
  { name: 'Harvard U.', value: 22, percentage: 22.0, color: universityColors['Harvard U.'] },
  { name: 'Yale U.', value: 16, percentage: 16.0, color: universityColors['Yale U.'] },
  { name: 'Georgetown U.', value: 8, percentage: 8.0, color: universityColors['Georgetown U.'] },
  { name: 'Stanford U.', value: 6, percentage: 6.0, color: universityColors['Stanford U.'] },
  { name: 'Wisconsin', value: 4, percentage: 4.0, color: universityColors['Wisconsin'] },
  { name: 'Brigham Young U.', value: 3, percentage: 3.0, color: universityColors['Brigham Young U.'] },
  { name: 'U. of Virginia', value: 3, percentage: 3.0, color: universityColors['U. of Virginia'] },
];

// All universities for unified legend
const allUniversities = [
  { name: 'Other', color: universityColors['Other'] },
  { name: 'Harvard', color: universityColors['Harvard'] },
  { name: 'U. of California, Los Angeles', color: universityColors['U. of California, Los Angeles'] },
  { name: 'Stanford', color: universityColors['Stanford'] },
  { name: 'Georgetown', color: universityColors['Georgetown'] },
  { name: 'Brigham Young U.', color: universityColors['Brigham Young U.'] },
  { name: 'Cornell U.', color: universityColors['Cornell U.'] },
  { name: 'U. of Virginia', color: universityColors['U. of Virginia'] },
  { name: 'U. of Texas', color: universityColors['U. of Texas'] },
  { name: 'U. of Florida', color: universityColors['U. of Florida'] },
  { name: 'Dartmouth College', color: universityColors['Dartmouth College'] },
  { name: 'U. of North Carolina', color: universityColors['U. of North Carolina'] },
  { name: 'Yale', color: universityColors['Yale'] },
  { name: 'Ohio State U.', color: universityColors['Ohio State U.'] },
  { name: 'Harvard U.', color: universityColors['Harvard U.'] },
  { name: 'Yale U.', color: universityColors['Yale U.'] },
  { name: 'Georgetown U.', color: universityColors['Georgetown U.'] },
  { name: 'Stanford U.', color: universityColors['Stanford U.'] },
  { name: 'Wisconsin', color: universityColors['Wisconsin'] },
];

export function EducationBreakdown({ selectedChambers }: EducationBreakdownProps) {
  const houseSvgRef = useRef<SVGSVGElement>(null);
  const senateSvgRef = useRef<SVGSVGElement>(null);
  const [houseData, setHouseData] = useState<typeof houseEducationData>(houseEducationData);
  const [senateData, setSenateData] = useState<typeof senateEducationData>(senateEducationData);
  const [loading, setLoading] = useState(true);

  const showBoth = selectedChambers.house && selectedChambers.senate;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseResponse, senateResponse] = await Promise.all([
          fetchEducationData('house'),
          fetchEducationData('senate'),
        ]);
        
        if (houseResponse.data) setHouseData(houseResponse.data);
        if (senateResponse.data) setSenateData(senateResponse.data);
      } catch (error) {
        console.error('Failed to load education data, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && selectedChambers.house && houseSvgRef.current) {
      renderPieChart(houseSvgRef.current, houseData, 'House', showBoth);
    }
  }, [selectedChambers.house, showBoth, houseData, loading]);

  useEffect(() => {
    if (!loading && selectedChambers.senate && senateSvgRef.current) {
      renderPieChart(senateSvgRef.current, senateData, 'Senate', showBoth);
    }
  }, [selectedChambers.senate, showBoth, senateData, loading]);

  const renderPieChart = (
    svgElement: SVGSVGElement,
    data: typeof houseEducationData,
    chamber: string,
    isShowingBoth: boolean
  ) => {
    // Clear previous content
    d3.select(svgElement).selectAll('*').remove();

    const scale = isShowingBoth ? 1 : 3;
    const width = 520 * scale;
    const height = 390 * scale;
    const radius = Math.min(width, height) / 2 - 20 * scale;
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
      .attr('stroke-width', 2 * scale)
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
      .attr('font-size', `${14 * scale}px`)
      .attr('font-weight', '600')
      .style('opacity', 0);

    // Add university name
    labels
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '-0.6em')
      .text(d => d.data.name);

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

    // Add center text - "Most Common Alma Mater in"
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.9em')
      .attr('fill', '#2D9CDB')
      .attr('font-size', `${14 * scale}px`)
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text('Most Common')
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#2D9CDB')
      .attr('font-size', `${14 * scale}px`)
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text('Alma Mater in')
      .transition()
      .duration(500)
      .delay(800)
      .attr('opacity', 1);

    // Add center text - chamber name
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .attr('fill', '#2D9CDB')
      .attr('font-size', `${14 * scale}px`)
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(`the ${chamber}`)
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
      <h2 className="text-center mb-8 text-[36px] font-bold text-[rgba(10,10,10,0.72)]">Most common alma mater by chamber</h2>
      
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
              viewBox={showBoth ? "0 0 520 390" : "0 0 1560 1170"}
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
              viewBox={showBoth ? "0 0 520 390" : "0 0 1560 1170"}
              className="w-full h-auto"
            />
          </div>
        )}
      </div>

      {/* Unified Legend Below Charts */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm text-gray-600 text-[24px] font-bold">Universities</div>
        <div className="flex flex-wrap justify-center gap-6">
          {allUniversities.map((university) => (
            <div key={university.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: university.color }}
              />
              <span className="text-sm text-gray-700 text-[14px] font-bold">{university.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
