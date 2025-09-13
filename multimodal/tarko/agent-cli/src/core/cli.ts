/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import path from 'path';
import {
  AgentCLIArguments,
  AgentServerVersionInfo,
  TARKO_CONSTANTS,
  LogLevel,
} from '@tarko/interface';
import { resolveAgentFromCLIArgument } from './options';
import { buildConfigPaths } from '../config/paths';
import { deepMerge, logger, printWelcomeLogo, resolveWorkspacePath } from '../utils';
import {
  buildAppConfig,
  CLIOptionsEnhancer,
  loadAgentConfig,
  loadEnvironmentVars,
} from '../config';
import { GlobalWorkspaceCommand } from './commands';
import { CLICommand, CLIInstance, AgentCLIInitOptions, AgentServerInitOptions } from '../types';
import {
  ServeCommandHandler,
  RunCommandHandler,
  RequestCommandHandler,
  WorkspaceCommandHandler,
} from './command-handlers';

const DEFAULT_OPTIONS: Partial<AgentCLIInitOptions> = {
  versionInfo: {
    version: '1.0.0',
    buildTime: __BUILD_TIME__,
    gitHash: __GIT_HASH__,
  },
};

/**
 * Tarko Agent CLI
 */
export class AgentCLI {
  protected options: AgentCLIInitOptions;

  /**
   * Create a new Tarko Agent CLI instance
   *
   * @param options CLI initialization options
   */
  constructor(options: AgentCLIInitOptions) {
    const mergedOptions = deepMerge(DEFAULT_OPTIONS, options ?? {}) as AgentCLIInitOptions;
    this.options = mergedOptions;
  }

  /**
   * Get version info
   */
  getVersionInfo(): AgentServerVersionInfo {
    return this.options.versionInfo!;
  }

  /**
   * Bootstrap Agent CLI
   */
  bootstrap(): void {
    const binName = this.options.binName ?? 'Tarko';
    const cli = cac(binName);
    cli.version(this.getVersionInfo().version);
    cli.help(() => {
      this.printLogo();
    });
    this.initializeCommands(cli);
    cli.parse();
  }

  /**
   * Hook method for subclasses to extend the CLI
   * Subclasses should override this method to add their specific commands and customizations
   *
   * @param cli The CAC CLI instance
   */
  protected extendCli(cli: CLIInstance): void {
    // No-op in base class - subclasses can override to extend CLI
  }

  /**
   * Hook method for configuring high-level-agent-specific CLI options
   * This method is called for commands that run agents (serve, start, run)
   * Subclasses can override this to add their specific CLI options
   *
   * @param command The command to configure
   * @returns The configured command with agent-specific options
   */
  protected configureAgentCommand(command: CLICommand): CLICommand {
    // Base implementation does nothing - subclasses should override to add custom options
    return command;
  }

  /**
   * Hook method for creating CLI options enhancer
   * Subclasses can override this to provide their own option processing logic
   *
   * @returns CLI options enhancer function or undefined
   */
  protected configureCLIOptionsEnhancer(): CLIOptionsEnhancer | undefined {
    return undefined;
  }

  /**
   * Template method for command registration
   * This method controls the overall command registration flow and should not be overridden
   * Subclasses should implement the hook methods instead
   */
  private initializeCommands(cli: CLIInstance): void {
    // Register core commands first
    this.registerCoreCommands(cli);

    // Hook for subclasses to extend CLI with additional commands and customizations
    this.extendCli(cli);
  }

  /**
   * Register core CLI commands
   * This method registers the basic commands that all agent CLIs should have
   */
  private registerCoreCommands(cli: CLIInstance): void {
    // Create argument processor function for reuse
    const processArguments = this.createArgumentProcessor();

    this.registerServeCommand(cli, processArguments);
    this.registerRunCommand(cli, processArguments);
    this.registerRequestCommand(cli);
    this.registerWorkspaceCommand(cli);
  }

  /**
   * Create argument processor function for command handlers
   */
  private createArgumentProcessor() {
    return async (cliArguments: AgentCLIArguments) => {
      return await this.processCLIArguments(cliArguments);
    };
  }

  /**
   * Print welcome logo - can be overridden by subclasses
   */
  protected printLogo(): void {
    printWelcomeLogo(
      this.options.binName || 'Tarko',
      this.getVersionInfo().version,
      'An atomic Agentic CLI for executing effective Agents',
    );
  }

