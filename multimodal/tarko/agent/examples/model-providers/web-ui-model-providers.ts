/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Example showing how to configure model providers for Web UI.
 * Model providers are now configured at the Web UI level,
 * allowing runtime model switching in the interface.
 */

import { AgentServer } from '@tarko/agent-server';
import { Agent } from '../../src';

async function main() {
  const server = new AgentServer({
    // Agent configuration with default model
    model: {
      provider: 'deepseek',
      id: 'ep-20250205140236',
      baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
      apiKey: process.env.ARK_DEEPSEEK_API_KEY,
    },
    workspace: process.cwd(),
    
    // Agent implementation
    agent: {
      type: 'constructor',
      constructor: Agent,
    },
    
    // Web UI configuration with model providers
    webui: {
      type: 'static',
      staticPath: '@tarko/agent-ui',
      model: {
        providers: [
          {
            name: 'deepseek',
            baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
            apiKey: process.env.ARK_DEEPSEEK_API_KEY,
            models: [
              'ep-20250205140052', // DeepSeek R1
              'ep-20250205140236', // DeepSeek V3
            ],
          },
          {
            name: 'openai',
            baseURL: 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
            models: [
              'gpt-4o',
              'gpt-4o-mini',
            ],
          },
        ],
      },
    },
  });

  // Start the server
  await server.start();
  console.log('Server started with model provider switching enabled');
}

main().catch(console.error);
