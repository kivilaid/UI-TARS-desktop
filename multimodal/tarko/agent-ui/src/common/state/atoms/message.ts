import { atom } from 'jotai';
import { Message, MessageGroup } from '@/common/types';

/**
 * Atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Atom for storing grouped messages for each session
 * Key is the session ID, value is an array of message groups for that session
 * This is derived from messagesAtom but with messages properly grouped
 * Uses memoization to avoid unnecessary re-computation
 */
const messageGroupCache = new Map<string, { messages: Message[]; groups: MessageGroup[] }>();

export const groupedMessagesAtom = atom<Record<string, MessageGroup[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, MessageGroup[]> = {};

  // Process each session's messages into groups with caching
  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    const cached = messageGroupCache.get(sessionId);

    // Check if we can reuse cached groups
    if (cached && arraysEqual(cached.messages, messages)) {
      result[sessionId] = cached.groups;
    } else {
      // Compute new groups and cache them
      const groups = createMessageGroups(messages);
      messageGroupCache.set(sessionId, { messages: [...messages], groups });
      result[sessionId] = groups;
    }
  });

  // Clean up cache for sessions that no longer exist
  const existingSessionIds = new Set(Object.keys(allMessages));
  for (const cachedSessionId of Array.from(messageGroupCache.keys())) {
    if (!existingSessionIds.has(cachedSessionId)) {
      messageGroupCache.delete(cachedSessionId);
    }
  }

  return result;
});

/**
 * Fast array equality check for messages
 */
function arraysEqual(a: Message[], b: Message[]): boolean {
  if (a.length !== b.length) return false;

  // Quick check: compare last few messages for performance
  const checkCount = Math.min(5, a.length);
  for (let i = a.length - checkCount; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].timestamp !== b[i].timestamp) {
      return false;
    }
  }

  return true;
}

/**
 * Group messages into logical conversation groups
 *
 * The grouping logic creates groups based on:
 * 1. User messages always start a new group
 * 2. System messages are standalone groups
 * 3. Assistant/environment messages that belong together are grouped
 * 4. Thinking/processing sequences are properly maintained
 */
function createMessageGroups(messages: Message[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];
  let currentThinkingSequence: {
    startIndex: number;
    messages: Message[];
  } | null = null;

  // Process messages in order
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // User messages always start a new group
    if (message.role === 'user') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      currentGroup = [message];
      currentThinkingSequence = null;
      continue;
    }

    // System messages are standalone
    if (message.role === 'system') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      groups.push({ messages: [message] });
      currentGroup = [];
      currentThinkingSequence = null;
      continue;
    }

    // Process assistant and environment messages
    if (message.role === 'assistant' || message.role === 'environment') {
      // Check if this assistant message has a different messageId from the last assistant message in current group
      // If so, it should start a new group (different thinking/response cycle)
      if (message.role === 'assistant' && message.messageId) {
        const lastAssistantInGroup = currentGroup
          .slice()
          .reverse()
          .find((m) => m.role === 'assistant');

        if (
          lastAssistantInGroup &&
          lastAssistantInGroup.messageId &&
          lastAssistantInGroup.messageId !== message.messageId
        ) {
          // Different messageId means this is a new assistant response cycle
          if (currentGroup.length > 0) {
            groups.push({ messages: [...currentGroup] });
          }
          currentGroup = [message];
          currentThinkingSequence = null;
          continue;
        }
      }

      // Check if this is the start of a thinking sequence
      if (
        message.role === 'assistant' &&
        currentGroup.length > 0 &&
        currentGroup[currentGroup.length - 1].role === 'user' &&
        (!message.finishReason || message.finishReason !== 'stop')
      ) {
        // Create new thinking sequence
        currentThinkingSequence = {
          startIndex: currentGroup.length,
          messages: [message],
        };
        currentGroup.push(message);
        continue;
      }

      // Continue existing thinking sequence
      if (currentThinkingSequence && (!message.finishReason || message.finishReason !== 'stop')) {
        currentThinkingSequence.messages.push(message);
        currentGroup.push(message);
        continue;
      }

      // Handle final answer in a thinking sequence
      if (message.role === 'assistant' && message.finishReason === 'stop') {
        if (currentThinkingSequence) {
          currentThinkingSequence.messages.push(message);
          currentGroup.push(message);
          currentThinkingSequence = null;
          continue;
        } else {
          // Standalone final answer
          currentGroup.push(message);
          continue;
        }
      }

      // Default: add to current group
      currentGroup.push(message);
    }
  }

  // Add the last group if not empty
  if (currentGroup.length > 0) {
    groups.push({ messages: [...currentGroup] });
  }

  return groups;
}
