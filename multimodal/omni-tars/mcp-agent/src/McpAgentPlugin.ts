/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, MCP_ENVIRONMENT } from '@omni-tars/core';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { McpManager } from './tools/mcp';
import { MCPServer } from '@agent-infra/mcp-client';
import { Trajectory, ToolCallInfo, TrajectoryOptions } from '@omni-tars/core';

export interface McpAgentPluginOption {
  mcpServers: MCPServer[];
  /** Tool call frequency tracking options */
  trajectoryOptions?: TrajectoryOptions;
}

/**
 * MCP Agent Plugin - handles MCP_ENVIRONMENT and provides search/link reading capabilities
 */
export class McpAgentPlugin extends AgentPlugin {
  readonly name = 'mcp-agent-plugin';
  readonly environmentSection = MCP_ENVIRONMENT;

  private mcpManager: McpManager;
  private trajectory: Trajectory;

  constructor(option: McpAgentPluginOption) {
    super();
    this.mcpManager = new McpManager({
      mcpServers: option.mcpServers.filter((s) => s.enable),
    });

    // Initialize trajectory tracking with search-specific defaults
    this.trajectory = new Trajectory({
      defaultLimit: 3,
      trackArgs: true,
      toolLimits: {
        search: 2, // Lower limit for search tools
        'search-web': 2,
        'search-tavily': 2,
        linkReader: 5, // Higher limit for link reading
        ...option.trajectoryOptions?.toolLimits,
      },
      ...option.trajectoryOptions,
    });
  }

  async initialize(): Promise<void> {
    await this.mcpManager.init();

    // Initialize tools
    this.tools = [
      new SearchToolProvider(this.mcpManager).getTool(),
      new LinkReaderToolProvider(this.mcpManager).getTool(),
    ];
  }

  async onEachAgentLoopEnd(): Promise<void> {
    //ignore
  }

  async onBeforeToolCall(
    id?: string,
    toolCall?: { toolCallId: string; name: string },
    args?: unknown,
  ): Promise<unknown> {
    // Only track if we have the necessary information
    if (!id || !toolCall) {
      return args;
    }

    // Track tool call and check for frequency limits
    const toolCallInfo: ToolCallInfo = {
      name: toolCall.name,
      args,
      sessionId: id,
      timestamp: Date.now(),
    };

    const warningMessage = this.trajectory.trackToolCall(toolCallInfo);

    if (warningMessage) {
      // Log the warning message
      console.warn(`[Trajectory Warning] ${warningMessage}`);

      // For search tools, we could modify the response or inject the warning
      // This is a simple implementation - in production you might want to
      // inject the warning into the agent's conversation history
      if (toolCall.name.toLowerCase().includes('search')) {
        // Could modify args or implement other warning mechanisms
        console.log(`Tool ${toolCall.name} has reached frequency limit for session ${id}`);
      }
    }

    return args;
  }

  /**
   * Get trajectory statistics for the current session
   */
  getTrajectoryStats(sessionId: string) {
    return this.trajectory.getSessionStats(sessionId);
  }

  /**
   * Clear trajectory data for a session
   */
  clearTrajectorySession(sessionId: string) {
    this.trajectory.clearSession(sessionId);
  }

  /**
   * Get overall trajectory statistics
   */
  getOverallTrajectoryStats() {
    return this.trajectory.getOverallStats();
  }
}
