/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge, isTest } from '@tarko/shared-utils';
import { getStaticPath } from '@tarko/agent-ui-builder';
import {
  CommonFilterOptions,
  AgentCLIArguments,
  ModelProviderName,
  AgentAppConfig,
  LogLevel,
  isAgentWebUIImplementationType,
} from '@tarko/interface';
import { resolveValue, loadWorkspaceConfig } from '../utils';
import { logConfigComplete } from './display';

/**
 * Handler for processing custom CLI options
 */
export type CLIOptionsEnhancer<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentAppConfig = AgentAppConfig,
> = (cliArguments: T, appConfig: Partial<U>) => void;

/**
 * Configuration builder options
 */
export interface ConfigBuilderOptions<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentAppConfig = AgentAppConfig,
> {
  cliArguments: T;
  userConfig: Partial<U>;
  appDefaults?: Partial<U>;
  cliOptionsEnhancer?: CLIOptionsEnhancer<T, U>;
  workspacePath?: string;
}

/**
 * Build complete application configuration from CLI arguments, user config, and app defaults
 *
 * Follows the configuration priority order:
 * L0: CLI Arguments (highest priority)
 * L1: Workspace Config File
 * L2: Global Workspace Config File
 * L3: CLI Config Files
 * L4: CLI Remote Config
 * L5: CLI Node API Config (lowest priority)
 */
export function buildAppConfig<
  T extends AgentCLIArguments = AgentCLIArguments,
  U extends AgentAppConfig = AgentAppConfig,
>(
  cliArgumentsOrOptions: T | ConfigBuilderOptions<T, U>,
  userConfig?: Partial<U>,
  appDefaults?: Partial<U>,
  cliOptionsEnhancer?: CLIOptionsEnhancer<T, U>,
  workspacePath?: string,
): U {
  // Handle both old and new API for backward compatibility
  let options: ConfigBuilderOptions<T, U>;
  
  if (userConfig !== undefined || appDefaults !== undefined || cliOptionsEnhancer !== undefined || workspacePath !== undefined) {
    // Old API: individual parameters
    options = {
      cliArguments: cliArgumentsOrOptions as T,
      userConfig: userConfig || {},
      appDefaults,
      cliOptionsEnhancer,
      workspacePath,
    };
  } else {
    // New API: options object
    options = cliArgumentsOrOptions as ConfigBuilderOptions<T, U>;
  }
  const { 
    cliArguments, 
    userConfig: finalUserConfig, 
    appDefaults: finalAppDefaults, 
    cliOptionsEnhancer: finalCliOptionsEnhancer, 
    workspacePath: finalWorkspacePath 
  } = options;
  // Build configuration with proper type safety
  const configBuilder = new ConfigurationBuilder<U>();
  
  // Add configurations in priority order (lowest to highest)
  if (finalAppDefaults) {
    configBuilder.addConfig(finalAppDefaults);
  }
  
  configBuilder.addConfig(finalUserConfig);
  
  if (finalWorkspacePath) {
    const workspaceConfig = loadWorkspaceConfig(finalWorkspacePath);
    configBuilder.addConfig(workspaceConfig as Partial<U>);
  }

  // Process CLI arguments through dedicated processor
  const cliProcessor = new CLIArgumentsProcessor(cliArguments);
  const processedCliConfig = cliProcessor.process(finalCliOptionsEnhancer);
  
  configBuilder.addConfig(processedCliConfig);
  
  // Build final configuration
  let finalConfig = configBuilder.build();
  
  // Apply post-processing steps
  finalConfig = applyConfigurationDefaults(finalConfig, cliArguments);
  
  // Log configuration
  const isDebug = cliArguments.debug || false;
  logConfigComplete(finalConfig, isDebug);
  
  return finalConfig;
}



/**
 * Handle server CLI options
 */
function handleServerOptions(
  config: Partial<AgentAppConfig>,
  serverOptions: {
    server?: {
      exclusive?: boolean;
    };
  },
): void {
  const { server } = serverOptions;

  if (!server) {
    return;
  }

  // Initialize server config if it doesn't exist
  if (!config.server) {
    config.server = {};
  }

  // Handle exclusive mode option
  if (server.exclusive !== undefined) {
    config.server.exclusive = server.exclusive;
  }
}

/**
 * Apply logging shortcuts from CLI arguments
 */
