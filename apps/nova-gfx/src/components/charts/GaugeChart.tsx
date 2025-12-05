import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartConfig } from './types';

interface GaugeChartProps {
  config: ChartConfig;
  width: number;
  height: number;
  className?: string;
}

export function GaugeChart({ config, width, height, className }: GaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    data,
    colors = ['#EF4444', '#F59E0B', '#22C55E'],
    backgroundColor = 'transparent',
    animate = true,
    animationDuration = 1000,
    showLabels = true,
    showValues = true,
    labelColor = '#FFFFFF',
    labelSize = 14,
    gaugeMin = 0,
    gaugeMax = 100,
    startAngle = -135,
    endAngle = 135,
    donutWidth = 0.2,
    padding = 20,
  } = config;

  // Get the primary value (first data point)
  const value = data[0]?.value ?? 0;
  const label = data[0]?.label ?? '';

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = Math.min(width, height) / 2 - padding;
    const innerRadius = radius * (1 - donutWidth);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2 + radius * 0.2})`);

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Background arc
    const backgroundArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(startRad)
      .endAngle(endRad)
      .cornerRadius(6);

    g.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', 'rgba(255,255,255,0.1)');

    // Value arc with gradient colors
    const valueScale = d3.scaleLinear()
      .domain([gaugeMin, gaugeMax])
      .range([startRad, endRad])
      .clamp(true);

    const colorScale = d3.scaleLinear<string>()
      .domain([gaugeMin, (gaugeMin + gaugeMax) / 2, gaugeMax])
      .range(colors.length >= 3 ? colors : [colors[0], colors[0], colors[0]]);

    const valueArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(startRad)
      .cornerRadius(6);

    const valuePath = g.append('path')
      .attr('fill', colorScale(value));

    if (animate) {
      valuePath
        .attr('d', valueArc.endAngle(startRad) as any)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attrTween('d', function() {
          const interpolate = d3.interpolate(startRad, valueScale(value));
          return function(t) {
            return valueArc.endAngle(interpolate(t))({} as any) || '';
          };
        })
        .attrTween('fill', function() {
          const interpolate = d3.interpolate(gaugeMin, value);
          return function(t) {
            return colorScale(interpolate(t));
          };
        });
    } else {
      valuePath.attr('d', valueArc.endAngle(valueScale(value)) as any);
    }

    // Tick marks
    const tickCount = 11;
    const ticks = d3.range(tickCount).map(i => {
      const tickValue = gaugeMin + (i / (tickCount - 1)) * (gaugeMax - gaugeMin);
      const angle = valueScale(tickValue);
      return { value: tickValue, angle };
    });

    g.selectAll('.tick')
      .data(ticks)
      .enter()
      .append('line')
      .attr('class', 'tick')
      .attr('x1', d => Math.cos(d.angle - Math.PI / 2) * (radius + 5))
      .attr('y1', d => Math.sin(d.angle - Math.PI / 2) * (radius + 5))
      .attr('x2', d => Math.cos(d.angle - Math.PI / 2) * (radius + 12))
      .attr('y2', d => Math.sin(d.angle - Math.PI / 2) * (radius + 12))
      .attr('stroke', labelColor)
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Min/Max labels
    if (showLabels) {
      g.append('text')
        .attr('x', Math.cos(startRad - Math.PI / 2) * (radius + 25))
        .attr('y', Math.sin(startRad - Math.PI / 2) * (radius + 25))
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', labelSize - 2)
        .attr('opacity', 0.7)
        .text(gaugeMin);

      g.append('text')
        .attr('x', Math.cos(endRad - Math.PI / 2) * (radius + 25))
        .attr('y', Math.sin(endRad - Math.PI / 2) * (radius + 25))
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', labelSize - 2)
        .attr('opacity', 0.7)
        .text(gaugeMax);
    }

    // Center value display
    if (showValues) {
      const valueText = g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.1em')
        .attr('fill', labelColor)
        .attr('font-size', labelSize * 2.5)
        .attr('font-weight', 700);

      if (animate) {
        valueText
          .text(gaugeMin)
          .transition()
          .duration(animationDuration)
          .ease(d3.easeCubicOut)
          .tween('text', function() {
            const interpolate = d3.interpolate(gaugeMin, value);
            return function(t) {
              d3.select(this).text(Math.round(interpolate(t)));
            };
          });
      } else {
        valueText.text(Math.round(value));
      }

      // Label below value
      if (label) {
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '2em')
          .attr('fill', labelColor)
          .attr('font-size', labelSize)
          .attr('opacity', 0.7)
          .text(label);
      }
    }

    // Needle
    const needleLength = radius * 0.85;
    const needleWidth = 8;

    const needleGroup = g.append('g')
      .attr('class', 'needle');

    // Needle path
    const needlePath = needleGroup.append('path')
      .attr('fill', labelColor)
      .attr('d', `M ${-needleWidth / 2} 0 L 0 ${-needleLength} L ${needleWidth / 2} 0 Z`);

    // Needle center circle
    needleGroup.append('circle')
      .attr('r', needleWidth * 1.5)
      .attr('fill', labelColor);

    if (animate) {
      needleGroup
        .attr('transform', `rotate(${startAngle})`)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attr('transform', `rotate(${startAngle + ((value - gaugeMin) / (gaugeMax - gaugeMin)) * (endAngle - startAngle)})`);
    } else {
      const rotation = startAngle + ((value - gaugeMin) / (gaugeMax - gaugeMin)) * (endAngle - startAngle);
      needleGroup.attr('transform', `rotate(${rotation})`);
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

