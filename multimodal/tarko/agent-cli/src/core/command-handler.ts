/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { AgentServerInitOptions } from '../types';
import { CLICommand } from '../types';

/**
 * Base interface for command handlers
 */
export interface CommandHandler {
  /**
   * Configure the command with options and actions
   */
  configure(command: CLICommand): CLICommand;

  /**
   * Execute the command with given arguments
   */
  execute(args: AgentCLIArguments): Promise<void>;
}

/**
 * Base class for agent-related command handlers
 */
export abstract class BaseAgentCommandHandler implements CommandHandler {
  constructor(
    protected processArguments: (args: AgentCLIArguments) => Promise<{
      agentServerInitOptions: AgentServerInitOptions;
      isDebug: boolean;
    }>,
  ) {}

  abstract configure(command: CLICommand): CLICommand;
  abstract execute(args: AgentCLIArguments): Promise<void>;

  /**
   * Handle common error scenarios
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${context}:`, message);
    process.exit(1);
  }
}
