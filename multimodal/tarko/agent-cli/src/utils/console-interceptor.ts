/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

interface ConsoleInterceptorOptions {
  silent?: boolean;
  capture?: boolean;
  filter?: (message: string) => boolean;
  debug?: boolean;
}

/**
 * ConsoleInterceptor - Temporarily intercepts console output
 */
export class ConsoleInterceptor {
  private originalMethods: Map<string, Function> = new Map();
  private buffer: string[] = [];
  private options: Required<ConsoleInterceptorOptions>;

  constructor(options: ConsoleInterceptorOptions = {}) {
    this.options = {
      silent: true,
      capture: true,
      filter: () => true,
      debug: false,
      ...options,
    };

    // Store original console methods
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    methods.forEach(method => {
      this.originalMethods.set(method, console[method]);
    });
  }

  start(): void {
    if (this.options.debug) {
      (this.originalMethods.get('error') as Function)('AgentCLI Starting console output interception');
    }

    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    methods.forEach(method => {
      (console as any)[method] = this.createInterceptor(method);
    });
  }

  stop(): void {
    this.originalMethods.forEach((originalMethod, methodName) => {
      (console as any)[methodName] = originalMethod;
    });

    if (this.options.debug) {
      (this.originalMethods.get('error') as Function)('AgentCLI Console output interception stopped');
    }
  }

  getCapturedOutput(): string[] {
    return [...this.buffer];
  }

  getCapturedString(): string {
    return this.buffer.join('\n');
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  private createInterceptor(methodName: string): (...args: any[]) => void {
    const original = this.originalMethods.get(methodName) as Function;
    
    return (...args: any[]): void => {
      const message = args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');

      if (!this.options.filter(message)) {
        original.apply(console, args);
        return;
      }

      if (this.options.capture) {
        this.buffer.push(message);
      }

      if (this.options.debug) {
        (this.originalMethods.get('error') as Function)(`AgentCLI [Intercepted]: ${message}`);
      }

      if (!this.options.silent) {
        original.apply(console, args);
      }
    };
  }

  static async run<T>(
    fn: () => Promise<T>,
    options?: ConsoleInterceptorOptions,
  ): Promise<{
    result: T;
    logs: string[];
  }> {
    const interceptor = new ConsoleInterceptor(options);
    interceptor.start();

    try {
      const result = await fn();
      return {
        result,
        logs: interceptor.getCapturedOutput(),
      };
    } finally {
      interceptor.stop();
    }
  }
}
