import { contextBridge, ipcRenderer } from "electron";

const extensionAPIs = {
  installExtension() {
    return ipcRenderer.invoke("extension", "extension:install");
  },

  uninstallExtension(extensionId: string) {
    return ipcRenderer.invoke("extension", "extension:uninstall", {extensionId});
  },

  listExtensions() {
    return ipcRenderer.invoke("extension", "extension:list");
  },
} satisfies Window["ifusion"]["extensions"];

const tabAPIs = {
  async createNewTab(extensionId: string) {
    return await ipcRenderer.invoke("tab", "tab:create", { extensionId });
  },

  closeTab(tabId: string) {
    return ipcRenderer.invoke("tab", "tab:close", {tabId});
  },

  switchToTab(tabId: string) {
    return ipcRenderer.invoke("tab", "tab:switch", {tabId});
  },

  reorderTab(fromIndex: number, toIndex: number) {
    return ipcRenderer.invoke("tab", "tab:reorder", { fromIndex, toIndex });
  },

  hideAllTabs() {
    ipcRenderer.send("tab", "tab:hide-all");
  },

  closeExtensionTab(extensionId) {
    return ipcRenderer.invoke("tab", "tab:close-extension", { extensionId });
  },
} satisfies Window["ifusion"]["tabs"];

contextBridge.exposeInMainWorld("ifusion", {
  frameActions: {
    sendFrameAction(payload: FrameWindowAction) {
      ipcRendererSend("sendFrameAction", payload);
    },
  },

  tabs: {
    ...tabAPIs,
  },

  extensions: {
    ...extensionAPIs,
  },
} satisfies Window["ifusion"]);

// Renderer to Main
export function ipcRendererSend<key extends keyof EventPayloadMapping>(
  channel: key,
  payload?: EventPayloadMapping[key]["request"]
) {
  ipcRenderer.send(channel, payload ? payload : null);
}

// Bi-directional
export function ipcRendererInvoke<key extends keyof EventPayloadMapping>(
  channel: key,
  payload?: EventPayloadMapping[key]["request"]
): Promise<EventPayloadMapping[key]["response"]> {
  return ipcRenderer.invoke(channel, payload ? payload : null);
}
