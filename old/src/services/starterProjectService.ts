import { supabase } from '@/lib/supabase';
import { getSystemTemplates } from '@/services/systemTemplateService';
import { glassProject, flatProject } from '@/data/starterProjects';
import type { StarterProject, StarterLayer, StarterTemplate, StarterElement, StarterAnimation } from '@/data/starterProjects/types';
import type { Project, Layer, Template, Element, Animation, Keyframe } from '@/types/database';

// Create a project from starter data
export async function createProjectFromStarter(
  starterProject: StarterProject,
  organizationId: string,
  userId?: string
): Promise<Project | null> {
  try {
    // 1. Create the project
    const projectId = crypto.randomUUID();
    const project: Partial<Project> = {
      id: projectId,
      organization_id: organizationId,
      created_by: userId || null,
      name: starterProject.name,
      description: starterProject.description,
      slug: `${starterProject.slug}-${Date.now()}`,
      canvas_width: starterProject.canvas_width,
      canvas_height: starterProject.canvas_height,
      frame_rate: starterProject.frame_rate,
      background_color: starterProject.background_color,
      api_key: crypto.randomUUID(),
      api_enabled: true,
      is_live: false,
      archived: false,
      settings: {
        designSystem: starterProject.design_system,
      },
    };

    const { data: createdProject, error: projectError } = await supabase
      .from('gfx_projects')
      .insert(project)
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      throw projectError;
    }

    // 2. Create layers
    const layerIdMap: Record<string, string> = {};
    for (let i = 0; i < starterProject.layers.length; i++) {
      const layerData = starterProject.layers[i];
      const layerId = crypto.randomUUID();
      layerIdMap[layerData.layer_type] = layerId;

      const layer: Partial<Layer> = {
        id: layerId,
        project_id: projectId,
        name: layerData.name,
        layer_type: layerData.layer_type as Layer['layer_type'],
        z_index: layerData.z_index,
        sort_order: i,
        position_anchor: layerData.position_anchor as Layer['position_anchor'],
        position_offset_x: layerData.position_offset_x,
        position_offset_y: layerData.position_offset_y,
        width: layerData.width,
        height: layerData.height,
        auto_out: false,
        allow_multiple: layerData.layer_type === 'bug',
        transition_in: 'fade',
        transition_in_duration: 500,
        transition_out: 'fade',
        transition_out_duration: 300,
        enabled: true,
        locked: false,
      };

      const { error: layerError } = await supabase
        .from('gfx_layers')
        .insert(layer);

      if (layerError) {
        console.error('Error creating layer:', layerError);
      }

      // 3. Create templates for this layer
      for (let j = 0; j < layerData.templates.length; j++) {
        const templateData = layerData.templates[j];
        await createTemplate(projectId, layerId, templateData, j);
      }
    }

    console.log(`✅ Created starter project: ${starterProject.name}`);
    return createdProject;
  } catch (error) {
    console.error('Error creating starter project:', error);
    return null;
  }
}

async function createTemplate(
  projectId: string,
  layerId: string,
  templateData: StarterTemplate,
  sortOrder: number
): Promise<void> {
  const templateId = crypto.randomUUID();

  const template: Partial<Template> = {
    id: templateId,
    project_id: projectId,
    layer_id: layerId,
    folder_id: null,
    name: templateData.name,
    description: templateData.description || null,
    tags: [],
    thumbnail_url: null,
    html_template: '<div class="gfx-root"></div>',
    css_styles: templateData.css || '',
    width: templateData.width || null,
    height: templateData.height || null,
    in_duration: templateData.in_duration,
    loop_duration: null,
    loop_iterations: -1,
    out_duration: templateData.out_duration,
    libraries: ['anime.js'],
    custom_script: null,
    enabled: true,
    locked: false,
    archived: false,
    version: 1,
    sort_order: sortOrder,
  };

  const { error: templateError } = await supabase
    .from('gfx_templates')
    .insert(template);

  if (templateError) {
    console.error('Error creating template:', templateError);
    return;
  }

  // Create elements
  const elementNameToId: Record<string, string> = {};
  await createElements(templateId, templateData.elements, null, elementNameToId);

  // Create animations
  for (const animData of templateData.animations) {
    const elementId = elementNameToId[animData.element_name];
    if (!elementId) {
      console.warn(`Element not found for animation: ${animData.element_name}`);
      continue;
    }

    const animationId = crypto.randomUUID();
    const animation: Partial<Animation> = {
      id: animationId,
      template_id: templateId,
      element_id: elementId,
      phase: animData.phase,
      delay: animData.delay,
      duration: animData.duration,
      iterations: 1,
      direction: 'normal',
      easing: animData.easing,
      preset_id: null,
    };

    const { error: animError } = await supabase
      .from('gfx_animations')
      .insert(animation);

    if (animError) {
      console.error('Error creating animation:', animError);
      continue;
    }

    // Create keyframes
    for (const kfData of animData.keyframes) {
      const keyframe: Partial<Keyframe> = {
        id: crypto.randomUUID(),
        animation_id: animationId,
        position: kfData.position,
        properties: kfData.properties,
      };

      const { error: kfError } = await supabase
        .from('gfx_keyframes')
        .insert(keyframe);

      if (kfError) {
        console.error('Error creating keyframe:', kfError);
      }
    }
  }
}

