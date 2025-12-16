// Hook to handle on-air animation playback
import { useEffect, useRef, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { getAnimatedProperties } from '@/lib/animation';
import type { AnimationPhase } from '@emergent-platform/types';

interface AnimationState {
  phase: AnimationPhase;
  startTime: number;
  duration: number;
  templateId: string;
}

// Hook to play animations when templates go on-air
export function useOnAirAnimation() {
  const {
    elements,
    animations,
    keyframes,
    onAirTemplates,
    setOnAirState,
    clearOnAir,
    playIn,
    phaseDurations,
  } = useDesignerStore();

  // Track animation states per layer
  const animationStates = useRef<Map<string, AnimationState>>(new Map());
  const animationFrames = useRef<Map<string, number>>(new Map());
  const elementStyles = useRef<Map<string, Record<string, string | number>>>(new Map());

  // Get elements for a template
  const getTemplateElements = useCallback((templateId: string) => {
    return elements.filter(e => e.template_id === templateId && e.visible);
  }, [elements]);

  // Apply animated styles to elements
  const applyStyles = useCallback((templateId: string, phase: AnimationPhase, time: number) => {
    const templateElements = getTemplateElements(templateId);
    const phaseDuration = phaseDurations[phase];

    templateElements.forEach(element => {
      const animatedProps = getAnimatedProperties(element, animations, keyframes, time, phase, false, phaseDuration);
      
      // Store for rendering
      elementStyles.current.set(element.id, animatedProps);
      
      // Apply to DOM
      const domElement = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (domElement) {
        Object.entries(animatedProps).forEach(([prop, value]) => {
          if (prop === 'opacity') {
            domElement.style.opacity = String(value);
          } else if (prop === 'transform') {
            domElement.style.transform = String(value);
          } else if (prop === 'backgroundColor') {
            domElement.style.backgroundColor = String(value);
          } else if (prop === 'color') {
            domElement.style.color = String(value);
          } else if (prop === 'scale') {
            domElement.style.transform = `scale(${value})`;
          }
        });
      }
    });
  }, [getTemplateElements, animations, keyframes]);

  // Reset element styles
  const resetStyles = useCallback((templateId: string) => {
    const templateElements = getTemplateElements(templateId);
    templateElements.forEach(element => {
      const domElement = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (domElement) {
        domElement.style.opacity = '1';
        domElement.style.transform = '';
        domElement.style.backgroundColor = '';
        domElement.style.color = '';
      }
    });
  }, [getTemplateElements]);

  // Animation loop for a specific layer
  const runAnimation = useCallback((layerId: string) => {
    const state = animationStates.current.get(layerId);
    if (!state) return;

    const onAir = onAirTemplates[layerId];
    if (!onAir || onAir.state !== state.phase) {
      // State changed externally, stop this loop
      return;
    }

    const elapsed = Date.now() - state.startTime;
    
    // Apply animation at current time
    applyStyles(state.templateId, state.phase, elapsed);

    // Check if animation is complete
    if (elapsed >= state.duration) {
      if (state.phase === 'in') {
        // IN complete -> LOOP
        console.log('[Animation] IN complete for layer:', layerId);
        setOnAirState(layerId, 'loop');
        
        const loopDuration = (phaseDurations.loop || 5000);
        animationStates.current.set(layerId, {
          ...state,
          phase: 'loop',
          startTime: Date.now(),
          duration: loopDuration,
        });
        
        // Continue with LOOP
        animationFrames.current.set(
          layerId,
          requestAnimationFrame(() => runAnimation(layerId))
        );
      } else if (state.phase === 'out') {
        // OUT complete
        console.log('[Animation] OUT complete for layer:', layerId, 'pending:', onAir.pendingSwitch);
        
        // Reset styles for current template
        resetStyles(state.templateId);
        
        if (onAir.pendingSwitch) {
          // Switch to new template
          const newTemplateId = onAir.pendingSwitch;
          animationStates.current.delete(layerId);
          
          // Trigger playIn for the new template (this will start the IN animation)
          playIn(newTemplateId, layerId);
        } else {
          // Just clear
          clearOnAir(layerId);
          animationStates.current.delete(layerId);
        }
      } else if (state.phase === 'loop') {
        // LOOP continues - restart
        animationStates.current.set(layerId, {
          ...state,
          startTime: Date.now(),
        });
        animationFrames.current.set(
          layerId,
          requestAnimationFrame(() => runAnimation(layerId))
        );
      }
      return;
    }

    // Continue animation
    animationFrames.current.set(
      layerId,
      requestAnimationFrame(() => runAnimation(layerId))
    );
  }, [applyStyles, resetStyles, setOnAirState, clearOnAir, playIn, onAirTemplates, phaseDurations]);

  // Start animation for a layer
  const startAnimation = useCallback((layerId: string, templateId: string, phase: AnimationPhase) => {
    console.log('[Animation] Starting', phase, 'for layer:', layerId, 'template:', templateId);
    
    // Cancel any existing animation for this layer
    const existingFrame = animationFrames.current.get(layerId);
    if (existingFrame) {
      cancelAnimationFrame(existingFrame);
    }

    // Get phase duration (in ms)
    const duration = phaseDurations[phase] || (phase === 'loop' ? 5000 : 3000);

    // Set initial state
    animationStates.current.set(layerId, {
      phase,
      startTime: Date.now(),
      duration,
      templateId,
    });

    // Apply initial frame
    applyStyles(templateId, phase, 0);

    // Start animation loop
    animationFrames.current.set(
      layerId,
      requestAnimationFrame(() => runAnimation(layerId))
    );
  }, [applyStyles, runAnimation, phaseDurations]);

  // Watch for on-air state changes
  useEffect(() => {
    Object.entries(onAirTemplates).forEach(([layerId, onAir]) => {
      const currentState = animationStates.current.get(layerId);
      
      // Check if we need to start a new animation
      if (!currentState || currentState.phase !== onAir.state || currentState.templateId !== onAir.templateId) {
        if (onAir.state === 'in') {
          startAnimation(layerId, onAir.templateId, 'in');
        } else if (onAir.state === 'out') {
          startAnimation(layerId, onAir.templateId, 'out');
        } else if (onAir.state === 'loop' && (!currentState || currentState.phase !== 'loop')) {
          startAnimation(layerId, onAir.templateId, 'loop');
        }
      }
    });

    // Clean up removed layers
    animationStates.current.forEach((state, layerId) => {
      if (!onAirTemplates[layerId]) {
        const frame = animationFrames.current.get(layerId);
        if (frame) cancelAnimationFrame(frame);
        resetStyles(state.templateId);
        animationStates.current.delete(layerId);
        animationFrames.current.delete(layerId);
      }
    });
  }, [onAirTemplates, startAnimation, resetStyles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationFrames.current.forEach(frame => cancelAnimationFrame(frame));
    };
  }, []);

  return {
    elementStyles: elementStyles.current,
    animationStates: animationStates.current,
  };
}
