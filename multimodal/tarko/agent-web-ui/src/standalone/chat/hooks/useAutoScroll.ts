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
 * Ultra-simple auto-scroll that prevents all flashing
 * 
 * Key insight: Only scroll when we're already at bottom AND content increases
 */
export const useAutoScroll = ({
  dependencies = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Check if we're at the bottom
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 10;
  }, []);

  // Instant scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.scrollTop = container.scrollHeight;
    wasAtBottomRef.current = true;
  }, []);

  // Track scroll position changes
  const handleScroll = useCallback(() => {
    // Clear any pending scroll timeout to prevent conflicts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    wasAtBottomRef.current = isAtBottom();
  }, [isAtBottom]);

  // Attach scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Auto-scroll only when content changes AND we were at bottom
  useEffect(() => {
    if (wasAtBottomRef.current) {
      // Use timeout to avoid conflicts with React rendering
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollToBottom();
        scrollTimeoutRef.current = null;
      }, 0);
    }
  }, dependencies);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return {
    messagesContainerRef,
    messagesEndRef,
    scrollToBottom,
  };
};
