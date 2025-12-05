import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartConfig } from './types';

interface PieChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  className?: string;
}

export function PieChart({ config, width, height, className }: PieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    data,
    colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#22C55E', '#F59E0B'],
    backgroundColor = 'transparent',
    animate = true,
    animationDuration = 1000,
    showLabels = true,
    showValues = true,
    labelColor = '#FFFFFF',
    labelSize = 14,
    valueFormat = 'percent',
    valuePrefix = '',
    valueSuffix = '',
    padding = 20,
  } = config;

  const formatValue = (value: number, total: number) => {
    let formatted: string;
    switch (valueFormat) {
      case 'percent':
        formatted = `${Math.round((value / total) * 100)}%`;
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

    const radius = Math.min(width, height) / 2 - padding;
    const total = d3.sum(data, d => d.value);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<typeof data[0]>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    const arcs = pie(data);

    // Slices
    const slices = g.selectAll('.slice')
      .data(arcs)
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('fill', (d, i) => d.data.color || colors[i % colors.length])
      .attr('stroke', backgroundColor === 'transparent' ? '#1a1a1a' : backgroundColor)
      .attr('stroke-width', 2);

    if (animate) {
      slices
        .attr('d', d3.arc<d3.PieArcDatum<typeof data[0]>>()
          .innerRadius(0)
          .outerRadius(0)
          .startAngle(d => d.startAngle)
          .endAngle(d => d.startAngle)
        )
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attrTween('d', function(d) {
          const interpolate = d3.interpolate(
            { startAngle: d.startAngle, endAngle: d.startAngle, innerRadius: 0, outerRadius: 0 },
            { startAngle: d.startAngle, endAngle: d.endAngle, innerRadius: 0, outerRadius: radius }
          );
          return function(t) {
            return arc(interpolate(t) as d3.PieArcDatum<typeof data[0]>) || '';
          };
        });
    } else {
      slices.attr('d', arc);
    }

    // Labels
    if (showLabels || showValues) {
      const labels = g.selectAll('.label-group')
        .data(arcs)
        .enter()
        .append('g')
        .attr('class', 'label-group')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`);

      if (animate) {
        labels
          .attr('opacity', 0)
          .transition()
          .delay(animationDuration * 0.5)
          .duration(animationDuration * 0.5)
          .attr('opacity', 1);
      }

      if (showLabels) {
        labels.append('text')
          .attr('class', 'label')
          .attr('dy', showValues ? '-0.5em' : '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', labelColor)
          .attr('font-size', labelSize)
          .attr('font-weight', 600)
          .text(d => d.data.label);
      }

      if (showValues) {
        labels.append('text')
          .attr('class', 'value')
          .attr('dy', showLabels ? '0.8em' : '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', labelColor)
          .attr('font-size', labelSize - 2)
          .attr('font-weight', 700)
          .text(d => formatValue(d.data.value, total));
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

