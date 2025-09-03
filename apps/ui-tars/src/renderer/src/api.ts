/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createClient } from '@ui-tars/electron-ipc/renderer';
import type { Router } from '@main/ipcRoutes';

// Check if we're in replay mode
const isReplayMode = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.get('mode') === 'replay' ||
    urlParams.get('replay') === 'true'
  ) {
    return true;
  }

  if (
    window.location.hash.includes('replay') ||
    window.location.href.includes('replay')
  ) {
    return true;
  }

  if (
    document.querySelector('[data-replay-mode]') ||
    document.body.classList.contains('replay-mode')
  ) {
    return true;
  }

  return false;
};

// Create the base API client
const baseApi = createClient<Router>({
  ipcInvoke: window.electron.ipcRenderer.invoke,
});

// Model-related API methods that should be blocked in replay mode
const modelApiMethods = [
  'checkModelAvailability',
  'checkVLMResponseApiSupport',
  'getAvailableModels',
];

// Create a proxy to intercept API calls and block model-related calls in replay mode
export const api = new Proxy(baseApi, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);

    // If it's a model-related API method and we're in replay mode, return a rejected promise
    if (
      typeof prop === 'string' &&
      modelApiMethods.includes(prop) &&
      isReplayMode()
    ) {
      return () => {
        console.warn(`[Replay Mode] Blocked API call: ${prop}`);
        return Promise.reject(
          new Error(`API call ${prop} is disabled in replay mode`),
        );
      };
    }

    return value;
  },
});
