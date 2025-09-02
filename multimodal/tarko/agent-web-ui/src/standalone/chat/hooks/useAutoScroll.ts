import { useRef, useEffect, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  debounceMs?: number; // Debounce time for scroll event handling
  autoScrollDelay?: number; // Delay before auto-scrolling after user stops interacting
  dependencies?: any[]; // Dependencies to trigger auto-scroll (e.g., messages)
}

interface UseAutoScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
  isUserScrolling: boolean;
}

/**
 * Custom hook for managing intelligent auto-scroll behavior in chat
 * 
 * Features:
 * - Auto-scrolls to bottom when new content appears
 * - Detects user manual scrolling and respects it
 * - Shows scroll-to-bottom indicator when user has scrolled up
 * - Automatically resumes auto-scroll after user inactivity
 */
export const useAutoScroll = ({
  threshold = 100,
  debounceMs = 100,
  autoScrollDelay = 2000,
  dependencies = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if container is at bottom
  const checkIsAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    isAutoScrollingRef.current = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Reset auto-scrolling flag after animation completes
    setTimeout(() => {
      isAutoScrollingRef.current = false;
      // Re-check position after scroll animation
      const atBottom = checkIsAtBottom();
      setIsAtBottom(atBottom);
      setShowScrollToBottom(!atBottom && !isUserScrolling);
    }, 600); // Slightly longer to ensure scroll animation completes
  }, [checkIsAtBottom, isUserScrolling]);

  // Handle scroll events with proper debouncing and state management
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const currentScrollTop = container.scrollTop;
    const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);
    
    // Skip if this is an auto-scroll or very small movement (< 2px)
    if (isAutoScrollingRef.current || scrollDelta < 2) {
      lastScrollTopRef.current = currentScrollTop;
      return;
    }
    
    const atBottom = checkIsAtBottom();
    
    // Batch state updates to prevent conflicts
    setIsAtBottom(atBottom);
    
    // Detect user-initiated scrolling
    const isUserInitiated = scrollDelta > 5; // More generous threshold
    
    if (isUserInitiated) {
      setIsUserScrolling(true);
      setShowScrollToBottom(!atBottom);
      
      // Clear existing timeout
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      
      // Set timeout to resume auto-scroll after inactivity
      userInteractionTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
        // Re-check position and update indicator
        const stillAtBottom = checkIsAtBottom();
        setShowScrollToBottom(!stillAtBottom);
      }, autoScrollDelay);
    } else {
      // For non-user initiated scrolls, only update indicator if not user scrolling
      if (!isUserScrolling) {
        setShowScrollToBottom(!atBottom);
      }
    }
    
    lastScrollTopRef.current = currentScrollTop;
  }, [checkIsAtBottom, autoScrollDelay, isUserScrolling]);

  // Debounced scroll handler to prevent excessive state updates
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const debouncedHandleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(handleScroll, debounceMs);
    };
    
    container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, debounceMs]);

  // Auto-scroll to bottom when new content appears (if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolling && isAtBottom) {
      // Use double requestAnimationFrame to ensure DOM layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }, [isUserScrolling, isAtBottom, scrollToBottom, ...dependencies]);

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
    isUserScrolling,
  };
};
