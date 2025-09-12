/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This config is used for internal testing only, DO NOT reply on it.
 * @deprecated The ModelProvider concept has been simplified. Use AgentModel instead.
 */
import { AgentModel } from '../../src';

// Legacy test configurations - consider updating to use AgentModel directly
export const TEST_MODEL_CONFIGS: AgentModel[] = [
  {
    provider: 'volcengine',
    apiKey: process.env.ARK_API_KEY,
    id: 'ep-20250510145437-5sxhs', // 'doubao-1.5-thinking-vision-pro'
  },
  {
    provider: 'azure-openai',
    baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    id: 'aws_sdk_claude37_sonnet',
  },
  {
    provider: 'lm-studio',
    id: 'qwen2.5-coder-3b-instruct',
  },
  {
    provider: 'ollama',
    id: 'qwen3:1.7b',
  },
  {
    provider: 'openai',
    baseURL: process.env.OPENAI_API_BASE_URL,
    id: 'gpt-4o-2024-11-20',
  },
];

// Keep the old export for backward compatibility
export const TEST_MODEL_PROVIDERS = TEST_MODEL_CONFIGS;
