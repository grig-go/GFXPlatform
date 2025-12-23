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
    <header className={styles.heroBanner}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>
          Comprehensive documentation for the Emergent broadcast platform. Use the <strong>AI Assistant</strong> on the left to quickly find answers and speed up your learning.
        </p>
      </div>
    </header>
  );
}

// App icon components
function NovaIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
      <span>N</span>
    </div>
  );
}

function NovaGFXIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'}}>
      <span>G</span>
    </div>
  );
}

function PulsarGFXIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #f97316, #ef4444)'}}>
      <span>P</span>
    </div>
  );
}

function PulsarVSIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #06b6d4, #3b82f6)'}}>
      <span>V</span>
    </div>
  );
}

function PulsarMCRIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #10b981, #06b6d4)'}}>
      <span>M</span>
    </div>
  );
}

function IntegrationIcon() {
  return (
    <div className={styles.appIcon} style={{background: 'linear-gradient(135deg, #64748b, #475569)'}}>
      <span>+</span>
    </div>
  );
}

type AppFeature = {
  title: string;
  description: string;
  link: string;
  icon: ReactNode;
};

const apps: AppFeature[] = [
  {
    title: 'Nova',
    description: 'Data dashboard and command center. Real-time data aggregation for elections, finance, sports, weather, and news with AI-powered automation.',
    link: '/docs/apps/nova',
    icon: <NovaIcon />,
  },
  {
    title: 'Nova GFX',
    description: 'Graphics design editor. Create stunning animated broadcast graphics with support for text, images, maps, charts, animations, and more.',
    link: '/docs/apps/nova-gfx',
    icon: <NovaGFXIcon />,
  },
  {
    title: 'Pulsar GFX',
    description: 'Graphics playout controller. Control your graphics in real-time during live productions. Edit content, trigger animations, and manage playlists.',
    link: '/docs/apps/pulsar-gfx',
    icon: <PulsarGFXIcon />,
  },
  {
    title: 'Pulsar VS',
    description: 'Virtual sets controller for Unreal Engine. Manage 3D virtual environments, playlists with advanced scheduling, and multi-channel output.',
    link: '/docs/apps/pulsar-vs',
    icon: <PulsarVSIcon />,
  },
  {
    title: 'Pulsar MCR',
    description: 'Master control room. Centralized control for multi-channel broadcast operations with scheduling, automation, and monitoring.',
    link: '/docs/apps/pulsar-mcr',
    icon: <PulsarMCRIcon />,
  },
  {
    title: 'Integration',
    description: 'Works with OBS, vMix, Unreal Engine, and any system that supports browser sources. Full REST API for automation and custom integrations.',
    link: '/docs/integration/obs',
    icon: <IntegrationIcon />,
  },
];

function AppCard({title, description, link, icon}: AppFeature) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={link} className={styles.featureCardLink}>
        <div className={styles.featureCard}>
          <div className={styles.cardHeader}>
            {icon}
            <Heading as="h3">{title}</Heading>
          </div>
          <p>{description}</p>
          <span className={styles.learnMore}>Learn more →</span>
        </div>
      </Link>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={clsx('row', styles.appGrid)}>
          {apps.map((app, idx) => (
            <AppCard key={idx} {...app} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description="Professional broadcast graphics made simple">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
