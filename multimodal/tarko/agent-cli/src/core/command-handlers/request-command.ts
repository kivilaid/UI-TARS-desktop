/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { CLICommand } from '../../types';
import { CommandHandler } from '../command-handler';

/**
 * Handler for the 'request' command
 */
export class RequestCommandHandler implements CommandHandler {
  configure(command: CLICommand): CLICommand {
    return command
      .option('--provider <provider>', 'LLM provider name (required)')
      .option('--model <model>', 'Model name (required)')
      .option('--body <body>', 'Path to request body JSON file or JSON string (required)')
      .option('--apiKey [apiKey]', 'Custom API key')
      .option('--baseURL [baseURL]', 'Custom base URL')
      .option('--stream', 'Enable streaming mode')
      .option('--thinking', 'Enable reasoning mode')
      .option('--format [format]', 'Output format: "raw" (default) or "semantic"', {
        default: 'raw',
      });
  }

  async execute(options: AgentCLIArguments = {}): Promise<void> {
    try {
      const { processRequestCommand } = await import('../commands/request');
      await processRequestCommand(options as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to process request:', message);
      process.exit(1);
    }
  }
}
