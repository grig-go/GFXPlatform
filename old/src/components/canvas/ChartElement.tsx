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
import type { ChartType, ChartData, ChartOptions } from '@/types/database';

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
  }, [chartType, options]);

  // Prepare Chart.js data with per-bar/dataset colors
  const chartJsData = useMemo(() => {
    const datasetsWithColors = data.datasets.map((ds, i) => {
      // Use dataset-specific colors if provided
      const datasetColorConfig = options.datasetColors?.[i];
      
      // For bar charts, use per-bar colors if provided
      let backgroundColor: string | string[] | undefined;
      if (chartType === 'bar' || chartType === 'horizontal-bar') {
        if (options.barColors && options.barColors.length > 0) {
          // Use per-bar colors
          backgroundColor = options.barColors;
        } else if (datasetColorConfig?.backgroundColor) {
          backgroundColor = datasetColorConfig.backgroundColor;
        } else if (ds.backgroundColor) {
          backgroundColor = ds.backgroundColor;
        } else {
          backgroundColor = colors[i % colors.length];
        }
      } else if (chartType === 'pie' || chartType === 'donut') {
        // For pie/donut, use array of colors
        if (options.barColors && options.barColors.length > 0) {
          backgroundColor = options.barColors;
        } else {
          backgroundColor = colors;
        }
      } else {
        // For line/area, use single color
        if (datasetColorConfig?.backgroundColor) {
          backgroundColor = datasetColorConfig.backgroundColor;
        } else if (ds.backgroundColor) {
          backgroundColor = ds.backgroundColor;
        } else {
          backgroundColor = colors[i % colors.length];
        }
      }

      let borderColor: string | string[] | undefined;
      if (datasetColorConfig?.borderColor) {
        borderColor = datasetColorConfig.borderColor;
      } else if (ds.borderColor) {
        borderColor = ds.borderColor;
      } else if (chartType === 'line' || chartType === 'area') {
        borderColor = colors[i % colors.length];
      } else {
        borderColor = 'transparent';
      }

      return {
        ...ds,
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
  }, [data, colors, chartType, options]);

  // Render D3 gauge chart
  useEffect(() => {
    if (chartType !== 'gauge' || !d3Ref.current) return;

    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const gaugeValue = options.gaugeValue ?? (data.datasets[0]?.data[0] ?? 0);
    const gaugeMax = options.gaugeMax ?? 100;
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

  }, [chartType, data, options, width, height, colors]);

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

    default:
      return {
        labels: ['A', 'B', 'C'],
        datasets: [{ data: [10, 20, 30] }],
      };
  }
}

