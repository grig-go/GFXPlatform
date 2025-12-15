import { useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import * as d3 from 'd3';
import type { ChartType, ChartData, ChartOptions } from '@emergent-platform/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartElementProps {
  chartType: ChartType;
  data: ChartData;
  options?: ChartOptions;
  width: number;
  height: number;
  animatedProps?: Record<string, any>; // Properties from timeline keyframes
  isPlaying?: boolean;
}

/**
 * Chart Animation Properties (keyframeable):
 *
 * Data Values:
 * - chartData_0, chartData_1, ... : Animate individual data point values (dataset 0)
 * - chartData_1_0, chartData_1_1, ... : Data points for dataset 1, etc.
 *
 * Colors:
 * - chartColor_0, chartColor_1, ... : Animate bar/segment colors
 * - chartBorderColor_0, ... : Animate border colors
 *
 * Gauge Specific:
 * - gaugeValue: Animate the gauge needle value (0-100 by default)
 * - gaugeMax: Animate the maximum gauge value
 *
 * Progress Animation:
 * - chartProgress: 0-1 value that reveals data progressively (bars grow, lines draw)
 *
 * Standard Properties (inherited):
 * - opacity, scale_x, scale_y, transform
 */

// Default chart colors (broadcast-friendly vibrant colors)
const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export function ChartElement({ 
  chartType, 
  data, 
  options = {}, 
  width, 
  height,
  animatedProps,
  isPlaying = false,
}: ChartElementProps) {
  const d3Ref = useRef<SVGSVGElement>(null);
  
  // Apply animated properties from keyframes
  const containerStyle = useMemo(() => {
    if (!animatedProps || !isPlaying) return {};
    
    const style: React.CSSProperties = {};
    
    // Apply opacity if animated
    if (animatedProps.opacity !== undefined) {
      style.opacity = Number(animatedProps.opacity);
    }
    
    // Apply transform if animated
    if (animatedProps.transform) {
      style.transform = animatedProps.transform as string;
    }
    
    // Apply scale if animated
    if (animatedProps.scale_x !== undefined || animatedProps.scale_y !== undefined) {
      const scaleX = animatedProps.scale_x !== undefined ? Number(animatedProps.scale_x) : 1;
      const scaleY = animatedProps.scale_y !== undefined ? Number(animatedProps.scale_y) : 1;
      style.transform = `scale(${scaleX}, ${scaleY})${style.transform ? ` ${style.transform}` : ''}`;
    }
    
    return style;
  }, [animatedProps, isPlaying]);

  // Prepare colors
  const colors = options.colors || DEFAULT_COLORS;

  // Chart.js options with expanded styling
  const chartJsOptions = useMemo(() => {
    const fontFamily = options.fontFamily || 'Inter, sans-serif';
    // Disable Chart.js animations if keyframes are being used (keyframes control the animation)
    const hasKeyframes = animatedProps && Object.keys(animatedProps).length > 0;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: (options.animated !== false && !hasKeyframes) ? {
        duration: options.animationDuration || 1000,
        easing: (options.animationEasing || 'easeOutQuart') as any,
      } : false,
      plugins: {
        legend: {
          display: options.showLegend ?? true,
          position: (options.legendPosition || 'top') as any,
          labels: {
            color: options.legendColor || '#FFFFFF',
            font: { 
              size: options.legendFontSize || 12, 
              family: fontFamily,
              weight: options.legendFontWeight || 'normal',
            },
          },
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          color: options.titleColor || '#FFFFFF',
          font: { 
            size: options.titleFontSize || 16, 
            family: fontFamily, 
            weight: (options.titleFontWeight || 'bold') as any,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: options.labelFontSize || 14, family: fontFamily },
          bodyFont: { size: options.valueFontSize || 12, family: fontFamily },
          titleColor: options.labelColor || '#FFFFFF',
          bodyColor: options.valueColor || '#FFFFFF',
        },
      },
      scales: chartType === 'bar' || chartType === 'line' || chartType === 'area' || chartType === 'horizontal-bar' ? {
        x: {
          display: options.showXAxis !== false,
          ticks: { 
            color: options.axisColor || '#9CA3AF',
            font: { size: options.axisFontSize || 12, family: fontFamily },
          },
          grid: { 
            display: options.showGrid !== false,
            color: options.gridColor || 'rgba(255,255,255,0.1)',
            lineWidth: options.gridLineWidth || 1,
          },
          border: {
            display: options.showXAxis !== false,
            color: options.axisLineColor || 'rgba(255,255,255,0.2)',
            width: options.axisLineWidth || 1,
          },
        },
        y: {
          display: options.showYAxis !== false,
          ticks: { 
            color: options.axisColor || '#9CA3AF',
            font: { size: options.axisFontSize || 12, family: fontFamily },
          },
          grid: { 
            display: options.showGrid !== false,
            color: options.gridColor || 'rgba(255,255,255,0.1)',
            lineWidth: options.gridLineWidth || 1,
          },
          border: {
            display: options.showYAxis !== false,
            color: options.axisLineColor || 'rgba(255,255,255,0.2)',
            width: options.axisLineWidth || 1,
          },
        },
      } : undefined,
    };
  // Use JSON.stringify for deep comparison of options object
  }, [chartType, JSON.stringify(options)]);

  // Extract animated chart progress (0-1 value for progressive reveal)
  // Priority: 1) animatedProps when playing, 2) options.chartProgress for direct control, 3) default to 1
  const chartProgress = useMemo(() => {
    // When playing animation, use animated value
    if (animatedProps && isPlaying && animatedProps.chartProgress !== undefined) {
      return Math.max(0, Math.min(1, Number(animatedProps.chartProgress)));
    }
    // When not playing, use options.chartProgress for direct slider control
    if (options.chartProgress !== undefined) {
      return Math.max(0, Math.min(1, Number(options.chartProgress)));
    }
    return 1;
  }, [animatedProps, isPlaying, options.chartProgress]);

  // Prepare Chart.js data with per-bar/dataset colors and animated values
  const chartJsData = useMemo(() => {
    // Validate data structure - return empty chart data if invalid
    if (!data || !Array.isArray(data.datasets) || data.datasets.length === 0) {
      return {
        labels: data?.labels || [],
        datasets: [{
          label: 'No Data',
          data: [],
          backgroundColor: colors[0],
        }],
      };
    }

    const datasetsWithColors = data.datasets.map((ds, datasetIdx) => {
      // Use dataset-specific colors if provided
      const datasetColorConfig = options.datasetColors?.[datasetIdx];

      // Get animated data values for this dataset
      let animatedData: number[] | undefined;
      if (animatedProps && isPlaying && Array.isArray(ds.data)) {
        animatedData = ds.data.map((originalValue, valueIdx) => {
          // Check for dataset-specific key first: chartData_1_0 (dataset 1, value 0)
          const datasetKey = `chartData_${datasetIdx}_${valueIdx}`;
          // Fallback to simple key for dataset 0: chartData_0
          const simpleKey = datasetIdx === 0 ? `chartData_${valueIdx}` : null;

          let value = originalValue as number;

          if (animatedProps[datasetKey] !== undefined) {
            value = Number(animatedProps[datasetKey]);
          } else if (simpleKey && animatedProps[simpleKey] !== undefined) {
            value = Number(animatedProps[simpleKey]);
          }

          // Apply chart progress (scale value from 0 to target)
          if (chartProgress < 1) {
            value = value * chartProgress;
          }

          return value;
        });
      } else if (chartProgress < 1 && Array.isArray(ds.data)) {
        // Apply progress even when not playing if progress is animated
        animatedData = ds.data.map(v => (v as number) * chartProgress);
      }

      // For bar charts, use per-bar colors if provided
      let backgroundColor: string | string[] | undefined;
      if (chartType === 'bar' || chartType === 'horizontal-bar') {
        if (options.barColors && options.barColors.length > 0) {
          // Use per-bar colors, apply animated colors if available
          backgroundColor = options.barColors.map((color, idx) => {
            const animKey = `chartColor_${idx}`;
            return (animatedProps && isPlaying && animatedProps[animKey])
              ? String(animatedProps[animKey])
              : color;
          });
        } else if (datasetColorConfig?.backgroundColor) {
          backgroundColor = datasetColorConfig.backgroundColor;
        } else if (ds.backgroundColor) {
          backgroundColor = ds.backgroundColor;
        } else {
          backgroundColor = colors[datasetIdx % colors.length];
        }
      } else if (chartType === 'pie' || chartType === 'donut') {
        // For pie/donut, use array of colors with animation support
        const baseColors = (options.barColors && options.barColors.length > 0)
          ? options.barColors
          : colors;
        backgroundColor = baseColors.map((color, idx) => {
          const animKey = `chartColor_${idx}`;
          return (animatedProps && isPlaying && animatedProps[animKey])
            ? String(animatedProps[animKey])
            : color;
        });
      } else {
        // For line/area, use single color
        if (datasetColorConfig?.backgroundColor) {
          backgroundColor = datasetColorConfig.backgroundColor;
        } else if (ds.backgroundColor) {
          backgroundColor = ds.backgroundColor;
        } else {
          backgroundColor = colors[datasetIdx % colors.length];
        }
        // Check for animated color
        const animColorKey = `chartColor_${datasetIdx}`;
        if (animatedProps && isPlaying && animatedProps[animColorKey]) {
          backgroundColor = String(animatedProps[animColorKey]);
        }
      }

      let borderColor: string | string[] | undefined;
      if (datasetColorConfig?.borderColor) {
        borderColor = datasetColorConfig.borderColor;
      } else if (ds.borderColor) {
        borderColor = ds.borderColor;
      } else if (chartType === 'line' || chartType === 'area') {
        borderColor = colors[datasetIdx % colors.length];
      } else {
        borderColor = 'transparent';
      }

      // Check for animated border color
      const animBorderKey = `chartBorderColor_${datasetIdx}`;
      if (animatedProps && isPlaying && animatedProps[animBorderKey]) {
        borderColor = String(animatedProps[animBorderKey]);
      }

      return {
        ...ds,
        data: animatedData || ds.data,
        backgroundColor,
        borderColor,
        borderWidth: ds.borderWidth ?? options.barBorderWidth ?? 2,
        borderRadius: options.barBorderRadius ?? 0,
        borderSkipped: false,
        fill: chartType === 'area' ? {
          target: 'origin',
          above: options.areaOpacity !== undefined
            ? `rgba(59, 130, 246, ${options.areaOpacity})`
            : (options.backgroundColor || 'rgba(59, 130, 246, 0.3)'),
        } : false,
        tension: chartType === 'line' || chartType === 'area'
          ? (options.lineTension ?? 0.4)
          : 0,
        pointRadius: options.pointRadius ?? (chartType === 'line' || chartType === 'area' ? 4 : 0),
        pointHoverRadius: options.pointHoverRadius ?? 6,
        pointBackgroundColor: borderColor,
        pointBorderColor: borderColor,
        pointBorderWidth: 2,
      };
    });

    return {
      labels: data.labels,
      datasets: datasetsWithColors,
    };
  }, [data, colors, chartType, options, animatedProps, isPlaying, chartProgress]);

  // Render D3 gauge chart
  useEffect(() => {
    if (chartType !== 'gauge' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    // Safely access gauge value with fallbacks, supporting animated gaugeValue
    const rawGaugeValue = data?.datasets?.[0]?.data?.[0];
    let gaugeValue = options.gaugeValue ?? (
      typeof rawGaugeValue === 'number' ? rawGaugeValue : 0
    );

    // Apply animated gauge value if available
    if (animatedProps && isPlaying && animatedProps.gaugeValue !== undefined) {
      gaugeValue = Number(animatedProps.gaugeValue);
    }

    // Apply chart progress to gauge value
    if (chartProgress < 1) {
      gaugeValue = gaugeValue * chartProgress;
    }

    let gaugeMax = options.gaugeMax ?? 100;
    // Support animated gaugeMax
    if (animatedProps && isPlaying && animatedProps.gaugeMax !== undefined) {
      gaugeMax = Number(animatedProps.gaugeMax);
    }

    const percentage = Math.min(gaugeValue / gaugeMax, 1);

    const centerX = width / 2;
    const centerY = height * 0.6;
    const radius = Math.min(width, height) * 0.4;
    const thickness = radius * 0.25;

    // Background arc
    const arcBg = d3.arc()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75)
      .cornerRadius(thickness / 2);

    svg.append('path')
      .attr('d', arcBg as any)
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('fill', 'rgba(255,255,255,0.1)');

    // Value arc
    const arcValue = d3.arc()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(-Math.PI * 0.75 + (Math.PI * 1.5 * percentage))
      .cornerRadius(thickness / 2);

    // Create gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'gaugeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colors[0]);
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colors[1] || colors[0]);

    svg.append('path')
      .attr('d', arcValue as any)
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('fill', 'url(#gaugeGradient)');

    // Value text
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', radius * 0.4)
      .attr('font-weight', 'bold')
      .attr('font-family', 'Inter, sans-serif')
      .text(Math.round(gaugeValue));

    // Label
    if (options.title) {
      svg.append('text')
        .attr('x', centerX)
        .attr('y', centerY + radius * 0.35)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .attr('font-size', 14)
        .attr('font-family', 'Inter, sans-serif')
        .text(options.title);
    }

    // Min/Max labels
    svg.append('text')
      .attr('x', centerX - radius * 0.7)
      .attr('y', centerY + radius * 0.15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', 12)
      .attr('font-family', 'Inter, sans-serif')
      .text('0');

    svg.append('text')
      .attr('x', centerX + radius * 0.7)
      .attr('y', centerY + radius * 0.15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', 12)
      .attr('font-family', 'Inter, sans-serif')
      .text(gaugeMax.toString());

  }, [chartType, data, options, width, height, colors, animatedProps, isPlaying, chartProgress]);

  // Render D3 candlestick chart
  useEffect(() => {
    if (chartType !== 'candlestick' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Get OHLC data
    const ohlcData = data?.datasets?.[0]?.data as any[] || [];
    const labels = data?.labels || [];

    if (ohlcData.length === 0) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .text('No candlestick data');
      return;
    }

    // Calculate min/max for y scale
    const allValues = ohlcData.flatMap(d => [d.open, d.high, d.low, d.close].filter(v => typeof v === 'number'));
    const yMin = Math.min(...allValues) * 0.95;
    const yMax = Math.max(...allValues) * 1.05;

    // Scales
    const xScale = d3.scaleBand()
      .domain(labels)
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // Colors
    const upColor = options.upColor || '#22C55E';
    const downColor = options.downColor || '#EF4444';
    const wickColor = options.wickColor || '#9CA3AF';

    // Apply chartProgress - show only a portion of candles
    const candlesToShow = Math.ceil(ohlcData.length * chartProgress);

    // Draw candlesticks
    ohlcData.slice(0, candlesToShow).forEach((d, i) => {
      const x = xScale(labels[i]) || 0;
      const candleWidth = xScale.bandwidth();
      const isUp = d.close >= d.open;
      const color = isUp ? upColor : downColor;

      // Wick (high-low line)
      g.append('line')
        .attr('x1', x + candleWidth / 2)
        .attr('x2', x + candleWidth / 2)
        .attr('y1', yScale(d.high))
        .attr('y2', yScale(d.low))
        .attr('stroke', wickColor)
        .attr('stroke-width', 1);

      // Candle body
      const bodyTop = Math.min(yScale(d.open), yScale(d.close));
      const bodyHeight = Math.abs(yScale(d.open) - yScale(d.close)) || 1;

      g.append('rect')
        .attr('x', x)
        .attr('y', bodyTop)
        .attr('width', candleWidth)
        .attr('height', bodyHeight)
        .attr('fill', color)
        .attr('rx', 2);
    });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', options.axisColor || '#9CA3AF')
      .attr('font-size', 10);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', options.axisColor || '#9CA3AF')
      .attr('font-size', 10);

    // Grid lines
    if (options.showGrid !== false) {
      g.selectAll('.grid-line')
        .data(yScale.ticks(5))
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', options.gridColor || 'rgba(255,255,255,0.1)')
        .attr('stroke-dasharray', '2,2');
    }

  }, [chartType, data, options, width, height, colors, chartProgress]);

  // Render D3 index chart (normalized line chart)
  useEffect(() => {
    if (chartType !== 'index-chart' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const datasets = data?.datasets || [];
    const labels = data?.labels || [];

    if (datasets.length === 0 || labels.length === 0) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .text('No index data');
      return;
    }

    // Normalize data to base value (default 100)
    const baseValue = options.indexBaseValue || 100;
    const normalizedData = datasets.map(ds => {
      const values = ds.data as number[];
      const firstValue = values[0] || 1;
      return {
        label: ds.label || 'Series',
        data: values.map(v => (v / firstValue) * baseValue),
      };
    });

    // Calculate y domain
    const allNormalized = normalizedData.flatMap(d => d.data);
    const yMin = Math.min(...allNormalized) * 0.95;
    const yMax = Math.max(...allNormalized) * 1.05;

    // Scales
    const xScale = d3.scalePoint()
      .domain(labels)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // Apply chartProgress - show only a portion of data points
    const pointsToShow = Math.ceil(labels.length * chartProgress);
    const visibleLabels = labels.slice(0, pointsToShow);

    // Line generator for visible data
    const line = d3.line<number>()
      .x((_, i) => xScale(visibleLabels[i]) || 0)
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    // Draw lines for each dataset
    normalizedData.forEach((dataset, idx) => {
      const color = colors[idx % colors.length];
      const visibleData = dataset.data.slice(0, pointsToShow);

      if (visibleData.length > 0) {
        g.append('path')
          .datum(visibleData)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', line);

        // Add label at the end of visible data
        const lastValue = visibleData[visibleData.length - 1];
        const lastLabelIndex = visibleData.length - 1;
        g.append('text')
          .attr('x', (xScale(visibleLabels[lastLabelIndex]) || 0) + 5)
          .attr('y', yScale(lastValue))
          .attr('fill', color)
          .attr('font-size', 11)
          .attr('dominant-baseline', 'middle')
          .text(`${dataset.label}: ${lastValue.toFixed(1)}`);
      }
    });

    // Base line at 100
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(baseValue))
      .attr('y2', yScale(baseValue))
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-dasharray', '4,4');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', options.axisColor || '#9CA3AF')
      .attr('font-size', 10);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', options.axisColor || '#9CA3AF')
      .attr('font-size', 10);

  }, [chartType, data, options, width, height, colors, chartProgress]);

  // Render D3 parliament chart (semicircle seating)
  useEffect(() => {
    if (chartType !== 'parliament' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const labels = data?.labels || [];
    const values = (data?.datasets?.[0]?.data as number[]) || [];
    const totalSeats = values.reduce((a, b) => a + b, 0);

    if (totalSeats === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .text('No parliament data');
      return;
    }

    // Options for new features
    const isFlipped = options.flipped === true;
    const showPartyBreakdown = options.showPartyBreakdown === true;
    const breakdownFontSize = options.breakdownFontSize || 48;
    const breakdownLabelSize = options.breakdownLabelSize || 14;

    // Adjust layout based on whether party breakdown is shown
    const breakdownHeight = showPartyBreakdown ? 80 : 0;
    const availableHeight = height - breakdownHeight;

    const centerX = width / 2;
    // For flipped version, center is near the top; for normal, near the bottom
    const centerY = isFlipped
      ? (showPartyBreakdown ? breakdownHeight + availableHeight * 0.15 : height * 0.15)
      : (showPartyBreakdown ? breakdownHeight + availableHeight * 0.85 : height * 0.85);

    const outerRadius = Math.min(width * 0.45, availableHeight * 0.7);
    const seatRadius = options.seatRadius || 8;
    const rowHeight = options.rowHeight || seatRadius * 2.5;
    const partyColors = options.partyColors || colors;

    // Calculate number of rows needed
    const rows: { radius: number; seatsCapacity: number }[] = [];
    let currentRadius = outerRadius;
    let totalCapacity = 0;

    while (totalCapacity < totalSeats && currentRadius > seatRadius * 3) {
      const circumference = Math.PI * currentRadius;
      const seatsInRow = Math.floor(circumference / (seatRadius * 2.5));
      rows.push({ radius: currentRadius, seatsCapacity: seatsInRow });
      totalCapacity += seatsInRow;
      currentRadius -= rowHeight;
    }

    // Reverse rows so inner rows are first (front rows)
    rows.reverse();

    // Calculate cumulative seat counts for each party (for proper sector filling)
    const cumulativeSeatCounts: number[] = [];
    let cumulative = 0;
    values.forEach((val) => {
      cumulative += val;
      cumulativeSeatCounts.push(cumulative);
    });

    // First pass: generate all seat positions (without party assignment yet)
    type SeatPosition = { x: number; y: number; angle: number; row: number; indexInRow: number };
    const seatPositions: SeatPosition[] = [];
    let seatsPlaced = 0;

    rows.forEach((row, rowIndex) => {
      const seatsNeeded = Math.min(row.seatsCapacity, totalSeats - seatsPlaced);

      for (let i = 0; i < seatsNeeded; i++) {
        // Angle from left (PI) to right (0) - evenly spaced in this row
        const t = seatsNeeded > 1 ? i / (seatsNeeded - 1) : 0.5;
        const angle = Math.PI * (1 - t); // PI (left) to 0 (right)

        const x = centerX + row.radius * Math.cos(angle);
        // For flipped version, add to centerY instead of subtract
        const y = isFlipped
          ? centerY + row.radius * Math.sin(angle)
          : centerY - row.radius * Math.sin(angle);

        seatPositions.push({ x, y, angle, row: rowIndex, indexInRow: i });
        seatsPlaced++;
      }
    });

    // Sort all seats by angle (from left PI to right 0) to ensure consistent party assignment
    seatPositions.sort((a, b) => b.angle - a.angle);

    // Assign parties based on sorted order (first N seats to party 1, next M to party 2, etc.)
    type SeatType = { x: number; y: number; partyIndex: number; angle: number };
    const seats: SeatType[] = seatPositions.map((pos, globalIndex) => {
      // Determine party based on global seat index
      let partyIndex = 0;
      for (let p = 0; p < cumulativeSeatCounts.length; p++) {
        if (globalIndex < cumulativeSeatCounts[p]) {
          partyIndex = p;
          break;
        }
      }
      return { x: pos.x, y: pos.y, partyIndex, angle: pos.angle };
    });

    // Apply chartProgress to show only a fraction of seats
    const seatsToShow = Math.round(seats.length * chartProgress);
    const visibleSeats = seats.slice(0, seatsToShow);

    // Draw seats
    svg.selectAll('circle.seat')
      .data(visibleSeats)
      .enter()
      .append('circle')
      .attr('class', 'seat')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', seatRadius)
      .attr('fill', d => partyColors[d.partyIndex % partyColors.length]);

    // Party breakdown labels (like "Democrats 51" on left, "Republicans 49" on right)
    if (showPartyBreakdown && labels.length >= 2) {
      // Calculate animated values for display
      const animatedValues = values.map(v => Math.round(v * chartProgress));

      // Left party (first party)
      const leftPartyColor = partyColors[0] || colors[0];
      svg.append('text')
        .attr('x', 30)
        .attr('y', 25)
        .attr('fill', '#9CA3AF')
        .attr('font-size', breakdownLabelSize)
        .attr('font-family', 'Inter, sans-serif')
        .text(labels[0]);

      svg.append('text')
        .attr('x', 30)
        .attr('y', 25 + breakdownFontSize * 0.9)
        .attr('fill', leftPartyColor)
        .attr('font-size', breakdownFontSize)
        .attr('font-weight', 'bold')
        .attr('font-family', 'Inter, sans-serif')
        .text(animatedValues[0].toString());

      // Right party (second party) - align to right
      const rightPartyColor = partyColors[1] || colors[1];
      svg.append('text')
        .attr('x', width - 30)
        .attr('y', 25)
        .attr('text-anchor', 'end')
        .attr('fill', '#9CA3AF')
        .attr('font-size', breakdownLabelSize)
        .attr('font-family', 'Inter, sans-serif')
        .text(labels[1]);

      svg.append('text')
        .attr('x', width - 30)
        .attr('y', 25 + breakdownFontSize * 0.9)
        .attr('text-anchor', 'end')
        .attr('fill', rightPartyColor)
        .attr('font-size', breakdownFontSize)
        .attr('font-weight', 'bold')
        .attr('font-family', 'Inter, sans-serif')
        .text(animatedValues[1].toString());

      // If there are more than 2 parties, show them in the middle area
      if (labels.length > 2) {
        const middleStartX = width * 0.35;
        const middleWidth = width * 0.3;
        const extraParties = labels.slice(2);
        const spacing = middleWidth / (extraParties.length + 1);

        extraParties.forEach((label, i) => {
          const partyIndex = i + 2;
          const xPos = middleStartX + spacing * (i + 1);
          const color = partyColors[partyIndex] || colors[partyIndex % colors.length];

          svg.append('text')
            .attr('x', xPos)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('fill', '#9CA3AF')
            .attr('font-size', breakdownLabelSize * 0.9)
            .attr('font-family', 'Inter, sans-serif')
            .text(label);

          svg.append('text')
            .attr('x', xPos)
            .attr('y', 25 + breakdownFontSize * 0.6)
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('font-size', breakdownFontSize * 0.6)
            .attr('font-weight', 'bold')
            .attr('font-family', 'Inter, sans-serif')
            .text(animatedValues[partyIndex].toString());
        });
      }
    }

    // Legend
    if (options.showLegend !== false) {
      const legendY = height - 30;
      let legendX = 20;

      labels.forEach((label, i) => {
        svg.append('circle')
          .attr('cx', legendX)
          .attr('cy', legendY)
          .attr('r', 6)
          .attr('fill', partyColors[i % partyColors.length]);

        svg.append('text')
          .attr('x', legendX + 12)
          .attr('y', legendY + 4)
          .attr('fill', '#FFFFFF')
          .attr('font-size', 11)
          .text(`${label}: ${values[i]}`);

        legendX += 100;
      });
    }

    // Balance of Power Bar
    if (options.showBalanceOfPower) {
      const barHeight = options.balanceBarHeight || 28;
      // Use custom Y position if provided, otherwise calculate default based on legend visibility
      const defaultBarY = options.showLegend !== false ? height - 70 : height - 50;
      const barY = options.balanceBarY !== undefined ? options.balanceBarY : defaultBarY;
      const barPadding = options.balanceBarPadding !== undefined ? options.balanceBarPadding : 20;
      const barWidth = width - barPadding * 2;
      const majority = Math.ceil(totalSeats / 2);

      // Background bar
      svg.append('rect')
        .attr('x', barPadding)
        .attr('y', barY)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', '#E5E7EB')
        .attr('rx', 2);

      // Draw each party's segment (scaled by chartProgress)
      let currentX = barPadding;
      values.forEach((value, i) => {
        // Apply chartProgress to segment width
        const animatedValue = Math.round(value * chartProgress);
        const segmentWidth = (animatedValue / totalSeats) * barWidth;

        if (segmentWidth > 0) {
          svg.append('rect')
            .attr('x', currentX)
            .attr('y', barY)
            .attr('width', segmentWidth)
            .attr('height', barHeight)
            .attr('fill', partyColors[i % partyColors.length])
            .attr('rx', i === 0 ? 2 : 0);

          // Add seat count label inside segment if wide enough
          if (segmentWidth > 30) {
            svg.append('text')
              .attr('x', currentX + segmentWidth / 2)
              .attr('y', barY + barHeight / 2 + 4)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 12)
              .attr('font-weight', 'bold')
              .attr('font-family', 'Inter, sans-serif')
              .text(animatedValue.toString());
          }
        }

        currentX += segmentWidth;
      });

      // Majority line
      const majorityX = barPadding + (majority / totalSeats) * barWidth;
      svg.append('line')
        .attr('x1', majorityX)
        .attr('x2', majorityX)
        .attr('y1', barY - 5)
        .attr('y2', barY + barHeight + 5)
        .attr('stroke', '#374151')
        .attr('stroke-width', 2);

      // Majority label
      svg.append('text')
        .attr('x', majorityX)
        .attr('y', barY + barHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6B7280')
        .attr('font-size', 10)
        .attr('font-family', 'Inter, sans-serif')
        .text('MAJORITY');

      // Title above bar (optional)
      if (options.balanceTitle) {
        svg.append('text')
          .attr('x', barPadding)
          .attr('y', barY - 8)
          .attr('fill', '#FFFFFF')
          .attr('font-size', 11)
          .attr('font-family', 'Inter, sans-serif')
          .text(options.balanceTitle);
      }
    }

  }, [chartType, data, options, width, height, colors, chartProgress]);

  // Render D3 soccer field
  useEffect(() => {
    if (chartType !== 'soccer-field' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const isDark = options.theme !== 'light';
    const fieldColor = options.fieldColor || (isDark ? '#1a472a' : '#4ade80');
    const lineColor = options.lineColor || '#FFFFFF';
    const lineWidth = 2;

    // Field dimensions (standard 105x68 ratio)
    const margin = 20;
    const fieldWidth = width - margin * 2;
    const fieldHeight = height - margin * 2;

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', fieldColor);

    const g = svg.append('g')
      .attr('transform', `translate(${margin},${margin})`);

    // Field outline
    g.append('rect')
      .attr('width', fieldWidth)
      .attr('height', fieldHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center line
    g.append('line')
      .attr('x1', fieldWidth / 2)
      .attr('x2', fieldWidth / 2)
      .attr('y1', 0)
      .attr('y2', fieldHeight)
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center circle
    const centerRadius = fieldWidth * 0.087; // ~9.15m on 105m pitch
    g.append('circle')
      .attr('cx', fieldWidth / 2)
      .attr('cy', fieldHeight / 2)
      .attr('r', centerRadius)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center spot
    g.append('circle')
      .attr('cx', fieldWidth / 2)
      .attr('cy', fieldHeight / 2)
      .attr('r', 3)
      .attr('fill', lineColor);

    // Penalty areas (both ends)
    const penaltyWidth = fieldWidth * 0.157; // ~16.5m
    const penaltyHeight = fieldHeight * 0.603; // ~40.3m
    const penaltyY = (fieldHeight - penaltyHeight) / 2;

    // Left penalty area
    g.append('rect')
      .attr('x', 0)
      .attr('y', penaltyY)
      .attr('width', penaltyWidth)
      .attr('height', penaltyHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Right penalty area
    g.append('rect')
      .attr('x', fieldWidth - penaltyWidth)
      .attr('y', penaltyY)
      .attr('width', penaltyWidth)
      .attr('height', penaltyHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Goal areas (6-yard boxes)
    const goalAreaWidth = fieldWidth * 0.052; // ~5.5m
    const goalAreaHeight = fieldHeight * 0.265; // ~18.32m (goal width)
    const goalAreaY = (fieldHeight - goalAreaHeight) / 2;

    g.append('rect')
      .attr('x', 0)
      .attr('y', goalAreaY)
      .attr('width', goalAreaWidth)
      .attr('height', goalAreaHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    g.append('rect')
      .attr('x', fieldWidth - goalAreaWidth)
      .attr('y', goalAreaY)
      .attr('width', goalAreaWidth)
      .attr('height', goalAreaHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Penalty spots
    const penaltySpotX = fieldWidth * 0.105; // ~11m
    g.append('circle')
      .attr('cx', penaltySpotX)
      .attr('cy', fieldHeight / 2)
      .attr('r', 3)
      .attr('fill', lineColor);

    g.append('circle')
      .attr('cx', fieldWidth - penaltySpotX)
      .attr('cy', fieldHeight / 2)
      .attr('r', 3)
      .attr('fill', lineColor);

    // Penalty arcs
    const penaltyArc = d3.arc()
      .innerRadius(centerRadius)
      .outerRadius(centerRadius)
      .startAngle(-0.93)
      .endAngle(0.93);

    g.append('path')
      .attr('d', penaltyArc as any)
      .attr('transform', `translate(${penaltySpotX},${fieldHeight / 2})`)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    g.append('path')
      .attr('d', penaltyArc as any)
      .attr('transform', `translate(${fieldWidth - penaltySpotX},${fieldHeight / 2}) rotate(180)`)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Corner arcs
    const cornerRadius = fieldWidth * 0.0095; // ~1m
    [
      [0, 0, 0],
      [fieldWidth, 0, 90],
      [0, fieldHeight, -90],
      [fieldWidth, fieldHeight, 180],
    ].forEach(([x, y, rotation]) => {
      g.append('path')
        .attr('d', d3.arc()
          .innerRadius(cornerRadius)
          .outerRadius(cornerRadius)
          .startAngle(0)
          .endAngle(Math.PI / 2) as any)
        .attr('transform', `translate(${x},${y}) rotate(${rotation})`)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth);
    });

    // Render data points (player positions, events, etc.)
    // Data format: datasets[0].data = [{ x: 0-100, y: 0-100, label?, number?, color?, size? }, ...]
    const dataPoints = data?.datasets?.[0]?.data as any[] || [];
    const defaultPointColor = options.pointColor || '#000000';
    const goalieColor = options.goalieColor || '#FFD700';
    const defaultPointSize = options.pointSize || 12;
    const showLabels = options.showPointLabels !== false;
    const showNumbers = options.showPointNumbers !== false;
    const pointStyle = options.pointStyle || 'circle'; // circle, jersey, dot

    // Helper to get color - uses goalie color for GK positions
    const getPointColor = (point: any) => {
      if (point.color) return point.color;
      const label = (point.label || '').toLowerCase();
      if (label === 'gk' || label === 'goalie' || label === 'goalkeeper') {
        return goalieColor;
      }
      return defaultPointColor;
    };

    if (dataPoints.length > 0) {
      const pointsGroup = g.append('g').attr('class', 'data-points');

      dataPoints.forEach((point, idx) => {
        if (typeof point !== 'object' || point.x === undefined || point.y === undefined) return;

        // Convert 0-100 coordinates to field coordinates
        const px = (point.x / 100) * fieldWidth;
        const py = (point.y / 100) * fieldHeight;
        const pointColor = getPointColor(point);
        const pointSize = point.size || defaultPointSize;

        if (pointStyle === 'jersey') {
          // Jersey/shirt style with number
          const jerseyGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          // Jersey body (rounded rectangle)
          jerseyGroup.append('rect')
            .attr('x', -pointSize * 0.7)
            .attr('y', -pointSize * 0.8)
            .attr('width', pointSize * 1.4)
            .attr('height', pointSize * 1.6)
            .attr('rx', pointSize * 0.3)
            .attr('fill', pointColor)
            .attr('stroke', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
            .attr('stroke-width', 1);

          // Number on jersey
          if (showNumbers && point.number !== undefined) {
            jerseyGroup.append('text')
              .attr('x', 0)
              .attr('y', pointSize * 0.15)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', isDark ? '#FFFFFF' : '#000000')
              .attr('font-size', pointSize * 0.8)
              .attr('font-weight', 'bold')
              .attr('font-family', 'Inter, sans-serif')
              .text(point.number);
          }

          // Label below jersey
          if (showLabels && point.label) {
            jerseyGroup.append('text')
              .attr('x', 0)
              .attr('y', pointSize * 1.2)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        } else if (pointStyle === 'dot') {
          // Simple dot - smaller size, still supports labels
          const dotGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          dotGroup.append('circle')
            .attr('r', pointSize / 3)
            .attr('fill', pointColor);

          // Label below dot
          if (showLabels && point.label) {
            dotGroup.append('text')
              .attr('y', pointSize / 3 + 10)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        } else {
          // Default circle with optional label and number
          const circleGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          circleGroup.append('circle')
            .attr('r', pointSize / 2)
            .attr('fill', pointColor)
            .attr('stroke', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
            .attr('stroke-width', 2);

          // Number inside circle
          if (showNumbers && point.number !== undefined) {
            circleGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', isDark ? '#FFFFFF' : '#000000')
              .attr('font-size', pointSize * 0.5)
              .attr('font-weight', 'bold')
              .attr('font-family', 'Inter, sans-serif')
              .text(point.number);
          }

          // Label below
          if (showLabels && point.label) {
            circleGroup.append('text')
              .attr('y', pointSize / 2 + 12)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        }
      });
    }

    // Legend for soccer field - show unique point labels/colors
    if (options.showLegend !== false && dataPoints.length > 0) {
      const legendPosition = options.legendPosition || 'bottom';
      const legendColor = options.legendColor || '#FFFFFF';
      const legendFontSize = options.legendFontSize || 12;

      // Get unique colors/labels from data points
      const uniqueEntries: { color: string; label: string }[] = [];
      const seenLabels = new Set<string>();

      dataPoints.forEach((point) => {
        if (point.label && !seenLabels.has(point.label)) {
          seenLabels.add(point.label);
          uniqueEntries.push({
            color: getPointColor(point),
            label: point.label,
          });
        }
      });

      if (uniqueEntries.length > 0) {
        const legendGroup = svg.append('g').attr('class', 'legend');

        if (legendPosition === 'top') {
          let legendX = margin;
          uniqueEntries.forEach((entry, i) => {
            legendGroup.append('circle')
              .attr('cx', legendX + 6)
              .attr('cy', 12)
              .attr('r', 6)
              .attr('fill', entry.color);

            legendGroup.append('text')
              .attr('x', legendX + 18)
              .attr('y', 16)
              .attr('fill', legendColor)
              .attr('font-size', legendFontSize)
              .attr('font-family', 'Inter, sans-serif')
              .text(entry.label);

            legendX += entry.label.length * 7 + 40;
          });
        } else {
          // Bottom legend (default)
          let legendX = margin;
          const legendY = height - 12;

          uniqueEntries.forEach((entry, i) => {
            legendGroup.append('circle')
              .attr('cx', legendX + 6)
              .attr('cy', legendY)
              .attr('r', 6)
              .attr('fill', entry.color);

            legendGroup.append('text')
              .attr('x', legendX + 18)
              .attr('y', legendY + 4)
              .attr('fill', legendColor)
              .attr('font-size', legendFontSize)
              .attr('font-family', 'Inter, sans-serif')
              .text(entry.label);

            legendX += entry.label.length * 7 + 40;
          });
        }
      }
    }

  }, [chartType, data, options, width, height]);

  // Render D3 basketball court (half court)
  useEffect(() => {
    if (chartType !== 'basketball-court' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const isDark = options.theme !== 'light';
    const courtColor = options.fieldColor || (isDark ? '#2a1810' : '#cd853f');
    const lineColor = options.lineColor || '#FFFFFF';
    const lineWidth = 2;

    // Half court dimensions (NBA: 47x50 feet, using half = 47x25)
    const margin = 20;
    const courtWidth = width - margin * 2;
    const courtHeight = height - margin * 2;

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', courtColor);

    const g = svg.append('g')
      .attr('transform', `translate(${margin},${margin})`);

    // Court outline
    g.append('rect')
      .attr('width', courtWidth)
      .attr('height', courtHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Three-point line (arc + corners)
    const threePointRadius = courtWidth * 0.485; // ~23.75 feet
    const threePointCornerLength = courtHeight * 0.28; // Corner three length

    // Three-point arc
    const threePointArc = d3.arc()
      .innerRadius(threePointRadius)
      .outerRadius(threePointRadius)
      .startAngle(-Math.PI / 2 + 0.4)
      .endAngle(Math.PI / 2 - 0.4);

    g.append('path')
      .attr('d', threePointArc as any)
      .attr('transform', `translate(${courtWidth * 0.057},${courtHeight / 2})`)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Three-point corner lines
    g.append('line')
      .attr('x1', 0)
      .attr('x2', courtWidth * 0.28)
      .attr('y1', threePointCornerLength)
      .attr('y2', threePointCornerLength)
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    g.append('line')
      .attr('x1', 0)
      .attr('x2', courtWidth * 0.28)
      .attr('y1', courtHeight - threePointCornerLength)
      .attr('y2', courtHeight - threePointCornerLength)
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Paint/Key area
    const keyWidth = courtWidth * 0.38; // ~19 feet
    const keyHeight = courtHeight * 0.32; // ~16 feet
    const keyY = (courtHeight - keyHeight) / 2;

    g.append('rect')
      .attr('x', 0)
      .attr('y', keyY)
      .attr('width', keyWidth)
      .attr('height', keyHeight)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Free throw circle
    const ftRadius = keyHeight / 2;
    g.append('circle')
      .attr('cx', keyWidth)
      .attr('cy', courtHeight / 2)
      .attr('r', ftRadius)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Restricted area (semicircle under basket)
    const restrictedRadius = courtWidth * 0.085; // ~4 feet
    const restrictedArc = d3.arc()
      .innerRadius(restrictedRadius)
      .outerRadius(restrictedRadius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('d', restrictedArc as any)
      .attr('transform', `translate(${courtWidth * 0.057},${courtHeight / 2})`)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Basket
    const basketX = courtWidth * 0.057;
    const rimRadius = courtWidth * 0.019; // ~9 inches

    // Backboard
    g.append('line')
      .attr('x1', basketX - courtWidth * 0.015)
      .attr('x2', basketX - courtWidth * 0.015)
      .attr('y1', courtHeight / 2 - courtHeight * 0.06)
      .attr('y2', courtHeight / 2 + courtHeight * 0.06)
      .attr('stroke', lineColor)
      .attr('stroke-width', 3);

    // Rim
    g.append('circle')
      .attr('cx', basketX)
      .attr('cy', courtHeight / 2)
      .attr('r', rimRadius)
      .attr('fill', 'none')
      .attr('stroke', '#EF4444')
      .attr('stroke-width', 2);

    // Center court line (at bottom for half court)
    g.append('line')
      .attr('x1', courtWidth)
      .attr('x2', courtWidth)
      .attr('y1', 0)
      .attr('y2', courtHeight)
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Center circle (half)
    const centerRadius = courtHeight * 0.12; // ~6 feet
    const centerArc = d3.arc()
      .innerRadius(centerRadius)
      .outerRadius(centerRadius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('d', centerArc as any)
      .attr('transform', `translate(${courtWidth},${courtHeight / 2})`)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', lineWidth);

    // Render data points (player positions, shot charts, etc.)
    // Data format: datasets[0].data = [{ x: 0-100, y: 0-100, label?, number?, color?, size? }, ...]
    const dataPoints = data?.datasets?.[0]?.data as any[] || [];
    const defaultPointColor = options.pointColor || '#000000';
    const centerColor = options.centerColor || '#FFD700'; // Special color for center position (like goalie in soccer)
    const defaultPointSize = options.pointSize || 12;
    const showLabels = options.showPointLabels !== false;
    const showNumbers = options.showPointNumbers !== false;
    const pointStyle = options.pointStyle || 'circle'; // circle, jersey, dot

    // Helper to get color - uses center color for C (center) positions
    const getPointColor = (point: any) => {
      if (point.color) return point.color;
      const label = (point.label || '').toLowerCase();
      if (label === 'c' || label === 'center') {
        return centerColor;
      }
      return defaultPointColor;
    };

    if (dataPoints.length > 0) {
      const pointsGroup = g.append('g').attr('class', 'data-points');

      dataPoints.forEach((point, idx) => {
        if (typeof point !== 'object' || point.x === undefined || point.y === undefined) return;

        // Convert 0-100 coordinates to court coordinates
        const px = (point.x / 100) * courtWidth;
        const py = (point.y / 100) * courtHeight;
        const pointColor = getPointColor(point);
        const pointSize = point.size || defaultPointSize;

        if (pointStyle === 'jersey') {
          // Jersey/shirt style with number
          const jerseyGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          // Jersey body (rounded rectangle)
          jerseyGroup.append('rect')
            .attr('x', -pointSize * 0.7)
            .attr('y', -pointSize * 0.8)
            .attr('width', pointSize * 1.4)
            .attr('height', pointSize * 1.6)
            .attr('rx', pointSize * 0.3)
            .attr('fill', pointColor)
            .attr('stroke', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
            .attr('stroke-width', 1);

          // Number on jersey
          if (showNumbers && point.number !== undefined) {
            jerseyGroup.append('text')
              .attr('x', 0)
              .attr('y', pointSize * 0.15)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', isDark ? '#FFFFFF' : '#000000')
              .attr('font-size', pointSize * 0.8)
              .attr('font-weight', 'bold')
              .attr('font-family', 'Inter, sans-serif')
              .text(point.number);
          }

          // Label below jersey
          if (showLabels && point.label) {
            jerseyGroup.append('text')
              .attr('x', 0)
              .attr('y', pointSize * 1.2)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        } else if (pointStyle === 'dot') {
          // Simple dot - smaller size, still supports labels
          const dotGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          dotGroup.append('circle')
            .attr('r', pointSize / 3)
            .attr('fill', pointColor);

          // Label below dot
          if (showLabels && point.label) {
            dotGroup.append('text')
              .attr('y', pointSize / 3 + 10)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        } else {
          // Default circle with optional label and number
          const circleGroup = pointsGroup.append('g')
            .attr('transform', `translate(${px},${py})`);

          circleGroup.append('circle')
            .attr('r', pointSize / 2)
            .attr('fill', pointColor)
            .attr('stroke', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
            .attr('stroke-width', 2);

          // Number inside circle
          if (showNumbers && point.number !== undefined) {
            circleGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', isDark ? '#FFFFFF' : '#000000')
              .attr('font-size', pointSize * 0.5)
              .attr('font-weight', 'bold')
              .attr('font-family', 'Inter, sans-serif')
              .text(point.number);
          }

          // Label below
          if (showLabels && point.label) {
            circleGroup.append('text')
              .attr('y', pointSize / 2 + 12)
              .attr('text-anchor', 'middle')
              .attr('fill', '#FFFFFF')
              .attr('font-size', 10)
              .attr('font-family', 'Inter, sans-serif')
              .attr('paint-order', 'stroke')
              .attr('stroke', 'rgba(0,0,0,0.7)')
              .attr('stroke-width', 3)
              .text(point.label);
          }
        }
      });
    }

    // Legend for basketball court - show unique point labels/colors
    if (options.showLegend !== false && dataPoints.length > 0) {
      const legendPosition = options.legendPosition || 'bottom';
      const legendColor = options.legendColor || '#FFFFFF';
      const legendFontSize = options.legendFontSize || 12;

      // Get unique colors/labels from data points
      const uniqueEntries: { color: string; label: string }[] = [];
      const seenLabels = new Set<string>();

      dataPoints.forEach((point) => {
        if (point.label && !seenLabels.has(point.label)) {
          seenLabels.add(point.label);
          uniqueEntries.push({
            color: getPointColor(point),
            label: point.label,
          });
        }
      });

      if (uniqueEntries.length > 0) {
        const legendGroup = svg.append('g').attr('class', 'legend');

        if (legendPosition === 'top') {
          let legendX = margin;
          uniqueEntries.forEach((entry, i) => {
            legendGroup.append('circle')
              .attr('cx', legendX + 6)
              .attr('cy', 12)
              .attr('r', 6)
              .attr('fill', entry.color);

            legendGroup.append('text')
              .attr('x', legendX + 18)
              .attr('y', 16)
              .attr('fill', legendColor)
              .attr('font-size', legendFontSize)
              .attr('font-family', 'Inter, sans-serif')
              .text(entry.label);

            legendX += entry.label.length * 7 + 40;
          });
        } else {
          // Bottom legend (default)
          let legendX = margin;
          const legendY = height - 12;

          uniqueEntries.forEach((entry, i) => {
            legendGroup.append('circle')
              .attr('cx', legendX + 6)
              .attr('cy', legendY)
              .attr('r', 6)
              .attr('fill', entry.color);

            legendGroup.append('text')
              .attr('x', legendX + 18)
              .attr('y', legendY + 4)
              .attr('fill', legendColor)
              .attr('font-size', legendFontSize)
              .attr('font-family', 'Inter, sans-serif')
              .text(entry.label);

            legendX += entry.label.length * 7 + 40;
          });
        }
      }
    }

  }, [chartType, data, options, width, height]);

  // Render based on chart type
  const chartContainerStyle = {
    width,
    height,
    ...containerStyle,
  };

  switch (chartType) {
    case 'bar':
      return (
        <div style={chartContainerStyle}>
          <Bar data={chartJsData} options={chartJsOptions} />
        </div>
      );

    case 'horizontal-bar':
      return (
        <div style={chartContainerStyle}>
          <Bar 
            data={chartJsData} 
            options={{
              ...chartJsOptions,
              indexAxis: 'y' as const,
            }} 
          />
        </div>
      );

    case 'line':
    case 'area':
      return (
        <div style={chartContainerStyle}>
          <Line data={chartJsData} options={chartJsOptions} />
        </div>
      );

    case 'pie':
      return (
        <div style={chartContainerStyle}>
          <Pie data={chartJsData} options={chartJsOptions} />
        </div>
      );

    case 'donut':
      return (
        <div style={chartContainerStyle}>
          <Doughnut 
            data={chartJsData} 
            options={{
              ...chartJsOptions,
              cutout: `${options.donutCutout ?? 60}%`,
            }} 
          />
        </div>
      );

    case 'gauge':
    case 'candlestick':
    case 'index-chart':
    case 'parliament':
    case 'soccer-field':
    case 'basketball-court':
      return (
        <svg
          ref={d3Ref}
          width={width}
          height={height}
          style={{
            overflow: 'visible',
            ...containerStyle,
          }}
        />
      );

    default:
      return (
        <div
          style={chartContainerStyle}
          className="flex items-center justify-center bg-neutral-800 text-neutral-400 text-sm"
        >
          Unknown chart type: {chartType}
        </div>
      );
  }
}

// Helper function to create sample data for different chart types
export function createSampleChartData(chartType: ChartType): ChartData {
  switch (chartType) {
    case 'bar':
    case 'horizontal-bar':
      return {
        labels: ['Team A', 'Team B', 'Team C', 'Team D'],
        datasets: [{
          label: 'Points',
          data: [65, 59, 80, 45],
        }],
      };

    case 'line':
    case 'area':
      return {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue',
          data: [30, 45, 60, 75],
        }],
      };

    case 'pie':
    case 'donut':
      return {
        labels: ['Category A', 'Category B', 'Category C'],
        datasets: [{
          data: [30, 50, 20],
        }],
      };

    case 'gauge':
      return {
        labels: ['Value'],
        datasets: [{
          data: [72],
        }],
      };

    case 'candlestick':
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          data: [
            { open: 100, high: 115, low: 95, close: 110 },
            { open: 110, high: 125, low: 105, close: 120 },
            { open: 120, high: 130, low: 110, close: 115 },
            { open: 115, high: 128, low: 108, close: 125 },
            { open: 125, high: 140, low: 118, close: 135 },
          ] as any,
        }],
      };

    case 'index-chart':
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          { label: 'Stock A', data: [100, 105, 102, 110, 115, 120] },
          { label: 'Stock B', data: [100, 98, 103, 108, 105, 112] },
        ],
      };

    case 'parliament':
      return {
        labels: ['Party A', 'Party B', 'Party C', 'Party D'],
        datasets: [{
          data: [120, 85, 45, 30],
        }],
      };

    case 'soccer-field':
    case 'basketball-court':
      return {
        labels: [],
        datasets: [],
      };

    default:
      return {
        labels: ['A', 'B', 'C'],
        datasets: [{ data: [10, 20, 30] }],
      };
  }
}

