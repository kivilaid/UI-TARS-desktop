/**
 * Fixed Trace to EventStream Mapper
 * Properly handles span lifecycle tracking
 */

const fs = require('fs');
const readline = require('readline');

class FixedTraceMapper {
  constructor() {
    this.spanStates = new Map(); // Track span lifecycles
    this.events = [];
    this.messageIdCounter = 0;
  }

  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg_${++this.messageIdCounter}`;
  }

  convertTimestamp(timeUnixNano) {
    return Math.floor(timeUnixNano / 1000000);
  }

  parseAttributes(attributesStr) {
    try {
      return attributesStr ? JSON.parse(attributesStr) : {};
    } catch (e) {
      return {};
    }
  }

  processTraceLine(line) {
    try {
      const trace = JSON.parse(line);
      const attrs = this.parseAttributes(trace.attributes);
      let newEvents = [];

      // Handle START events - establish span context
      if (trace.type === 'START' && trace.name) {
        this.spanStates.set(trace.span_id, {
          name: trace.name,
          startTime: this.convertTimestamp(trace.time_unix_nano),
          messageId: this.generateMessageId(),
          traceId: trace.trace_id,
          parentSpanId: trace.parent_span_id
        });

        // Generate appropriate start events
        switch (trace.name) {
          case 'agent_step':
            newEvents.push({
              id: this.generateEventId(),
              type: 'agent_run_start',
              timestamp: this.convertTimestamp(trace.time_unix_nano),
              sessionId: trace.trace_id,
              runOptions: {},
              agentName: 'trace_agent'
            });
            break;

          case 'portal.run_action':
            if (attrs.inputs) {
              newEvents.push({
                id: this.generateEventId(),
                type: 'tool_call',
                timestamp: this.convertTimestamp(trace.time_unix_nano),
                toolCallId: trace.span_id,
                name: attrs.inputs.action_id || 'unknown_tool',
                arguments: attrs.inputs.data || {},
                startTime: this.convertTimestamp(trace.time_unix_nano),
                tool: {
                  name: attrs.inputs.action_id || 'unknown_tool',
                  description: `Tool execution via ${attrs.inputs.provider || 'unknown'}`,
                  schema: {}
                }
              });
            }
            break;
        }
      }

      // Handle UPDATE events - use span state to determine context
      else if (trace.type === 'UPDATE') {
        const spanState = this.spanStates.get(trace.span_id);
        if (spanState) {
          switch (spanState.name) {
            case 'llm':
              if (attrs.outputs?.content) {
                newEvents.push({
                  id: this.generateEventId(),
                  type: 'assistant_streaming_message',
                  timestamp: this.convertTimestamp(trace.time_unix_nano),
                  content: attrs.outputs.content,
                  messageId: spanState.messageId,
                  isComplete: false
                });
              }
              break;

            case 'portal.run_action':
              if (attrs.outputs) {
                // This could be intermediate tool output
                console.log(`Tool update for ${trace.span_id}: ${JSON.stringify(attrs.outputs).substring(0, 100)}...`);
              }
              break;
          }
        }
      }

      // Handle END events - finalize spans
      else if (trace.type === 'END') {
        const spanState = this.spanStates.get(trace.span_id);
        if (spanState) {
          const elapsedMs = this.convertTimestamp(trace.time_unix_nano) - spanState.startTime;

          switch (spanState.name) {
            case 'agent_step':
              newEvents.push({
                id: this.generateEventId(),
                type: 'agent_run_end',
                timestamp: this.convertTimestamp(trace.time_unix_nano),
                sessionId: spanState.traceId,
                iterations: 1,
                elapsedMs,
                status: 'completed'
              });
              break;

            case 'llm':
              newEvents.push({
                id: this.generateEventId(),
                type: 'assistant_message',
                timestamp: this.convertTimestamp(trace.time_unix_nano),
                content: attrs.outputs?.content || 'LLM response completed',
                messageId: spanState.messageId,
                ttltMs: elapsedMs,
                finishReason: 'stop'
              });
              break;

            case 'portal.run_action':
              newEvents.push({
                id: this.generateEventId(),
                type: 'tool_result',
                timestamp: this.convertTimestamp(trace.time_unix_nano),
                toolCallId: trace.span_id,
                name: 'tool_execution',
                content: attrs.outputs?.result || attrs.outputs?.data || 'Tool execution completed',
                elapsedMs,
                error: attrs.outputs?.data?.stderr || undefined
              });
              break;

            case 'parse_tool_calls':
              if (attrs.outputs) {
                newEvents.push({
                  id: this.generateEventId(),
                  type: 'system',
                  timestamp: this.convertTimestamp(trace.time_unix_nano),
                  level: 'info',
                  message: 'Tool calls parsed',
                  details: {
                    span_id: trace.span_id,
                    outputs: attrs.outputs
                  }
                });
              }
              break;
          }

          // Clean up span state
          this.spanStates.delete(trace.span_id);
        }
      }

      this.events.push(...newEvents);
      return newEvents;

    } catch (error) {
      console.error('Error processing trace line:', error.message);
      return [];
    }
  }

  analyzeEventTypes() {
    const typeCounts = {};
    this.events.forEach(event => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    return typeCounts;
  }
}

// Test the fixed mapper
async function testFixedMapper() {
  const mapper = new FixedTraceMapper();
  const filePath = 'multimodal/tarko/agent-ui-builder/agent_trace.jsonl';
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  const maxLines = 30;
  
  console.log('=== Testing Fixed Mapper ===\n');
  
  for await (const line of rl) {
    lineCount++;
    if (lineCount > maxLines) break;
    
    const events = mapper.processTraceLine(line);
    
    if (events.length > 0) {
      console.log(`Line ${lineCount}: Generated ${events.length} event(s)`);
      events.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.type}`);
        if (event.content) {
          console.log(`     Content: ${event.content.substring(0, 80)}...`);
        }
        if (event.name) {
          console.log(`     Tool: ${event.name}`);
        }
      });
    }
  }
  
  console.log('\n=== Final Summary ===');
  console.log(`Total events generated: ${mapper.events.length}`);
  
  const typeCounts = mapper.analyzeEventTypes();
  console.log('\nEvent type distribution:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

testFixedMapper().catch(console.error);