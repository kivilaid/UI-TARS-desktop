import { describe, it, expect } from 'vitest';
import { ModelResolver, resolveModel } from '../src/model-resolver';
import { AgentModel } from '../src/types';

describe('resolveModel function', () => {
  it('should resolve with default values when no configuration provided', () => {
    const resolved = resolveModel();

    expect(resolved).toEqual({
      provider: 'openai',
      id: 'gpt-4o',
      displayName: undefined,
      baseURL: undefined,
      apiKey: undefined,
      actualProvider: 'openai',
    });
  });

  it('should use agent model configuration', () => {
    const agentModel: AgentModel = {
      provider: 'anthropic',
      id: 'claude-3-sonnet',
      apiKey: 'test-key',
      baseURL: 'https://api.anthropic.com',
      displayName: 'Claude 3 Sonnet',
    };

    const resolved = resolveModel(agentModel);

    expect(resolved).toEqual({
      provider: 'anthropic',
      id: 'claude-3-sonnet',
      displayName: 'Claude 3 Sonnet',
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      actualProvider: 'anthropic',
    });
  });

  it('should override agent model with run parameters', () => {
    const agentModel: AgentModel = {
      provider: 'openai',
      id: 'gpt-4',
      apiKey: 'agent-key',
    };

    const resolved = resolveModel(agentModel, 'claude-3-haiku', 'anthropic');

    expect(resolved).toEqual({
      provider: 'anthropic',
      id: 'claude-3-haiku',
      displayName: undefined,
      baseURL: undefined,
      apiKey: 'agent-key', // Keeps agent model's config
      actualProvider: 'anthropic',
    });
  });

  it('should apply default configuration for extended providers', () => {
    const resolved = resolveModel(undefined, 'llama3', 'ollama');

    expect(resolved).toEqual({
      provider: 'ollama',
      id: 'llama3',
      displayName: undefined,
      baseURL: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
      actualProvider: 'openai', // 'ollama' maps to 'openai'
    });
  });

  it('should prioritize agent model configuration over defaults', () => {
    const agentModel: AgentModel = {
      provider: 'ollama',
      id: 'llama3',
      baseURL: 'http://custom-server:11434/v1',
      apiKey: 'custom-key',
    };

    const resolved = resolveModel(agentModel);

    expect(resolved).toEqual({
      provider: 'ollama',
      id: 'llama3',
      displayName: undefined,
      baseURL: 'http://custom-server:11434/v1',
      apiKey: 'custom-key',
      actualProvider: 'openai',
    });
  });

  it('should handle partial agent model configuration', () => {
    const agentModel: AgentModel = {
      provider: 'deepseek',
    };

    const resolved = resolveModel(agentModel, 'deepseek-chat');

    expect(resolved).toEqual({
      provider: 'deepseek',
      id: 'deepseek-chat',
      displayName: undefined,
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: undefined,
      actualProvider: 'openai',
    });
  });
});

describe('ModelResolver (legacy compatibility)', () => {
  it('should work with legacy constructor', () => {
    const agentModel: AgentModel = {
      provider: 'openai',
      id: 'gpt-4o',
      apiKey: 'test-key',
    };

    const resolver = new ModelResolver(agentModel);
    const resolved = resolver.resolve();

    expect(resolved).toEqual({
      provider: 'openai',
      id: 'gpt-4o',
      displayName: undefined,
      baseURL: undefined,
      apiKey: 'test-key',
      actualProvider: 'openai',
    });
  });

  it('should return agent model as default selection', () => {
    const agentModel: AgentModel = {
      provider: 'anthropic',
      id: 'claude-3-haiku',
    };

    const resolver = new ModelResolver(agentModel);
    const defaultSelection = resolver.getDefaultSelection();

    expect(defaultSelection).toEqual(agentModel);
  });

  it('should return empty array for getAllProviders', () => {
    const resolver = new ModelResolver();
    const providers = resolver.getAllProviders();

    expect(providers).toEqual([]);
  });

  it('should support run parameter overrides', () => {
    const agentModel: AgentModel = {
      provider: 'openai',
      id: 'gpt-4',
    };

    const resolver = new ModelResolver(agentModel);
    const resolved = resolver.resolve('claude-3-sonnet', 'anthropic');

    expect(resolved).toEqual({
      provider: 'anthropic',
      id: 'claude-3-sonnet',
      displayName: undefined,
      baseURL: undefined,
      apiKey: undefined,
      actualProvider: 'anthropic',
    });
  });
});
