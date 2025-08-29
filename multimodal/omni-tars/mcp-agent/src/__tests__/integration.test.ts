/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { McpAgentPlugin } from '../McpAgentPlugin';
import { MCPServer } from '@agent-infra/mcp-client';

describe('McpAgentPlugin Integration', () => {
  let plugin: McpAgentPlugin;
  const mockMcpServers: MCPServer[] = [];

  beforeEach(() => {
    plugin = new McpAgentPlugin({
      mcpServers: mockMcpServers,
      trajectoryOptions: {
        defaultLimit: 3,
        trackArgs: false, // Disable arg tracking for cleaner tests
        toolLimits: {
          search: 2, // Set to 2 for first test
        },
      },
    });
  });

  describe('Tool call trajectory tracking', () => {
    test('should track tool calls and warn when limit exceeded', async () => {
      // Create a fresh plugin instance for this test with specific config
      const testPlugin = new McpAgentPlugin({
        mcpServers: mockMcpServers,
        trajectoryOptions: {
          defaultLimit: 3,
          trackArgs: false,
          toolLimits: {
            search: 2, // Set to 2 for this test
          },
        },
      });

      const sessionId = 'test-session-limit';
      const toolCall = { toolCallId: 'call-1', name: 'search' };
      const args = { query: 'test search' };

      // Mock console.warn to capture warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // First call - should pass without warning
      let result = await testPlugin.onBeforeToolCall(sessionId, toolCall, args);
      expect(result).toEqual(args);
      expect(warnSpy).not.toHaveBeenCalled();

      // Second call - should trigger warning (limit is 2, count becomes 2)
      result = await testPlugin.onBeforeToolCall(sessionId, toolCall, args);
      expect(result).toEqual(args);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Trajectory Warning]'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool search has reached frequency limit'),
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    test('should handle missing parameters gracefully', async () => {
      // Should not throw when parameters are missing
      let result = await plugin.onBeforeToolCall();
      expect(result).toBeUndefined();

      result = await plugin.onBeforeToolCall('session');
      expect(result).toBeUndefined();

      result = await plugin.onBeforeToolCall('session', undefined, { test: 'args' });
      expect(result).toEqual({ test: 'args' });
    });

    test('should provide trajectory statistics', async () => {
      const sessionId = 'test-session';
      const searchCall = { toolCallId: 'call-1', name: 'search' };
      const linkCall = { toolCallId: 'call-2', name: 'linkReader' };

      // Make some tool calls
      await plugin.onBeforeToolCall(sessionId, searchCall, { query: 'test1' });
      await plugin.onBeforeToolCall(sessionId, linkCall, { url: 'test.com' });
      await plugin.onBeforeToolCall(sessionId, linkCall, { url: 'test2.com' });

      // Check session stats (trackArgs is false, so tools are tracked by name only)
      const stats = plugin.getTrajectoryStats(sessionId);
      expect(Object.keys(stats)).toHaveLength(2);
      expect(stats['search'].count).toBe(1);
      expect(stats['linkReader'].count).toBe(2);

      // Check overall stats
      const overallStats = plugin.getOverallTrajectoryStats();
      expect(overallStats.totalSessions).toBe(1);
      expect(overallStats.totalToolCalls).toBe(3);
      expect(overallStats.toolDistribution.search).toBe(1);
      expect(overallStats.toolDistribution.linkReader).toBe(2);
    });

    test('should clear session data correctly', async () => {
      const sessionId = 'test-session';
      const toolCall = { toolCallId: 'call-1', name: 'search' };

      // Make a tool call
      await plugin.onBeforeToolCall(sessionId, toolCall, { query: 'test' });

      // Verify data exists
      let stats = plugin.getTrajectoryStats(sessionId);
      expect(Object.keys(stats)).toHaveLength(1);

      // Clear session
      plugin.clearTrajectorySession(sessionId);

      // Verify data is cleared
      stats = plugin.getTrajectoryStats(sessionId);
      expect(Object.keys(stats)).toHaveLength(0);
    });

    test('should track different sessions separately', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const toolCall = { toolCallId: 'call-1', name: 'search' };

      // Make calls in different sessions
      await plugin.onBeforeToolCall(session1, toolCall, { query: 'test1' });
      await plugin.onBeforeToolCall(session2, toolCall, { query: 'test2' });

      // Check stats are separate
      const stats1 = plugin.getTrajectoryStats(session1);
      const stats2 = plugin.getTrajectoryStats(session2);

      expect(stats1['search'].count).toBe(1);
      expect(stats2['search'].count).toBe(1);
      expect(stats1['search'].firstCall.args.query).toBe('test1');
      expect(stats2['search'].firstCall.args.query).toBe('test2');
    });

    test('should respect custom tool limits', async () => {
      // Create a fresh plugin instance for this test
      const testPlugin = new McpAgentPlugin({
        mcpServers: mockMcpServers,
        trajectoryOptions: {
          defaultLimit: 3,
          trackArgs: false,
          toolLimits: {
            search: 2, // Set to 2 for search
          },
        },
      });

      const sessionId = 'test-session-limits';
      const searchCall = { toolCallId: 'call-1', name: 'search' };
      const linkCall = { toolCallId: 'call-2', name: 'linkReader' };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Search has limit of 2, should warn on second call
      await testPlugin.onBeforeToolCall(sessionId, searchCall, { query: 'test' });
      await testPlugin.onBeforeToolCall(sessionId, searchCall, { query: 'test' });
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockClear();

      // LinkReader has default limit of 3, should warn on third call
      await testPlugin.onBeforeToolCall(sessionId, linkCall, { url: 'test1.com' });
      await testPlugin.onBeforeToolCall(sessionId, linkCall, { url: 'test2.com' });
      await testPlugin.onBeforeToolCall(sessionId, linkCall, { url: 'test3.com' });
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  describe('Plugin lifecycle', () => {
    test('should initialize without error', async () => {
      // Mock mcpManager.init to avoid actual MCP server connections
      const initSpy = vi.spyOn(plugin as any, 'mcpManager', 'get').mockReturnValue({
        init: vi.fn().mockResolvedValue(undefined),
      });

      await expect(plugin.initialize()).resolves.not.toThrow();

      initSpy.mockRestore();
    });

    test('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('mcp-agent-plugin');
      expect(plugin.environmentSection).toBeDefined();
    });
  });
});