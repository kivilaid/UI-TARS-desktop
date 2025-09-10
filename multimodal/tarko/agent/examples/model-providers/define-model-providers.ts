/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An minimal example, using built-in model provider.
 * Note: model.providers has been moved to Web UI configuration.
 * This example shows the simplified Agent configuration.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      provider: 'deepseek',
      id: 'ep-20250205140236', // DeepSeek R1
      baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
      apiKey: process.env.ARK_DEEPSEEK_API_KEY,
    },
  });

  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
