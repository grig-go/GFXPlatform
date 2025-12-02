import { supabase } from '@/lib/supabase';
import type {
  Project, Layer, Template, Element,
  Animation, Keyframe, Binding,
} from '@/types';

// ============================================
// PROJECTS
// ============================================

export async function fetchProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('gfx_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }
  return data;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('gfx_projects')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data || [];
}

export async function createProject(project: Partial<Project>): Promise<Project | null> {
  const canvasWidth = project.canvas_width || 1920;
  const canvasHeight = project.canvas_height || 1080;
  
  const { data, error } = await supabase
    .from('gfx_projects')
    .insert({
      name: project.name || 'Untitled Project',
      description: project.description || null,
      slug: project.slug || `project-${Date.now()}`,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
      frame_rate: project.frame_rate || 30,
      background_color: project.background_color || 'transparent',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  // Create default design system
  await supabase.from('gfx_project_design_systems').insert({
    project_id: data.id,
  });

  // Create default layers (ordered by z_index, lowest at bottom)
  // Layer dimensions scale with canvas size
  const defaultLayers = [
    { 
      name: 'Background', 
      layer_type: 'background',
      z_index: 10,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: canvasWidth,
      height: canvasHeight,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 500,
      enabled: true,
      always_on: true, // Background layer is always on by default
    },
    { 
      name: 'Fullscreen', 
      layer_type: 'fullscreen', 
      z_index: 100,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: canvasWidth,
      height: canvasHeight,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 300,
      enabled: true,
    },
    { 
      name: 'Lower Third', 
      layer_type: 'lower-third', 
      z_index: 300,
      position_anchor: 'bottom-left',
      position_offset_x: Math.round(canvasWidth * 0.04),
      position_offset_y: Math.round(-canvasHeight * 0.11),
      width: Math.round(canvasWidth * 0.36),
      height: Math.round(canvasHeight * 0.14),
      auto_out: true,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 400,
      transition_out: 'fade',
      transition_out_duration: 300,
      enabled: true,
    },
    { 
      name: 'Bug', 
      layer_type: 'bug', 
      z_index: 450,
      position_anchor: 'top-right',
      position_offset_x: Math.round(-canvasWidth * 0.02),
      position_offset_y: Math.round(canvasHeight * 0.04),
      width: Math.round(canvasWidth * 0.1),
      height: Math.round(canvasHeight * 0.074),
      auto_out: false,
      allow_multiple: true,
      transition_in: 'fade',
      transition_in_duration: 300,
      transition_out: 'fade',
      transition_out_duration: 200,
      enabled: true,
    },
  ];

  // Insert layers and wait for completion
  const { data: createdLayers, error: layerError } = await supabase.from('gfx_layers').insert(
    defaultLayers.map((l, i) => ({
      project_id: data.id,
      ...l,
      locked: false,
      sort_order: i,
    }))
  ).select();
  
  if (layerError) {
    console.error('Error creating default layers:', layerError);
  } else {
    console.log(`Created ${createdLayers?.length || 0} default layers for project ${data.id}`);

    // Create a default blank template under the Fullscreen layer
    const fullscreenLayer = createdLayers?.find(l => l.layer_type === 'fullscreen');
    if (fullscreenLayer) {
      const { data: blankTemplate, error: templateError } = await supabase
        .from('gfx_templates')
        .insert({
          project_id: data.id,
          layer_id: fullscreenLayer.id,
          name: 'Blank',
          description: 'Default blank template',
          html_template: '<div class="gfx-root"></div>',
          css_styles: '',
          sort_order: 0,
          enabled: true,
        })
        .select()
        .single();

      if (templateError) {
        console.error('Error creating default blank template:', templateError);
      } else {
        console.log(`Created default blank template "${blankTemplate?.name}" for fullscreen layer`);
      }
    }
  }

  return data;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project:', error);
    return false;
  }
  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_projects')
    .update({ archived: true })
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }
  return true;
}

// ============================================
// LAYERS
// ============================================

export async function fetchLayers(projectId: string): Promise<Layer[]> {
  const { data, error } = await supabase
    .from('gfx_layers')
    .select('*')
    .eq('project_id', projectId)
    .order('z_index', { ascending: true });

  if (error) {
    console.error('Error fetching layers:', error);
    return [];
  }
  
  // Apply defaults for properties that may not exist in older records
  return (data || []).map((layer) => ({
    ...layer,
    enabled: layer.enabled ?? true,
    locked: layer.locked ?? false,
  }));
}

