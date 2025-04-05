import { contextBridge, ipcRenderer } from "electron";

const extensionAPIs = {
  installExtension() {
   
    return ipcRenderer.invoke("extension", "extension:install");
  },

  uninstallExtension(uniqueId: string) {
   
    return ipcRenderer.invoke("extension", "extension:uninstall", uniqueId);
  },

  listExtensions()  {
    return ipcRenderer.invoke("extension","extension:list");
  },

  updateExtension(uniqueId: string, sourcePath: string) {
    return ipcRenderer.invoke("extension","extension:update", { uniqueId, sourcePath });
  },

  enableExtension(uniqueId: string) {
    return ipcRenderer.invoke("extension","extension:enable", uniqueId);
  },

  disableExtension(uniqueId: string) {
    return ipcRenderer.invoke("extension","extension:disable", uniqueId);
  },
};

const tabAPIs = {
  createNewTab(extensionUniqueId: string) {
   
    return ipcRenderer.invoke("tab","tab:create", extensionUniqueId);
  },

  closeTab(tabId: string) {
    return ipcRenderer.invoke("tab","tab:close", tabId);
  },

  switchToTab(tabId: string) {
    return ipcRenderer.invoke("tab","tab:switch", tabId);
  },

  reorderTab(fromIndex: number, toIndex: number) {
    return ipcRenderer.invoke("tab","tab:reorder", { fromIndex, toIndex });
  },

  getAllTabs() {
    return ipcRenderer.invoke("tab","tab:getAll");
  },

  getActiveTab() {
    return ipcRenderer.invoke("tab","tab:getActive");
  },

  hideAllTabs() {
    ipcRenderer.send("tab","tab:hideAll");
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


