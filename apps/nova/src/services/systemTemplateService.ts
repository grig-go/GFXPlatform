/**
 * System Template Service
 *
 * Manages system templates (starter projects) that can be:
 * - Loaded from localStorage for persistence
 * - Exported to JSON for sharing
 * - Imported from JSON
 */

import type { StarterProject } from '../types/starterProject';

const SYSTEM_TEMPLATES_KEY = 'nova-system-templates';

// Default templates (basic starters)
const defaultTemplates: StarterProject[] = [
  {
    name: 'Glass Style',
    slug: 'glass-style',
    description: 'Modern glass morphism design with blur effects and transparency',
    style: 'glass',
    canvas_width: 1920,
    canvas_height: 1080,
    frame_rate: 60,
    background_color: 'transparent',
    design_system: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#8B5CF6',
        background: 'rgba(0, 0, 0, 0.8)',
        surface: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
      },
      fonts: ['Inter'],
    },
    layers: [],
  },
  {
    name: 'Flat Style',
    slug: 'flat-style',
    description: 'Clean flat design with solid colors and minimal shadows',
    style: 'flat',
    canvas_width: 1920,
    canvas_height: 1080,
    frame_rate: 60,
    background_color: 'transparent',
    design_system: {
      colors: {
        primary: '#2563EB',
        secondary: '#64748B',
        accent: '#7C3AED',
        background: '#1E293B',
        surface: '#334155',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
      },
      fonts: ['Inter'],
    },
    layers: [],
  },
];

// Get system templates - first from localStorage, then fallback to defaults
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

  // Return defaults
  return defaultTemplates;
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

// Reset to defaults
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
      if (!template.name || !template.slug) {
        return { success: false, error: 'Invalid template format: missing required fields (name, slug)' };
      }
    }

    saveSystemTemplates(parsed);
    return { success: true, count: parsed.length };
  } catch (e) {
    return { success: false, error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
}

// Export a single template to JSON
export function exportTemplateToJSON(slug: string): string | null {
  const templates = getSystemTemplates();
  const template = templates.find(t => t.slug === slug);

  if (!template) return null;

  return JSON.stringify(template, null, 2);
}
