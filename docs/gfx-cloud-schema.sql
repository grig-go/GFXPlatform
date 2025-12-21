-- Nova-GFX Cloud Schema (source database)
-- Pulled from ihdoylhzekyluiiigxxc.supabase.co

CREATE TABLE public.gfx_animation_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category = ANY (ARRAY['entrance'::text, 'exit'::text, 'emphasis'::text, 'motion'::text])),
  definition jsonb NOT NULL,
  preview_url text,
  is_system boolean DEFAULT false,
  organization_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_animation_presets_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_animation_presets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE public.gfx_animations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  element_id uuid,
  phase text NOT NULL CHECK (phase = ANY (ARRAY['in'::text, 'loop'::text, 'out'::text])),
  delay integer DEFAULT 0,
  duration integer DEFAULT 500,
  iterations integer DEFAULT 1,
  direction text DEFAULT 'normal'::text,
  easing text DEFAULT 'ease-out'::text,
  preset_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_animations_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_animations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.gfx_templates(id),
  CONSTRAINT gfx_animations_element_id_fkey FOREIGN KEY (element_id) REFERENCES public.gfx_elements(id)
);

CREATE TABLE public.gfx_bindings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  element_id uuid,
  binding_key text NOT NULL,
  target_property text NOT NULL,
  binding_type text DEFAULT 'text'::text CHECK (binding_type = ANY (ARRAY['text'::text, 'image'::text, 'number'::text, 'color'::text, 'boolean'::text])),
  default_value text,
  formatter text,
  formatter_options jsonb,
  required boolean DEFAULT false,
  CONSTRAINT gfx_bindings_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_bindings_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.gfx_templates(id),
  CONSTRAINT gfx_bindings_element_id_fkey FOREIGN KEY (element_id) REFERENCES public.gfx_elements(id)
);

CREATE TABLE public.gfx_chat_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  context_template_id uuid,
  context_element_ids uuid[],
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  attachments jsonb,
  changes_applied jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_chat_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT gfx_chat_history_context_template_id_fkey FOREIGN KEY (context_template_id) REFERENCES public.gfx_templates(id)
);

CREATE TABLE public.gfx_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid,
  context_template_id uuid,
  context_element_ids uuid[] DEFAULT '{}'::uuid[],
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  changes_applied jsonb,
  error boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_chat_messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT gfx_chat_messages_context_template_id_fkey FOREIGN KEY (context_template_id) REFERENCES public.gfx_templates(id)
);

CREATE TABLE public.gfx_elements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  name text NOT NULL,
  element_id text NOT NULL,
  element_type text NOT NULL CHECK (element_type = ANY (ARRAY['div'::text, 'text'::text, 'image'::text, 'shape'::text, 'group'::text, 'video'::text, 'lottie'::text, 'd3-chart'::text, 'map'::text, 'chart'::text, 'ticker'::text, 'icon'::text, 'svg'::text, 'line'::text, 'table'::text, 'countdown'::text, 'topic-badge'::text])),
  parent_element_id uuid,
  sort_order integer DEFAULT 0,
  position_x double precision DEFAULT 0,
  position_y double precision DEFAULT 0,
  width double precision,
  height double precision,
  rotation double precision DEFAULT 0,
  scale_x double precision DEFAULT 1,
  scale_y double precision DEFAULT 1,
  anchor_x double precision DEFAULT 0.5,
  anchor_y double precision DEFAULT 0.5,
  opacity double precision DEFAULT 1,
  content jsonb DEFAULT '{"type": "div"}'::jsonb,
  styles jsonb DEFAULT '{}'::jsonb,
  classes text[] DEFAULT '{}'::text[],
  visible boolean DEFAULT true,
  locked boolean DEFAULT false,
  z_index integer DEFAULT 0,
  interactions jsonb,
  CONSTRAINT gfx_elements_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_elements_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.gfx_templates(id),
  CONSTRAINT gfx_elements_parent_element_id_fkey FOREIGN KEY (parent_element_id) REFERENCES public.gfx_elements(id)
);

CREATE TABLE public.gfx_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  layer_id uuid,
  parent_folder_id uuid,
  name text NOT NULL,
  color text,
  icon text,
  sort_order integer DEFAULT 0,
  expanded boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_folders_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_folders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_folders_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES public.gfx_layers(id),
  CONSTRAINT gfx_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.gfx_folders(id)
);

CREATE TABLE public.gfx_keyframes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  animation_id uuid,
  position double precision NOT NULL CHECK ("position" >= 0::double precision),
  easing text DEFAULT 'linear'::text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  scale_x double precision,
  scale_y double precision,
  opacity double precision,
  clip_path text,
  filter_blur double precision,
  filter_brightness double precision,
  color text,
  background_color text,
  custom jsonb,
  sort_order integer DEFAULT 0,
  properties jsonb DEFAULT '{}'::jsonb,
  name text,
  CONSTRAINT gfx_keyframes_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_keyframes_animation_id_fkey FOREIGN KEY (animation_id) REFERENCES public.gfx_animations(id)
);