async function createElements(
  templateId: string,
  elements: StarterElement[],
  parentId: string | null,
  nameToIdMap: Record<string, string>
): Promise<void> {
  for (let i = 0; i < elements.length; i++) {
    const elData = elements[i];
    const elementId = crypto.randomUUID();
    nameToIdMap[elData.name] = elementId;

    const element: Partial<Element> = {
      id: elementId,
      template_id: templateId,
      name: elData.name,
      element_id: `el-${elementId.slice(0, 8)}`,
      element_type: elData.element_type as Element['element_type'],
      parent_element_id: parentId,
      sort_order: i,
      z_index: elData.z_index ?? i * 10,
      position_x: elData.position_x,
      position_y: elData.position_y,
      width: elData.width,
      height: elData.height,
      rotation: elData.rotation ?? 0,
      scale_x: 1,
      scale_y: 1,
      anchor_x: 0,
      anchor_y: 0,
      opacity: elData.opacity ?? 1,
      content: elData.content as Element['content'],
      styles: elData.styles || {},
      classes: [],
      visible: true,
      locked: false,
    };

    const { error } = await supabase
      .from('gfx_elements')
      .insert(element);

    if (error) {
      console.error('Error creating element:', error);
      continue;
    }

    // Create children recursively
    if (elData.children && elData.children.length > 0) {
      await createElements(templateId, elData.children, elementId, nameToIdMap);
    }
  }
}

// Create a local (demo) project from starter data
export function createLocalProjectFromStarter(starterProject: StarterProject): {
  project: Project;
  layers: Layer[];
  templates: Template[];
  elements: Element[];
  animations: Animation[];
  keyframes: Keyframe[];
} {
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();

  const project: Project = {
    id: projectId,
    organization_id: 'demo-org',
    created_by: null,
    name: starterProject.name,
    description: starterProject.description,
    slug: `${starterProject.slug}-${Date.now()}`,
    custom_url_slug: null,
    canvas_width: starterProject.canvas_width,
    canvas_height: starterProject.canvas_height,
    frame_rate: starterProject.frame_rate,
    background_color: starterProject.background_color,
    api_key: crypto.randomUUID(),
    api_enabled: true,
    is_live: false,
    archived: false,
    created_at: now,
    updated_at: now,
    settings: {
      designSystem: starterProject.design_system,
      // Store reference to the system template this project was created from
      systemTemplateSlug: starterProject.slug,
      systemTemplateId: (starterProject as any).id || null,
    },
    published: false,
  };

  const layers: Layer[] = [];
  const templates: Template[] = [];
  const elements: Element[] = [];
  const animations: Animation[] = [];
  const keyframes: Keyframe[] = [];

  // Create layers
  const layerIdMap: Record<string, string> = {};
  for (let i = 0; i < starterProject.layers.length; i++) {
    const layerData = starterProject.layers[i];
    const layerId = crypto.randomUUID();
    layerIdMap[layerData.layer_type] = layerId;

    const layer: Layer = {
      id: layerId,
      project_id: projectId,
      name: layerData.name,
      layer_type: layerData.layer_type as Layer['layer_type'],
      z_index: layerData.z_index,
      sort_order: i,
      position_anchor: layerData.position_anchor as Layer['position_anchor'],
      position_offset_x: layerData.position_offset_x,
      position_offset_y: layerData.position_offset_y,
      width: layerData.width,
      height: layerData.height,
      auto_out: false,
      allow_multiple: layerData.layer_type === 'bug',
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 300,
      enabled: true,
      locked: false,
      created_at: now,
    };

    layers.push(layer);

    // Create templates for this layer
    for (let j = 0; j < layerData.templates.length; j++) {
      const templateData = layerData.templates[j];
      const { template, templateElements, templateAnimations, templateKeyframes } = 
        createLocalTemplate(projectId, layerId, templateData, j);
      
      templates.push(template);
      elements.push(...templateElements);
      animations.push(...templateAnimations);
      keyframes.push(...templateKeyframes);
    }
  }

  return { project, layers, templates, elements, animations, keyframes };
}

