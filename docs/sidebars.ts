import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  devGuideSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/quick-start',
        'getting-started/environment',
        'getting-started/commands',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/backend',
        'architecture/frontend',
        'architecture/api-client',
        'architecture/database',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/coding-standards',
        'development/testing',
        'development/docker',
        'development/migrations',
        'development/contributing',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/hipaa-compliance',
        'security/phi-fields',
        'security/encryption',
        'security/audit-logging',
      ],
    },
  ],
};

export default sidebars;
