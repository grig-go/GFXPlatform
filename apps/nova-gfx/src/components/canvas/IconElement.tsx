import { useMemo, useEffect, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { library, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
// @ts-ignore - lottie-web doesn't have proper TypeScript types
import lottie from 'lottie-web';
// @ts-ignore - react-animated-weather types
import ReactAnimatedWeather from 'react-animated-weather';
import { getWeatherIcon } from '@/lib/weatherIcons';
type AnimationItem = any;

// Add FontAwesome icon libraries
library.add(fas, far, fab);

// Animated weather icon renderer using react-animated-weather
function AnimatedWeatherIconRenderer({ animatedIcon, size, color }: {
  animatedIcon: string;
  size: number;
  color: string;
}) {
  return (
    <ReactAnimatedWeather
      icon={animatedIcon}
      color={color}
      size={size}
      animate={true}
    />
  );
}

// Process SVG content to handle different libraries and apply colors correctly
function processSvgContent(svg: string, color: string, library: string): string {
  let processedSvg = svg;

  // For meteocons, remove the grid layer (id="Grid_1_" or id="Grid")
  if (library === 'meteocons') {
    // Remove the entire Grid group which contains the background lines
    processedSvg = processedSvg.replace(/<g id="Grid_1_">[\s\S]*?<\/g>\s*<\/g>\s*<\/g>/g, '');
    processedSvg = processedSvg.replace(/<g id="Grid">[\s\S]*?<\/g>/g, '');
  }

  // Apply color - but preserve fill="none" for stroke-based icons
  const applyColor = (content: string, targetColor: string): string => {
    // Replace explicit fills (but not fill="none")
    content = content.replace(/fill="(?!none)[^"]*"/g, `fill="${targetColor}"`);
    content = content.replace(/fill='(?!none)[^']*'/g, `fill='${targetColor}'`);

    // Replace strokes (but not stroke="none")
    content = content.replace(/stroke="(?!none)[^"]*"/g, `stroke="${targetColor}"`);
    content = content.replace(/stroke='(?!none)[^']*'/g, `stroke='${targetColor}'`);

    // Handle SVG elements with no fill attribute - add fill attribute via CSS
    // For SVGs that use currentColor, this won't hurt
    return content;
  };

  processedSvg = applyColor(processedSvg, color);

  // Make SVG scalable by ensuring viewBox is present and removing fixed dimensions
  if (!processedSvg.includes('viewBox')) {
    // Try to extract width/height and create viewBox
    const widthMatch = processedSvg.match(/width="(\d+)(?:px)?"/);
    const heightMatch = processedSvg.match(/height="(\d+)(?:px)?"/);
    if (widthMatch && heightMatch) {
      processedSvg = processedSvg.replace(/<svg/, `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`);
    }
  }

  // Remove fixed width/height to allow CSS scaling
  processedSvg = processedSvg.replace(/\s+width="[^"]*"/, '');
  processedSvg = processedSvg.replace(/\s+height="[^"]*"/, '');

  return processedSvg;
}

// Weather icon renderer component that handles SVG loading with better error handling
function WeatherIconRenderer({ svgUrl, displayName, size, color, library }: {
  svgUrl: string;
  displayName: string;
  size: number;
  color: string;
  library: string;
}) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!svgUrl) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Try to fetch SVG and inline it for better control
    fetch(svgUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.text();
      })
      .then(svg => {
        const processedSvg = processSvgContent(svg, color, library);
        setSvgContent(processedSvg);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Failed to load weather icon:', svgUrl, err);
        setError(true);
        setLoading(false);
      });
  }, [svgUrl, color, library]);

  if (loading) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs text-muted-foreground"
      >
        ...
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs text-muted-foreground border border-dashed"
        title={`Failed to load: ${displayName}`}
      >
        ?
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      className="weather-icon-container [&>svg]:w-full [&>svg]:h-full"
    />
  );
}

interface IconElementProps {
  content: {
    type: 'icon';
    library: 'lucide' | 'fontawesome' | 'lottie' | 'weather';
    iconName: string;
    size?: number;
    color?: string;
    weight?: 'solid' | 'regular' | 'brands';
    lottieUrl?: string;
    lottieJson?: string;
    lottieLoop?: boolean;
    lottieAutoplay?: boolean;
  };
  width: number | null;
  height: number | null;
  isSelected?: boolean;
  filter?: string; // CSS filter for drop-shadow
}

