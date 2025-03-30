import { getPreloadFilePath } from "../../../pathResolver.js";

import { BrowserWindow, WebContentsView } from "electron";
import { ipcMainHandle, ipcMainOn } from "../../../utils.js";
import path from "path";
import ExtensionManager from "../ExtensionService/ExtensionManager.js";

const headerHeight = 32;

export default class TabManager {
  private static instance: TabManager;
  private window: BrowserWindow;
  private tabs: Tab[] = [];
  private activeTab: Tab | null = null;
  // private activeTabId: string | null = null;

  private constructor(window: BrowserWindow) {
    this.window = window;

    window.on("resize", () => {
      this.tabs.forEach((tab) => {
        if (tab.view) this.resizeView(tab.view);
      });
    });
  }

  public static getInstance(window: BrowserWindow) {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager(window);
    }

    return TabManager.instance;
  }

  async createNewTab(extensionUniqueId: string): Promise<Result | Result<TabUIInfo>> {
    // Generate Tab ID
    const id = this.generateTabId();

    // Setting up view
    const view = new WebContentsView({
      webPreferences: {
        preload: getPreloadFilePath(),
      },
    });

    // Loading the extension in the view
    // view.webContents.loadFile(path.join(extension.path));
    const res: Result | Result<ExtensionManifest> =
      await ExtensionManager.getInstance().loadExtension(extensionUniqueId, view);

    if (res.code !== ExtensionOperationCode.EXTENSION_LOAD_SUCCESSFUL) {
      // tell the user that extension could not be loaded
      return res as Result;
    }

    this.resizeView(view);
    this.window.contentView.addChildView(view);

    // Add the new tab
    const newTab: Tab = {
      id,
      view,
      title: res.data?.name ?? "Title not available",
      extensionUniqueId: res.data?.uniqueId ?? "Extension uniqueId not available",
    };

    this.tabs.push(newTab);

    this.switchToTab(id);

    view.webContents.on("destroyed", () => {
      console.log("View destroyed:", id, " Extension:", res.data?.name ?? "Name not available");
    });

    return {
      code: TabManagerResultCode.TAB_CREATE_SUCCESSFUL,
      message: `Tab successfully created with extension uniqueId:${res.data?.uniqueId}`,
      data: {
        id: newTab.id,
        title: newTab.title,
      } as TabUIInfo,
    };
  }

  // Closes a tab
  closeTab(tabId: string): Result<{ activeTabIndex: number }> {
    // get the tab index
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);

    // if the tab is not found
    if (tabIndex === -1) {
      throw new Error("tab:close - Tab not found");
    }

    // Remove the tab from the tabs array
    const [tab] = this.tabs.splice(tabIndex, 1); // the deleted tab will be returned

    // Remove the WebContentsView from the window object and close it
    if (tab.view !== null) {
      this.window.contentView.removeChildView(tab.view);
      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
        console.log("Tab closed: ", tab.id);
      } else {
        console.log("Tab already closed:", tab.id);
      }
      tab.view = null; // ensuring no reference to the view exists, so that it can be garbage collected
    }

    // If the active tab was closed, switch to the next tab in the tabs list
    if (this.activeTab && this.activeTab.id === tabId) {
      this.activeTab.view = null; // ensuring no reference to the view exists, so that it can be garbage collected

      // if the user closed the first tab & it was the active one & its the last remaining tab
      if (this.tabs.length === 0) {
        this.activeTab = null;
      }
      // if the user closed the last tab & it was the active one
      else if (tabIndex >= this.tabs.length) {
        this.activeTab = this.tabs[this.tabs.length - 1];
        this.showTab(this.activeTab.id);
      }

      // if the user closed a tab and there exists tabs after it
      else {
        this.activeTab = this.tabs[tabIndex];
        this.showTab(this.activeTab.id);
      }
    }

    return {
      code: TabManagerResultCode.TAB_CLOSE_SUCCESSFUL,
      message: "Tab successfully closed",
      data: { activeTabIndex: this.getTabIndex(this.getActiveTab().data!) },
    };
  }

  switchToTab(tabId: string): Result<{ activeTabIndex: number }> {
    // if user tries to switch to the same tab, return
    if (this.activeTab && this.activeTab.id == tabId) {
      return {
        code: TabManagerResultCode.TAB_SWITCH_SUCCESSFUL,
        message: `Switched to tab ${tabId}`,
        data: { activeTabIndex: this.getTabIndex(this.getActiveTab().data!) },
      };
    }

    const currentTab = this.activeTab;
    const nextTab = this.getTabById(tabId);

    if (!nextTab) {
      return {
        code: TabManagerResultCode.TAB_SWITCH_FAILED,
        message: `Tab ${tabId} not found`,
        data: { activeTabIndex: this.getTabIndex(this.getActiveTab().data!) },
      };
    }

    if (currentTab) {
      this.hideTab(currentTab.id);
    }

    if (nextTab) {
      this.showTab(nextTab.id);
      this.activeTab = nextTab;
    }

    return {
      code: TabManagerResultCode.TAB_SWITCH_SUCCESSFUL,
      message: `Switched to tab ${tabId}`,
      data: { activeTabIndex: this.getTabIndex(this.getActiveTab().data!) },
    };
  }

  reorderTab(
    fromIndex: number,
    toIndex: number
  ): Result<{ tabs: TabUIInfo[]; activeTabIndex: number }> {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.tabs.length ||
      toIndex >= this.tabs.length
    ) {
      throw new Error("Invalid tab indices for reordering");
    }

    // Remove the tab from its original position
    const [movedTab] = this.tabs.splice(fromIndex, 1);

    // Insert the tab at its new position
    this.tabs.splice(toIndex, 0, movedTab);

    return {
      code: TabManagerResultCode.TAB_REORDER_SUCCESSFUL,
      message: `Tab ${movedTab.id} moved from ${fromIndex} to index ${toIndex}`,
      data: {
        tabs: [
          ...this.tabs.map((tab) => {
            return { id: tab.id, title: tab.title };
          }),
        ],
        activeTabIndex: this.getTabIndex(this.getActiveTab().data!),
      },
    };
  }

  getTabs(): Result<Tab[]> {
    return {
      code: TabManagerResultCode.TAB_GET_ALL_SUCCESSFUL,
      message: "Successfully retrieved all the tabs",
      data: this.tabs,
    };
  }

  getActiveTab(): Result<Tab | null> {
    return {
      code: TabManagerResultCode.TAB_GET_ACTIVE_SUCCESSFUL,
      message: "Successfully retrieved active tab",
      data: this.activeTab,
    };
  }

  hideAllTabs() {
    this.tabs.map((tab) => this.hideTab(tab.id));
    this.activeTab = null;
  }

  // helper functions

  getTabById(id: string): Tab | undefined {
    return this.tabs.find((tab) => tab.id === id);
  }

  hideTab(tabId: string) {
    const tab = this.getTabById(tabId);
    if (tab && tab.view) {
      tab.view.setVisible(false);
    }
  }

  showTab(tabId: string) {
    const tab = this.getTabById(tabId);
    if (tab && tab.view) {
      tab.view.setVisible(true);
    }
  }

  generateTabId(): string {
    return `tab-${Date.now()}`;
  }

  resizeView(view: WebContentsView) {
    const bounds = this.window.getBounds();
    view.setBounds({
      x: 0,
      y: headerHeight,
      width: bounds.width,
      height: bounds.height - headerHeight,
    });
  }

  getTabIndex(tab: Tab | null) {
    if (tab) return this.tabs.findIndex((t) => t.id === tab.id);

    return -1;
  }
}

export function initializeTabManager(window: BrowserWindow) {
  const tabManager: TabManager = TabManager.getInstance(window);

  ipcMainHandle("tab:create", (payload) => {
    return tabManager.createNewTab(payload);
  });

  ipcMainHandle("tab:close", (payload) => {
    try {
      return tabManager.closeTab(payload);
    } catch (e) {
      console.error("tab:close failed", e);
    }
  });

  ipcMainHandle("tab:switch", (payload) => {
    return tabManager.switchToTab(payload);
  });

  ipcMainHandle("tab:reorder", (payload) => {
    try {
      return tabManager.reorderTab(payload.fromIndex, payload.toIndex);
    } catch (e) {
      console.error("tab:reorder failed", e);
    }
  });

  ipcMainHandle("tab:getAll", () => tabManager.getTabs());

  ipcMainHandle("tab:getActive", () => tabManager.getActiveTab());

  ipcMainOn("tab:hideAll", () => tabManager.hideAllTabs());
}
