import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartConfig } from './types';

interface LineChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  className?: string;
}

export function LineChart({ config, width, height, className }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    data,
    colors = ['#8B5CF6'],
    backgroundColor = 'transparent',
    animate = true,
    animationDuration = 1000,
    showLabels: _showLabels = true,
    showValues = false,
    labelColor = '#FFFFFF',
    labelSize = 12,
    showXAxis = true,
    showYAxis = true,
    showGrid = true,
    gridColor = 'rgba(255,255,255,0.1)',
    padding = 40,
    borderWidth = 3,
  } = config;

  const isArea = config.type === 'area';
  const isSparkline = config.type === 'sparkline';

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const effectivePadding = isSparkline ? 4 : padding;

    const g = svg
      .append('g')
      .attr('transform', `translate(${effectivePadding}, ${effectivePadding})`);

    const xScale = d3.scalePoint()
      .domain(data.map(d => d.label))
      .range([0, isSparkline ? width - effectivePadding * 2 : innerWidth]);

    const yExtent = d3.extent(data, d => d.value) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([isSparkline ? height - effectivePadding * 2 : innerHeight, 0]);

    // Grid
    if (showGrid && !isSparkline) {
      // Horizontal grid lines
      g.selectAll('.grid-line-h')
        .data(yScale.ticks(5))
        .enter()
        .append('line')
        .attr('class', 'grid-line-h')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor);

      // Vertical grid lines
      g.selectAll('.grid-line-v')
        .data(data)
        .enter()
        .append('line')
        .attr('class', 'grid-line-v')
        .attr('x1', d => xScale(d.label) || 0)
        .attr('x2', d => xScale(d.label) || 0)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', gridColor);
    }

    // Area fill
    if (isArea) {
      const area = d3.area<typeof data[0]>()
        .x(d => xScale(d.label) || 0)
        .y0(isSparkline ? height - effectivePadding * 2 : innerHeight)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const areaPath = g.append('path')
        .datum(data)
        .attr('fill', `url(#gradient-${colors[0].replace('#', '')})`)
        .attr('opacity', 0.3);

      // Gradient definition
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${colors[0].replace('#', '')}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors[0])
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colors[0])
        .attr('stop-opacity', 0);

      if (animate) {
        // Animation uses opacity transition, not path drawing
        areaPath
          .attr('d', area)
          .attr('opacity', 0)
          .transition()
          .delay(animationDuration * 0.3)
          .duration(animationDuration * 0.7)
          .attr('opacity', 0.3);
      } else {
        areaPath.attr('d', area);
      }
    }

    // Line
    const line = d3.line<typeof data[0]>()
      .x(d => xScale(d.label) || 0)
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const linePath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors[0])
      .attr('stroke-width', borderWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    if (animate) {
      const totalLength = linePath.node()?.getTotalLength() || 0;
      linePath
        .attr('d', line)
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    } else {
      linePath.attr('d', line);
    }

    // Data points
    if (!isSparkline) {
      const points = g.selectAll('.point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.label) || 0)
        .attr('cy', d => yScale(d.value))
        .attr('fill', colors[0])
        .attr('stroke', backgroundColor === 'transparent' ? '#1a1a1a' : backgroundColor)
        .attr('stroke-width', 2);

      if (animate) {
        points
          .attr('r', 0)
          .transition()
          .delay((_, i) => (animationDuration / data.length) * i)
          .duration(200)
          .attr('r', 5);
      } else {
        points.attr('r', 5);
      }
    }

    // X Axis
    if (showXAxis && !isSparkline) {
      const xAxis = g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`);

      xAxis.selectAll('.tick')
        .data(data)
        .enter()
        .append('text')
        .attr('x', d => xScale(d.label) || 0)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', labelSize)
        .text(d => d.label);
    }

    // Y Axis
    if (showYAxis && !isSparkline) {
      const yAxis = g.append('g')
        .attr('class', 'y-axis');

      yAxis.selectAll('.tick')
        .data(yScale.ticks(5))
        .enter()
        .append('text')
        .attr('x', -10)
        .attr('y', d => yScale(d))
        .attr('text-anchor', 'end')
        .attr('dy', '0.35em')
        .attr('fill', labelColor)
        .attr('font-size', labelSize)
        .text(d => d.toLocaleString());
    }

    // Values on hover points
    if (showValues && !isSparkline) {
      g.selectAll('.value')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', d => xScale(d.label) || 0)
        .attr('y', d => yScale(d.value) - 12)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', labelSize - 2)
        .attr('font-weight', 600)
        .text(d => d.value.toLocaleString());
    }

  }, [data, width, height, config]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={className}
      style={{ backgroundColor }}
    />
  );
}