function applyLoggingShortcuts(
  config: AgentAppConfig,
  shortcuts: { debug?: boolean; quiet?: boolean },
): void {
  if (config.logLevel) {
    // @ts-expect-error
    config.logLevel = parseLogLevel(config.logLevel);
  }

  if (shortcuts.quiet) {
    config.logLevel = LogLevel.SILENT;
  }

  if (shortcuts.debug) {
    config.logLevel = LogLevel.DEBUG;
  }
}

/**
 * Parse log level string to enum
 */
function parseLogLevel(level: string): LogLevel | undefined {
  const upperLevel = level.toUpperCase();
  if (upperLevel === 'DEBUG') return LogLevel.DEBUG;
  if (upperLevel === 'INFO') return LogLevel.INFO;
  if (upperLevel === 'WARN' || upperLevel === 'WARNING') return LogLevel.WARN;
  if (upperLevel === 'ERROR') return LogLevel.ERROR;

  console.warn(`Unknown log level: ${level}, using default log level`);
  return undefined;
}

/**
 * Apply server configuration with defaults
 */
function applyServerConfiguration(config: AgentAppConfig, serverOptions: { port?: number }): void {
  if (!config.server) {
    config.server = {
      port: 8888,
    };
  }

  if (!config.server.storage || !config.server.storage.type) {
    config.server.storage = {
      type: 'sqlite',
    };
  }

  if (serverOptions.port) {
    config.server.port = serverOptions.port;
  }
}

/**
 * Resolve environment variables in model configuration
 */
function resolveModelSecrets(cliConfigProps: Partial<AgentAppConfig>): void {
  if (cliConfigProps.model) {
    if (cliConfigProps.model.apiKey) {
      const modelApiKey = cliConfigProps.model.apiKey;
      const resolvedApiKey = resolveValue(modelApiKey, 'API key');
      cliConfigProps.model['apiKey'] = resolvedApiKey;
    }

    if (cliConfigProps.model.baseURL) {
      cliConfigProps.model.baseURL = resolveValue(cliConfigProps.model.baseURL, 'base URL');
    }
  }
}

/**
 * Apply WebUI configuration defaults
 */
function applyWebUIDefaults(config: AgentAppConfig): void {
  if (!config.webui) {
    config.webui = {};
  }

  if (!config.webui.type) {
    config.webui.type = 'static';
  }

  if (isAgentWebUIImplementationType(config.webui, 'static') && !config.webui.staticPath) {
    config.webui.staticPath = isTest() ? '/path/to/web-ui' : getStaticPath();
  }

  if (!config.webui.title) {
    config.webui.title = 'Tarko';
  }

  if (!config.webui.welcomTitle) {
    config.webui.welcomTitle = 'Hello, Tarko!';
  }

  if (!config.webui.subtitle) {
    config.webui.subtitle = 'Build your own effective Agents and run anywhere!';
  }

  if (!config.webui.welcomePrompts) {
    config.webui.welcomePrompts = ['Introduce yourself'];
  }

  if (!config.webui.logo) {
    config.webui.logo =
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png';
  }
}

/**
 * Handle tool filter CLI options
 */
function handleToolFilterOptions(
  config: Partial<AgentAppConfig>,
  toolOptions: {
    tool?: {
      include?: string | string[];
      exclude?: string | string[];
    };
  },
): void {
  const { tool } = toolOptions;

  if (!tool) {
    return;
  }

  // Initialize tool config if it doesn't exist
  if (!config.tool) {
    config.tool = {};
  }

  // Handle include patterns
  if (tool.include) {
    const includePatterns = Array.isArray(tool.include) ? tool.include : [tool.include];
    // Flatten comma-separated patterns
    const flattenedInclude = includePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedInclude.length > 0) {
      config.tool.include = flattenedInclude;
    }
  }

  // Handle exclude patterns
  if (tool.exclude) {
    const excludePatterns = Array.isArray(tool.exclude) ? tool.exclude : [tool.exclude];
    // Flatten comma-separated patterns
    const flattenedExclude = excludePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedExclude.length > 0) {
      config.tool.exclude = flattenedExclude;
    }
  }
}

/**
 * Handle MCP server filter CLI options
 */
