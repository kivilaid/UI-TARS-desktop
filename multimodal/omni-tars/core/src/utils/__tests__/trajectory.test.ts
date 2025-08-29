/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Trajectory, ToolCallInfo } from '../trajectory';

describe('Trajectory', () => {
  let trajectory: Trajectory;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    trajectory = new Trajectory({ defaultLimit: 3 });
  });

  const createToolCall = (
    name: string,
    args: any = {},
    sessionId = 'test-session-123',
  ): ToolCallInfo => ({
    name,
    args,
    sessionId,
    timestamp: Date.now(),
  });

  describe('Basic tool call tracking', () => {
    test('should track tool calls correctly', () => {
      const toolCall = createToolCall('search', { query: 'test' });

      const warning = trajectory.trackToolCall(toolCall);
      expect(warning).toBeNull();

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search']).toBeDefined();
      expect(stats['search'].count).toBe(1);
    });

    test('should return warning when limit is reached', () => {
      const toolCall = createToolCall('search', { query: 'test' });

      // Call 3 times (default limit)
      trajectory.trackToolCall(toolCall);
      trajectory.trackToolCall(toolCall);
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toContain('这个关键词你已经搜过了');
    });

    test('should track different tools separately', () => {
      const searchCall = createToolCall('search', { query: 'test' });
      const linkCall = createToolCall('linkReader', { url: 'test.com' });

      trajectory.trackToolCall(searchCall);
      trajectory.trackToolCall(linkCall);

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search'].count).toBe(1);
      expect(stats['linkReader'].count).toBe(1);
    });
  });

  describe('Argument tracking', () => {
    test('should track args when trackArgs is enabled', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: true });

      const call1 = createToolCall('search', { query: 'test1' });
      const call2 = createToolCall('search', { query: 'test2' });

      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call2);

      const stats = trajectory.getSessionStats(sessionId);
      expect(Object.keys(stats)).toHaveLength(2);
      expect(stats['search:{"query":"test1"}'].count).toBe(1);
      expect(stats['search:{"query":"test2"}'].count).toBe(1);
    });

    test('should not track args when trackArgs is disabled', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: false });

      const call1 = createToolCall('search', { query: 'test1' });
      const call2 = createToolCall('search', { query: 'test2' });

      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call2);

      const stats = trajectory.getSessionStats(sessionId);
      expect(Object.keys(stats)).toHaveLength(1);
      expect(stats['search'].count).toBe(2);
    });
  });

  describe('Custom limits', () => {
    test('should respect custom tool limits', () => {
      trajectory = new Trajectory({
        defaultLimit: 3,
        toolLimits: { search: 2 },
      });

      const toolCall = createToolCall('search', { query: 'test' });

      trajectory.trackToolCall(toolCall);
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toContain('这个关键词你已经搜过了');
    });

    test('should use default limit for tools without custom limits', () => {
      trajectory = new Trajectory({
        defaultLimit: 2,
        toolLimits: { search: 5 },
      });

      const toolCall = createToolCall('linkReader', { url: 'test.com' });

      trajectory.trackToolCall(toolCall);
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toContain('工具 "linkReader"');
    });
  });

  describe('Custom key generator', () => {
    test('should use custom key generator when provided', () => {
      trajectory = new Trajectory({
        defaultLimit: 3,
        keyGenerator: (toolCall) => `${toolCall.name}-custom`,
      });

      const toolCall = createToolCall('search', { query: 'test' });
      trajectory.trackToolCall(toolCall);

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search-custom']).toBeDefined();
      expect(stats['search-custom'].count).toBe(1);
    });
  });

  describe('Session isolation', () => {
    test('should track sessions separately', () => {
      const session1Call = createToolCall('search', { query: 'test' }, 'session-1');
      const session2Call = createToolCall('search', { query: 'test' }, 'session-2');

      trajectory.trackToolCall(session1Call);
      trajectory.trackToolCall(session2Call);

      const stats1 = trajectory.getSessionStats('session-1');
      const stats2 = trajectory.getSessionStats('session-2');

      expect(stats1['search'].count).toBe(1);
      expect(stats2['search'].count).toBe(1);
    });

    test('should clear specific session data', () => {
      const session1Call = createToolCall('search', { query: 'test' }, 'session-1');
      const session2Call = createToolCall('search', { query: 'test' }, 'session-2');

      trajectory.trackToolCall(session1Call);
      trajectory.trackToolCall(session2Call);

      trajectory.clearSession('session-1');

      const stats1 = trajectory.getSessionStats('session-1');
      const stats2 = trajectory.getSessionStats('session-2');

      expect(Object.keys(stats1)).toHaveLength(0);
      expect(stats2['search'].count).toBe(1);
    });
  });

  describe('Utility methods', () => {
    test('should check if tool call would exceed limit', () => {
      const toolCall = createToolCall('search', { query: 'test' });

      expect(trajectory.wouldExceedLimit(toolCall)).toBe(false);

      trajectory.trackToolCall(toolCall);
      trajectory.trackToolCall(toolCall);
      trajectory.trackToolCall(toolCall);

      expect(trajectory.wouldExceedLimit(toolCall)).toBe(true);
    });

    test('should provide overall statistics', () => {
      const call1 = createToolCall('search', { query: 'test' }, 'session-1');
      const call2 = createToolCall('linkReader', { url: 'test.com' }, 'session-2');

      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call2);

      const stats = trajectory.getOverallStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalToolCalls).toBe(3);
      expect(stats.toolDistribution.search).toBe(2);
      expect(stats.toolDistribution.linkReader).toBe(1);
    });

    test('should clear all data', () => {
      const call1 = createToolCall('search', { query: 'test' }, 'session-1');
      const call2 = createToolCall('linkReader', { url: 'test.com' }, 'session-2');

      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call2);

      trajectory.clearAll();

      const stats = trajectory.getOverallStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalToolCalls).toBe(0);
    });
  });

  describe('Warning messages', () => {
    test('should generate specific warning for search tools', () => {
      trajectory = new Trajectory({ defaultLimit: 2 });
      const toolCall = createToolCall('search-web', { query: 'test' });

      trajectory.trackToolCall(toolCall);
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toBe('这个关键词你已经搜过了，请查看历史里Search这个关键词的结果');
    });

    test('should generate generic warning for non-search tools', () => {
      trajectory = new Trajectory({ defaultLimit: 2 });
      const toolCall = createToolCall('linkReader', { url: 'test.com' });

      trajectory.trackToolCall(toolCall);
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toContain('工具 "linkReader" 在本次会话中已被调用 2 次，达到限制');
    });
  });

  describe('Argument hashing', () => {
    test('should handle null and undefined args', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: true });

      const call1 = createToolCall('search', null);
      const call2 = createToolCall('search', undefined);

      trajectory.trackToolCall(call1);
      trajectory.trackToolCall(call2);

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search:null']).toBeDefined();
    });

    test('should handle string args', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: true });

      const toolCall = createToolCall('search', 'test query');
      trajectory.trackToolCall(toolCall);

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search:test query']).toBeDefined();
    });

    test('should handle complex object args', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: true });

      const complexArgs = {
        query: 'test',
        filters: { date: '2024', type: 'news' },
        options: { limit: 10 },
      };

      const toolCall = createToolCall('search', complexArgs);
      trajectory.trackToolCall(toolCall);

      const stats = trajectory.getSessionStats(sessionId);
      const expectedKey = `search:${JSON.stringify(complexArgs)}`;
      expect(stats[expectedKey]).toBeDefined();
    });

    test('should handle non-serializable args gracefully', () => {
      trajectory = new Trajectory({ defaultLimit: 3, trackArgs: true });

      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const toolCall = createToolCall('search', circularObj);
      trajectory.trackToolCall(toolCall);

      const stats = trajectory.getSessionStats(sessionId);
      // Should not crash and should create some key
      expect(Object.keys(stats)).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle rapid successive calls', () => {
      const toolCall = createToolCall('search', { query: 'test' });

      // Rapid calls
      for (let i = 0; i < 5; i++) {
        trajectory.trackToolCall(toolCall);
      }

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search'].count).toBe(5);
    });

    test('should maintain correct first and last call references', () => {
      const firstCall = createToolCall('search', { query: 'first' });
      const lastCall = createToolCall('search', { query: 'last' });

      trajectory.trackToolCall(firstCall);
      trajectory.trackToolCall(lastCall);

      const stats = trajectory.getSessionStats(sessionId);
      expect(stats['search'].firstCall.args.query).toBe('first');
      expect(stats['search'].lastCall.args.query).toBe('last');
    });

    test('should handle empty session ID gracefully', () => {
      const toolCall = createToolCall('search', { query: 'test' }, '');
      const warning = trajectory.trackToolCall(toolCall);

      expect(warning).toBeNull();
      const stats = trajectory.getSessionStats('');
      expect(stats['search']).toBeDefined();
    });
  });
});
