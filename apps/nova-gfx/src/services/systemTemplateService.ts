/**
 * System Template Service
 * 
 * Manages system templates (starter projects) that can be:
 * - Loaded from code defaults
 * - Saved to localStorage for persistence
 * - Exported to JSON for sharing
 * - Imported from JSON
 */

import { glassProject, flatProject } from '@/data/starterProjects';
import type { StarterProject, StarterLayer, StarterTemplate, StarterElement, StarterAnimation, StarterKeyframe } from '@/data/starterProjects/types';
import type { Project, Layer, Template, Element, Animation, Keyframe } from '@emergent-platform/types';

const SYSTEM_TEMPLATES_KEY = 'nova-system-templates';

// Get system templates - first from localStorage, then fallback to code defaults
export function getSystemTemplates(): StarterProject[] {
  try {
    const stored = localStorage.getItem(SYSTEM_TEMPLATES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load system templates from localStorage:', e);
  }
  
  // Return defaults from code
  return [glassProject, flatProject];
}

// Save system templates to localStorage
export function saveSystemTemplates(templates: StarterProject[]): boolean {
  try {
    localStorage.setItem(SYSTEM_TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  } catch (e) {
    console.error('Failed to save system templates:', e);
    return false;
  }
}

// Update a specific system template
export function updateSystemTemplate(slug: string, template: StarterProject): boolean {
  const templates = getSystemTemplates();
  const index = templates.findIndex(t => t.slug === slug);
  
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  
  return saveSystemTemplates(templates);
}

// Delete a system template
export function deleteSystemTemplate(slug: string): boolean {
  const templates = getSystemTemplates();
  const filtered = templates.filter(t => t.slug !== slug);
  return saveSystemTemplates(filtered);
}

// Reset to code defaults
export function resetSystemTemplatesToDefaults(): boolean {
  try {
    localStorage.removeItem(SYSTEM_TEMPLATES_KEY);
    return true;
  } catch (e) {
    console.error('Failed to reset system templates:', e);
    return false;
  }
}

// Export templates to JSON string
export function exportSystemTemplatesToJSON(): string {
  const templates = getSystemTemplates();
  return JSON.stringify(templates, null, 2);
}

// Import templates from JSON string
export function importSystemTemplatesFromJSON(json: string): { success: boolean; error?: string; count?: number } {
  try {
    const parsed = JSON.parse(json);
    
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Invalid format: expected an array of templates' };
    }
    
    // Validate each template has required fields
    for (const template of parsed) {
      if (!template.name || !template.slug || !template.layers) {
        return { success: false, error: 'Invalid template format: missing required fields (name, slug, layers)' };
      }
    }
    
    saveSystemTemplates(parsed);
    return { success: true, count: parsed.length };
  } catch (e) {
    return { success: false, error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
}

// Convert current project to starter template format
export function convertProjectToStarterTemplate(
  project: Project,
  layers: Layer[],
  templates: Template[],
  elements: Element[],
  animations: Animation[],
  keyframes: Keyframe[]
): StarterProject {
  // Create starter layers with their templates
  const starterLayers: StarterLayer[] = layers.map(layer => {
    // Find templates for this layer
    const layerTemplates = templates.filter(t => t.layer_id === layer.id);
    
    const starterTemplates: StarterTemplate[] = layerTemplates.map(template => {
      // Find elements for this template
      const templateElements = elements.filter(e => e.template_id === template.id);
      
      // Build element hierarchy
      const rootElements = templateElements.filter(e => !e.parent_element_id);
      const starterElements = rootElements.map(el => convertElementToStarter(el, templateElements));
      
      // Find animations for this template
      const templateAnimations = animations.filter(a => a.template_id === template.id);
      const starterAnimations: StarterAnimation[] = templateAnimations.map(anim => {
        const animKeyframes = keyframes.filter(k => k.animation_id === anim.id);
        const element = templateElements.find(e => e.id === anim.element_id);
        
        return {
          element_name: element?.name || 'Unknown',
          phase: anim.phase,
          delay: anim.delay,
          duration: anim.duration,
          easing: anim.easing,
          keyframes: animKeyframes.map(kf => ({
            position: kf.position,
            properties: kf.properties as Record<string, string | number>,
          })),
        };
      });
      
      return {
        name: template.name,
        description: template.description || undefined,
        layer_type: layer.layer_type,
        width: template.width || layer.width,
        height: template.height || layer.height,
        css: template.css_styles || undefined,
        in_duration: template.in_duration || 500,
        out_duration: template.out_duration || 300,
        elements: starterElements,
        animations: starterAnimations,
      };
    });
    
    return {
      name: layer.name,
      layer_type: layer.layer_type,
      z_index: layer.z_index,
      position_anchor: layer.position_anchor,
      position_offset_x: layer.position_offset_x,
      position_offset_y: layer.position_offset_y,
      width: layer.width,
      height: layer.height,
      templates: starterTemplates,
    };
  });
  
  // Get design system from project settings
  const designSystem = (project.settings as any)?.designSystem || {
    fonts: {
      primary: 'Inter',
      secondary: 'Inter',
      accent: 'Inter',
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#8B5CF6',
      background: 'rgba(0, 0, 0, 0.8)',
      surface: 'rgba(255, 255, 255, 0.1)',
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
    },
  };
  
  return {
    name: project.name,
    slug: project.slug.replace(/-\d+$/, ''), // Remove timestamp suffix
    description: project.description || '',
    style: 'glass', // Default to glass, could be detected
    canvas_width: project.canvas_width,
    canvas_height: project.canvas_height,
    frame_rate: project.frame_rate,
    background_color: project.background_color,
    design_system: designSystem,
    layers: starterLayers,
  };
}

// Helper to convert element and its children to starter format
function convertElementToStarter(element: Element, allElements: Element[]): StarterElement {
  const children = allElements.filter(e => e.parent_element_id === element.id);
  
  const starterElement: StarterElement = {
    name: element.name,
    element_type: element.element_type,
    position_x: element.position_x,
    position_y: element.position_y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    z_index: element.z_index,
    styles: element.styles || {},
    content: element.content,
  };
  
  if (children.length > 0) {
    starterElement.children = children.map(child => convertElementToStarter(child, allElements));
  }
  
  return starterElement;
}

// Save current project as a new system template
export function saveProjectAsSystemTemplate(
  project: Project,
  layers: Layer[],
  templates: Template[],
  elements: Element[],
  animations: Animation[],
  keyframes: Keyframe[],
  options?: {
    name?: string;
    slug?: string;
    description?: string;
    style?: 'glass' | 'flat' | 'sports' | 'news';
  }
): { success: boolean; error?: string } {
  try {
    const starterTemplate = convertProjectToStarterTemplate(
      project, layers, templates, elements, animations, keyframes
    );
    
    // Apply overrides
    if (options?.name) starterTemplate.name = options.name;
    if (options?.slug) starterTemplate.slug = options.slug;
    if (options?.description) starterTemplate.description = options.description;
    if (options?.style) starterTemplate.style = options.style;
    
    // Update or add to system templates
    updateSystemTemplate(starterTemplate.slug, starterTemplate);
    
    return { success: true };
  } catch (e) {
    return { 
      success: false, 
      error: `Failed to save template: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
}

// Export a single template to JSON
export function exportTemplateToJSON(slug: string): string | null {
  const templates = getSystemTemplates();
  const template = templates.find(t => t.slug === slug);
  
  if (!template) return null;
  
  return JSON.stringify(template, null, 2);
}