  /**
   * Register the 'serve' command
   */
  private registerServeCommand(
    cli: CLIInstance,
    processArguments: (args: AgentCLIArguments) => Promise<{
      agentServerInitOptions: AgentServerInitOptions;
      isDebug: boolean;
    }>,
  ): void {
    const handler = new ServeCommandHandler(processArguments);
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    // Configure command with handler
    let configuredCommand = handler.configure(serveCommand);
    
    // Apply agent-specific configurations
    configuredCommand = this.configureAgentCommand(configuredCommand);

    configuredCommand.action(async (cliArguments: AgentCLIArguments = {}) => {
      this.printLogo();
      await handler.execute(cliArguments);
    });
  }

  /**
   * Register the 'run' command (default command)
   */
  private registerRunCommand(
    cli: CLIInstance,
    processArguments: (args: AgentCLIArguments) => Promise<{
      agentServerInitOptions: AgentServerInitOptions;
      isDebug: boolean;
    }>,
  ): void {
    const handler = new RunCommandHandler(processArguments);
    const runCommand = cli.command('[run] [agent]', 'Run Agent in interactive UI or headless mode');

    // Configure command with handler
    let configuredCommand = handler.configure(runCommand);
    
    // Apply agent-specific configurations
    configuredCommand = this.configureAgentCommand(configuredCommand);
    
    configuredCommand.action(async (...args: any[]) => {
      await handler.execute(...args);
    });
  }

  /**
   * Register the 'request' command
   */
  private registerRequestCommand(cli: CLIInstance): void {
    const handler = new RequestCommandHandler();
    const requestCommand = cli.command('request', 'Send a direct request to an model provider');
    
    const configuredCommand = handler.configure(requestCommand);
    
    configuredCommand.action(async (options = {}) => {
      await handler.execute(options);
    });
  }



  /**
   * Process common command options and prepare configuration
   * This method is now private and handles all common CLI argument processing
   */
  private async processCLIArguments(cliArguments: AgentCLIArguments): Promise<{
    agentServerInitOptions: AgentServerInitOptions;
    isDebug: boolean;
  }> {
    const isDebug = !!cliArguments.debug;

    // Set logger level early based on CLI arguments
    if (cliArguments.quiet) {
      logger.setLevel(LogLevel.SILENT);
    } else if (isDebug) {
      logger.setLevel(LogLevel.DEBUG);
    }

    const workspace = resolveWorkspacePath(process.cwd(), cliArguments.workspace);

    // Init Environment Variables from .env files
    loadEnvironmentVars(workspace, isDebug);

    const globalWorkspaceCommand = new GlobalWorkspaceCommand(
      this.options.directories?.globalWorkspaceDir,
    );
    const globalWorkspaceEnabled = await globalWorkspaceCommand.isGlobalWorkspaceEnabled();

    // Build config paths with proper priority order
    const configPaths = buildConfigPaths({
      cliConfigPaths: cliArguments.config,
      remoteConfig: this.options.remoteConfig,
      workspace,
      globalWorkspaceEnabled,
      globalWorkspaceDir:
        this.options.directories?.globalWorkspaceDir || TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR,
      isDebug,
    });

    const userConfig = await loadAgentConfig(configPaths, isDebug);

    // Get CLI options enhancer from subclass
    const cliOptionsEnhancer = this.configureCLIOptionsEnhancer();

    const appConfig = buildAppConfig({
      cliArguments,
      userConfig,
      appDefaults: this.options.appConfig,
      cliOptionsEnhancer,
      workspacePath: workspace,
    });

    // Update logger level with final config if it differs from CLI arguments
    if (appConfig.logLevel && !cliArguments.quiet && !isDebug) {
      logger.setLevel(appConfig.logLevel);
    }

    // Map CLI options to `AgentImplementation` that can be consumed by
    // the AgentServer and hand them over to the Server for processing
    const agentImplementation = await resolveAgentFromCLIArgument(
      cliArguments.agent,
      appConfig.agent ?? this.options.appConfig?.agent,
    );

    logger.debug(`Using agent: ${agentImplementation.label ?? cliArguments.agent}`);

    // Set agent config.
    appConfig.agent = agentImplementation;
    // Set workspace config
    appConfig.workspace = workspace;

    return {
      agentServerInitOptions: {
        appConfig,
        versionInfo: this.options.versionInfo,
        directories: this.options.directories,
      },
      isDebug,
    };
  }

  private registerWorkspaceCommand(cli: CLIInstance): void {
    const handler = new WorkspaceCommandHandler(this.options.directories?.globalWorkspaceDir);
    const workspaceCommand = cli.command('workspace', 'Manage agent workspace');
    
    const configuredCommand = handler.configure(workspaceCommand);
    
    configuredCommand.action(async (options = {}) => {
      await handler.execute(options);
    });
  }
}