CREATE TABLE public.gfx_layers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  name text NOT NULL,
  layer_type text NOT NULL CHECK (layer_type = ANY (ARRAY['fullscreen'::text, 'background'::text, 'lower-third'::text, 'side-panel'::text, 'ticker'::text, 'bug'::text, 'alert'::text, 'overlay'::text, 'video'::text, 'map'::text, 'custom'::text])),
  z_index integer NOT NULL,
  sort_order integer DEFAULT 0,
  position_anchor text DEFAULT 'top-left'::text,
  position_offset_x integer DEFAULT 0,
  position_offset_y integer DEFAULT 0,
  width integer,
  height integer,
  auto_out boolean DEFAULT false,
  auto_out_delay integer DEFAULT 5000,
  allow_multiple boolean DEFAULT false,
  transition_in text DEFAULT 'fade'::text,
  transition_in_duration integer DEFAULT 500,
  transition_out text DEFAULT 'fade'::text,
  transition_out_duration integer DEFAULT 300,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  locked boolean DEFAULT false,
  always_on boolean DEFAULT false,
  CONSTRAINT gfx_layers_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_layers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id)
);

CREATE TABLE public.gfx_playback_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  layer_id uuid,
  template_id uuid,
  command text NOT NULL CHECK (command = ANY (ARRAY['play_in'::text, 'play_out'::text, 'update'::text, 'clear'::text, 'clear_all'::text])),
  data jsonb,
  transition text,
  transition_duration integer,
  executed boolean DEFAULT false,
  executed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_playback_commands_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_playback_commands_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_playback_commands_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES public.gfx_layers(id),
  CONSTRAINT gfx_playback_commands_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.gfx_templates(id)
);

CREATE TABLE public.gfx_playback_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  layer_id uuid,
  template_id uuid,
  state text DEFAULT 'empty'::text CHECK (state = ANY (ARRAY['empty'::text, 'in'::text, 'hold'::text, 'loop'::text, 'out'::text])),
  data_override jsonb,
  started_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_playback_state_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_playback_state_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_playback_state_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES public.gfx_layers(id),
  CONSTRAINT gfx_playback_state_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.gfx_templates(id)
);

CREATE TABLE public.gfx_project_design_systems (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE,
  colors jsonb DEFAULT '{"text": "#FFFFFF", "accent": "#06B6D4", "primary": "#8B5CF6", "secondary": "#EC4899", "background": "#000000"}'::jsonb,
  fonts jsonb DEFAULT '{"body": {"family": "Inter", "weight": 400}, "heading": {"family": "Inter", "weight": 700}}'::jsonb,
  spacing jsonb DEFAULT '{"lg": 24, "md": 16, "sm": 8, "xl": 32, "xs": 4}'::jsonb,
  animation_defaults jsonb DEFAULT '{"easing": "ease-out", "inDuration": 500, "outDuration": 300}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gfx_project_design_systems_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_project_design_systems_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id)
);

CREATE TABLE public.gfx_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid,
  name text NOT NULL,
  description text,
  slug text NOT NULL,
  custom_url_slug text UNIQUE,
  canvas_width integer DEFAULT 1920,
  canvas_height integer DEFAULT 1080,
  frame_rate integer DEFAULT 60,
  background_color text DEFAULT 'transparent'::text,
  api_key text DEFAULT replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text),
  api_enabled boolean DEFAULT true,
  is_live boolean DEFAULT false,
  archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  published boolean DEFAULT false,
  updated_by uuid,
  interactive_enabled boolean DEFAULT false,
  interactive_config jsonb,
  CONSTRAINT gfx_projects_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT gfx_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT gfx_projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.gfx_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  layer_id uuid,
  folder_id uuid,
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}'::text[],
  thumbnail_url text,
  html_template text DEFAULT '<div class="gfx-root"></div>'::text,
  css_styles text DEFAULT ''::text,
  width integer,
  height integer,
  in_duration integer DEFAULT 500,
  loop_duration integer,
  loop_iterations integer DEFAULT '-1'::integer,
  out_duration integer DEFAULT 300,
  libraries text[] DEFAULT '{}'::text[],
  custom_script text,
  locked boolean DEFAULT false,
  archived boolean DEFAULT false,
  version integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  enabled boolean DEFAULT true,
  data_source_id text,
  data_source_config jsonb,
  CONSTRAINT gfx_templates_pkey PRIMARY KEY (id),
  CONSTRAINT gfx_templates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.gfx_projects(id),
  CONSTRAINT gfx_templates_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES public.gfx_layers(id),
  CONSTRAINT gfx_templates_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.gfx_folders(id),
  CONSTRAINT gfx_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ... and pulsar tables follow the same pattern
