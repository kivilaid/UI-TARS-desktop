import { atom } from 'jotai';
import { Message, MessageGroup } from '@/common/types';

/**
 * Atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Derived atom for grouped messages by session
 * Simple, efficient grouping logic
 */
export const groupedMessagesAtom = atom<Record<string, MessageGroup[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, MessageGroup[]> = {};

  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = groupMessages(messages);
  });

  return result;
});

/**
 * Efficient message grouping logic
 * Rules:
 * 1. User messages start new groups
 * 2. Assistant messages with same messageId are grouped together  
 * 3. System/environment messages are standalone
 */
function groupMessages(messages: Message[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      // User messages always start a new group
      if (currentGroup.length > 0) {
        groups.push({ messages: currentGroup });
        currentGroup = [];
      }
      currentGroup.push(message);
    } else if (message.role === 'system') {
      // System messages are standalone
      if (currentGroup.length > 0) {
        groups.push({ messages: currentGroup });
        currentGroup = [];
      }
      groups.push({ messages: [message] });
    } else {
      // Assistant/environment messages
      if (message.role === 'assistant' && message.messageId && currentGroup.length > 0) {
        // Check if this is a new assistant conversation
        const lastAssistant = currentGroup.findLast(m => m.role === 'assistant');
        if (lastAssistant?.messageId && lastAssistant.messageId !== message.messageId) {
          // New assistant conversation - start new group
          groups.push({ messages: currentGroup });
          currentGroup = [message];
          continue;
        }
      }
      currentGroup.push(message);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ messages: currentGroup });
  }

  return groups;
}
