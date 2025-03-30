export {};

declare global {
  interface EventDataMapping {
    "tab:opened": { tabId: number };
  }
}