export async function createLayer(layer: Partial<Layer>): Promise<Layer | null> {
  const { data, error } = await supabase
    .from('gfx_layers')
    .insert(layer)
    .select()
    .single();

  if (error) {
    console.error('Error creating layer:', error);
    return null;
  }
  return data;
}

// ============================================
// TEMPLATES
// ============================================

export async function fetchTemplates(projectId: string): Promise<Template[]> {
  const { data, error } = await supabase
    .from('gfx_templates')
    .select('*')
    .eq('project_id', projectId)
    .eq('archived', false)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  
  // Apply defaults for properties that may not exist in older records
  return (data || []).map((template) => ({
    ...template,
    enabled: template.enabled ?? true,
    locked: template.locked ?? false,
  }));
}

export async function fetchTemplate(templateId: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('gfx_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }
  return data;
}

export async function createTemplate(template: Partial<Template>): Promise<Template | null> {
  const { data, error } = await supabase
    .from('gfx_templates')
    .insert({
      project_id: template.project_id,
      layer_id: template.layer_id,
      name: template.name || 'Untitled Template',
      description: template.description || null,
      html_template: template.html_template || '<div class="gfx-root"></div>',
      css_styles: template.css_styles || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }
  return data;
}

export async function updateTemplate(templateId: string, updates: Partial<Template>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    console.error('Error updating template:', error);
    return false;
  }
  return true;
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_templates')
    .update({ archived: true })
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }
  return true;
}

export async function duplicateTemplate(templateId: string): Promise<Template | null> {
  const template = await fetchTemplate(templateId);
  if (!template) return null;

  // Fetch elements, animations, bindings
  const [elements, animations, bindings] = await Promise.all([
    fetchElements(templateId),
    fetchAnimations(templateId),
    fetchBindings(templateId),
  ]);

  // Create new template
  const newTemplate = await createTemplate({
    ...template,
    name: `${template.name} (Copy)`,
    id: undefined,
  });

  if (!newTemplate) return null;

  // Duplicate elements with ID mapping
  const elementIdMap = new Map<string, string>();
  for (const el of elements) {
    const newEl = await createElement({
      ...el,
      id: undefined,
      template_id: newTemplate.id,
      parent_element_id: el.parent_element_id ? elementIdMap.get(el.parent_element_id) : null,
    });
    if (newEl) {
      elementIdMap.set(el.id, newEl.id);
    }
  }

  // Duplicate animations
  for (const anim of animations) {
    const newElementId = elementIdMap.get(anim.element_id);
    if (newElementId) {
      await createAnimation({
        ...anim,
        id: undefined,
        template_id: newTemplate.id,
        element_id: newElementId,
      });
    }
  }

  // Duplicate bindings
  for (const binding of bindings) {
    const newElementId = elementIdMap.get(binding.element_id);
    if (newElementId) {
      await createBinding({
        ...binding,
        id: undefined,
        template_id: newTemplate.id,
        element_id: newElementId,
      });
    }
  }

  return newTemplate;
}

// ============================================
// ELEMENTS
// ============================================

export async function fetchElements(templateId: string): Promise<Element[]> {
  const { data, error } = await supabase
    .from('gfx_elements')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching elements:', error);
    return [];
  }
  return data || [];
}

export async function createElement(element: Partial<Element>): Promise<Element | null> {
  const { data, error } = await supabase
    .from('gfx_elements')
    .insert(element)
    .select()
    .single();

  if (error) {
    console.error('Error creating element:', error);
    return null;
  }
  return data;
}

export async function updateElement(elementId: string, updates: Partial<Element>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_elements')
    .update(updates)
    .eq('id', elementId);

  if (error) {
    console.error('Error updating element:', error);
    return false;
  }
  return true;
}

export async function deleteElement(elementId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_elements')
    .delete()
    .eq('id', elementId);

  if (error) {
    console.error('Error deleting element:', error);
    return false;
  }
  return true;
}

// ============================================
// ANIMATIONS
// ============================================

