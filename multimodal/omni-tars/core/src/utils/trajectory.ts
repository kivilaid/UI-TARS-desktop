/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tool call information for tracking
 */
export interface ToolCallInfo {
  name: string;
  args: any;
  sessionId: string;
  timestamp: number;
}

/**
 * Tool call tracking entry with count and context
 */
export interface ToolCallEntry {
  count: number;
  firstCall: ToolCallInfo;
  lastCall: ToolCallInfo;
}

/**
 * Configuration options for trajectory tracking
 */
export interface TrajectoryOptions {
  /** Default limit for tool call frequency per session */
  defaultLimit: number;
  /** Custom limits for specific tools */
  toolLimits?: Record<string, number>;
  /** Whether to track args in the frequency key */
  trackArgs?: boolean;
  /** Custom key generator for tool calls */
  keyGenerator?: (toolCall: ToolCallInfo) => string;
}

/**
 * Trajectory class for tracking agent tool calls with frequency limits
 * 
 * This class provides:
 * - Tool call frequency tracking by tool name and optionally by arguments
 * - Configurable limits per tool type
 * - Session-based isolation
 * - Warning message generation when limits are exceeded
 */
export class Trajectory {
  private toolCalls: Map<string, Map<string, ToolCallEntry>> = new Map();
  private options: Required<Omit<TrajectoryOptions, 'toolLimits' | 'keyGenerator'>> & 
    Pick<TrajectoryOptions, 'toolLimits' | 'keyGenerator'>;

  constructor(options: TrajectoryOptions = { defaultLimit: 3 }) {
    this.options = {
      defaultLimit: options.defaultLimit,
      trackArgs: options.trackArgs ?? false,
      toolLimits: options.toolLimits,
      keyGenerator: options.keyGenerator,
    };
  }

  /**
   * Generate a unique key for tracking tool calls
   */
  private generateKey(toolCall: ToolCallInfo): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(toolCall);
    }

    if (this.options.trackArgs) {
      const argsHash = this.hashArgs(toolCall.args);
      return `${toolCall.name}:${argsHash}`;
    }
    
    return toolCall.name;
  }

  /**
   * Generate a simple hash for arguments
   */
  private hashArgs(args: any): string {
    if (!args) return 'null';
    if (typeof args === 'string') return args.slice(0, 50);
    
    try {
      const str = JSON.stringify(args);
      return str.slice(0, 100);
    } catch {
      return String(args).slice(0, 50);
    }
  }

  /**
   * Get the limit for a specific tool
   */
  private getLimit(toolName: string): number {
    return this.options.toolLimits?.[toolName] ?? this.options.defaultLimit;
  }

  /**
   * Track a tool call and return warning message if limit exceeded
   */
  public trackToolCall(toolCall: ToolCallInfo): string | null {
    const { sessionId } = toolCall;
    const key = this.generateKey(toolCall);
    
    // Initialize session tracking if not exists
    if (!this.toolCalls.has(sessionId)) {
      this.toolCalls.set(sessionId, new Map());
    }
    
    const sessionTracker = this.toolCalls.get(sessionId)!;
    const limit = this.getLimit(toolCall.name);
    
    // Get or create entry
    let entry = sessionTracker.get(key);
    if (!entry) {
      entry = {
        count: 0,
        firstCall: toolCall,
        lastCall: toolCall,
      };
      sessionTracker.set(key, entry);
    }
    
    // Update entry
    entry.count++;
    entry.lastCall = toolCall;
    
    // Check if limit exceeded
    if (entry.count >= limit) {
      return this.generateWarningMessage(toolCall, entry, limit);
    }
    
    return null;
  }

  /**
   * Generate warning message when tool call limit is exceeded
   */
  private generateWarningMessage(
    toolCall: ToolCallInfo, 
    entry: ToolCallEntry, 
    limit: number
  ): string {
    const toolName = toolCall.name;
    const isSearch = toolName.toLowerCase().includes('search');
    
    if (isSearch) {
      return `这个关键词你已经搜过了，请查看历史里Search这个关键词的结果`;
    }
    
    return `工具 "${toolName}" 在本次会话中已被调用 ${entry.count} 次，达到限制 (${limit})。请检查历史调用结果避免重复操作。`;
  }

  /**
   * Get tool call statistics for a session
   */
  public getSessionStats(sessionId: string): Record<string, ToolCallEntry> {
    const sessionTracker = this.toolCalls.get(sessionId);
    if (!sessionTracker) return {};
    
    const stats: Record<string, ToolCallEntry> = {};
    for (const [key, entry] of sessionTracker.entries()) {
      stats[key] = { ...entry };
    }
    
    return stats;
  }

  /**
   * Check if a tool call would exceed the limit without tracking it
   */
  public wouldExceedLimit(toolCall: ToolCallInfo): boolean {
    const { sessionId } = toolCall;
    const key = this.generateKey(toolCall);
    const limit = this.getLimit(toolCall.name);
    
    const sessionTracker = this.toolCalls.get(sessionId);
    if (!sessionTracker) return false;
    
    const entry = sessionTracker.get(key);
    return entry ? entry.count >= limit : false;
  }

  /**
   * Clear tracking data for a specific session
   */
  public clearSession(sessionId: string): void {
    this.toolCalls.delete(sessionId);
  }

  /**
   * Clear all tracking data
   */
  public clearAll(): void {
    this.toolCalls.clear();
  }

  /**
   * Get overall statistics across all sessions
   */
  public getOverallStats(): {
    totalSessions: number;
    totalToolCalls: number;
    toolDistribution: Record<string, number>;
  } {
    let totalToolCalls = 0;
    const toolDistribution: Record<string, number> = {};
    
    for (const sessionTracker of this.toolCalls.values()) {
      for (const entry of sessionTracker.values()) {
        totalToolCalls += entry.count;
        const toolName = entry.firstCall.name;
        toolDistribution[toolName] = (toolDistribution[toolName] ?? 0) + entry.count;
      }
    }
    
    return {
      totalSessions: this.toolCalls.size,
      totalToolCalls,
      toolDistribution,
    };
  }
}
