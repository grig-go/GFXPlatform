import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'category',
      label: 'Applications',
      collapsed: false,
      items: [
        'apps/nova-gfx',
        'apps/pulsar-gfx',
      ],
    },
    {
      type: 'category',
      label: 'Elements',
      collapsed: false,
      items: [
        'elements/overview',
        'elements/text',
        'elements/image',
        'elements/shape',
        'elements/map',
        'elements/chart',
        'elements/ticker',
        'elements/icon',
        'elements/group',
      ],
    },
    {
      type: 'category',
      label: 'Animation',
      collapsed: false,
      items: [
        'animation/overview',
        'animation/phases',
        'animation/keyframes',
        'animation/easing',
        'animation/presets',
      ],
    },
    {
      type: 'category',
      label: 'Templates',
      collapsed: true,
      items: [
        'templates/overview',
        'templates/creating',
        'templates/layers',
        'templates/content-fields',
      ],
    },
    {
      type: 'category',
      label: 'Integration',
      collapsed: true,
      items: [
        'integration/obs',
        'integration/vmix',
        'integration/api',
        'integration/data-sources',
      ],
    },
  ],
  apiSidebar: [
    {
      type: 'doc',
      id: 'api/overview',
      label: 'API Overview',
    },
    {
      type: 'category',
      label: 'REST API',
      items: [
        'api/rest/authentication',
        'api/rest/projects',
        'api/rest/templates',
        'api/rest/elements',
        'api/rest/pages',
      ],
    },
    {
      type: 'category',
      label: 'Types',
      items: [
        'api/types/element',
        'api/types/template',
        'api/types/animation',
        'api/types/content',
      ],
    },
  ],
};

export default sidebars;