export function IconElement({
  content,
  width,
  height,
  isSelected: _isSelected = false,
  filter,
}: IconElementProps) {
  const iconSize = content.size || 24;
  const iconColor = content.color || '#FFFFFF';
  const elementWidth = width || 48;
  const elementHeight = height || 48;

  // Get Lucide icon component
  const LucideIcon = useMemo(() => {
    if (content.library === 'lucide') {
      const IconComponent = (LucideIcons as any)[content.iconName];
      return IconComponent || LucideIcons.Sparkles; // Fallback to Sparkles
    }
    return null;
  }, [content.library, content.iconName]);

  // Get FontAwesome icon
  const fontAwesomeIcon = useMemo(() => {
    if (content.library === 'fontawesome') {
      try {
        const weight = content.weight || 'solid';
        const iconName = content.iconName;
        
        // Try to find icon using findIconDefinition
        let iconDef: IconDefinition | null = null;
        
        if (weight === 'solid') {
          iconDef = findIconDefinition({ prefix: 'fas', iconName: iconName as any });
        } else if (weight === 'regular') {
          iconDef = findIconDefinition({ prefix: 'far', iconName: iconName as any });
        } else if (weight === 'brands') {
          iconDef = findIconDefinition({ prefix: 'fab', iconName: iconName as any });
        }
        
        // Fallback: try to find in any library
        if (!iconDef) {
          iconDef = findIconDefinition({ prefix: 'fas', iconName: iconName as any }) ||
                   findIconDefinition({ prefix: 'far', iconName: iconName as any }) ||
                   findIconDefinition({ prefix: 'fab', iconName: iconName as any });
        }
        
        return iconDef;
      } catch (e) {
        console.warn('FontAwesome icon not found:', content.iconName, e);
        return null;
      }
    }
    return null;
  }, [content.library, content.iconName, content.weight]);

  // Get weather icon
  const weatherIcon = useMemo(() => {
    if (content.library === 'weather') {
      return getWeatherIcon(content.iconName);
    }
    return null;
  }, [content.library, content.iconName]);

  // Lottie animation
  const lottieContainerRef = useRef<HTMLDivElement>(null);
  const lottieAnimationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (content.library === 'lottie' && lottieContainerRef.current) {
      // Clean up previous animation
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }

      const animationData = content.lottieJson 
        ? JSON.parse(content.lottieJson)
        : null;

      if (animationData || content.lottieUrl) {
        try {
          const anim = lottie.loadAnimation({
            container: lottieContainerRef.current,
            renderer: 'svg',
            loop: content.lottieLoop !== false,
            autoplay: content.lottieAutoplay !== false,
            animationData: animationData,
            path: content.lottieUrl,
          });
          lottieAnimationRef.current = anim;

          // Set size
          if (anim) {
            anim.setSubframe(false);
            // Scale animation to fit container
            const scale = iconSize / 100; // Assuming default Lottie size is 100x100
            lottieContainerRef.current.style.transform = `scale(${scale})`;
            lottieContainerRef.current.style.transformOrigin = 'center';
          }
        } catch (error) {
          console.error('Failed to load Lottie animation:', error);
        }
      }

      return () => {
        if (lottieAnimationRef.current) {
          lottieAnimationRef.current.destroy();
          lottieAnimationRef.current = null;
        }
      };
    }
  }, [content.library, content.lottieUrl, content.lottieJson, content.lottieLoop, content.lottieAutoplay, iconSize]);

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ 
        width: elementWidth, 
        height: elementHeight,
        color: iconColor,
      }}
    >
      {content.library === 'lucide' && LucideIcon && (
        <LucideIcon 
          size={iconSize} 
          color={iconColor}
          style={{ 
            width: iconSize, 
            height: iconSize,
            filter: filter || undefined,
          }}
        />
      )}
      {content.library === 'fontawesome' && fontAwesomeIcon && (
        <FontAwesomeIcon 
          icon={fontAwesomeIcon as IconDefinition}
          size="lg"
          style={{ 
            fontSize: `${iconSize}px`,
            color: iconColor,
            filter: filter || undefined,
          }}
        />
      )}
      {content.library === 'fontawesome' && !fontAwesomeIcon && (
        <div className="text-xs text-muted-foreground">Icon not found</div>
      )}
      {content.library === 'lottie' && (
        <div 
          ref={lottieContainerRef}
          style={{
            width: iconSize,
            height: iconSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: filter || undefined,
          }}
        />
      )}

      {content.library === 'weather' && weatherIcon && weatherIcon.animated && weatherIcon.animatedIcon && (
        <div style={{ filter: filter || undefined }}>
          <AnimatedWeatherIconRenderer
            animatedIcon={weatherIcon.animatedIcon}
            size={iconSize}
            color={iconColor}
          />
        </div>
      )}

      {content.library === 'weather' && weatherIcon && !weatherIcon.animated && (
        <div style={{ filter: filter || undefined }}>
          <WeatherIconRenderer
            svgUrl={weatherIcon.svgUrl}
            displayName={weatherIcon.displayName}
            size={iconSize}
            color={iconColor}
            library={weatherIcon.library}
          />
        </div>
      )}

      {content.library === 'weather' && !weatherIcon && (
        <div className="text-xs text-muted-foreground">Weather icon not found</div>
      )}
    </div>
  );
}

