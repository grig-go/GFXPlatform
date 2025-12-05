import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { ChartConfig, ChartDataPoint } from './types';

interface BarChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  className?: string;
}

export function BarChart({ config, width, height, className }: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const {
    data,
    colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#22C55E', '#F59E0B'],
    backgroundColor = 'transparent',
    borderRadius = 4,
    animate = true,
    animationDuration = 800,
    showLabels = true,
    showValues = true,
    labelColor = '#FFFFFF',
    labelSize = 14,
    valueFormat = 'number',
    valuePrefix = '',
    valueSuffix = '',
    showXAxis = false,
    showYAxis = false,
    showGrid = false,
    gridColor = 'rgba(255,255,255,0.1)',
    padding = 20,
    gap = 8,
    orientation = 'vertical',
  } = config;

  const isHorizontal = config.type === 'horizontal-bar' || orientation === 'horizontal';

  const formatValue = (value: number) => {
    let formatted: string;
    switch (valueFormat) {
      case 'percent':
        formatted = `${Math.round(value)}%`;
        break;
      case 'currency':
        formatted = `$${value.toLocaleString()}`;
        break;
      default:
        formatted = value.toLocaleString();
    }
    return `${valuePrefix}${formatted}${valueSuffix}`;
  };

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const g = svg
      .append('g')
      .attr('transform', `translate(${padding}, ${padding})`);

    const maxValue = Math.max(...data.map(d => d.value));

    if (isHorizontal) {
      // Horizontal bar chart
      const yScale = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([0, innerHeight])
        .padding(gap / 100);

      const xScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .range([0, innerWidth]);

      // Grid lines
      if (showGrid) {
        g.selectAll('.grid-line')
          .data(xScale.ticks(5))
          .enter()
          .append('line')
          .attr('class', 'grid-line')
          .attr('x1', d => xScale(d))
          .attr('x2', d => xScale(d))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', gridColor)
          .attr('stroke-dasharray', '2,2');
      }

      // Bars
      const bars = g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => yScale(d.label) || 0)
        .attr('height', yScale.bandwidth())
        .attr('x', 0)
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('fill', (d, i) => d.color || colors[i % colors.length]);

      if (animate) {
        bars
          .attr('width', 0)
          .transition()
          .duration(animationDuration)
          .ease(d3.easeCubicOut)
          .attr('width', d => xScale(d.value));
      } else {
        bars.attr('width', d => xScale(d.value));
      }

      // Labels
      if (showLabels) {
        g.selectAll('.label')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'label')
          .attr('x', 8)
          .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('fill', labelColor)
          .attr('font-size', labelSize)
          .attr('font-weight', 600)
          .text(d => d.label);
      }

      // Values
      if (showValues) {
        const values = g.selectAll('.value')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'value')
          .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('fill', labelColor)
          .attr('font-size', labelSize)
          .attr('font-weight', 700)
          .attr('text-anchor', 'end');

        if (animate) {
          values
            .attr('x', 0)
            .attr('opacity', 0)
            .transition()
            .duration(animationDuration)
            .ease(d3.easeCubicOut)
            .attr('x', d => xScale(d.value) - 8)
            .attr('opacity', 1)
            .tween('text', function(d) {
              const i = d3.interpolateNumber(0, d.value);
              return function(t) {
                d3.select(this).text(formatValue(i(t)));
              };
            });
        } else {
          values
            .attr('x', d => xScale(d.value) - 8)
            .text(d => formatValue(d.value));
        }
      }

    } else {
      // Vertical bar chart
      const xScale = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([0, innerWidth])
        .padding(gap / 100);

      const yScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .range([innerHeight, 0]);

      // Grid lines
      if (showGrid) {
        g.selectAll('.grid-line')
          .data(yScale.ticks(5))
          .enter()
          .append('line')
          .attr('class', 'grid-line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', d => yScale(d))
          .attr('y2', d => yScale(d))
          .attr('stroke', gridColor)
          .attr('stroke-dasharray', '2,2');
      }

      // Bars
      const bars = g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.label) || 0)
        .attr('width', xScale.bandwidth())
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('fill', (d, i) => d.color || colors[i % colors.length]);

      if (animate) {
        bars
          .attr('y', innerHeight)
          .attr('height', 0)
          .transition()
          .duration(animationDuration)
          .ease(d3.easeCubicOut)
          .attr('y', d => yScale(d.value))
          .attr('height', d => innerHeight - yScale(d.value));
      } else {
        bars
          .attr('y', d => yScale(d.value))
          .attr('height', d => innerHeight - yScale(d.value));
      }

      // Labels
      if (showLabels) {
        g.selectAll('.label')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'label')
          .attr('x', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
          .attr('y', innerHeight + 16)
          .attr('text-anchor', 'middle')
          .attr('fill', labelColor)
          .attr('font-size', labelSize)
          .attr('font-weight', 600)
          .text(d => d.label);
      }

      // Values on top of bars
      if (showValues) {
        const values = g.selectAll('.value')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'value')
          .attr('x', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', labelColor)
          .attr('font-size', labelSize - 2)
          .attr('font-weight', 700);

        if (animate) {
          values
            .attr('y', innerHeight)
            .attr('opacity', 0)
            .transition()
            .duration(animationDuration)
            .ease(d3.easeCubicOut)
            .attr('y', d => yScale(d.value) - 8)
            .attr('opacity', 1)
            .tween('text', function(d) {
              const i = d3.interpolateNumber(0, d.value);
              return function(t) {
                d3.select(this).text(formatValue(i(t)));
              };
            });
        } else {
          values
            .attr('y', d => yScale(d.value) - 8)
            .text(d => formatValue(d.value));
        }
      }
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

