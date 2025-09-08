# Agent Trace JSONL to AgentEventStream Analysis Report

## Overview

This report analyzes the structure of `agent_trace.jsonl` and maps it to the `AgentEventStream` interface defined in `multimodal/tarko/agent-interface/src/agent-event-stream.ts`.

## Source Data Structure (agent_trace.jsonl)

The JSONL file contains **283 lines** of tracing data with the following structure:

### Event Types
- `START`: Beginning of a span/operation
- `UPDATE`: Progress updates during operation
- `END`: Completion of a span/operation

### Span Names (Operations)
- `agent_step`: High-level agent execution step
- `llm`: Language model interactions
- `parse_tool_calls`: Tool call parsing operations
- `portal.run_action`: Tool execution operations

### Core Fields
```json
{
  "type": "START|UPDATE|END",
  "span_id": "unique_span_identifier",
  "time_unix_nano": 1756368841261194200,
  "parent_span_id": "parent_span_id_or_empty",
  "trace_id": "overall_trace_identifier",
  "name": "operation_name",
  "attributes": "{JSON_string_with_inputs_outputs}",
  "events": [],
  "status": { "code": "UNSET", "message": null }
}
```

### Attributes Structure
Attributes contain operation-specific data:
- **inputs**: Parameters for the operation (for START events)
- **outputs**: Results from the operation (for UPDATE/END events)
- **metadata**: hostname, process_id, thread_id, task_id

## Target Structure (AgentEventStream)

The AgentEventStream defines a flat event structure with specific event types:

### Core Event Types
- `user_message`: User input
- `assistant_message`: Agent response
- `assistant_thinking_message`: Agent reasoning
- `tool_call`: Tool invocation
- `tool_result`: Tool execution result
- `system`: System messages
- `agent_run_start`/`agent_run_end`: Session lifecycle

### Base Event Structure
```typescript
interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
}
```

## Mapping Analysis

### 1. Structural Differences

| Aspect | agent_trace.jsonl | AgentEventStream |
|--------|-------------------|------------------|
| Event Granularity | Span-based (START/UPDATE/END) | Action-based (discrete events) |
| Hierarchy | Parent-child spans | Flat event sequence |
| Data Location | Nested in attributes | Direct event properties |
| Timing | Unix nanoseconds | Unix milliseconds |
| Identifiers | span_id + trace_id | Single event id |

### 2. Event Type Mapping

#### LLM Operations
```
agent_trace.jsonl:
  name: "llm"
  type: "START" -> attributes.inputs (prompt, model, etc.)
  type: "UPDATE" -> attributes.outputs.content (streaming response)
  type: "END" -> final response

AgentEventStream:
  assistant_streaming_message -> for streaming updates
  assistant_message -> for final response
```

#### Tool Operations
```
agent_trace.jsonl:
  name: "parse_tool_calls" -> tool call parsing
  name: "portal.run_action" -> tool execution
  
AgentEventStream:
  tool_call -> tool invocation
  tool_result -> tool execution result
```

#### Agent Steps
```
agent_trace.jsonl:
  name: "agent_step" -> high-level agent iteration
  
AgentEventStream:
  agent_run_start/agent_run_end -> session boundaries
```

### 3. Data Transformation Requirements

#### Timestamp Conversion
```javascript
// agent_trace.jsonl uses nanoseconds
const timestampMs = Math.floor(time_unix_nano / 1000000);
```

#### ID Generation
```javascript
// Generate AgentEventStream compatible IDs
const eventId = `${span_id}_${type.toLowerCase()}`;
```

#### Content Extraction
```javascript
// Extract content from nested attributes
const attributes = JSON.parse(jsonObj.attributes);
const content = attributes.outputs?.content || attributes.inputs?.prompt;
```

## Proposed Mapping Implementation

### Core Transformation Function

```javascript
function transformTraceToEventStream(traceLine) {
  const trace = JSON.parse(traceLine);
  const events = [];
  
  // Parse attributes
  const attrs = trace.attributes ? JSON.parse(trace.attributes) : {};
  
  // Base event properties
  const baseEvent = {
    id: `${trace.span_id}_${trace.type.toLowerCase()}`,
    timestamp: Math.floor(trace.time_unix_nano / 1000000)
  };
  
  // Map based on span name and type
  switch (trace.name) {
    case 'llm':
      return transformLLMEvent(trace, attrs, baseEvent);
    case 'portal.run_action':
      return transformToolEvent(trace, attrs, baseEvent);
    case 'agent_step':
      return transformAgentStepEvent(trace, attrs, baseEvent);
    case 'parse_tool_calls':
      return transformToolCallEvent(trace, attrs, baseEvent);
  }
  
  return events;
}
```

### Specific Transformers

#### LLM Events
```javascript
function transformLLMEvent(trace, attrs, baseEvent) {
  switch (trace.type) {
    case 'START':
      // Could generate user_message from inputs
      break;
    case 'UPDATE':
      if (attrs.outputs?.content) {
        return {
          ...baseEvent,
          type: 'assistant_streaming_message',
          content: attrs.outputs.content,
          messageId: trace.span_id
        };
      }
      break;
    case 'END':
      return {
        ...baseEvent,
        type: 'assistant_message',
        content: attrs.outputs?.content || '',
        messageId: trace.span_id
      };
  }
}
```

#### Tool Events
```javascript
function transformToolEvent(trace, attrs, baseEvent) {
  switch (trace.type) {
    case 'START':
      return {
        ...baseEvent,
        type: 'tool_call',
        toolCallId: trace.span_id,
        name: attrs.inputs?.action_id || 'unknown',
        arguments: attrs.inputs?.data || {},
        startTime: baseEvent.timestamp
      };
    case 'END':
      return {
        ...baseEvent,
        type: 'tool_result',
        toolCallId: trace.span_id,
        name: attrs.inputs?.action_id || 'unknown',
        content: attrs.outputs?.result || attrs.outputs?.data,
        elapsedMs: 0 // Calculate from START to END
      };
  }
}
```

## Key Challenges

1. **State Management**: AgentEventStream expects discrete events, but trace data is span-based
2. **Content Reconstruction**: Need to correlate START/UPDATE/END events to build complete messages
3. **Tool Call Correlation**: Matching parse_tool_calls with portal.run_action spans
4. **Streaming Simulation**: Converting UPDATE events to streaming events
5. **Missing Context**: Some AgentEventStream fields (like user messages) may not be present in trace data

## Recommendations

1. **Implement Stateful Converter**: Track span lifecycles to generate appropriate AgentEventStream events
2. **Correlation Logic**: Use parent_span_id to link related operations
3. **Content Buffering**: Accumulate streaming content from UPDATE events
4. **Metadata Preservation**: Map trace metadata to AgentEventStream event properties
5. **Validation Layer**: Ensure generated events conform to AgentEventStream interface

This mapping will enable visualization and analysis of trace data using existing AgentEventStream tooling.
