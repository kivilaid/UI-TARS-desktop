/**
 * Trace to EventStream Mapper
 * Converts agent_trace.jsonl format to AgentEventStream events
 */

const fs = require('fs');
const readline = require('readline');

class TraceToEventStreamMapper {
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

  transformLLMEvent(trace, attrs) {
    const events = [];
    const messageId = this.spanStates.get(trace.span_id)?.messageId || this.generateMessageId();

    switch (trace.type) {
      case 'START':
        // Store span state
        this.spanStates.set(trace.span_id, {
          messageId,
          startTime: this.convertTimestamp(trace.time_unix_nano),
          type: 'llm'
        });
        break;

      case 'UPDATE':
        if (attrs.outputs?.content) {
          events.push({
            id: this.generateEventId(),
            type: 'assistant_streaming_message',
            timestamp: this.convertTimestamp(trace.time_unix_nano),
            content: attrs.outputs.content,
            messageId,
            isComplete: false
          });
        }
        break;

      case 'END':
        const spanState = this.spanStates.get(trace.span_id);
        if (spanState) {
          const ttltMs = this.convertTimestamp(trace.time_unix_nano) - spanState.startTime;
          
          events.push({
            id: this.generateEventId(),
            type: 'assistant_message',
            timestamp: this.convertTimestamp(trace.time_unix_nano),
            content: attrs.outputs?.content || '',
            messageId,
            ttltMs,
            finishReason: 'stop'
          });
          
          this.spanStates.delete(trace.span_id);
        }
        break;
    }

    return events;
  }

  transformToolEvent(trace, attrs) {
    const events = [];

    switch (trace.type) {
      case 'START':
        if (trace.name === 'portal.run_action' && attrs.inputs) {
          const toolCall = {
            id: this.generateEventId(),
            type: 'tool_call',
            timestamp: this.convertTimestamp(trace.time_unix_nano),
            toolCallId: trace.span_id,
            name: attrs.inputs.action_id || 'unknown_tool',
            arguments: attrs.inputs.data || {},
            startTime: this.convertTimestamp(trace.time_unix_nano),
            tool: {
              name: attrs.inputs.action_id || 'unknown_tool',
              description: `Tool execution via ${attrs.inputs.provider}`,
              schema: {} // Would need to be populated from tool registry
            }
          };
          
          events.push(toolCall);
          
          // Store span state for result correlation
          this.spanStates.set(trace.span_id, {
            toolName: attrs.inputs.action_id,
            startTime: this.convertTimestamp(trace.time_unix_nano)
          });
        }
        break;

      case 'END':
        if (trace.name === 'portal.run_action') {
          const spanState = this.spanStates.get(trace.span_id);
          if (spanState) {
            const elapsedMs = this.convertTimestamp(trace.time_unix_nano) - spanState.startTime;
            
            const toolResult = {
              id: this.generateEventId(),
              type: 'tool_result',
              timestamp: this.convertTimestamp(trace.time_unix_nano),
              toolCallId: trace.span_id,
              name: spanState.toolName,
              content: attrs.outputs?.result || attrs.outputs?.data || 'No result',
              elapsedMs
            };
            
            if (attrs.outputs?.data?.stderr) {
              toolResult.error = attrs.outputs.data.stderr;
            }
            
            events.push(toolResult);
            this.spanStates.delete(trace.span_id);
          }
        }
        break;
    }

    return events;
  }

  transformAgentStepEvent(trace, attrs) {
    const events = [];

    switch (trace.type) {
      case 'START':
        events.push({
          id: this.generateEventId(),
          type: 'agent_run_start',
          timestamp: this.convertTimestamp(trace.time_unix_nano),
          sessionId: trace.trace_id,
          runOptions: {}, // Would need to extract from attributes
          agentName: 'trace_agent'
        });
        break;

      case 'END':
        events.push({
          id: this.generateEventId(),
          type: 'agent_run_end',
          timestamp: this.convertTimestamp(trace.time_unix_nano),
          sessionId: trace.trace_id,
          iterations: 1, // Would need to count from trace
          elapsedMs: 0, // Would need to calculate
          status: 'completed'
        });
        break;
    }

    return events;
  }

  transformSystemEvent(trace, message) {
    return {
      id: this.generateEventId(),
      type: 'system',
      timestamp: this.convertTimestamp(trace.time_unix_nano),
      level: 'info',
      message,
      details: {
        span_id: trace.span_id,
        trace_id: trace.trace_id
      }
    };
  }

  processTraceLine(line) {
    try {
      const trace = JSON.parse(line);
      const attrs = this.parseAttributes(trace.attributes);
      let newEvents = [];

      // Route to appropriate transformer based on span name
      switch (trace.name) {
        case 'llm':
          newEvents = this.transformLLMEvent(trace, attrs);
          break;
        case 'portal.run_action':
          newEvents = this.transformToolEvent(trace, attrs);
          break;
        case 'agent_step':
          newEvents = this.transformAgentStepEvent(trace, attrs);
          break;
        case 'parse_tool_calls':
          // Could generate tool parsing events if needed
          break;
        default:
          // Generate system event for unknown spans
          if (trace.type === 'START') {
            newEvents = [this.transformSystemEvent(trace, `Started ${trace.name || 'unknown'} operation`)];
          }
      }

      this.events.push(...newEvents);
      return newEvents;

    } catch (error) {
      console.error('Error processing trace line:', error.message);
      return [];
    }
  }

  async processFile(filePath, outputPath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    const processedEvents = [];

    for await (const line of rl) {
      lineCount++;
      const events = this.processTraceLine(line);
      processedEvents.push(...events);
      
      if (lineCount % 50 === 0) {
        console.log(`Processed ${lineCount} lines, generated ${processedEvents.length} events`);
      }
    }

    // Sort events by timestamp
    processedEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Write output
    const output = {
      metadata: {
        sourceFile: filePath,
        totalTraceLines: lineCount,
        generatedEvents: processedEvents.length,
        conversionTimestamp: new Date().toISOString()
      },
      events: processedEvents
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\nConversion complete:`);
    console.log(`- Input: ${lineCount} trace lines`);
    console.log(`- Output: ${processedEvents.length} AgentEventStream events`);
    console.log(`- Saved to: ${outputPath}`);

    return output;
  }

  // Utility method to analyze event type distribution
  analyzeEventTypes() {
    const typeCounts = {};
    this.events.forEach(event => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    return typeCounts;
  }
}

// CLI usage
if (require.main === module) {
  const mapper = new TraceToEventStreamMapper();
  const inputFile = process.argv[2] || 'multimodal/tarko/agent-ui-builder/agent_trace.jsonl';
  const outputFile = process.argv[3] || 'converted_events.json';
  
  mapper.processFile(inputFile, outputFile)
    .then(result => {
      console.log('\nEvent type distribution:');
      const typeCounts = mapper.analyzeEventTypes();
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    })
    .catch(error => {
      console.error('Conversion failed:', error);
    });
}

module.exports = TraceToEventStreamMapper;
