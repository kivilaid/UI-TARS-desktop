/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { addCommonOptions } from '../options';
import { CLICommand } from '../../types';
import { BaseAgentCommandHandler } from '../command-handler';

/**
 * Handler for the 'serve' command
 */
export class ServeCommandHandler extends BaseAgentCommandHandler {
  configure(command: CLICommand): CLICommand {
    return addCommonOptions(command);
  }

  async execute(cliArguments: AgentCLIArguments = {}): Promise<void> {
    try {
      const { agentServerInitOptions, isDebug } = await this.processArguments(cliArguments);
      const { startHeadlessServer } = await import('../commands/serve');
      await startHeadlessServer({
        agentServerInitOptions,
        isDebug,
      });
    } catch (err) {
      this.handleError(err, 'Failed to start server');
    }
  }
}
