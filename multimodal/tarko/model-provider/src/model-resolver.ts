/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentModel,
  ModelProviderName,
  ResolvedModel,
  ActualModelProviderName,
} from './types';
import { MODEL_PROVIDER_CONFIGS } from './constants';

/**
 * Get the actual provider implementation name
 */
function getActualProvider(providerName: ModelProviderName): ActualModelProviderName {
  const config = MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
  return (config?.actual || providerName) as ActualModelProviderName;
}

/**
 * Get default configuration for a provider
 */
function getDefaultConfig(providerName: ModelProviderName) {
  return MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
}

/**
 * Resolves the model configuration based on run options and defaults
 *
 * @param agentModel - Default model configuration from agent options
 * @param runModel - Model specified in run options (optional)
 * @param runProvider - Provider specified in run options (optional)
 * @returns Resolved model configuration
 */
export function resolveModel(
  agentModel?: AgentModel,
  runModel?: string,
  runProvider?: ModelProviderName,
): ResolvedModel {
  // Start with runtime parameters, fall back to agent model configuration
  const provider = runProvider || agentModel?.provider || 'openai';
  const model = runModel || agentModel?.id || 'gpt-4o';
  
  let baseURL = agentModel?.baseURL;
  let apiKey = agentModel?.apiKey;
  let displayName = agentModel?.displayName;

  // Apply default configuration from constants if missing
  const defaultConfig = getDefaultConfig(provider);
  if (defaultConfig) {
    baseURL = baseURL || defaultConfig.baseURL;
    apiKey = apiKey || defaultConfig.apiKey;
  }

  return {
    provider,
    id: model,
    displayName,
    baseURL,
    apiKey,
    actualProvider: getActualProvider(provider),
  };
}

/**
 * Legacy ModelResolver class for backward compatibility
 * @deprecated Use resolveModel function instead
 */
export class ModelResolver {
  private readonly agentModel?: AgentModel;

  constructor(agentModel?: AgentModel) {
    this.agentModel = agentModel;
  }

  resolve(runModel?: string, runProvider?: ModelProviderName): ResolvedModel {
    return resolveModel(this.agentModel, runModel, runProvider);
  }

  getDefaultSelection(): AgentModel {
    return this.agentModel || {};
  }

  getAllProviders(): never[] {
    return [];
  }
}
