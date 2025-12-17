import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner, NonIdealState } from '@blueprintjs/core';
import './UserGuidePage.css';

// Import the user guide markdown content
import userGuideContent from '../../docs/USER_GUIDE.md?raw';

const UserGuidePage: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setContent(userGuideContent);
      setLoading(false);
    } catch (err) {
      setError('Failed to load user guide');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="user-guide-loading">
        <Spinner size={50} />
      </div>
    );
  }

  if (error) {
    return (
      <NonIdealState
        icon="error"
        title="Error Loading Guide"
        description={error}
      />
    );
  }

  return (
    <div className="user-guide-container">
      <div className="user-guide-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom heading renderer with anchor links
            h1: ({ children, ...props }) => (
              <h1 id={generateId(children)} {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 id={generateId(children)} {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 id={generateId(children)} {...props}>
                {children}
              </h3>
            ),
            // Custom table renderer for better styling
            table: ({ children, ...props }) => (
              <div className="table-wrapper">
                <table {...props}>{children}</table>
              </div>
            ),
            // Custom code block renderer
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return <code className="inline-code" {...props}>{children}</code>;
              }
              return (
                <pre className="code-block">
                  <code className={className} {...props}>{children}</code>
                </pre>
              );
            },
            // Custom image renderer with path transformation
            img: ({ src, alt, ...props }) => {
              // Check for placeholder text
              if (src?.includes('Placeholder:') || alt?.includes('Placeholder:')) {
                return (
                  <div className="image-placeholder">
                    <div className="placeholder-icon">📷</div>
                    <div className="placeholder-text">{alt || 'Image placeholder'}</div>
                  </div>
                );
              }

              // Transform relative paths from ./images/ to /docs/images/
              let imageSrc = src || '';
              if (imageSrc.startsWith('./images/')) {
                imageSrc = imageSrc.replace('./images/', '/docs/images/');
              } else if (imageSrc.startsWith('images/')) {
                imageSrc = '/docs/' + imageSrc;
              }

              return (
                <img
                  src={imageSrc}
                  alt={alt}
                  onError={(e) => {
                    // Show placeholder on image load error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'image-placeholder';
                    placeholder.innerHTML = `
                      <div class="placeholder-icon">📷</div>
                      <div class="placeholder-text">${alt || 'Image not found'}</div>
                    `;
                    target.parentNode?.insertBefore(placeholder, target);
                  }}
                  {...props}
                />
              );
            },
            // Custom link renderer
            a: ({ href, children, ...props }) => {
              // Handle anchor links
              if (href?.startsWith('#')) {
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(href.slice(1));
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// Helper function to generate heading IDs for anchor links
function generateId(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (Array.isArray(children)) {
    return children
      .map((child) => (typeof child === 'string' ? child : ''))
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  return '';
}

export default UserGuidePage;