function createLocalTemplate(
  projectId: string,
  layerId: string,
  templateData: StarterTemplate,
  sortOrder: number
): {
  template: Template;
  templateElements: Element[];
  templateAnimations: Animation[];
  templateKeyframes: Keyframe[];
} {
  const templateId = crypto.randomUUID();
  const now = new Date().toISOString();

  const template: Template = {
    id: templateId,
    project_id: projectId,
    layer_id: layerId,
    folder_id: null,
    name: templateData.name,
    description: templateData.description || null,
    tags: [],
    thumbnail_url: null,
    html_template: '<div class="gfx-root"></div>',
    css_styles: templateData.css || '',
    width: templateData.width || null,
    height: templateData.height || null,
    in_duration: templateData.in_duration,
    loop_duration: null,
    loop_iterations: -1,
    out_duration: templateData.out_duration,
    libraries: ['anime.js'],
    custom_script: null,
    enabled: true,
    locked: false,
    archived: false,
    version: 1,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    created_by: null,
  };

  const templateElements: Element[] = [];
  const templateAnimations: Animation[] = [];
  const templateKeyframes: Keyframe[] = [];
  const elementNameToId: Record<string, string> = {};

  // Create elements
  createLocalElements(templateId, templateData.elements, null, elementNameToId, templateElements);

  // Create animations
  for (const animData of templateData.animations) {
    const elementId = elementNameToId[animData.element_name];
    if (!elementId) {
      console.warn(`Element not found for animation: ${animData.element_name}`);
      continue;
    }

    const animationId = crypto.randomUUID();
    const animation: Animation = {
      id: animationId,
      template_id: templateId,
      element_id: elementId,
      phase: animData.phase,
      delay: animData.delay,
      duration: animData.duration,
      iterations: 1,
      direction: 'normal',
      easing: animData.easing,
      preset_id: null,
      created_at: now,
    };

    templateAnimations.push(animation);

    // Create keyframes
    for (const kfData of animData.keyframes) {
      const keyframe: Keyframe = {
        id: crypto.randomUUID(),
        animation_id: animationId,
        position: kfData.position,
        properties: kfData.properties,
      };

      templateKeyframes.push(keyframe);
    }
  }

  return { template, templateElements, templateAnimations, templateKeyframes };
}

function createLocalElements(
  templateId: string,
  elementsData: StarterElement[],
  parentId: string | null,
  nameToIdMap: Record<string, string>,
  outputElements: Element[]
): void {
  for (let i = 0; i < elementsData.length; i++) {
    const elData = elementsData[i];
    const elementId = crypto.randomUUID();
    nameToIdMap[elData.name] = elementId;

    const element: Element = {
      id: elementId,
      template_id: templateId,
      name: elData.name,
      element_id: `el-${elementId.slice(0, 8)}`,
      element_type: elData.element_type as Element['element_type'],
      parent_element_id: parentId,
      sort_order: i,
      z_index: elData.z_index ?? i * 10,
      position_x: elData.position_x,
      position_y: elData.position_y,
      width: elData.width,
      height: elData.height,
      rotation: elData.rotation ?? 0,
      scale_x: 1,
      scale_y: 1,
      anchor_x: 0,
      anchor_y: 0,
      opacity: elData.opacity ?? 1,
      content: elData.content as Element['content'],
      styles: elData.styles || {},
      classes: [],
      visible: true,
      locked: false,
    };

    outputElements.push(element);

    // Create children recursively
    if (elData.children && elData.children.length > 0) {
      createLocalElements(templateId, elData.children, elementId, nameToIdMap, outputElements);
    }
  }
}

// Get available starter projects - now uses system templates which can be customized
export function getStarterProjects(): StarterProject[] {
  return getSystemTemplates();
}

// Check if starter projects exist in the database
export async function checkStarterProjectsExist(organizationId: string): Promise<{
  glass: boolean;
  flat: boolean;
}> {
  const { data: projects } = await supabase
    .from('gfx_projects')
    .select('name')
    .eq('organization_id', organizationId)
    .in('name', ['Glass Starter', 'Flat Starter']);

  const projectNames = projects?.map(p => p.name) || [];

  return {
    glass: projectNames.includes('Glass Starter'),
    flat: projectNames.includes('Flat Starter'),
  };
}

// Seed starter projects if they don't exist
export async function seedStarterProjects(organizationId: string, userId?: string): Promise<void> {
  const exists = await checkStarterProjectsExist(organizationId);

  if (!exists.glass) {
    await createProjectFromStarter(glassProject, organizationId, userId);
  }

  if (!exists.flat) {
    await createProjectFromStarter(flatProject, organizationId, userId);
  }
}




