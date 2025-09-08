import { AgentUIBuilder } from '../src';
import { transformTraceFile } from './trace-transformer';
import * as path from 'path';

async function main() {
  try {
    console.log('Transforming agent_trace.jsonl to AgentEventStream format...');
    
    // Transform the trace file
    const traceFilePath = path.join(__dirname, '..', 'agent_trace.jsonl');
    const events = await transformTraceFile(traceFilePath);
    
    console.log(`Transformed ${events.length} events`);
    
    // Log first few events to verify transformation
    console.log('\nFirst 5 events:');
    events.slice(0, 5).forEach((event, index) => {
      console.log(`${index + 1}. ${event.type} (${new Date(event.timestamp).toISOString()})`);
      if (event.type === 'assistant_message') {
        const assistantEvent = event as any;
        console.log(`   Content preview: ${assistantEvent.content?.substring(0, 100)}...`);
      } else if (event.type === 'tool_call') {
        const toolEvent = event as any;
        console.log(`   Tool: ${toolEvent.name}, Args: ${JSON.stringify(toolEvent.arguments).substring(0, 100)}...`);
      } else if (event.type === 'tool_result') {
        const resultEvent = event as any;
        console.log(`   Result preview: ${JSON.stringify(resultEvent.content).substring(0, 100)}...`);
      }
    });
    
    // Create UI builder instance
    const builder = new AgentUIBuilder({
      /**
       * Event Stream - using transformed events
       */
      events,
      /**
       * Session Information
       */
      sessionInfo: {
        id: 'trace-session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspace: '/workspace',
        metadata: {
          name: 'Transformed Agent Trace Session',
          tags: ['trace', 'transformed'],
          modelConfig: {
            provider: 'openai',
            modelId: 'gpt-4',
            displayName: 'GPT-4',
            configuredAt: Date.now(),
          },
          agentInfo: {
            name: 'OpenHands Agent',
            configuredAt: Date.now(),
          },
        },
      },
      /**
       * Server Information
       */
      serverInfo: {
        version: '1.0.0',
        buildTime: Date.now(),
        gitHash: 'trace-transform',
      },
      /**
       * UI Configuration
       */
      uiConfig: {
        logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
        title: 'Agent Trace Viewer',
        subtitle: 'Visualizing transformed agent execution traces',
        welcomTitle: 'Agent Trace Analysis',
        guiAgent: {
          defaultScreenshotRenderStrategy: 'afterAction',
          enableScreenshotRenderStrategySwitch: true,
          renderGUIAction: true,
          renderBrowserShell: false,
        },
      },
    });

    // Generate HTML
    const outputPath = './trace-viewer.html';
    const html = builder.dump(outputPath);
    
    console.log(`\nGenerated HTML viewer at: ${outputPath}`);
    console.log('Open the file in a browser to view the transformed trace.');
    
    // Also save the transformed events as JSON for inspection
    const eventsOutputPath = './transformed-events.json';
    const fs = require('fs');
    fs.writeFileSync(eventsOutputPath, JSON.stringify(events, null, 2));
    console.log(`\nSaved transformed events to: ${eventsOutputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
