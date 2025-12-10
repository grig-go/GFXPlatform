import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Nova GFX',
  tagline: 'Professional broadcast graphics made simple',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://nova-gfx.emergent.solutions',
  baseUrl: '/docs/',

  organizationName: 'emergent-solutions',
  projectName: 'nova-gfx',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    './plugins/ai-chat-plugin.js',
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs at root of baseUrl (so /docs/apps/nova-gfx, not /docs/docs/apps/nova-gfx)
          editUrl: 'https://github.com/emergent-solutions/nova-gfx/tree/main/apps/docs/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/emergent-solutions/nova-gfx/tree/main/apps/docs/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/nova-gfx-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Nova GFX',
      logo: {
        alt: 'Emergent Nova GFX',
        src: 'img/navbar-logo.svg',
        style: {height: '28px', width: 'auto'},
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'right',
          label: 'Documentation',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'right',
          label: 'API Reference',
        },
        {to: '/blog', label: 'Changelog', position: 'right'},
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Elements',
              to: '/docs/elements/overview',
            },
            {
              label: 'Animation',
              to: '/docs/animation/overview',
            },
          ],
        },
        {
          title: 'Applications',
          items: [
            {
              label: 'Nova GFX (Designer)',
              to: '/docs/apps/nova-gfx',
            },
            {
              label: 'Pulsar GFX (Playout)',
              to: '/docs/apps/pulsar-gfx',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Changelog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/emergent-solutions/nova-gfx',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Emergent Solutions. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
