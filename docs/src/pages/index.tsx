import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quick-start">
            Quick Start Guide
          </Link>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  description: string;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Developer Guide',
    description: 'Architecture, setup, coding standards, and development workflows for the Rust backend and TypeScript frontend.',
    link: '/docs/getting-started/introduction',
  },
  {
    title: 'User Guides',
    description: 'Role-based guides for Doctors, Nurses, Front Desk, Admin, Lab Tech, Pharmacist, Billing, and Patients.',
    link: '/user-guides/overview',
  },
  {
    title: 'UX & Design',
    description: 'UX audit findings, design system documentation, accessibility guidelines, and UI patterns.',
    link: '/ux/audit-findings',
  },
  {
    title: 'API Reference',
    description: 'REST API documentation for authentication, patients, encounters, orders, billing, pharmacy, and workflows.',
    link: '/api-reference/overview',
  },
];

function Feature({title, description, link}: FeatureItem) {
  return (
    <div className={clsx('col col--3')}>
      <div className="padding-horiz--md padding-vert--lg">
        <Heading as="h3">
          <Link to={link}>{title}</Link>
        </Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className="margin-vert--xl">
          <div className="container">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