export async function fetchAnimations(templateId: string): Promise<Animation[]> {
  const { data, error } = await supabase
    .from('gfx_animations')
    .select('*')
    .eq('template_id', templateId);

  if (error) {
    console.error('Error fetching animations:', error);
    return [];
  }
  return data || [];
}

export async function createAnimation(animation: Partial<Animation>): Promise<Animation | null> {
  const { data, error } = await supabase
    .from('gfx_animations')
    .insert(animation)
    .select()
    .single();

  if (error) {
    console.error('Error creating animation:', error);
    return null;
  }
  return data;
}

export async function updateAnimation(animationId: string, updates: Partial<Animation>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_animations')
    .update(updates)
    .eq('id', animationId);

  if (error) {
    console.error('Error updating animation:', error);
    return false;
  }
  return true;
}

export async function deleteAnimation(animationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_animations')
    .delete()
    .eq('id', animationId);

  if (error) {
    console.error('Error deleting animation:', error);
    return false;
  }
  return true;
}

// ============================================
// KEYFRAMES
// ============================================

export async function fetchKeyframes(animationId: string): Promise<Keyframe[]> {
  const { data, error } = await supabase
    .from('gfx_keyframes')
    .select('*')
    .eq('animation_id', animationId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching keyframes:', error);
    return [];
  }
  return data || [];
}

export async function createKeyframe(keyframe: Partial<Keyframe>): Promise<Keyframe | null> {
  const { data, error } = await supabase
    .from('gfx_keyframes')
    .insert(keyframe)
    .select()
    .single();

  if (error) {
    console.error('Error creating keyframe:', error);
    return null;
  }
  return data;
}

export async function updateKeyframe(keyframeId: string, updates: Partial<Keyframe>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_keyframes')
    .update(updates)
    .eq('id', keyframeId);

  if (error) {
    console.error('Error updating keyframe:', error);
    return false;
  }
  return true;
}

export async function deleteKeyframe(keyframeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_keyframes')
    .delete()
    .eq('id', keyframeId);

  if (error) {
    console.error('Error deleting keyframe:', error);
    return false;
  }
  return true;
}

// ============================================
// BINDINGS
// ============================================

export async function fetchBindings(templateId: string): Promise<Binding[]> {
  const { data, error } = await supabase
    .from('gfx_bindings')
    .select('*')
    .eq('template_id', templateId);

  if (error) {
    console.error('Error fetching bindings:', error);
    return [];
  }
  return data || [];
}

export async function createBinding(binding: Partial<Binding>): Promise<Binding | null> {
  const { data, error } = await supabase
    .from('gfx_bindings')
    .insert(binding)
    .select()
    .single();

  if (error) {
    console.error('Error creating binding:', error);
    return null;
  }
  return data;
}

export async function updateBinding(bindingId: string, updates: Partial<Binding>): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_bindings')
    .update(updates)
    .eq('id', bindingId);

  if (error) {
    console.error('Error updating binding:', error);
    return false;
  }
  return true;
}

export async function deleteBinding(bindingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gfx_bindings')
    .delete()
    .eq('id', bindingId);

  if (error) {
    console.error('Error deleting binding:', error);
    return false;
  }
  return true;
}

// ============================================
// FULL TEMPLATE SAVE (batch operation)
// ============================================

export async function saveTemplateWithElements(
  template: Template,
  elements: Element[],
  animations: Animation[],
  keyframes: Keyframe[],
  bindings: Binding[]
): Promise<boolean> {
  try {
    // Update template
    await updateTemplate(template.id, template);

    // For each element, upsert
    for (const el of elements) {
      const { error } = await supabase
        .from('gfx_elements')
        .upsert(el, { onConflict: 'id' });
      if (error) throw error;
    }

    // For each animation, upsert
    for (const anim of animations) {
      const { error } = await supabase
        .from('gfx_animations')
        .upsert(anim, { onConflict: 'id' });
      if (error) throw error;
    }

    // For each keyframe, upsert
    for (const kf of keyframes) {
      const { error } = await supabase
        .from('gfx_keyframes')
        .upsert(kf, { onConflict: 'id' });
      if (error) throw error;
    }

    // For each binding, upsert
    for (const binding of bindings) {
      const { error } = await supabase
        .from('gfx_bindings')
        .upsert(binding, { onConflict: 'id' });
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error saving template:', error);
    return false;
  }
}

