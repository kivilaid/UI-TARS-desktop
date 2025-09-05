import { useRef, useEffect, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  debounceMs?: number; // Debounce time for user interaction detection
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
  debounceMs = 150,
  autoScrollDelay = 2000,
  dependencies = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  // Use refs to avoid stale closure issues
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false);
  const lastContentHeightRef = useRef(0);
  const wasAtBottomRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if container is at bottom
  const checkIsAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, [threshold]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    isAutoScrollingRef.current = true;
    
    // Use instant scroll for better UX when content is streaming
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'instant'
    });
    
    // Update state immediately
    wasAtBottomRef.current = true;
    setShowScrollToBottom(false);
    
    // Reset auto-scrolling flag after a short delay
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 50);
  }, []);

  // Handle scroll events with debouncing
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Skip if this is an auto-scroll
    if (isAutoScrollingRef.current) return;
    
    const atBottom = checkIsAtBottom();
    wasAtBottomRef.current = atBottom;
    
    // Only show scroll-to-bottom button when user has scrolled up significantly
    const shouldShowButton = !atBottom;
    setShowScrollToBottom(shouldShowButton);
    
    // Mark as user scrolling when not at bottom
    if (!atBottom) {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      
      // Set timeout to resume auto-scroll after inactivity
      userInteractionTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
        // Re-check if we're at bottom after timeout
        if (checkIsAtBottom()) {
          setShowScrollToBottom(false);
        }
      }, autoScrollDelay);
    } else {
      // If back at bottom, immediately stop user scrolling state
      setIsUserScrolling(false);
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
        userInteractionTimeoutRef.current = null;
      }
    }
  }, [checkIsAtBottom, autoScrollDelay]);

  // Debounced scroll handler
  const debouncedHandleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, debounceMs);
  }, [handleScroll, debounceMs]);

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [debouncedHandleScroll]);

  // Auto-scroll when content changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const currentHeight = container.scrollHeight;
    const heightChanged = currentHeight !== lastContentHeightRef.current;
    
    // Check if we're currently at bottom
    const currentlyAtBottom = checkIsAtBottom();
    
    // Auto-scroll if:
    // 1. Content height has changed (new content) OR this is initial load
    // 2. User is not actively scrolling
    // 3. We were at bottom before the change OR this is initial state
    const shouldAutoScroll = (
      (heightChanged || lastContentHeightRef.current === 0) &&
      !isUserScrolling &&
      (wasAtBottomRef.current || currentlyAtBottom)
    );
    
    if (shouldAutoScroll) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    
    // Update refs
    lastContentHeightRef.current = currentHeight;
    if (!isUserScrolling) {
      wasAtBottomRef.current = currentlyAtBottom;
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {
        // Force initial scroll and reset states
        wasAtBottomRef.current = true;
        lastContentHeightRef.current = 0;
        scrollToBottom();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
