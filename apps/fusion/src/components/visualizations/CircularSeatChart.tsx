import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { LucideIcon } from 'lucide-react';

interface CircularSeatChartProps {
  data: {
    democrat: number;
    republican: number;
    libertarian: number;
    independent: number;
    total: number;
    votesRemaining: number;
    seatColors?: string[]; // Optional array to specify exact color for each seat
  };
  chamber: string;
  type: 'semicircle' | 'grid';
  title?: string;
  icon?: LucideIcon;
}

export function CircularSeatChart({ data, chamber, type, title, icon: Icon }: CircularSeatChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const barRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const totalSeats = data.total;
    const calledSeats = data.democrat + data.republican + data.independent + data.libertarian;
    const uncalledSeats = totalSeats - calledSeats;
    
    // Determine parameters based on chamber
    const dotRadius = chamber === 'Senate' ? 5 : 3;
    const rows = chamber === 'Senate' ? 5 : 8;
    const baseRadius = chamber === 'Senate' ? 95 : 65;
    const rowSpacing = chamber === 'Senate' ? 38 : 28;
    
    const centerX = 300;
    const centerY = 300;
    
    // Generate seat colors
    let seatColors: string[] = [];
    
    if (data.seatColors && data.seatColors.length > 0) {
      seatColors = data.seatColors;
    } else {
      // Split uncalled into portions for left edge, middle, and right edge
      const uncalledLeft = Math.floor(uncalledSeats * 0.35);
      const uncalledMiddle = Math.floor(uncalledSeats * 0.35);
      const uncalledRight = uncalledSeats - uncalledLeft - uncalledMiddle;
      
      // Add uncalled left edge
      for (let i = 0; i < uncalledLeft; i++) {
        seatColors.push('#d1d5db');
      }
      
      // Add Democrats
      for (let i = 0; i < data.democrat; i++) {
        seatColors.push('#60a5fa');
      }
      
      // Add uncalled middle
      for (let i = 0; i < uncalledMiddle; i++) {
        seatColors.push('#d1d5db');
      }
      
      // Add Republicans
      for (let i = 0; i < data.republican; i++) {
        seatColors.push('#ef4444');
      }
      
      // Add Independents
      for (let i = 0; i < data.independent; i++) {
        seatColors.push('#a855f7');
      }
      
      // Add uncalled right edge
      for (let i = 0; i < uncalledRight; i++) {
        seatColors.push('#d1d5db');
      }
      
      // Add any remaining (libertarians)
      for (let i = 0; i < data.libertarian; i++) {
        seatColors.push('#f59e0b');
      }
    }
    
    // Generate seat positions using D3
    const seats: { x: number; y: number; color: string }[] = [];
    let currentSeat = 0;
    
    for (let row = 0; row < rows; row++) {
      const radius = baseRadius + row * rowSpacing;
      const seatsInRow = chamber === 'Senate' 
        ? Math.floor(8 + row * 3.5)
        : Math.floor(12 + row * 6);
      
      for (let i = 0; i < seatsInRow && currentSeat < totalSeats; i++) {
        // Calculate angle from left (π) to right (0)
        const angle = Math.PI - (i / (seatsInRow - 1)) * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY - radius * Math.sin(angle);
        
        seats.push({ 
          x, 
          y, 
          color: seatColors[currentSeat] || '#d1d5db'
        });
        currentSeat++;
      }
    }
    
    // Use D3 to render the seats with animation
    const svg = d3.select(svgRef.current);
    
    svg
      .selectAll('circle')
      .data(seats)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 0) // Start with radius 0
      .attr('fill', d => d.color)
      .attr('stroke', 'none')
      .attr('opacity', 0) // Start invisible
      .transition() // Add transition
      .duration(800) // Animation duration in ms
      .delay((d, i) => i * 2) // Stagger animation - each seat delayed by 2ms
      .ease(d3.easeCubicOut) // Easing function for smooth animation
      .attr('r', dotRadius) // Animate to full radius
      .attr('opacity', 1); // Fade in
      
  }, [data, chamber]);
  
  // For House: 212 (dem total), 46 (uncalled), 177 (rep total)
  // For Senate: 45 (dem total), 11 (uncalled), 42 (rep total)
  const isHouse = chamber === 'House';
  const demTotal = isHouse ? 212 : 45;
  const uncalled = isHouse ? 46 : 11;
  const repTotal = isHouse ? 177 : 42;
  const majority = chamber === 'Senate' ? 51 : 218;
  
  // Create balance of power bar with D3
  useEffect(() => {
    if (!barRef.current) return;
    
    // Clear previous content
    d3.select(barRef.current).selectAll('*').remove();
    
    const barData = [
      { value: demTotal, color: '#60a5fa', label: demTotal.toString() },
      { value: uncalled, color: '#d1d5db', label: uncalled.toString() },
      { value: repTotal, color: '#ef4444', label: repTotal.toString() }
    ];
    
    const width = 800;
    const height = 100;
    const barHeight = 48;
    const barY = 35;
    
    const svg = d3.select(barRef.current);
    
    // Add "Democratic" label
    svg.append('text')
      .attr('x', 0)
      .attr('y', 20)
      .attr('fill', '#4b5563')
      .attr('font-size', '12px')
      .text('Democratic');
    
    // Add "Republican" label
    svg.append('text')
      .attr('x', width)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('fill', '#4b5563')
      .attr('font-size', '12px')
      .text('Republican');
    
    // Calculate cumulative positions
    let cumulativeX = 0;
    const barSegments = barData.map(d => {
      const segmentWidth = (d.value / data.total) * width;
      const segment = {
        x: cumulativeX,
        width: segmentWidth,
        ...d
      };
      cumulativeX += segmentWidth;
      return segment;
    });
    
    // Create bar segments with animation
    const segments = svg.selectAll('rect')
      .data(barSegments)
      .enter()
      .append('rect')
      .attr('x', d => d.x)
      .attr('y', barY)
      .attr('width', 0) // Start with 0 width
      .attr('height', barHeight)
      .attr('fill', d => d.color)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 150)
      .ease(d3.easeCubicOut)
      .attr('width', d => d.width);
    
    // Add text labels inside bars (after animation completes)
    setTimeout(() => {
      svg.selectAll('text.bar-label')
        .data(barSegments)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => d.x + d.width / 2)
        .attr('y', barY + barHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .attr('opacity', 0)
        .text(d => d.label)
        .transition()
        .duration(300)
        .attr('opacity', 1);
    }, 1600);
    
    // Add majority marker line
    const majorityX = (majority / data.total) * width;
    
    svg.append('line')
      .attr('x1', majorityX)
      .attr('x2', majorityX)
      .attr('y1', barY)
      .attr('y2', barY + barHeight)
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay(1200)
      .attr('opacity', 1);
    
    // Add majority marker label
    const majorityLabel = svg.append('g')
      .attr('opacity', 0);
    
    majorityLabel.append('rect')
      .attr('x', majorityX - 15)
      .attr('y', barY - 28)
      .attr('width', 30)
      .attr('height', 20)
      .attr('fill', 'black')
      .attr('rx', 3);
    
    majorityLabel.append('text')
      .attr('x', majorityX)
      .attr('y', barY - 14)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .text(majority);
    
    majorityLabel.transition()
      .duration(500)
      .delay(1200)
      .attr('opacity', 1);
    
    // Add scale labels
    const scaleY = barY + barHeight + 20;
    const scalePoints = [0, 0.2, 0.4, 0.6, 0.8, 1].map(pct => ({
      x: pct * width,
      label: Math.floor(pct * data.total).toString()
    }));
    
    svg.selectAll('text.scale')
      .data(scalePoints)
      .enter()
      .append('text')
      .attr('class', 'scale')
      .attr('x', d => d.x)
      .attr('y', scaleY)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .attr('opacity', 0)
      .text(d => d.label)
      .transition()
      .duration(500)
      .delay(1400)
      .attr('opacity', 1);
    
  }, [data, chamber, demTotal, uncalled, repTotal, majority]);
  
  return (
    <div>
      {/* Title with Icon */}
      {title && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {Icon && <Icon className="h-6 w-6 text-gray-700" />}
          <h2 className="text-gray-900 text-[32px] font-bold">{title}</h2>
        </div>
      )}
      
      {/* Seat Visualization */}
      <div className="mb-6 w-full">
        <svg 
          ref={svgRef}
          viewBox="0 0 600 340" 
          className="w-full h-auto"
        />
      </div>

      {/* Balance of Power Bar - D3 Version */}
      <div className="mb-4 w-full mt-6">
        <svg 
          ref={barRef}
          viewBox="0 0 800 120" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
