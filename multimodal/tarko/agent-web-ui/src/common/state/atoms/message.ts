import { atom } from 'jotai';
import { Message } from '@/common/types';

/**
 * Simplified atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 * 
 * Removed complex grouping logic - UI components handle grouping as needed
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Derived atom for sorted messages by session
 * Simple time-based sorting, no complex grouping
 */
export const sortedMessagesAtom = atom<Record<string, Message[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, Message[]> = {};

  // Sort messages by timestamp for each session
  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  });

  return result;
});
