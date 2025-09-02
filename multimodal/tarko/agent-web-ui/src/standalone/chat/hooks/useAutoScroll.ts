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
    if (!container || isUserScrolling) return; // Respect user scrolling
    
    isAutoScrollingRef.current = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Reset auto-scrolling flag after animation completes
    setTimeout(() => {
      isAutoScrollingRef.current = false;
      // Re-check position after scroll animation
      if (!isUserScrolling) { // Only update if user hasn't started scrolling
        const atBottom = checkIsAtBottom();
        setIsAtBottom(atBottom);
        setShowScrollToBottom(!atBottom);
      }
    }, 800); // Extended timeout for reliable animation completion
  }, [checkIsAtBottom, isUserScrolling]);

  // Handle scroll events with immediate user scroll detection
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const currentScrollTop = container.scrollTop;
    const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);
    
    // Skip very small movements (< 1px) to avoid noise
    if (scrollDelta < 1) {
      return;
    }
    
    const atBottom = checkIsAtBottom();
    
    // Detect user-initiated scrolling (more sensitive threshold)
    const isUserInitiated = scrollDelta > 3 && !isAutoScrollingRef.current;
    
    if (isUserInitiated) {
      // Immediately stop any auto-scroll behavior
      setIsUserScrolling(true);
      setIsAtBottom(atBottom);
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
        setIsAtBottom(stillAtBottom);
        setShowScrollToBottom(!stillAtBottom);
      }, autoScrollDelay);
    } else if (!isAutoScrollingRef.current) {
      // Update position state for programmatic scrolls only
      setIsAtBottom(atBottom);
      if (!isUserScrolling) {
        setShowScrollToBottom(!atBottom);
      }
    }
    
    lastScrollTopRef.current = currentScrollTop;
  }, [checkIsAtBottom, autoScrollDelay, isUserScrolling]);

  // Immediate scroll handler for responsive user interaction
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Use immediate handler for user scroll detection
    const immediateHandleScroll = () => {
      handleScroll();
    };
    
    // Also use debounced handler for less critical updates
    const debouncedHandleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        // Only update if not actively user scrolling
        if (!isUserScrolling) {
          const atBottom = checkIsAtBottom();
          setIsAtBottom(atBottom);
          setShowScrollToBottom(!atBottom);
        }
      }, debounceMs);
    };
    
    // Use immediate handler for responsive user interaction
    container.addEventListener('scroll', immediateHandleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', immediateHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, debounceMs, isUserScrolling, checkIsAtBottom]);

  // Auto-scroll to bottom when new content appears (if user hasn't scrolled up)
  useEffect(() => {
    // Only auto-scroll if user is not actively scrolling and was at bottom
    if (!isUserScrolling && isAtBottom) {
      // Use double requestAnimationFrame to ensure DOM layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double-check user hasn't started scrolling in the meantime
          if (!isUserScrolling) {
            scrollToBottom();
          }
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
