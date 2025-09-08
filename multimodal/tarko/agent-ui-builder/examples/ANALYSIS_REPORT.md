# Agent Trace to AgentEventStream Transformation Analysis Report

## Overview

This report analyzes the transformation from `agent_trace.jsonl` format to `AgentEventStream` format, documenting the structural differences and mapping approach.

## Source Data Structure Analysis

### Trace Event Format (agent_trace.jsonl)

The source data follows an OpenTelemetry-like tracing format with these characteristics:

```typescript
interface TraceEvent {
  type: 'START' | 'UPDATE' | 'END';           // Span lifecycle
  span_id: string;                            // Unique span identifier
  time_unix_nano: number;                     // High-precision timestamp
  parent_span_id?: string;                    // Parent span for hierarchy
  trace_id?: string;                          // Overall trace identifier
  name?: string;                              // Span name (e.g., 'llm', 'agent_step')
  attributes?: {                              // Span-specific data
    inputs?: any;                             // Input parameters
    outputs?: any;                            // Execution results
    // ... other metadata
  };
  events?: any[];                             // Span events
  status?: { code: string; message: string }; // Execution status
}
```

### Key Span Types Identified

1. **`agent_step`**: Represents a complete agent iteration
2. **`llm`**: LLM inference calls with inputs/outputs
3. **`parse_tool_calls`**: Tool call parsing operations
4. **`portal.run_action`**: Tool execution (e.g., `execute_bash`)

## Target Format Analysis

### AgentEventStream Format

The target format follows an event-driven architecture with these principles:

- **Event-centric**: Each event represents a discrete action or state change
- **Typed events**: Strong typing for different event categories
- **Streaming-friendly**: Designed for real-time processing
- **User-focused**: Events correspond to user-visible actions

### Key Event Types in Target Format

1. **`agent_run_start/end`**: Session lifecycle events
2. **`assistant_message`**: LLM responses with content
3. **`tool_call`**: Tool invocation events
4. **`tool_result`**: Tool execution results
5. **`user_message`**: User inputs (not present in trace data)

## Transformation Mapping

### 1. Span Lifecycle → Event Mapping

| Trace Span | Event Type | Mapping Logic |
|------------|------------|---------------|
| `agent_step` START | `agent_run_start` | Session initiation |
| `agent_step` END | `agent_run_end` | Session completion |
| `llm` UPDATE with outputs | `assistant_message` | LLM response content |
| `portal.run_action` START | `tool_call` | Tool invocation |
| `portal.run_action` UPDATE | `tool_result` | Tool execution result |

### 2. Data Field Mapping

#### Agent Run Events
```typescript
// Source: agent_step span
TraceEvent {
  name: 'agent_step',
  attributes: { step: 1, ... }
}

// Target: AgentRunStartEvent
{
  type: 'agent_run_start',
  sessionId: trace.trace_id,
  runOptions: { maxIterations: 100, streaming: true }
}
```

#### Assistant Messages
```typescript
// Source: llm span UPDATE
TraceEvent {
  name: 'llm',
  type: 'UPDATE',
  attributes: {
    outputs: {
      content: "I'll help you...",
      tool_calls: [...]
    }
  }
}

// Target: AssistantMessageEvent
{
  type: 'assistant_message',
  content: outputs.content,
  toolCalls: outputs.tool_calls,
  ttltMs: elapsedTime
}
```

#### Tool Events
```typescript
// Source: portal.run_action span
TraceEvent {
  name: 'portal.run_action',
  attributes: {
    inputs: {
      action_id: 'execute_bash',
      data: { command: 'pwd && ls' }
    },
    outputs: {
      result: "/workspace\n..."
    }
  }
}

// Target: ToolCallEvent + ToolResultEvent
{
  type: 'tool_call',
  name: 'execute_bash',
  arguments: { command: 'pwd && ls' }
}
{
  type: 'tool_result',
  content: "/workspace\n...",
  elapsedMs: calculatedTime
}
```

## Design Differences

### 1. **Conceptual Model**
- **Trace Format**: Infrastructure-focused, spans represent execution units
- **EventStream Format**: User-focused, events represent conversation flow

### 2. **Temporal Representation**
- **Trace Format**: Span lifecycle (START/UPDATE/END) with hierarchical relationships
- **EventStream Format**: Linear event sequence with timestamps

### 3. **Data Organization**
- **Trace Format**: Attributes contain both inputs and outputs in separate span updates
- **EventStream Format**: Each event is self-contained with relevant data

### 4. **Tool Handling**
- **Trace Format**: Tool calls and results are separate span updates
- **EventStream Format**: Explicit `tool_call` and `tool_result` event pairs

### 5. **Streaming Support**
- **Trace Format**: Not designed for streaming (batch updates)
- **EventStream Format**: Native streaming support with incremental events

## Transformation Challenges

### 1. **Missing User Messages**
The trace data doesn't contain explicit user messages, only system/agent interactions.

### 2. **Span Context Management**
Required maintaining span context across START/UPDATE/END events to correlate related data.

### 3. **Time Precision**
Converting nanosecond timestamps to milliseconds for EventStream compatibility.

### 4. **Tool Call Correlation**
Matching tool calls with their results across different span updates.

## Implementation Results

### Transformation Statistics
- **Total events generated**: 84
- **Event type distribution**:
  - `agent_run_start`: 20 events
  - `assistant_message`: 20 events  
  - `tool_call`: 12 events
  - `tool_result`: 12 events
  - `agent_run_end`: 20 events

### Generated Artifacts
1. **`trace-transformer.ts`**: Core transformation logic
2. **`transform-and-dump.ts`**: Example usage with UI generation
3. **`trace-viewer.html`**: Interactive HTML viewer
4. **`transformed-events.json`**: Complete transformed event data

## Recommendations

### 1. **Enhanced User Context**
Consider capturing user messages in the original trace format to provide complete conversation context.

### 2. **Streaming Optimization**
For real-time scenarios, implement streaming transformation to convert trace spans to events as they occur.

### 3. **Error Handling**
Add support for error events when tool executions fail or LLM calls encounter issues.

### 4. **Metadata Preservation**
Preserve additional trace metadata (hostname, process_id, etc.) in event extra fields for debugging.

## Conclusion

The transformation successfully bridges the gap between infrastructure tracing and user-facing event streams. The resulting AgentEventStream events provide a clean, typed interface for UI rendering while preserving the essential information from the original trace data.

The transformer demonstrates how different observability formats can be unified under a common event schema, enabling consistent tooling and visualization across different agent implementations.
