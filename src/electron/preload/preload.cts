import { contextBridge, ipcRenderer } from "electron";

const extensionAPIs = {
  installExtension() {
    return ipcRendererInvoke("extension:install");
  },

  uninstallExtension(uniqueId: string) {
    return ipcRendererInvoke("extension:uninstall", uniqueId);
  },

  listExtensions() {
    return ipcRendererInvoke("extension:list");
  },

  updateExtension(uniqueId: string, sourcePath: string) {
    return ipcRendererInvoke("extension:update", { uniqueId, sourcePath });
  },

  enableExtension(uniqueId: string) {
    return ipcRendererInvoke("extension:enable", uniqueId);
  },

  disableExtension(uniqueId: string) {
    return ipcRendererInvoke("extension:disable", uniqueId);
  },
};

const tabAPIs = {
  createNewTab(extensionUniqueId: string) {
    return ipcRendererInvoke("tab:create", extensionUniqueId);
  },

  closeTab(tabId: string) {
    return ipcRendererInvoke("tab:close", tabId);
  },

  switchToTab(tabId: string) {
    return ipcRendererInvoke("tab:switch", tabId);
  },

  reorderTab(fromIndex: number, toIndex: number) {
    return ipcRendererInvoke("tab:reorder", { fromIndex, toIndex });
  },

  getAllTabs() {
    return ipcRendererInvoke("tab:getAll");
  },

  getActiveTab() {
    return ipcRendererInvoke("tab:getActive");
  },

  hideAllTabs() {
    ipcRendererSend("tab:hideAll");
  },
};

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
