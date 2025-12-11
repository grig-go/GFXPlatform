/**
 * Animation Presets Library for Nova GFX
 * 
 * This module provides a comprehensive set of animation presets that can be used
 * by the AI and manually by users to create sophisticated broadcast graphics.
 * 
 * Inspired by professional broadcast graphics systems.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: 'entrance' | 'exit' | 'emphasis' | 'loop' | 'transition';
  keyframes: CSSKeyframes;
  defaultDuration: number;
  defaultEasing: string;
  defaultDelay?: number;
}

export interface CSSKeyframes {
  [percentage: string]: React.CSSProperties;
}

export interface StaggerConfig {
  baseDelay: number;
  increment: number;
  direction: 'forward' | 'reverse' | 'center-out' | 'edges-in';
}

export interface AnimationSequence {
  elementAnimations: ElementAnimation[];
  totalDuration: number;
}

export interface ElementAnimation {
  elementId: string;
  preset: string;
  delay: number;
  duration: number;
  easing: string;
  properties?: Record<string, any>;
}

// ============================================================================
// TIMING CURVES (Professional Broadcast Easings)
// ============================================================================

export const EASINGS = {
  // Standard
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Bouncy / Overshoot
  bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounceIn: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elasticOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Smooth Professional
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  smoothIn: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  smoothOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Snappy
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
  snappyIn: 'cubic-bezier(0.4, 0, 1, 1)',
  snappyOut: 'cubic-bezier(0, 0, 0.2, 1)',
  
  // Dramatic
  dramatic: 'cubic-bezier(0.19, 1, 0.22, 1)',
  slowStart: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  
  // Broadcast Standard
  broadcastIn: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  broadcastOut: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
} as const;

export type EasingType = keyof typeof EASINGS;

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

export const ENTRANCE_PRESETS: AnimationPreset[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    description: 'Simple fade in',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    },
  },
  {
    id: 'slide-in-left',
    name: 'Slide In Left',
    description: 'Slide in from the left',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'translateX(-50px)' },
      '100%': { opacity: 1, transform: 'translateX(0)' },
    },
  },
  {
    id: 'slide-in-right',
    name: 'Slide In Right',
    description: 'Slide in from the right',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'translateX(50px)' },
      '100%': { opacity: 1, transform: 'translateX(0)' },
    },
  },
  {
    id: 'slide-in-up',
    name: 'Slide In Up',
    description: 'Slide in from below',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'translateY(50px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
    },
  },
  {
    id: 'slide-in-down',
    name: 'Slide In Down',
    description: 'Slide in from above',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'translateY(-50px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
    },
  },
  {
    id: 'scale-in',
    name: 'Scale In',
    description: 'Scale up from small',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { opacity: 0, transform: 'scale(0.8)' },
      '70%': { transform: 'scale(1.02)' },
      '100%': { opacity: 1, transform: 'scale(1)' },
    },
  },
  {
    id: 'scale-in-center',
    name: 'Scale In Center',
    description: 'Pop in from center',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.elasticOut,
    keyframes: {
      '0%': { opacity: 0, transform: 'scale(0)' },
      '50%': { transform: 'scale(1.15)' },
      '100%': { opacity: 1, transform: 'scale(1)' },
    },
  },
  {
    id: 'blur-in',
    name: 'Blur In',
    description: 'Fade in with blur',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { opacity: 0, filter: 'blur(10px)' },
      '100%': { opacity: 1, filter: 'blur(0)' },
    },
  },
  {
    id: 'flip-in-x',
    name: 'Flip In X',
    description: '3D flip on X axis',
    category: 'entrance',
    defaultDuration: 700,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'perspective(1000px) rotateX(-90deg)' },
      '60%': { transform: 'perspective(1000px) rotateX(10deg)' },
      '100%': { opacity: 1, transform: 'perspective(1000px) rotateX(0)' },
    },
  },
  {
    id: 'flip-in-y',
    name: 'Flip In Y',
    description: '3D flip on Y axis',
    category: 'entrance',
    defaultDuration: 700,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { opacity: 0, transform: 'perspective(1000px) rotateY(-90deg)' },
      '60%': { transform: 'perspective(1000px) rotateY(10deg)' },
      '100%': { opacity: 1, transform: 'perspective(1000px) rotateY(0)' },
    },
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Dramatic zoom entrance',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.dramatic,
    keyframes: {
      '0%': { opacity: 0, transform: 'scale(0.3)' },
      '50%': { opacity: 1 },
      '100%': { transform: 'scale(1)' },
    },
  },
  {
    id: 'bounce-in',
    name: 'Bounce In',
    description: 'Bouncy entrance',
    category: 'entrance',
    defaultDuration: 800,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { opacity: 0, transform: 'scale(0.3)' },
      '50%': { transform: 'scale(1.05)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { opacity: 1, transform: 'scale(1)' },
    },
  },
  {
    id: 'wipe-in-left',
    name: 'Wipe In Left',
    description: 'Wipe reveal from left',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.snappy,
    keyframes: {
      '0%': { clipPath: 'inset(0 100% 0 0)' },
      '100%': { clipPath: 'inset(0 0 0 0)' },
    },
  },
  {
    id: 'wipe-in-right',
    name: 'Wipe In Right',
    description: 'Wipe reveal from right',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.snappy,
    keyframes: {
      '0%': { clipPath: 'inset(0 0 0 100%)' },
      '100%': { clipPath: 'inset(0 0 0 0)' },
    },
  },
  {
    id: 'title-entrance',
    name: 'Title Entrance',
    description: 'Professional title entrance with 3D tilt',
    category: 'entrance',
    defaultDuration: 800,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(-25px) rotateX(-20deg) scale(0.85)',
        filter: 'blur(5px)'
      },
      '60%': { 
        transform: 'translateY(2px) rotateX(1deg) scale(1.01)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0) rotateX(0) scale(1)',
        filter: 'blur(0)'
      },
    },
  },
  {
    id: 'card-entrance-left',
    name: 'Card Entrance Left',
    description: 'Card slides in from left with 3D rotation',
    category: 'entrance',
    defaultDuration: 900,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateX(-50px) rotateY(-20deg) scale(0.8)',
        filter: 'blur(4px)'
      },
      '70%': { 
        transform: 'translateX(5px) rotateY(1deg) scale(1.02)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateX(0) rotateY(0) scale(1)',
        filter: 'blur(0)'
      },
    },
  },
  {
    id: 'card-entrance-right',
    name: 'Card Entrance Right',
    description: 'Card slides in from right with 3D rotation',
    category: 'entrance',
    defaultDuration: 900,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateX(50px) rotateY(20deg) scale(0.8)',
        filter: 'blur(4px)'
      },
      '70%': { 
        transform: 'translateX(-5px) rotateY(-1deg) scale(1.02)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateX(0) rotateY(0) scale(1)',
        filter: 'blur(0)'
      },
    },
  },
  // F1 / Motorsport Graphics
  {
    id: 'f1-stat-card',
    name: 'F1 Stats Card',
    description: 'Card entrance with subtle pulse for motorsport stats',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(20px) scale(0.9)'
      },
      '70%': { 
        transform: 'translateY(-2px) scale(1.02)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0) scale(1)'
      },
    },
  },
  {
    id: 'driver-photo',
    name: 'Driver Photo Entrance',
    description: 'Photo scale-in with border glow',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(0.8)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'scale(1)'
      },
    },
  },
  {
    id: 'number-badge',
    name: 'Number Badge',
    description: 'Badge pop-in for driver numbers',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.elasticOut,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(0) rotate(-15deg)'
      },
      '60%': { 
        transform: 'scale(1.15) rotate(5deg)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'scale(1) rotate(0deg)'
      },
    },
  },
  // Finance / Market Graphics
  {
    id: 'market-card',
    name: 'Market Card Entrance',
    description: 'Card with tilt entrance for financial data',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(40px) rotate(-3deg)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0) rotate(0deg)'
      },
    },
  },
  {
    id: 'stock-ticker',
    name: 'Stock Ticker Slide',
    description: 'Ticker-style slide in with scale',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.snappy,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateX(-20px) scale(0.8)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateX(0) scale(1)'
      },
    },
  },
  {
    id: 'chart-draw',
    name: 'Chart Line Draw',
    description: 'Chart path drawing animation',
    category: 'entrance',
    defaultDuration: 1500,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        strokeDashoffset: '1000',
        opacity: 0.5
      },
      '100%': { 
        strokeDashoffset: '0',
        opacity: 1
      },
    },
  },
  {
    id: 'number-counter',
    name: 'Number Counter Pop',
    description: 'Number pop animation for counters',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { 
        transform: 'scale(0.5)',
        opacity: 0
      },
      '50%': { 
        transform: 'scale(1.1)'
      },
      '100%': { 
        transform: 'scale(1)',
        opacity: 1
      },
    },
  },
  // News Graphics
  {
    id: 'news-headline',
    name: 'News Headline',
    description: 'Bold headline entrance with underline',
    category: 'entrance',
    defaultDuration: 700,
    defaultEasing: EASINGS.broadcastIn,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(-30px)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0)'
      },
    },
  },
  {
    id: 'news-card-tilt',
    name: 'News Card Tilt',
    description: 'Card entrance with 3D tilt effect',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(40px) rotate(-3deg) scale(0.9)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0) rotate(0deg) scale(1)'
      },
    },
  },
  {
    id: 'social-icon',
    name: 'Social Icon Pop',
    description: 'Social media icon with delay pop',
    category: 'entrance',
    defaultDuration: 300,
    defaultEasing: EASINGS.elasticOut,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(0)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'scale(1)'
      },
    },
  },
  // Flight / Table Graphics
  {
    id: 'table-row',
    name: 'Table Row Stagger',
    description: 'Row entrance for data tables',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateX(-20px)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateX(0)'
      },
    },
  },
  {
    id: 'status-badge',
    name: 'Status Badge',
    description: 'Status indicator pop-in',
    category: 'entrance',
    defaultDuration: 300,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(0.5)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'scale(1)'
      },
    },
  },
  // Bug / Corner Graphics
  {
    id: 'bug-slide',
    name: 'Bug Slide In',
    description: 'Corner bug slide entrance',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(-20px)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0)'
      },
    },
  },
  // Weather Graphics
  {
    id: 'weather-icon-float',
    name: 'Weather Icon Float',
    description: 'Weather icon with floating entrance',
    category: 'entrance',
    defaultDuration: 600,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(15px) scale(0.8)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0) scale(1)'
      },
    },
  },
  {
    id: 'temperature',
    name: 'Temperature Display',
    description: 'Temperature number entrance',
    category: 'entrance',
    defaultDuration: 500,
    defaultEasing: EASINGS.bounceOut,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(0.7)'
      },
      '60%': { 
        transform: 'scale(1.1)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'scale(1)'
      },
    },
  },
  // School Closings / List Graphics
  {
    id: 'list-item-slide',
    name: 'List Item Slide',
    description: 'List item staggered entrance',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.smooth,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateX(-30px)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateX(0)'
      },
    },
  },
  // Alert / Breaking Graphics
  {
    id: 'breaking-alert',
    name: 'Breaking Alert',
    description: 'Urgent alert flash entrance',
    category: 'entrance',
    defaultDuration: 300,
    defaultEasing: EASINGS.snappy,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'scale(1.2)',
        filter: 'brightness(2)'
      },
      '50%': { 
        opacity: 1, 
        filter: 'brightness(1.5)'
      },
      '100%': { 
        transform: 'scale(1)',
        filter: 'brightness(1)'
      },
    },
  },
  {
    id: 'urgent-banner',
    name: 'Urgent Banner',
    description: 'Full-width banner drop',
    category: 'entrance',
    defaultDuration: 400,
    defaultEasing: EASINGS.snappy,
    keyframes: {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(-100%)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0)'
      },
    },
  },
];

// ============================================================================
// EXIT ANIMATIONS
// ============================================================================

export const EXIT_PRESETS: AnimationPreset[] = [
  {
    id: 'fade-out',
    name: 'Fade Out',
    description: 'Simple fade out',
    category: 'exit',
    defaultDuration: 400,
    defaultEasing: EASINGS.smoothIn,
    keyframes: {
      '0%': { opacity: 1 },
      '100%': { opacity: 0 },
    },
  },
  {
    id: 'slide-out-left',
    name: 'Slide Out Left',
    description: 'Slide out to the left',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { opacity: 1, transform: 'translateX(0)' },
      '100%': { opacity: 0, transform: 'translateX(-50px)' },
    },
  },
  {
    id: 'slide-out-right',
    name: 'Slide Out Right',
    description: 'Slide out to the right',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { opacity: 1, transform: 'translateX(0)' },
      '100%': { opacity: 0, transform: 'translateX(50px)' },
    },
  },
  {
    id: 'slide-out-up',
    name: 'Slide Out Up',
    description: 'Slide out upward',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { opacity: 1, transform: 'translateY(0)' },
      '100%': { opacity: 0, transform: 'translateY(-50px)' },
    },
  },
  {
    id: 'slide-out-down',
    name: 'Slide Out Down',
    description: 'Slide out downward',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { opacity: 1, transform: 'translateY(0)' },
      '100%': { opacity: 0, transform: 'translateY(50px)' },
    },
  },
  {
    id: 'scale-out',
    name: 'Scale Out',
    description: 'Shrink and fade out',
    category: 'exit',
    defaultDuration: 400,
    defaultEasing: EASINGS.smoothIn,
    keyframes: {
      '0%': { opacity: 1, transform: 'scale(1)' },
      '100%': { opacity: 0, transform: 'scale(0.8)' },
    },
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    description: 'Dramatic zoom exit',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.smoothIn,
    keyframes: {
      '0%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 0, transform: 'scale(0)' },
    },
  },
  {
    id: 'blur-out',
    name: 'Blur Out',
    description: 'Fade out with blur',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.smoothIn,
    keyframes: {
      '0%': { opacity: 1, filter: 'blur(0)' },
      '100%': { opacity: 0, filter: 'blur(10px)' },
    },
  },
  {
    id: 'title-exit',
    name: 'Title Exit',
    description: 'Professional title exit with 3D tilt',
    category: 'exit',
    defaultDuration: 600,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { 
        opacity: 1, 
        transform: 'translateY(0) rotateX(0) scale(1)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 0, 
        transform: 'translateY(-100px) rotateX(90deg) scale(0.5)',
        filter: 'blur(20px)'
      },
    },
  },
  {
    id: 'card-exit-left',
    name: 'Card Exit Left',
    description: 'Card exits to the left with 3D rotation',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { 
        opacity: 1, 
        transform: 'translateX(0) rotateY(0) scale(1)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 0, 
        transform: 'translateX(-200px) rotateY(-90deg) scale(0.3)',
        filter: 'blur(15px)'
      },
    },
  },
  {
    id: 'card-exit-right',
    name: 'Card Exit Right',
    description: 'Card exits to the right with 3D rotation',
    category: 'exit',
    defaultDuration: 500,
    defaultEasing: EASINGS.broadcastOut,
    keyframes: {
      '0%': { 
        opacity: 1, 
        transform: 'translateX(0) rotateY(0) scale(1)',
        filter: 'blur(0)'
      },
      '100%': { 
        opacity: 0, 
        transform: 'translateX(200px) rotateY(90deg) scale(0.3)',
        filter: 'blur(15px)'
      },
    },
  },
];

// ============================================================================
// LOOP/CONTINUOUS ANIMATIONS
// ============================================================================

export const LOOP_PRESETS: AnimationPreset[] = [
  {
    id: 'float',
    name: 'Float',
    description: 'Gentle floating motion',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-8px)' },
      '100%': { transform: 'translateY(0)' },
    },
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Subtle pulsing scale',
    category: 'loop',
    defaultDuration: 2000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },
  },
  {
    id: 'pulse-glow',
    name: 'Pulse Glow',
    description: 'Pulsing glow effect',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' },
      '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)' },
      '100%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' },
    },
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Shimmering gradient effect',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { backgroundPosition: '-100% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
  {
    id: 'rotate',
    name: 'Rotate',
    description: 'Continuous rotation',
    category: 'loop',
    defaultDuration: 10000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
  {
    id: 'bounce',
    name: 'Bounce',
    description: 'Bouncing motion',
    category: 'loop',
    defaultDuration: 1000,
    defaultEasing: EASINGS.easeOut,
    keyframes: {
      '0%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-20px)' },
      '100%': { transform: 'translateY(0)' },
    },
  },
  {
    id: 'sway',
    name: 'Sway',
    description: 'Gentle swaying motion',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'rotate(-2deg)' },
      '50%': { transform: 'rotate(2deg)' },
      '100%': { transform: 'rotate(-2deg)' },
    },
  },
  {
    id: 'breathing',
    name: 'Breathing',
    description: 'Breathing scale effect',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'scale(1)', opacity: 1 },
      '50%': { transform: 'scale(1.03)', opacity: 0.9 },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
  },
  {
    id: 'color-cycle',
    name: 'Color Cycle',
    description: 'Cycling through colors',
    category: 'loop',
    defaultDuration: 5000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { filter: 'hue-rotate(0deg)' },
      '100%': { filter: 'hue-rotate(360deg)' },
    },
  },
  {
    id: 'ticker-scroll',
    name: 'Ticker Scroll',
    description: 'Continuous scrolling for tickers',
    category: 'loop',
    defaultDuration: 30000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { transform: 'translateX(0)' },
      '100%': { transform: 'translateX(-50%)' },
    },
  },
  // F1 / Motorsport Loop Animations
  {
    id: 'track-pulse',
    name: 'Track Pulse',
    description: 'Racing track glow pulse',
    category: 'loop',
    defaultDuration: 2000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        filter: 'drop-shadow(0 0 6px rgba(221, 55, 55, 0.4))'
      },
      '50%': { 
        filter: 'drop-shadow(0 0 16px rgba(221, 55, 55, 0.7))'
      },
      '100%': { 
        filter: 'drop-shadow(0 0 6px rgba(221, 55, 55, 0.4))'
      },
    },
  },
  {
    id: 'stats-pulse',
    name: 'Stats Card Pulse',
    description: 'Subtle pulse for stat cards',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        transform: 'scale(1)',
        boxShadow: '0 4px 12px rgba(221, 55, 55, 0.3)'
      },
      '50%': { 
        transform: 'scale(1.02)',
        boxShadow: '0 0 40px rgba(221, 55, 55, 0.6)'
      },
      '100%': { 
        transform: 'scale(1)',
        boxShadow: '0 4px 12px rgba(221, 55, 55, 0.3)'
      },
    },
  },
  // Finance Loop Animations
  {
    id: 'market-glow-green',
    name: 'Market Glow (Positive)',
    description: 'Green glow pulse for positive markets',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        boxShadow: '0 20px 60px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)'
      },
      '50%': { 
        boxShadow: '0 25px 80px rgba(34, 197, 94, 0.7), 0 0 60px rgba(34, 197, 94, 0.5)'
      },
      '100%': { 
        boxShadow: '0 20px 60px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)'
      },
    },
  },
  {
    id: 'market-glow-red',
    name: 'Market Glow (Negative)',
    description: 'Red glow pulse for negative markets',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        boxShadow: '0 20px 60px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)'
      },
      '50%': { 
        boxShadow: '0 25px 80px rgba(239, 68, 68, 0.7), 0 0 60px rgba(239, 68, 68, 0.5)'
      },
      '100%': { 
        boxShadow: '0 20px 60px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)'
      },
    },
  },
  // News Loop Animations
  {
    id: 'news-glow-purple',
    name: 'News Purple Glow',
    description: 'Purple glow pulse for news cards',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        boxShadow: '0 20px 60px rgba(168, 85, 247, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)'
      },
      '50%': { 
        boxShadow: '0 25px 80px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.6)'
      },
      '100%': { 
        boxShadow: '0 20px 60px rgba(168, 85, 247, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)'
      },
    },
  },
  {
    id: 'social-pulse',
    name: 'Social Icon Pulse',
    description: 'Social media icon pulse',
    category: 'loop',
    defaultDuration: 2000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': {
        opacity: 1,
        transform: 'scale(1)'
      },
      '50%': {
        opacity: 0.8,
        transform: 'scale(1.1)'
      },
      '100%': {
        opacity: 1,
        transform: 'scale(1)'
      },
    },
  },
  {
    id: 'image-shimmer',
    name: 'Image Shimmer',
    description: 'Shimmer effect over images',
    category: 'loop',
    defaultDuration: 4000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { backgroundPosition: '-100% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
  // Sports Theme Loop Animations
  {
    id: 'rotating-glow',
    name: 'Rotating Glow',
    description: 'Glow that rotates around element',
    category: 'loop',
    defaultDuration: 6000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), -20px -20px 60px rgba(221, 55, 55, 0.2)'
      },
      '25%': { 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 20px -20px 60px rgba(221, 55, 55, 0.3)'
      },
      '50%': { 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 20px 20px 60px rgba(221, 55, 55, 0.4)'
      },
      '75%': { 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), -20px 20px 60px rgba(221, 55, 55, 0.3)'
      },
      '100%': { 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), -20px -20px 60px rgba(221, 55, 55, 0.2)'
      },
    },
  },
  {
    id: 'shimmer-border',
    name: 'Shimmer Border',
    description: 'Border color shimmer effect',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { borderColor: 'rgba(221, 55, 55, 0.3)' },
      '50%': { borderColor: 'rgba(221, 55, 55, 0.8)' },
      '100%': { borderColor: 'rgba(221, 55, 55, 0.3)' },
    },
  },
  {
    id: 'text-glow-pulse',
    name: 'Text Glow Pulse',
    description: 'Pulsing text shadow glow',
    category: 'loop',
    defaultDuration: 3000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        textShadow: '0 0 20px rgba(221, 55, 55, 0.6), 0 0 40px rgba(221, 55, 55, 0.4)'
      },
      '50%': { 
        textShadow: '0 0 30px rgba(221, 55, 55, 1), 0 0 60px rgba(221, 55, 55, 0.8)'
      },
      '100%': { 
        textShadow: '0 0 20px rgba(221, 55, 55, 0.6), 0 0 40px rgba(221, 55, 55, 0.4)'
      },
    },
  },
  {
    id: 'icon-pulse',
    name: 'Icon Pulse',
    description: 'Icon scale and glow pulse',
    category: 'loop',
    defaultDuration: 2000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        transform: 'scale(1)',
        filter: 'drop-shadow(0 0 5px rgba(221, 55, 55, 0.5))'
      },
      '50%': { 
        transform: 'scale(1.15)',
        filter: 'drop-shadow(0 0 15px rgba(221, 55, 55, 1))'
      },
      '100%': { 
        transform: 'scale(1)',
        filter: 'drop-shadow(0 0 5px rgba(221, 55, 55, 0.5))'
      },
    },
  },
  // Weather Loop Animations
  {
    id: 'rain-drop',
    name: 'Rain Drop',
    description: 'Falling rain animation',
    category: 'loop',
    defaultDuration: 1000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { transform: 'translateY(-20px)', opacity: 0 },
      '20%': { opacity: 1 },
      '100%': { transform: 'translateY(20px)', opacity: 0 },
    },
  },
  {
    id: 'sun-ray',
    name: 'Sun Ray Spin',
    description: 'Rotating sun rays',
    category: 'loop',
    defaultDuration: 10000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
  // Gradient Shift Animations
  {
    id: 'gradient-shift',
    name: 'Gradient Shift',
    description: 'Animated gradient shift',
    category: 'loop',
    defaultDuration: 2000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { 
        background: 'linear-gradient(90deg, transparent 0%, rgba(221, 55, 55, 0.4) 50%, transparent 100%)'
      },
      '50%': { 
        background: 'linear-gradient(90deg, transparent 0%, rgba(221, 55, 55, 0.8) 50%, transparent 100%)'
      },
      '100%': { 
        background: 'linear-gradient(90deg, transparent 0%, rgba(221, 55, 55, 0.4) 50%, transparent 100%)'
      },
    },
  },
  // Motion Path Animation (for cars on tracks, etc.)
  {
    id: 'motion-path',
    name: 'Motion Path',
    description: 'Element follows SVG path (requires motion-path CSS)',
    category: 'loop',
    defaultDuration: 8000,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { offsetDistance: '0%' },
      '100%': { offsetDistance: '100%' },
    },
  },
];

// ============================================================================
// EMPHASIS ANIMATIONS (Attention-grabbing)
// ============================================================================

export const EMPHASIS_PRESETS: AnimationPreset[] = [
  {
    id: 'shake',
    name: 'Shake',
    description: 'Quick shake effect',
    category: 'emphasis',
    defaultDuration: 500,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'translateX(0)' },
      '20%': { transform: 'translateX(-10px)' },
      '40%': { transform: 'translateX(10px)' },
      '60%': { transform: 'translateX(-10px)' },
      '80%': { transform: 'translateX(10px)' },
      '100%': { transform: 'translateX(0)' },
    },
  },
  {
    id: 'flash',
    name: 'Flash',
    description: 'Quick flash effect',
    category: 'emphasis',
    defaultDuration: 300,
    defaultEasing: EASINGS.linear,
    keyframes: {
      '0%': { opacity: 1 },
      '50%': { opacity: 0 },
      '100%': { opacity: 1 },
    },
  },
  {
    id: 'rubber-band',
    name: 'Rubber Band',
    description: 'Elastic stretch effect',
    category: 'emphasis',
    defaultDuration: 800,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'scaleX(1)' },
      '30%': { transform: 'scaleX(1.25)' },
      '40%': { transform: 'scaleX(0.75)' },
      '50%': { transform: 'scaleX(1.15)' },
      '65%': { transform: 'scaleX(0.95)' },
      '75%': { transform: 'scaleX(1.05)' },
      '100%': { transform: 'scaleX(1)' },
    },
  },
  {
    id: 'jello',
    name: 'Jello',
    description: 'Jello wobble effect',
    category: 'emphasis',
    defaultDuration: 900,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'skewX(0deg) skewY(0deg)' },
      '11%': { transform: 'skewX(-12.5deg) skewY(-12.5deg)' },
      '22%': { transform: 'skewX(6.25deg) skewY(6.25deg)' },
      '33%': { transform: 'skewX(-3.125deg) skewY(-3.125deg)' },
      '44%': { transform: 'skewX(1.5625deg) skewY(1.5625deg)' },
      '55%': { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' },
      '66%': { transform: 'skewX(0.390625deg) skewY(0.390625deg)' },
      '77%': { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' },
      '100%': { transform: 'skewX(0deg) skewY(0deg)' },
    },
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    description: 'Heartbeat pulse effect',
    category: 'emphasis',
    defaultDuration: 1000,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'scale(1)' },
      '14%': { transform: 'scale(1.3)' },
      '28%': { transform: 'scale(1)' },
      '42%': { transform: 'scale(1.3)' },
      '70%': { transform: 'scale(1)' },
    },
  },
  {
    id: 'tada',
    name: 'Tada',
    description: 'Attention-grabbing tada',
    category: 'emphasis',
    defaultDuration: 800,
    defaultEasing: EASINGS.easeInOut,
    keyframes: {
      '0%': { transform: 'scale(1) rotate(0deg)' },
      '10%': { transform: 'scale(0.9) rotate(-3deg)' },
      '20%': { transform: 'scale(0.9) rotate(-3deg)' },
      '30%': { transform: 'scale(1.1) rotate(3deg)' },
      '40%': { transform: 'scale(1.1) rotate(-3deg)' },
      '50%': { transform: 'scale(1.1) rotate(3deg)' },
      '60%': { transform: 'scale(1.1) rotate(-3deg)' },
      '70%': { transform: 'scale(1.1) rotate(3deg)' },
      '80%': { transform: 'scale(1.1) rotate(-3deg)' },
      '90%': { transform: 'scale(1.1) rotate(3deg)' },
      '100%': { transform: 'scale(1) rotate(0deg)' },
    },
  },
];

// ============================================================================
// ALL PRESETS COMBINED
// ============================================================================

export const ALL_PRESETS: AnimationPreset[] = [
  ...ENTRANCE_PRESETS,
  ...EXIT_PRESETS,
  ...LOOP_PRESETS,
  ...EMPHASIS_PRESETS,
];

// Lookup map for quick access
export const PRESETS_MAP: Record<string, AnimationPreset> = Object.fromEntries(
  ALL_PRESETS.map(preset => [preset.id, preset])
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a preset by ID
 */
