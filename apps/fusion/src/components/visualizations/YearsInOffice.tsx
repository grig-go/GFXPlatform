import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { fetchOfficeData } from '../../utils/api';

interface YearsInOfficeProps {
  selectedChambers: {
    house: boolean;
    senate: boolean;
  };
}

// Data for years in office
const yearsData = [
  { range: '1-4', house: 28.0, senate: 12.0 },
  { range: '4-6', house: 18.0, senate: 8.0 },
  { range: '7-13', house: 20.0, senate: 15.0 },
  { range: '11-15', house: 12.0, senate: 14.0 },
  { range: '16-20', house: 8.0, senate: 12.0 },
  { range: '21-30', house: 9.0, senate: 15.0 },
  { range: '31-39', house: 3.0, senate: 3.0 },
  { range: '40+', house: 2.0, senate: 3.0 },
];

const colors = {
  house: '#4A5F8C',
  senate: '#D66969',
};

export function YearsInOffice({ selectedChambers }: YearsInOfficeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [officeData, setOfficeData] = useState<typeof yearsData>(yearsData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchOfficeData();
        if (response.data) setOfficeData(response.data);
      } catch (error) {
        console.error('Failed to load office data, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setDimensions({
          width: containerWidth,
          height: 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || loading) return;

    renderChart();
  }, [selectedChambers, dimensions, officeData, loading]);

  const renderChart = () => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 120, bottom: 60, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const yScale = d3.scaleBand()
      .domain(officeData.map(d => d.range))
      .range([0, height])
      .padding(0.3);

    const xScale = d3.scaleLinear()
      .domain([0, 35])
      .range([0, width]);

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xScale.ticks(7))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    // Add X axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .ticks(7)
        .tickFormat(d => `${d}%`)
      );

    xAxis.selectAll('text')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px');

    xAxis.selectAll('line')
      .attr('stroke', '#d1d5db');

    xAxis.select('.domain')
      .attr('stroke', '#d1d5db');

    // Add Y axis
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale));

    yAxis.selectAll('text')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px');

    yAxis.selectAll('line').remove();
    yAxis.select('.domain').remove();

    const barHeight = yScale.bandwidth() / 2;

    // Add House bars
    if (selectedChambers.house) {
      const houseBars = g.selectAll('.bar-house')
        .data(officeData)
        .enter()
        .append('rect')
        .attr('class', 'bar-house')
        .attr('x', 0)
        .attr('y', d => (yScale(d.range) || 0) + barHeight)
        .attr('height', barHeight)
        .attr('fill', colors.house)
        .attr('width', 0);

      // Animate bars
      houseBars
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('width', d => xScale(d.house));

      // Add labels
      const houseLabels = g.selectAll('.label-house')
        .data(officeData)
        .enter()
        .append('text')
        .attr('class', 'label-house')
        .attr('x', d => xScale(d.house) + 5)
        .attr('y', d => (yScale(d.range) || 0) + barHeight + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#374151')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('opacity', 0)
        .text(d => `${d.house}%`);

      houseLabels
        .transition()
        .duration(500)
        .delay(800)
        .attr('opacity', 1);
    }

    // Add Senate bars
    if (selectedChambers.senate) {
      const senateBars = g.selectAll('.bar-senate')
        .data(officeData)
        .enter()
        .append('rect')
        .attr('class', 'bar-senate')
        .attr('x', 0)
        .attr('y', d => yScale(d.range) || 0)
        .attr('height', barHeight)
        .attr('fill', colors.senate)
        .attr('width', 0);

      // Animate bars
      senateBars
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('width', d => xScale(d.senate));

      // Add labels
      const senateLabels = g.selectAll('.label-senate')
        .data(officeData)
        .enter()
        .append('text')
        .attr('class', 'label-senate')
        .attr('x', d => xScale(d.senate) + 5)
        .attr('y', d => (yScale(d.range) || 0) + barHeight / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#374151')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('opacity', 0)
        .text(d => `${d.senate}%`);

      senateLabels
        .transition()
        .duration(500)
        .delay(800)
        .attr('opacity', 1);
    }

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 10)`);

    if (selectedChambers.house) {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colors.house);

      legend.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('fill', '#374151')
        .attr('font-size', '12px')
        .text('House');
    }

    if (selectedChambers.senate) {
      const yOffset = selectedChambers.house ? 25 : 0;
      legend.append('rect')
        .attr('x', 0)
        .attr('y', yOffset)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colors.senate);

      legend.append('text')
        .attr('x', 20)
        .attr('y', yOffset + 12)
        .attr('fill', '#374151')
        .attr('font-size', '12px')
        .text('Senate');
    }
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
      <h2 className="text-center mb-12 text-[36px] font-bold text-[rgba(10,10,10,0.72)]">Years in Office</h2>
      
      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
