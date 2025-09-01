import React from 'react';

/**
 * Text element styles using semantic CSS classes
 * Zero runtime overhead, leverages CSS custom properties
 */
const TEXT_STYLES = {
  paragraph: 'my-2 md-text-primary leading-relaxed text-base',
  unorderedList: 'my-2 list-disc pl-6 md-text-primary text-base',
  orderedList: 'my-2 list-decimal pl-6 md-text-primary text-base',
  listItem: 'my-1 text-base',
  blockquote: 'border-l-4 md-border-quote pl-4 my-5 italic md-text-muted',
  horizontalRule: 'my-8 border-t md-border-default',
};

/**
 * Paragraph component
 */
export const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={TEXT_STYLES.paragraph}>{children}</p>
);

/**
 * Unordered list component
 */
export const UnorderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className={TEXT_STYLES.unorderedList}>{children}</ul>
);

/**
 * Ordered list component
 */
export const OrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className={TEXT_STYLES.orderedList}>{children}</ol>
);

/**
 * List item component
 */
export const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className={TEXT_STYLES.listItem}>{children}</li>
);

/**
 * Blockquote component
 */
export const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <blockquote className={TEXT_STYLES.blockquote}>{children}</blockquote>
);

/**
 * Horizontal rule component
 */
export const HorizontalRule: React.FC = () => <hr className={TEXT_STYLES.horizontalRule} />;
