import { supabase, getCurrentUser } from '../client';
import type { Template, Element, Animation, Keyframe, Binding } from '@emergent-platform/types';

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<Template | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data;
}

/**
 * Create a new template
 */
export async function createTemplate(template: Partial<Template>): Promise<Template | null> {
  if (!supabase) return null;

  const user = getCurrentUser();

  const { data, error } = await supabase
    .from('templates')
    .insert({
      ...template,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }

  return data;
}

/**
 * Update a template
 */
export async function updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    return null;
  }

  return data;
}

/**
 * Archive a template (soft delete)
 */
export async function archiveTemplate(templateId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('templates')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    console.error('Error archiving template:', error);
    return false;
  }

  return true;
}

/**
 * Delete a template permanently
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }

  return true;
}

/**
 * Get all elements for a template
 */
export async function getTemplateElements(templateId: string): Promise<Element[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('elements')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching elements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all animations for a template
 */
export async function getTemplateAnimations(templateId: string): Promise<Animation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('animations')
    .select('*')
    .eq('template_id', templateId);

  if (error) {
    console.error('Error fetching animations:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all keyframes for animations in a template
 */
export async function getTemplateKeyframes(templateId: string): Promise<Keyframe[]> {
  if (!supabase) return [];

  // First get animation IDs for this template
  const { data: animations } = await supabase
    .from('animations')
    .select('id')
    .eq('template_id', templateId);

  if (!animations || animations.length === 0) return [];

  const animationIds = animations.map((a: any) => a.id);

  const { data, error } = await supabase
    .from('keyframes')
    .select('*')
    .in('animation_id', animationIds)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching keyframes:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all bindings for a template
 */
export async function getTemplateBindings(templateId: string): Promise<Binding[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('bindings')
    .select('*')
    .eq('template_id', templateId);

  if (error) {
    console.error('Error fetching bindings:', error);
    return [];
  }

  return data || [];
}

/**
 * Get complete template data (template + elements + animations + keyframes + bindings)
 */
export async function getFullTemplate(templateId: string): Promise<{
  template: Template;
  elements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
  bindings: Binding[];
} | null> {
  const template = await getTemplate(templateId);
  if (!template) return null;

  const [elements, animations, keyframes, bindings] = await Promise.all([
    getTemplateElements(templateId),
    getTemplateAnimations(templateId),
    getTemplateKeyframes(templateId),
    getTemplateBindings(templateId),
  ]);

  return { template, elements, animations, keyframes, bindings };
}
