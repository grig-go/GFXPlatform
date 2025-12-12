import { supabase } from '@emergent-platform/supabase-client';
import type {
  Project, Layer, Template, Element,
  Animation, Keyframe, Binding,
} from '@emergent-platform/types';

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

export async function fetchProjects(organizationId?: string): Promise<Project[]> {
  let query = supabase
    .from('gfx_projects')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  // Filter by organization if provided
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data || [];
}

export async function createProject(project: Partial<Project> & { organization_id: string; created_by?: string }): Promise<Project | null> {
  // Validate organization_id is provided (required by database constraint)
  if (!project.organization_id) {
    console.error('Error: organization_id is required to create a project');
    throw new Error('Organization is required to create a project');
  }

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
      organization_id: project.organization_id,
      created_by: project.created_by || null,
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
  console.log('[deleteProject] Starting deletion:', projectId);

  // Delete from Supabase (archive)
  const { error, data } = await supabase
    .from('gfx_projects')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select();

  if (error) {
    console.error('[deleteProject] Error deleting project from Supabase:', error);
    return false;
  }

  console.log('[deleteProject] ✅ Project archived in database:', data);

  // Also delete from localStorage if it exists
  try {
    localStorage.removeItem(`nova-project-${projectId}`);
    console.log('[deleteProject] ✅ Removed from localStorage');
  } catch (err) {
    console.error('[deleteProject] Error deleting project from localStorage:', err);
  }

  return true;
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  try {
    // Try to load from localStorage first
    const localDataStr = localStorage.getItem(`nova-project-${projectId}`);
    let projectData: {
      project: Project;
      layers: Layer[];
      templates: Template[];
      elements: Element[];
      animations: Animation[];
      keyframes: Keyframe[];
      bindings: Binding[];
    } | null = null;

    if (localDataStr) {
      try {
        projectData = JSON.parse(localDataStr);
      } catch (e) {
        console.error('Failed to parse localStorage project data:', e);
      }
    }

    // If not in localStorage, try to load from Supabase
    if (!projectData) {
      const project = await fetchProject(projectId);
      if (!project) {
        console.error('Project not found:', projectId);
        return null;
      }

      const [layers, templates] = await Promise.all([
        fetchLayers(projectId),
        fetchTemplates(projectId),
      ]);

      // Fetch all elements, animations, keyframes, and bindings for all templates
      const allElements: Element[] = [];
      const allAnimations: Animation[] = [];
      const allKeyframes: Keyframe[] = [];
      const allBindings: Binding[] = [];

      for (const template of templates) {
        const [elements, animations, bindings] = await Promise.all([
          fetchElements(template.id),
          fetchAnimations(template.id),
          fetchBindings(template.id),
        ]);

        allElements.push(...elements);

        // Fetch keyframes for each animation
        for (const anim of animations) {
          const keyframes = await fetchKeyframes(anim.id);
          allKeyframes.push(...keyframes);
        }
        allAnimations.push(...animations);
        allBindings.push(...bindings);
      }

      projectData = {
        project,
        layers,
        templates,
        elements: allElements,
        animations: allAnimations,
        keyframes: allKeyframes,
        bindings: allBindings,
      };
    }

    if (!projectData) {
      console.error('Failed to load project data for duplication');
      return null;
    }

    // Create new project
    const newProject = await createProject({
      name: `${projectData.project.name} (Copy)`,
      description: projectData.project.description,
      canvas_width: projectData.project.canvas_width,
      canvas_height: projectData.project.canvas_height,
      frame_rate: projectData.project.frame_rate,
      background_color: projectData.project.background_color,
    });

    if (!newProject) {
      console.error('Failed to create duplicated project');
      return null;
    }

    // Create layer ID mapping
    const layerIdMap = new Map<string, string>();
    for (const layer of projectData.layers) {
      const newLayer = await createLayer({
        ...layer,
        id: undefined,
        project_id: newProject.id,
      });
      if (newLayer) {
        layerIdMap.set(layer.id, newLayer.id);
      }
    }

    // Create template ID mapping and duplicate templates
    const templateIdMap = new Map<string, string>();
    for (const template of projectData.templates) {
      const newLayerId = layerIdMap.get(template.layer_id);
      if (!newLayerId) continue;

      const newTemplate = await createTemplate({
        ...template,
        id: undefined,
        project_id: newProject.id,
        layer_id: newLayerId,
        name: `${template.name} (Copy)`,
      });

      if (newTemplate) {
        templateIdMap.set(template.id, newTemplate.id);
      }
    }

    // Create element ID mapping and duplicate elements
    const elementIdMap = new Map<string, string>();
    for (const element of projectData.elements) {
      const newTemplateId = templateIdMap.get(element.template_id);
      if (!newTemplateId) continue;

      const newElement = await createElement({
        ...element,
        id: undefined,
        template_id: newTemplateId,
        parent_element_id: element.parent_element_id
          ? elementIdMap.get(element.parent_element_id) || null
          : null,
      });

      if (newElement) {
        elementIdMap.set(element.id, newElement.id);
      }
    }

    // Duplicate animations with keyframes
    const animationIdMap = new Map<string, string>();
    for (const anim of projectData.animations) {
      const newElementId = elementIdMap.get(anim.element_id);
      const newTemplateId = templateIdMap.get(anim.template_id);
      if (!newElementId || !newTemplateId) continue;

      const newAnim = await createAnimation({
        ...anim,
        id: undefined,
        template_id: newTemplateId,
        element_id: newElementId,
      });

      if (newAnim) {
        animationIdMap.set(anim.id, newAnim.id);
        // Duplicate keyframes for this animation
        const animKeyframes = projectData.keyframes.filter(
          (kf) => kf.animation_id === anim.id
        );
        for (const kf of animKeyframes) {
          await createKeyframe({
            ...kf,
            id: undefined,
            animation_id: newAnim.id,
          });
        }
      }
    }

    // Duplicate bindings
    for (const binding of projectData.bindings) {
      const newElementId = elementIdMap.get(binding.element_id);
      const newTemplateId = templateIdMap.get(binding.template_id);
      if (!newElementId || !newTemplateId) continue;

      await createBinding({
        ...binding,
        id: undefined,
        template_id: newTemplateId,
        element_id: newElementId,
      });
    }

    // Save to localStorage for immediate access
    try {
      const newProjectData = {
        project: newProject,
        layers: await fetchLayers(newProject.id),
        templates: await fetchTemplates(newProject.id),
        elements: [],
        animations: [],
        keyframes: [],
        bindings: [],
      };

      // Fetch all related data
      for (const template of newProjectData.templates) {
        const [elements, animations, bindings] = await Promise.all([
          fetchElements(template.id),
          fetchAnimations(template.id),
          fetchBindings(template.id),
        ]);

        newProjectData.elements.push(...elements);
        newProjectData.animations.push(...animations);
        newProjectData.bindings.push(...bindings);

        for (const anim of animations) {
          const keyframes = await fetchKeyframes(anim.id);
          newProjectData.keyframes.push(...keyframes);
        }
      }

      localStorage.setItem(
        `nova-project-${newProject.id}`,
        JSON.stringify(newProjectData)
      );
    } catch (err) {
      console.error('Error saving duplicated project to localStorage:', err);
    }

    return newProject;
  } catch (error) {
    console.error('Error duplicating project:', error);
    return null;
  }
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
  console.log('[deleteTemplate service] Starting deletion:', templateId);

  const { error, data } = await supabase
    .from('gfx_templates')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select();

  if (error) {
    console.error('[deleteTemplate service] Error deleting template:', error);
    return false;
  }

  console.log('[deleteTemplate service] ✅ Template archived:', data);
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

  // Ensure properties object is populated - merge individual columns if properties is empty
  // This handles backward compatibility with keyframes that have data in individual columns
  return (data || []).map((kf: any) => {
    const properties = kf.properties && Object.keys(kf.properties).length > 0
      ? kf.properties
      : {};

    // Merge individual columns into properties if they exist and properties doesn't have them
    const mergedProperties = { ...properties };
    if (kf.position_x != null && mergedProperties.position_x === undefined) {
      mergedProperties.position_x = kf.position_x;
    }
    if (kf.position_y != null && mergedProperties.position_y === undefined) {
      mergedProperties.position_y = kf.position_y;
    }
    if (kf.rotation != null && mergedProperties.rotation === undefined) {
      mergedProperties.rotation = kf.rotation;
    }
    if (kf.scale_x != null && mergedProperties.scale_x === undefined) {
      mergedProperties.scale_x = kf.scale_x;
    }
    if (kf.scale_y != null && mergedProperties.scale_y === undefined) {
      mergedProperties.scale_y = kf.scale_y;
    }
    if (kf.opacity != null && mergedProperties.opacity === undefined) {
      mergedProperties.opacity = kf.opacity;
    }
    if (kf.clip_path != null && mergedProperties.clip_path === undefined) {
      mergedProperties.clip_path = kf.clip_path;
    }
    if (kf.filter_blur != null && mergedProperties.filter_blur === undefined) {
      mergedProperties.filter_blur = kf.filter_blur;
    }
    if (kf.filter_brightness != null && mergedProperties.filter_brightness === undefined) {
      mergedProperties.filter_brightness = kf.filter_brightness;
    }
    if (kf.color != null && mergedProperties.color === undefined) {
      mergedProperties.color = kf.color;
    }
    if (kf.background_color != null && mergedProperties.backgroundColor === undefined) {
      mergedProperties.backgroundColor = kf.background_color;
    }
    // Also check for 'transform' column if it exists
    if (kf.transform != null && mergedProperties.transform === undefined) {
      mergedProperties.transform = kf.transform;
    }

    return {
      ...kf,
      properties: mergedProperties,
    } as Keyframe;
  });
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

