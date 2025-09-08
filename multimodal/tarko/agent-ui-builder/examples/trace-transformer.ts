import { AgentEventStream } from '../src';
import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Trace data structure from agent_trace.jsonl
 */
interface TraceEvent {
  type: 'START' | 'UPDATE' | 'END';
  span_id: string;
  time_unix_nano: number;
  parent_span_id?: string;
  trace_id?: string;
  name?: string;
  attributes?: {
    inputs?: {
      messages?: Array<{ role: string; content: string }>;
      model?: string;
      kwargs?: any;
      provider?: string;
      action_id?: string;
      data?: any;
      timeout?: number;
    };
    outputs?: {
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
      result?: string;
      data?: any;
      error?: string;
      exit_code?: number;
      openai?: any;
      raw?: any;
      [key: string]: any;
    };
    step?: number;
    hostname?: string;
    process_id?: number;
    thread_id?: number;
    task_id?: number;
  };
  events?: any[];
  status?: {
    code: string;
    message: string | null;
  };
}

/**
 * Transformer class to convert trace events to AgentEventStream events
 */
export class TraceTransformer {
  private events: AgentEventStream.Event[] = [];
  private spanContexts = new Map<string, {
    name?: string;
    startTime: number;
    inputs?: any;
    toolCallId?: string;
  }>();
  private messageIdCounter = 0;
  private toolCallIdCounter = 0;

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${++this.messageIdCounter}`;
  }

  private generateToolCallId(): string {
    return `tool_${++this.toolCallIdCounter}`;
  }

  private nanoToMs(nanoTime: number): number {
    return Math.floor(nanoTime / 1000000);
  }

  async transformFile(filePath: string): Promise<AgentEventStream.Event[]> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim() === '') continue;
      
      try {
        const traceEvent: TraceEvent = JSON.parse(line);
        this.processTraceEvent(traceEvent);
      } catch (error) {
        console.error('Error parsing trace event:', error);
      }
    }

    return this.events;
  }

  private processTraceEvent(trace: TraceEvent): void {
    const timestamp = this.nanoToMs(trace.time_unix_nano);

    switch (trace.type) {
      case 'START':
        this.handleStart(trace, timestamp);
        break;
      case 'UPDATE':
        this.handleUpdate(trace, timestamp);
        break;
      case 'END':
        this.handleEnd(trace, timestamp);
        break;
    }
  }

  private handleStart(trace: TraceEvent, timestamp: number): void {
    // Store span context
    this.spanContexts.set(trace.span_id, {
      name: trace.name,
      startTime: timestamp,
      inputs: trace.attributes?.inputs
    });

    // Handle specific span types
    switch (trace.name) {
      case 'agent_step':
        this.createAgentRunStartEvent(trace, timestamp);
        break;
      case 'llm':
        // LLM start - we'll wait for the UPDATE with outputs
        break;
      case 'portal.run_action':
        this.createToolCallEvent(trace, timestamp);
        break;
    }
  }

  private handleUpdate(trace: TraceEvent, timestamp: number): void {
    const context = this.spanContexts.get(trace.span_id);
    if (!context) return;

    const outputs = trace.attributes?.outputs;
    if (!outputs) return;

    switch (context.name) {
      case 'llm':
        this.handleLLMUpdate(trace, context, timestamp, outputs);
        break;
      case 'portal.run_action':
        this.handleToolResultUpdate(trace, context, timestamp, outputs);
        break;
    }
  }

  private handleEnd(trace: TraceEvent, timestamp: number): void {
    const context = this.spanContexts.get(trace.span_id);
    if (!context) return;

    switch (context.name) {
      case 'agent_step':
        this.createAgentRunEndEvent(trace, context, timestamp);
        break;
    }

    // Clean up context
    this.spanContexts.delete(trace.span_id);
  }

  private createAgentRunStartEvent(trace: TraceEvent, timestamp: number): void {
    const event: AgentEventStream.AgentRunStartEvent = {
      id: this.generateId(),
      type: 'agent_run_start',
      timestamp,
      sessionId: trace.trace_id || 'unknown',
      runOptions: {
        maxIterations: 100, // Default value
        streaming: true
      }
    };
    this.events.push(event);
  }

  private createAgentRunEndEvent(trace: TraceEvent, context: any, timestamp: number): void {
    const elapsedMs = timestamp - context.startTime;
    const event: AgentEventStream.AgentRunEndEvent = {
      id: this.generateId(),
      type: 'agent_run_end',
      timestamp,
      sessionId: trace.trace_id || 'unknown',
      iterations: trace.attributes?.step || 1,
      elapsedMs,
      status: 'completed'
    };
    this.events.push(event);
  }

  private handleLLMUpdate(trace: TraceEvent, context: any, timestamp: number, outputs: any): void {
    // Create assistant message
    if (outputs.content) {
      const messageId = this.generateMessageId();
      const ttltMs = timestamp - context.startTime;
      
      // Parse XML-style function calls from content
      const toolCalls = this.parseXMLFunctionCalls(outputs.content);
      
      const event: AgentEventStream.AssistantMessageEvent = {
        id: this.generateId(),
        type: 'assistant_message',
        timestamp,
        content: outputs.content,
        rawContent: outputs.raw,
        ttltMs,
        messageId
      };

      // Add parsed tool calls if present
      if (toolCalls.length > 0) {
        event.toolCalls = toolCalls;
      }

      this.events.push(event);
    }
  }

  private parseXMLFunctionCalls(content: string): any[] {
    const toolCalls: any[] = [];
    
    // Regex to match XML-style function calls
    const functionRegex = /<function=([^>]+)>([\s\S]*?)<\/function>/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const parametersXML = match[2];
      
      // Parse parameters from XML
      const parameters: Record<string, any> = {};
      const paramRegex = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;
      let paramMatch;
      
      while ((paramMatch = paramRegex.exec(parametersXML)) !== null) {
        const paramName = paramMatch[1];
        const paramValue = paramMatch[2].trim();
        parameters[paramName] = paramValue;
      }
      
      // Generate tool call in OpenAI format
      const toolCallId = this.generateToolCallId();
      toolCalls.push({
        id: toolCallId,
        type: 'function',
        function: {
          name: functionName,
          arguments: JSON.stringify(parameters)
        }
      });
    }
    
    return toolCalls;
  }

  private createToolCallEvent(trace: TraceEvent, timestamp: number): void {
    const inputs = trace.attributes?.inputs;
    if (!inputs || !inputs.action_id) return;

    const toolCallId = this.generateToolCallId();
    
    // Store tool call ID in context for result matching
    const context = this.spanContexts.get(trace.span_id);
    if (context) {
      context.toolCallId = toolCallId;
    }

    const event: AgentEventStream.ToolCallEvent = {
      id: this.generateId(),
      type: 'tool_call',
      timestamp,
      toolCallId,
      name: inputs.action_id,
      arguments: inputs.data || {},
      startTime: timestamp,
      tool: {
        name: inputs.action_id,
        description: `Tool: ${inputs.action_id}`,
        schema: {}
      }
    };
    
    this.events.push(event);
  }

  private handleToolResultUpdate(trace: TraceEvent, context: any, timestamp: number, outputs: any): void {
    if (!context.toolCallId) return;

    const elapsedMs = timestamp - context.startTime;
    const toolName = context.inputs?.action_id || 'unknown';

    const event: AgentEventStream.ToolResultEvent = {
      id: this.generateId(),
      type: 'tool_result',
      timestamp,
      toolCallId: context.toolCallId,
      name: toolName,
      content: outputs.result || outputs.data || outputs,
      elapsedMs,
      error: outputs.error
    };

    this.events.push(event);
  }

  getEvents(): AgentEventStream.Event[] {
    return this.events;
  }
}

// Usage example
export async function transformTraceFile(inputPath: string): Promise<AgentEventStream.Event[]> {
  const transformer = new TraceTransformer();
  return await transformer.transformFile(inputPath);
}
