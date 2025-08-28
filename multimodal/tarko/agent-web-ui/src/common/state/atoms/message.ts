import { atom } from 'jotai';
import { Message, MessageGroup } from '@/common/types';

/**
 * Atom for storing messages for each session
 * Key is the session ID, value is an array of messages for that session
 */
export const messagesAtom = atom<Record<string, Message[]>>({});

/**
 * Derived atom for grouped messages by session
 * Simplified grouping logic - groups by messageId for assistant messages,
 * individual groups for others
 */
export const groupedMessagesAtom = atom<Record<string, MessageGroup[]>>((get) => {
  const allMessages = get(messagesAtom);
  const result: Record<string, MessageGroup[]> = {};

  Object.entries(allMessages).forEach(([sessionId, messages]) => {
    result[sessionId] = createMessageGroups(messages);
  });

  return result;
});

/**
 * Simplified message grouping logic
 * Groups messages by:
 * 1. User messages start new groups
 * 2. Assistant messages with same messageId are grouped together
 * 3. System/environment messages are standalone
 */
function createMessageGroups(messages: Message[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];

  for (const message of messages) {
    // User messages always start a new group
    if (message.role === 'user') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      currentGroup = [message];
      continue;
    }

    // System messages are standalone
    if (message.role === 'system') {
      if (currentGroup.length > 0) {
        groups.push({ messages: [...currentGroup] });
      }
      groups.push({ messages: [message] });
      currentGroup = [];
      continue;
    }

    // Assistant/environment messages - check for messageId grouping
    if (message.role === 'assistant' || message.role === 'environment') {
      // If this assistant message has a different messageId from the last assistant message in current group,
      // it should start a new group (different thinking/response cycle)
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
          continue;
        }
      }

      // Add to current group
      currentGroup.push(message);
    }
  }

  // Add the last group if not empty
  if (currentGroup.length > 0) {
    groups.push({ messages: [...currentGroup] });
  }

  return groups;
}
