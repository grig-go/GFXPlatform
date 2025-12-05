import { useMemo } from 'react';

interface LineElementProps {
  content: {
    type: 'line';
    points: Array<{ x: number; y: number }>;
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    strokeDasharray?: string;
    strokeDashoffset?: number;
    arrowStart?: {
      enabled: boolean;
      type?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
      size?: number;
      color?: string;
    };
    arrowEnd?: {
      enabled: boolean;
      type?: 'none' | 'arrow' | 'triangle' | 'circle' | 'square';
      size?: number;
      color?: string;
    };
    opacity?: number;
  };
  width: number | null;
  height: number | null;
}

export function LineElement({ content, width, height }: LineElementProps) {
  const elementWidth = width || 200;
  const elementHeight = height || 2;
  
  const stroke = content.stroke || '#FFFFFF';
  const strokeWidth = content.strokeWidth || 2;
  const strokeLinecap = content.strokeLinecap || 'round';
  const strokeLinejoin = content.strokeLinejoin || 'round';
  const strokeDasharray = content.strokeDasharray;
  const strokeDashoffset = content.strokeDashoffset || 0;
  const opacity = content.opacity ?? 1;
  
  // Calculate bounding box from points
  const { minX, minY, maxX, maxY, pathData } = useMemo(() => {
    if (!content.points || content.points.length < 2) {
      return { minX: 0, minY: 0, maxX: elementWidth, maxY: elementHeight, pathData: '' };
    }
    
    const points = content.points;
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    
    // Find bounding box
    points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    
    // Build path data
    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    
    return { minX, minY, maxX, maxY, pathData };
  }, [content.points, elementWidth, elementHeight]);
  
  const viewBoxWidth = Math.max(maxX - minX, 1);
  const viewBoxHeight = Math.max(maxY - minY, 1);
  
  // Arrow markers
  const arrowStart = content.arrowStart || { enabled: false, type: 'none' };
  const arrowEnd = content.arrowEnd || { enabled: false, type: 'none' };
  
  const startMarkerId = useMemo(() => 
    arrowStart.enabled && arrowStart.type !== 'none' 
      ? `arrow-start-${Math.random().toString(36).substr(2, 9)}` 
      : null,
    [arrowStart.enabled, arrowStart.type]
  );
  
  const endMarkerId = useMemo(() => 
    arrowEnd.enabled && arrowEnd.type !== 'none' 
      ? `arrow-end-${Math.random().toString(36).substr(2, 9)}` 
      : null,
    [arrowEnd.enabled, arrowEnd.type]
  );
  
  const startArrowSize = arrowStart.size || strokeWidth * 3;
  const startArrowColor = arrowStart.color || stroke;
  const endArrowSize = arrowEnd.size || strokeWidth * 3;
  const endArrowColor = arrowEnd.color || stroke;
  
  return (
    <div 
      className="relative w-full h-full"
      style={{ width: elementWidth, height: elementHeight }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${minX - strokeWidth} ${minY - strokeWidth} ${viewBoxWidth + strokeWidth * 2} ${viewBoxHeight + strokeWidth * 2}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {startMarkerId && arrowStart.enabled && arrowStart.type !== 'none' && (
            <marker
              id={startMarkerId}
              markerWidth={startArrowSize}
              markerHeight={startArrowSize}
              refX={startArrowSize}
              refY={startArrowSize / 2}
              orient="auto"
              markerUnits="strokeWidth"
            >
              {arrowStart.type === 'arrow' && (
                <path
                  d={`M 0 0 L ${startArrowSize} ${startArrowSize / 2} L 0 ${startArrowSize} z`}
                  fill={startArrowColor}
                />
              )}
              {arrowStart.type === 'triangle' && (
                <polygon
                  points={`0,0 ${startArrowSize},${startArrowSize / 2} 0,${startArrowSize}`}
                  fill={startArrowColor}
                />
              )}
              {arrowStart.type === 'circle' && (
                <circle
                  cx={startArrowSize / 2}
                  cy={startArrowSize / 2}
                  r={startArrowSize / 2}
                  fill={startArrowColor}
                />
              )}
              {arrowStart.type === 'square' && (
                <rect
                  x="0"
                  y="0"
                  width={startArrowSize}
                  height={startArrowSize}
                  fill={startArrowColor}
                />
              )}
            </marker>
          )}
          {endMarkerId && arrowEnd.enabled && arrowEnd.type !== 'none' && (
            <marker
              id={endMarkerId}
              markerWidth={endArrowSize}
              markerHeight={endArrowSize}
              refX={endArrowSize}
              refY={endArrowSize / 2}
              orient="auto"
              markerUnits="strokeWidth"
            >
              {arrowEnd.type === 'arrow' && (
                <path
                  d={`M 0 0 L ${endArrowSize} ${endArrowSize / 2} L 0 ${endArrowSize} z`}
                  fill={endArrowColor}
                />
              )}
              {arrowEnd.type === 'triangle' && (
                <polygon
                  points={`0,0 ${endArrowSize},${endArrowSize / 2} 0,${endArrowSize}`}
                  fill={endArrowColor}
                />
              )}
              {arrowEnd.type === 'circle' && (
                <circle
                  cx={endArrowSize / 2}
                  cy={endArrowSize / 2}
                  r={endArrowSize / 2}
                  fill={endArrowColor}
                />
              )}
              {arrowEnd.type === 'square' && (
                <rect
                  x="0"
                  y="0"
                  width={endArrowSize}
                  height={endArrowSize}
                  fill={endArrowColor}
                />
              )}
            </marker>
          )}
        </defs>
        <path
          d={pathData}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeLinecap}
          strokeLinejoin={strokeLinejoin}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          opacity={opacity}
          markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
          markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
        />
      </svg>
    </div>
  );
}
