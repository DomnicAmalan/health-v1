import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Health V1 Documentation',
  tagline: 'Developer docs, user guides, and API reference for the Health V1 platform',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://health-v1-docs.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

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
          path: 'docs',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'user-guides',
        path: 'user-guides',
        routeBasePath: 'user-guides',
        sidebarPath: './sidebarsUserGuides.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'ux',
        path: 'ux',
        routeBasePath: 'ux',
        sidebarPath: './sidebarsUx.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api-reference',
        path: 'api-reference',
        routeBasePath: 'api-reference',
        sidebarPath: './sidebarsApi.ts',
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Health V1',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'devGuideSidebar',
          position: 'left',
          label: 'Developer Guide',
        },
        {
          to: '/user-guides/overview',
          label: 'User Guides',
          position: 'left',
          activeBaseRegex: '/user-guides/',
        },
        {
          to: '/ux/audit-findings',
          label: 'UX & Design',
          position: 'left',
          activeBaseRegex: '/ux/',
        },
        {
          to: '/api-reference/overview',
          label: 'API Reference',
          position: 'left',
          activeBaseRegex: '/api-reference/',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Developer Guide',
          items: [
            {label: 'Quick Start', to: '/docs/getting-started/quick-start'},
            {label: 'Architecture', to: '/docs/architecture/overview'},
            {label: 'Coding Standards', to: '/docs/development/coding-standards'},
          ],
        },
        {
          title: 'User Guides',
          items: [
            {label: 'Doctor', to: '/user-guides/doctor/overview'},
            {label: 'Front Desk', to: '/user-guides/front-desk/overview'},
            {label: 'Admin', to: '/user-guides/admin/overview'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'API Reference', to: '/api-reference/overview'},
            {label: 'HIPAA Compliance', to: '/docs/security/hipaa-compliance'},
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Health V1. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
