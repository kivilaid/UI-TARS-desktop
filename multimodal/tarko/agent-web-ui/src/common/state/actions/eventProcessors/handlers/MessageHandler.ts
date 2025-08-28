import { v4 as uuidv4 } from 'uuid';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { activePanelContentAtom, isProcessingAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { ChatCompletionContentPartImage } from '@tarko/agent-interface';

/**
 * Unified message handler - handles all message types with simple logic
 */
class UnifiedMessageHandler {
  /**
   * Simple message update/create logic
   */
  protected updateMessage(
    context: EventHandlerContext,
    sessionId: string,
    messageUpdate: Partial<Message> & { id: string },
  ): void {
    const { set } = context;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      const messageId = messageUpdate.messageId || messageUpdate.id;
      
      // Find existing message by messageId or id
      const existingIndex = sessionMessages.findIndex(
        (msg) => (msg.messageId && msg.messageId === messageId) || msg.id === messageUpdate.id
      );

      if (existingIndex !== -1) {
        // Update existing message
        const updatedMessages = [...sessionMessages];
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex],
          ...messageUpdate,
        };
        return {
          ...prev,
          [sessionId]: updatedMessages,
        };
      } else {
        // Create new message
        const newMessage: Message = {
          role: 'assistant', // default role
          content: '',
          timestamp: Date.now(),
          ...messageUpdate,
        };
        return {
          ...prev,
          [sessionId]: [...sessionMessages, newMessage],
        };
      }
    });
  }
}

export class UserMessageHandler extends UnifiedMessageHandler implements EventHandler<AgentEventStream.UserMessageEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.UserMessageEvent {
    return event.type === 'user_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.UserMessageEvent,
  ): void {
    const { get, set } = context;

    this.updateMessage(context, sessionId, {
      id: event.id,
      role: 'user',
      content: event.content,
      timestamp: event.timestamp,
    });

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

export class AssistantMessageHandler extends UnifiedMessageHandler
  implements EventHandler<AgentEventStream.AssistantMessageEvent>
{
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AssistantMessageEvent {
    return event.type === 'assistant_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantMessageEvent,
  ): void {
    const { get, set } = context;

    this.updateMessage(context, sessionId, {
      id: event.id,
      role: 'assistant',
      content: event.content,
      timestamp: event.timestamp,
      toolCalls: event.toolCalls,
      finishReason: event.finishReason,
      messageId: event.messageId,
      isStreaming: false,
      ttftMs: event.ttftMs,
      ttltMs: event.ttltMs,
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

export class StreamingMessageHandler extends UnifiedMessageHandler
  implements EventHandler<AgentEventStream.AssistantStreamingMessageEvent>
{
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
    const { get, set } = context;
    const sessionMessages = get(messagesAtom)[sessionId] || [];
    
    // Find existing message to update
    const existingMessage = sessionMessages.find(
      (msg) => (event.messageId && msg.messageId === event.messageId) || 
               (msg.role === 'assistant' && msg.isStreaming)
    );

    if (existingMessage) {
      // Append to existing streaming message
      const currentContent = typeof existingMessage.content === 'string' ? existingMessage.content : '';
      this.updateMessage(context, sessionId, {
        id: existingMessage.id,
        content: currentContent + event.content,
        isStreaming: !event.isComplete,
        toolCalls: event.toolCalls || existingMessage.toolCalls,
        messageId: event.messageId || existingMessage.messageId,
      });
    } else {
      // Create new streaming message
      this.updateMessage(context, sessionId, {
        id: event.id || uuidv4(),
        role: 'assistant',
        content: event.content,
        timestamp: event.timestamp,
        isStreaming: !event.isComplete,
        toolCalls: event.toolCalls,
        messageId: event.messageId,
      });
    }

    if (event.isComplete) {
      set(isProcessingAtom, false);
    }
  }
}

export class ThinkingMessageHandler extends UnifiedMessageHandler
  implements
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
    const { get } = context;
    const sessionMessages = get(messagesAtom)[sessionId] || [];
    
    // Find existing assistant message with same messageId
    const existingMessage = event.messageId 
      ? sessionMessages.find(msg => msg.messageId === event.messageId && msg.role === 'assistant')
      : null;

    if (existingMessage) {
      // Update existing assistant message with thinking content
      let newThinking: string;
      if (event.type === 'assistant_streaming_thinking_message') {
        // Append to existing thinking content
        newThinking = (existingMessage.thinking || '') + event.content;
      } else {
        // Replace thinking content
        newThinking = event.content;
      }

      this.updateMessage(context, sessionId, {
        id: existingMessage.id,
        thinking: newThinking,
        messageId: event.messageId || existingMessage.messageId,
        isStreaming: event.type === 'assistant_streaming_thinking_message' && !event.isComplete,
      });
    } else {
      // Create new assistant message with thinking content
      this.updateMessage(context, sessionId, {
        id: event.id || uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: event.timestamp,
        thinking: event.content,
        messageId: event.messageId,
        isStreaming: event.type === 'assistant_streaming_thinking_message' && !event.isComplete,
      });
    }
  }
}
