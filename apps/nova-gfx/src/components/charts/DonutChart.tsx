import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartConfig } from './types';

interface DonutChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  className?: string;
}

export function DonutChart({ config, width, height, className }: DonutChartProps) {
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
    donutWidth = 0.4, // 0-1, percentage of radius
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
    const innerRadius = radius * (1 - donutWidth);
    const total = d3.sum(data, d => d.value);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<typeof data[0]>()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.02);

    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    const arcs = pie(data);

    // Slices
    const slices = g.selectAll('.slice')
      .data(arcs)
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('fill', (d, i) => d.data.color || colors[i % colors.length]);

    if (animate) {
      slices
        .attr('d', d3.arc<d3.PieArcDatum<typeof data[0]>>()
          .innerRadius(innerRadius)
          .outerRadius(innerRadius)
          .startAngle(d => d.startAngle)
          .endAngle(d => d.startAngle)
        )
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attrTween('d', function(d) {
          const interpolate = d3.interpolate(
            { startAngle: d.startAngle, endAngle: d.startAngle },
            { startAngle: d.startAngle, endAngle: d.endAngle }
          );
          return function(t) {
            const current = interpolate(t);
            return arc({
              ...d,
              startAngle: current.startAngle,
              endAngle: current.endAngle,
            }) || '';
          };
        });
    } else {
      slices.attr('d', arc);
    }

    // Center total or main value
    if (showValues && data.length > 0) {
      const centerGroup = g.append('g').attr('class', 'center-label');
      
      if (animate) {
        centerGroup.attr('opacity', 0)
          .transition()
          .delay(animationDuration * 0.5)
          .duration(animationDuration * 0.3)
          .attr('opacity', 1);
      }

      // Show total in center
      centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .attr('fill', labelColor)
        .attr('font-size', labelSize * 2)
        .attr('font-weight', 700)
        .text(formatValue(total, total));

      centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')
        .attr('fill', labelColor)
        .attr('font-size', labelSize * 0.8)
        .attr('opacity', 0.7)
        .text('TOTAL');
    }

    // Legend
    if (showLabels) {
      const legendG = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - padding}, ${padding})`);

      data.forEach((d, i) => {
        const legendItem = legendG.append('g')
          .attr('transform', `translate(0, ${i * 24})`);

        legendItem.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('rx', 2)
          .attr('fill', d.color || colors[i % colors.length]);

        legendItem.append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('fill', labelColor)
          .attr('font-size', labelSize - 2)
          .text(`${d.label}: ${formatValue(d.value, total)}`);
      });
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

