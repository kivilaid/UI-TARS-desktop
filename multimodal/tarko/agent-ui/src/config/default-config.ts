/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BaseAgentWebUIImplementation, WorkspaceNavItem } from '@tarko/interface';

/**
 * Default Web UI configuration for standalone deployment
 * Based on the omni-agent configuration structure
 */
export const DEFAULT_WEBUI_CONFIG: BaseAgentWebUIImplementation = {
  logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
  title: 'Tarko Agent UI',
  subtitle: 'Offering seamless integration with a wide range of real-world tools.',
  welcomTitle: 'A multimodal AI agent',
  welcomePrompts: [
    'Search for the latest GUI Agent papers',
    'Find information about UI TARS',
    'Tell me the top 5 most popular projects on ProductHunt today',
    'Write hello world using python',
    'Use jupyter to calculate which is greater in 9.11 and 9.9',
    'Write code to reproduce seed-tars.com',
    'Summary seed-tars.com/1.5',
    'Write a python code to download the paper https://arxiv.org/abs/2505.12370, and convert the pdf to markdown',
    'Search news about bytedance seed1.6 model, then write a web page in modern style and deploy it',
    'Write a minimal code sample to help me use transformer',
    'Please search for trending datasets on Hugging Face, download the top-ranked dataset, and calculate the total number of characters in the entire dataset.',
  ],
  workspace: {
    navItems: [
      {
        title: 'Code Server',
        link: './code-server/',
        icon: 'code',
      },
      {
        title: 'VNC',
        link: './vnc/index.html?autoconnect=true',
        icon: 'monitor',
      },
    ],
  },
  guiAgent: {
    defaultScreenshotRenderStrategy: 'afterAction',
    enableScreenshotRenderStrategySwitch: true,
    renderGUIAction: true,
    renderBrowserShell: false,
  },
  layout: {
    enableLayoutSwitchButton: true,
  },
};