export function getPreset(id: string): AnimationPreset | undefined {
  return PRESETS_MAP[id];
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: AnimationPreset['category']): AnimationPreset[] {
  return ALL_PRESETS.filter(p => p.category === category);
}

/**
 * Convert keyframes to CSS @keyframes string
 */
export function keyframesToCSS(name: string, keyframes: CSSKeyframes): string {
  const cssRules = Object.entries(keyframes)
    .map(([percentage, props]) => {
      const cssProps = Object.entries(props)
        .map(([key, value]) => {
          // Convert camelCase to kebab-case
          const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${kebabKey}: ${value}`;
        })
        .join('; ');
      return `${percentage} { ${cssProps} }`;
    })
    .join('\n  ');
  
  return `@keyframes ${name} {\n  ${cssRules}\n}`;
}

/**
 * Generate staggered delays for multiple elements
 */
export function generateStaggerDelays(
  count: number,
  config: StaggerConfig
): number[] {
  const delays: number[] = [];
  
  switch (config.direction) {
    case 'forward':
      for (let i = 0; i < count; i++) {
        delays.push(config.baseDelay + (i * config.increment));
      }
      break;
      
    case 'reverse':
      for (let i = count - 1; i >= 0; i--) {
        delays.push(config.baseDelay + (i * config.increment));
      }
      break;
      
    case 'center-out':
      const center = Math.floor(count / 2);
      for (let i = 0; i < count; i++) {
        const distanceFromCenter = Math.abs(i - center);
        delays.push(config.baseDelay + (distanceFromCenter * config.increment));
      }
      break;
      
    case 'edges-in':
      for (let i = 0; i < count; i++) {
        const distanceFromEdge = Math.min(i, count - 1 - i);
        delays.push(config.baseDelay + ((count - 1 - distanceFromEdge) * config.increment));
      }
      break;
  }
  
  return delays;
}

/**
 * Create an animation sequence for a group of elements
 */
export function createAnimationSequence(
  elementIds: string[],
  entrancePreset: string,
  staggerConfig: StaggerConfig = { baseDelay: 0, increment: 100, direction: 'forward' }
): AnimationSequence {
  const preset = getPreset(entrancePreset);
  if (!preset) {
    throw new Error(`Unknown preset: ${entrancePreset}`);
  }
  
  const delays = generateStaggerDelays(elementIds.length, staggerConfig);
  
  const elementAnimations: ElementAnimation[] = elementIds.map((id, index) => ({
    elementId: id,
    preset: entrancePreset,
    delay: delays[index],
    duration: preset.defaultDuration,
    easing: preset.defaultEasing,
  }));
  
  const totalDuration = Math.max(...delays) + preset.defaultDuration;
  
  return {
    elementAnimations,
    totalDuration,
  };
}

/**
 * Get matching exit preset for an entrance preset
 */
export function getMatchingExitPreset(entranceId: string): string | undefined {
  const exitMap: Record<string, string> = {
    'fade-in': 'fade-out',
    'slide-in-left': 'slide-out-left',
    'slide-in-right': 'slide-out-right',
    'slide-in-up': 'slide-out-up',
    'slide-in-down': 'slide-out-down',
    'scale-in': 'scale-out',
    'scale-in-center': 'zoom-out',
    'blur-in': 'blur-out',
    'zoom-in': 'zoom-out',
    'title-entrance': 'title-exit',
    'card-entrance-left': 'card-exit-left',
    'card-entrance-right': 'card-exit-right',
  };
  
  return exitMap[entranceId];
}

