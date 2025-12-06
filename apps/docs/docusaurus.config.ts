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
  baseUrl: '/',

  organizationName: 'emergent-solutions',
  projectName: 'nova-gfx',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
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
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Nova GFX',
      logo: {
        alt: 'Nova GFX Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {to: '/blog', label: 'Changelog', position: 'left'},
        {
          href: 'https://github.com/emergent-solutions/nova-gfx',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
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
