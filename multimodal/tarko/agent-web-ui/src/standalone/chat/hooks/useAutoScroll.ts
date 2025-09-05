import { useRef, useEffect, useCallback } from 'react';

interface UseAutoScrollOptions {
  dependencies?: any[];
}

interface UseAutoScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
}

/**
 * Simplified auto-scroll hook that just works
 * 
 * Core principle: Always scroll to bottom unless user has manually scrolled up
 */
export const useAutoScroll = ({
  dependencies = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const lastScrollHeightRef = useRef(0);

  // Simple scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.scrollTop = container.scrollHeight;
    userScrolledUpRef.current = false;
  }, []);

  // Check if user scrolled up manually
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // If user scrolled to bottom, resume auto-scroll
    if (isAtBottom) {
      userScrolledUpRef.current = false;
    } else {
      // Only mark as user-scrolled if content height hasn't changed
      // (i.e., user manually scrolled, not due to new content)
      if (scrollHeight === lastScrollHeightRef.current) {
        userScrolledUpRef.current = true;
      }
    }
    
    lastScrollHeightRef.current = scrollHeight;
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-scroll when content changes
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      // Use RAF to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, dependencies);

  // Initial scroll to bottom
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [scrollToBottom]);

  return {
    messagesContainerRef,
    messagesEndRef,
    scrollToBottom,
  };
};
