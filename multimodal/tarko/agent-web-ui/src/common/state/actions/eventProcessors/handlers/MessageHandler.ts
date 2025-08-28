import { v4 as uuidv4 } from 'uuid';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { activePanelContentAtom, isProcessingAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { ChatCompletionContentPartImage } from '@tarko/agent-interface';

/**
 * Unified message update utility
 */
function updateMessages(
  context: EventHandlerContext,
  sessionId: string,
  update: (messages: Message[]) => Message[]
): void {
  const { set } = context;
  set(messagesAtom, (prev) => ({
    ...prev,
    [sessionId]: update(prev[sessionId] || [])
  }));
}

/**
 * Find existing message by messageId or id
 */
function findMessage(messages: Message[], messageId?: string, id?: string, role?: string): number {
  if (messageId) {
    const index = messages.findIndex(m => m.messageId === messageId && (!role || m.role === role));
    if (index !== -1) return index;
  }
  if (id) {
    return messages.findIndex(m => m.id === id);
  }
  return -1;
}

export class UserMessageHandler implements EventHandler<AgentEventStream.UserMessageEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.UserMessageEvent {
    return event.type === 'user_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.UserMessageEvent,
  ): void {
    const { get, set } = context;

    updateMessages(context, sessionId, (messages) => [
      ...messages,
      {
        id: event.id,
        role: 'user',
        content: event.content,
        timestamp: event.timestamp,
      }
    ]);

    // Auto-show user uploaded images in workspace panel (only for active session)
    if (Array.isArray(event.content) && shouldUpdatePanelContent(get, sessionId)) {
      const images = event.content.filter(
        (part): part is { type: 'image_url'; image_url: { url: string } } =>
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          part.type === 'image_url' &&
          'image_url' in part &&
          typeof part.image_url === 'object' &&
          part.image_url !== null &&
          'url' in part.image_url &&
          typeof part.image_url.url === 'string',
      );

      if (images.length > 0) {
        set(activePanelContentAtom, {
          type: 'image',
          source: images[0].image_url.url,
          title: 'User Upload',
          timestamp: Date.now(),
        });
      }
    }
  }
}

export class AssistantMessageHandler implements EventHandler<AgentEventStream.AssistantMessageEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AssistantMessageEvent {
    return event.type === 'assistant_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantMessageEvent,
  ): void {
    const { get, set } = context;

    updateMessages(context, sessionId, (messages) => {
      const existingIndex = findMessage(messages, event.messageId, event.id, 'assistant');
      
      const messageData = {
        id: event.id,
        role: 'assistant' as const,
        content: event.content,
        timestamp: event.timestamp,
        toolCalls: event.toolCalls,
        finishReason: event.finishReason,
        messageId: event.messageId,
        isStreaming: false,
        ttftMs: event.ttftMs,
        ttltMs: event.ttltMs,
      };

      if (existingIndex !== -1) {
        const updated = [...messages];
        updated[existingIndex] = { ...updated[existingIndex], ...messageData };
        return updated;
      }
      
      return [...messages, messageData];
    });

    if (event.finishReason !== 'tool_calls' && shouldUpdatePanelContent(get, sessionId)) {
      // Auto-associate with recent environment input for final browser state display
      const currentMessages = get(messagesAtom)[sessionId] || [];

      for (let i = currentMessages.length - 1; i >= 0; i--) {
        const msg = currentMessages[i];
        if (msg.role === 'environment' && Array.isArray(msg.content)) {
          const imageContent = msg.content.find(
            (item): item is ChatCompletionContentPartImage =>
              typeof item === 'object' &&
              item !== null &&
              'type' in item &&
              item.type === 'image_url' &&
              'image_url' in item &&
              typeof item.image_url === 'object' &&
              item.image_url !== null &&
              'url' in item.image_url,
          );

          if (imageContent && imageContent.image_url) {
            set(activePanelContentAtom, {
              type: 'image',
              source: msg.content,
              title: msg.description || 'Final Browser State',
              timestamp: msg.timestamp,
              environmentId: msg.id,
            });
            break;
          }
        }
      }
    }

    set(isProcessingAtom, false);
  }
}

export class StreamingMessageHandler implements EventHandler<AgentEventStream.AssistantStreamingMessageEvent> {
  canHandle(
    event: AgentEventStream.Event,
  ): event is AgentEventStream.AssistantStreamingMessageEvent {
    return event.type === 'assistant_streaming_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantStreamingMessageEvent,
  ): void {
    const { set } = context;

    updateMessages(context, sessionId, (messages) => {
      // Find existing streaming message
      let existingIndex = -1;
      
      if (event.messageId) {
        existingIndex = messages.findIndex(
          (msg) => msg.messageId === event.messageId && msg.role === 'assistant'
        );
      }
      
      // Fallback to last streaming assistant message
      if (existingIndex === -1) {
        existingIndex = messages.findLastIndex(
          (msg) => msg.role === 'assistant' && msg.isStreaming
        );
      }

      if (existingIndex !== -1) {
        // Update existing streaming message
        const existing = messages[existingIndex];
        const currentContent = typeof existing.content === 'string' ? existing.content : '';
        const updated = [...messages];
        updated[existingIndex] = {
          ...existing,
          content: currentContent + event.content,
          isStreaming: !event.isComplete,
          toolCalls: event.toolCalls || existing.toolCalls,
        };
        return updated;
      } else {
        // Create new streaming message
        return [...messages, {
          id: event.id || uuidv4(),
          role: 'assistant' as const,
          content: event.content,
          timestamp: event.timestamp,
          isStreaming: !event.isComplete,
          toolCalls: event.toolCalls,
          messageId: event.messageId,
        }];
      }
    });

    if (event.isComplete) {
      set(isProcessingAtom, false);
    }
  }
}

export class ThinkingMessageHandler implements
    EventHandler<
      | AgentEventStream.AssistantThinkingMessageEvent
      | AgentEventStream.AssistantStreamingThinkingMessageEvent
    >
{
  canHandle(
    event: AgentEventStream.Event,
  ): event is
    | AgentEventStream.AssistantThinkingMessageEvent
    | AgentEventStream.AssistantStreamingThinkingMessageEvent {
    return (
      event.type === 'assistant_thinking_message' ||
      event.type === 'assistant_streaming_thinking_message'
    );
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event:
      | AgentEventStream.AssistantThinkingMessageEvent
      | AgentEventStream.AssistantStreamingThinkingMessageEvent,
  ): void {
    updateMessages(context, sessionId, (messages) => {
      const existingIndex = event.messageId 
        ? messages.findIndex(msg => msg.messageId === event.messageId && msg.role === 'assistant')
        : -1;

      const isStreaming = event.type === 'assistant_streaming_thinking_message';
      
      if (existingIndex !== -1) {
        // Update existing assistant message with thinking content
        const existing = messages[existingIndex];
        const newThinking = isStreaming 
          ? (existing.thinking || '') + event.content
          : event.content;
        
        const updated = [...messages];
        updated[existingIndex] = {
          ...existing,
          thinking: newThinking,
          isStreaming: isStreaming && !event.isComplete,
        };
        return updated;
      } else {
        // Create new assistant message with thinking content
        return [...messages, {
          id: event.id || uuidv4(),
          role: 'assistant' as const,
          content: '',
          timestamp: event.timestamp,
          thinking: event.content,
          messageId: event.messageId,
          isStreaming: isStreaming && !event.isComplete,
        }];
      }
    });
  }
}
