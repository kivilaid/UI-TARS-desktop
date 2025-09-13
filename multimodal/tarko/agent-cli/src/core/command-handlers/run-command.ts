/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { addCommonOptions } from '../options';
import { CLICommand } from '../../types';
import { BaseAgentCommandHandler } from '../command-handler';
import { readFromStdin } from '../stdin';

/**
 * Handler for the 'run' command
 */
export class RunCommandHandler extends BaseAgentCommandHandler {
  configure(command: CLICommand): CLICommand {
    return addCommonOptions(command)
      .option('--headless', 'Run in headless mode and output results to stdout')
      .option('--input [...query]', 'Input query to process (for headless mode)')
      .option(
        '--format [format]',
        'Output format: "json" or "text" (default: "text") (for headless mode)',
        {
          default: 'text',
        },
      )
      .option(
        '--include-logs',
        'Include captured logs in the output (for debugging) (for headless mode)',
        {
          default: false,
        },
      )
      .option(
        '--use-cache [useCache]',
        'Use cache for headless mode execution (for headless mode)',
        {
          default: true,
        },
      );
  }

  async execute(...args: any[]): Promise<void> {
    // Handle dynamic arguments due to optional positional parameters [run] [agent]
    const cliArguments: AgentCLIArguments = args[args.length - 1] || {};
    const agent = args[args.length - 2];

    // If agent is provided as positional argument, use it
    if (agent && typeof agent === 'string') {
      if (cliArguments.agent && cliArguments.agent !== agent) {
        console.warn(
          `Warning: Both positional agent '${agent}' and --agent flag '${cliArguments.agent}' provided. Using positional agent '${agent}'.`,
        );
      }
      cliArguments.agent = agent;
    }

    if (cliArguments.headless) {
      await this.runHeadlessMode(cliArguments);
    } else {
      await this.runInteractiveMode(cliArguments);
    }
  }

  private async runHeadlessMode(cliArguments: AgentCLIArguments): Promise<void> {
    try {
      let input: string;

      if (
        cliArguments.input &&
        (Array.isArray(cliArguments.input) ? cliArguments.input.length > 0 : true)
      ) {
        input = Array.isArray(cliArguments.input)
          ? cliArguments.input.join(' ')
          : cliArguments.input;
      } else {
        const stdinInput = await readFromStdin();

        if (!stdinInput) {
          console.error('Error: No input provided. Use --input parameter or pipe content to stdin');
          process.exit(1);
        }

        input = stdinInput;
      }

      const quietMode = cliArguments.debug ? false : true;

      const { agentServerInitOptions, isDebug } = await this.processArguments({
        ...cliArguments,
        quiet: quietMode,
      });

      const useCache = cliArguments.useCache !== false;

      if (useCache) {
        const { processServerRun } = await import('../commands/run');
        await processServerRun({
          agentServerInitOptions,
          input,
          format: cliArguments.format as 'json' | 'text',
          includeLogs: cliArguments.includeLogs || !!cliArguments.debug,
          isDebug,
        });
      } else {
        const { processSilentRun } = await import('../commands/run');
        await processSilentRun({
          agentServerInitOptions,
          input,
          format: cliArguments.format as 'json' | 'text',
          includeLogs: cliArguments.includeLogs || !!cliArguments.debug,
        });
      }
    } catch (err) {
      this.handleError(err, 'Error');
    }
  }

  private async runInteractiveMode(cliArguments: AgentCLIArguments): Promise<void> {
    try {
      const { agentServerInitOptions, isDebug } = await this.processArguments(cliArguments);
      const { startInteractiveWebUI } = await import('../commands/start');
      await startInteractiveWebUI({
        agentServerInitOptions,
        isDebug,
        open: cliArguments.open,
      });
    } catch (err) {
      this.handleError(err, 'Failed to start server');
    }
  }
}
