import React, { useRef } from 'react';
import { generateId } from '../utils';

interface HeadingProps {
  children: React.ReactNode;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * First H1 tracking ref - shared across all heading instances
 */
const firstH1Rendered = { current: false };

/**
 * Reset the first H1 flag (called when content changes)
 */
export const resetFirstH1Flag = (): void => {
  firstH1Rendered.current = false;
};

/**
 * Generic heading component with consistent styling and anchor support
 */
export const Heading: React.FC<HeadingProps> = ({ children, level }) => {
  const id = generateId(children?.toString());

  const getHeadingStyles = () => {
    const baseStyles = 'group scroll-mt-20 flex items-center font-semibold leading-tight';

    switch (level) {
      case 1:
        return `${baseStyles} md-text-heading text-3xl font-bold mt-6 mb-2 pb-2 border-b md-border-default`;
      case 2:
        return `${baseStyles} md-text-heading text-2xl font-bold mt-6 mb-2 pb-2`;
      case 3:
        return `${baseStyles} md-text-primary text-xl font-semibold mt-8 mb-3`;
      case 4:
        return `${baseStyles} md-text-primary text-md font-semibold mt-6 mb-2`;
      default:
        return `${baseStyles} md-text-secondary text-sm font-medium mt-4 mb-2`;
    }
  };

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag id={id} className={getHeadingStyles()}>
      {children}
    </HeadingTag>
  );
};

/**
 * Specific heading components for markdown renderer
 */
export const H1: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirstH1 = !firstH1Rendered.current;
  if (isFirstH1) {
    firstH1Rendered.current = true;
  }

  return <Heading level={1}>{children}</Heading>;
};

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={2}>{children}</Heading>
);

export const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={3}>{children}</Heading>
);

export const H4: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={4}>{children}</Heading>
);
