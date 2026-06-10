import type { WebviewOutboundMessage } from './types';

type VsCodeApi = {
  postMessage(message: WebviewOutboundMessage): void;
};

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

export const vscode = window.acquireVsCodeApi?.();
