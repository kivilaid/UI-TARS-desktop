/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { CLICommand } from '../../types';
import { CommandHandler } from '../command-handler';
import { GlobalWorkspaceCommand } from '../commands';

/**
 * Handler for the 'workspace' command
 */
export class WorkspaceCommandHandler implements CommandHandler {
  constructor(private globalWorkspaceDir?: string) {}

  configure(command: CLICommand): CLICommand {
    return command
      .option('--init', 'Initialize a new workspace')
      .option('--open', 'Open the workspace in VSCode')
      .option('--enable', 'Enable global workspace')
      .option('--disable', 'Disable global workspace')
      .option('--status', 'Show workspace status');
  }

  async execute(
    options: {
      init?: boolean;
      open?: boolean;
      enable?: boolean;
      disable?: boolean;
      status?: boolean;
    } = {},
  ): Promise<void> {
    try {
      const workspaceCmd = new GlobalWorkspaceCommand(this.globalWorkspaceDir);
      await workspaceCmd.execute(options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Workspace command failed:', message);
      process.exit(1);
    }
  }
}