function handleMCPServerFilterOptions(
  config: Partial<AgentAppConfig>,
  mcpServerOptions: {
    mcpServer?: CommonFilterOptions;
  },
): void {
  const { mcpServer } = mcpServerOptions;

  if (!mcpServer) {
    return;
  }

  // Initialize mcpServer config if it doesn't exist
  const configAny = config as any;
  if (!configAny.mcpServer) {
    configAny.mcpServer = {};
  }

  // Handle include patterns
  if (mcpServer.include) {
    const includePatterns = Array.isArray(mcpServer.include)
      ? mcpServer.include
      : [mcpServer.include];
    // Flatten comma-separated patterns
    const flattenedInclude = includePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedInclude.length > 0) {
      configAny.mcpServer.include = flattenedInclude;
    }
  }

  // Handle exclude patterns
  if (mcpServer.exclude) {
    const excludePatterns = Array.isArray(mcpServer.exclude)
      ? mcpServer.exclude
      : [mcpServer.exclude];
    // Flatten comma-separated patterns
    const flattenedExclude = excludePatterns.flatMap((pattern) =>
      pattern
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    );
    if (flattenedExclude.length > 0) {
      configAny.mcpServer.exclude = flattenedExclude;
    }
  }
}

/**
 * Configuration builder for type-safe configuration merging
 */
class ConfigurationBuilder<T extends AgentAppConfig = AgentAppConfig> {
  private configs: Partial<T>[] = [];

  /**
   * Add a configuration layer
   */
  addConfig(config: Partial<T>): this {
    if (config && typeof config === 'object') {
      this.configs.push(config);
    }
    return this;
  }

  /**
   * Build the final configuration by merging all layers
   */
  build(): T {
    let result = {} as T;
    for (const config of this.configs) {
      result = deepMerge(result, config as any) as T;
    }
    return result;
  }
}

/**
 * CLI arguments processor for handling CLI-specific logic
 */
class CLIArgumentsProcessor<T extends AgentCLIArguments = AgentCLIArguments> {
  constructor(private cliArguments: T) {}

  /**
   * Process CLI arguments into configuration
   */
  process<U extends AgentAppConfig>(
    enhancer?: CLIOptionsEnhancer<T, U>,
  ): Partial<U> {
    // Handle undefined cliArguments
    if (!this.cliArguments) {
      return {} as Partial<U>;
    }
    
    // Extract CLI-specific properties
    const {
      agent,
      workspace,
      config: configPath,
      debug,
      quiet,
      port,
      tool,
      mcpServer,
      server,
      // Extract deprecated options
      provider,
      apiKey,
      baseURL,
      shareProvider,
      model,
      ...cliConfigProps
    } = this.cliArguments;

    // Handle deprecated options
    this.handleDeprecatedOptions(cliConfigProps as any, {
      provider,
      apiKey,
      baseURL,
      shareProvider,
      model,
    });

    // Handle tool filters
    handleToolFilterOptions(cliConfigProps, { tool });

    // Handle MCP server filters
    handleMCPServerFilterOptions(cliConfigProps, { mcpServer });

    // Handle server options
    handleServerOptions(cliConfigProps, { server });

    // Resolve model secrets
    resolveModelSecrets(cliConfigProps);

    // Apply enhancer if provided
    if (enhancer) {
      enhancer(this.cliArguments, cliConfigProps as any);
    }

    return cliConfigProps as unknown as Partial<U>;
  }

  /**
   * Handle deprecated CLI options
   */
  private handleDeprecatedOptions(
    config: Partial<AgentAppConfig>,
    deprecated: {
      provider?: string;
      apiKey?: string;
      baseURL?: string;
      shareProvider?: string;
      model?: string | object;
    },
  ): void {
    const { provider, apiKey: deprecatedApiKey, baseURL, shareProvider, model } = deprecated;

    // Handle deprecated model configuration
    if (provider || deprecatedApiKey || baseURL || (typeof model === 'string')) {
      // Initialize model config if it doesn't exist
      if (!config.model) {
        config.model = {};
      }
      
      // If model is a string, convert it to object format
      if (typeof model === 'string') {
        config.model.id = model;
      }
      
      // Apply deprecated options (CLI args should override existing config)
      if (provider) {
        config.model.provider = provider as ModelProviderName;
      }
      if (deprecatedApiKey) {
        config.model.apiKey = deprecatedApiKey;
      }
      if (baseURL) {
        config.model.baseURL = baseURL;
      }
    }

    // Handle deprecated share provider
    if (shareProvider) {
      if (!config.share) {
        config.share = {};
      }
      config.share.provider = shareProvider;
    }
  }
}

/**
 * Apply configuration defaults and post-processing
 */
function applyConfigurationDefaults<T extends AgentAppConfig>(
  config: T,
  cliArguments: AgentCLIArguments,
): T {
  const { debug, quiet, port } = cliArguments;
  
  // Apply CLI shortcuts
  applyLoggingShortcuts(config, { debug, quiet });
  applyServerConfiguration(config, { port });

  // Apply WebUI defaults
  applyWebUIDefaults(config);

  return config;
}
