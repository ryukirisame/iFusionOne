import { getPreloadFilePath } from "../../../pathResolver.js";

import { BrowserWindow, ipcMain, WebContentsView } from "electron";
import { ipcMainHandle, ipcMainOn } from "../../../utils.js";

import { CommandRegistry } from "../../registry/CommandRegistry/CommandRegistry.js";
import { ServiceRegistry } from "../../registry/ServiceRegistry/ServiceRegistry.js";
import { BaseError, ExtensionError, InvalidArgumentError, TabError } from "../../errors/index.js";
import TabService from "./TabService.js";
import { error } from "console";
import { isReadable } from "stream";

const headerHeight = 32;

/**
 * `TabManager` is responsible for managing tabs in the application.
 * It provides methods to create, close, switch, reorder, and hide tabs.
 *
 * The class is implemented as a singleton to ensure a single instance manages all tabs.
 *
 * @example
 * const tabManager = TabManager.getInstance(window);
 *
 * // Create a new tab
 * const newTab = await tabManager.createNewTab("extension-unique-id");
 * console.log("New tab created:", newTab);
 *
 * // Switch to a tab
 * const result = tabManager.switchToTab("tab-123");
 * console.log("Switched to tab:", result);
 */
export default class TabManager {
  private static instance: TabManager;
  private window: BrowserWindow;
  private tabs: Tab[] = [];
  private activeTab: Tab | null = null;

  /**
   * Private constructor to enforce the singleton pattern.
   *
   * @param window - The `BrowserWindow` instance associated with the tab manager.
   */
  private constructor(window: BrowserWindow) {
    this.window = window;

    window.on("resize", () => {
      this.tabs.forEach((tab) => {
        if (tab.view) this.resizeView(tab.view);
      });
    });
  }

  /**
   * Returns the singleton instance of the `TabManager`.
   *
   * @param window - The `BrowserWindow` instance associated with the tab manager.
   * @returns The singleton instance of the `TabManager`.
   */
  public static getInstance(window: BrowserWindow) {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager(window);
    }

    return TabManager.instance;
  }

  /**
   * Creates a new tab and loads an extension into it.
   *
   * @param extensionUniqueId - The unique ID of the extension to load in the new tab.
   * @returns A promise that resolves to an object containing the tab's ID and title.
   * @throws {InvalidArgumentError} If the `extensionUniqueId` is invalid.
   * @throws {TabError} If the tab cannot be created.
   */
  async createNewTab(extensionUniqueId: string): Promise<TabUIInfo> {
    // Validate the extensionUniqueId
    if (!extensionUniqueId || typeof extensionUniqueId !== "string") {
      throw new InvalidArgumentError("Invalid extensionUniqueId provided.");
    }

    // Generate a unique Tab ID
    const id = this.generateTabId();

    // Setting up view
    const view = new WebContentsView({
      webPreferences: {
        preload: getPreloadFilePath(),
        sandbox: true,
      },
    });

    // view.setBackgroundColor("#FF1E1E1E");
    this.resizeView(view);
    this.window.contentView.addChildView(view);

    view.webContents.on("destroyed", () => {
      console.log("View destroyed:", id, " Extension:", manifest.name ?? "Name not available");
    });

    let manifest: ExtensionManifest;
    try {
      // Retrieve the ExtensionService
      const extensionService = await ServiceRegistry.getService("ExtensionService");

      // Load the extension in the view
      const response = await extensionService.loadExtension(extensionUniqueId, view);

      if (response.isSuccess) {
        manifest = response.data!;
      } else {
        throw response.error;
      }
    } catch (error) {
      console.error(
        `Failed to load extension with uniqueId ${extensionUniqueId}: in the tab ${id}`,
        error
      );

      throw new TabError(
        `Failed to load extension with uniqueId ${extensionUniqueId}: in the tab ${id}`,
        error as Error
      );
    }

    // Add the new tab
    const newTab: Tab = {
      id,
      view,
      title: manifest.name,
      extensionUniqueId: manifest.uniqueId!,
    };

    this.tabs.push(newTab);

    this.switchToTab(id);

    return {
      id: newTab.id,
      title: newTab.title,
      extensionUniqueId: manifest.uniqueId!,
    };
  }

  /**
   * Closes a tab by its ID.
   *
   * @param tabId - The ID of the tab to close.
   * @returns An object containing the updated active tab index.
   * @throws {TabError} If the tab with the given ID is not found.
   */
  closeTab(tabId: string): { activeTabIndex: number } {
    // Find the tab index
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);

    // if the tab is not found
    if (tabIndex === -1) {
      throw new TabError(`Tab with ID '${tabId}' not found.`);
    }

    // Remove the tab from the tabs array
    const [tab] = this.tabs.splice(tabIndex, 1); // the deleted tab will be returned

    // Remove the WebContentsView from the window object and close it
    if (tab.view) {
      this.window.contentView.removeChildView(tab.view);
      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
        console.log(`WebContentsView closed for tab: ${tab.id}`);
      } else {
        console.log(`WebContentsView already destroyed for tab: ${tab.id}`);
      }
      tab.view = null; // Ensure no reference to the view exists, so that it can be garbage collected
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
      activeTabIndex: this.getTabIndex(this.getActiveTab()),
    };
  }

  /**
   * Switches to a tab by its ID.
   *
   * @param tabId - The ID of the tab to switch to.
   * @returns An object containing the updated active tab index.
   * @throws {InvalidArgumentError} If the `tabId` is invalid.
   */
  switchToTab(tabId: string): { activeTabIndex: number } {
    // Validate the tabId
    if (!tabId || typeof tabId !== "string") {
      throw new InvalidArgumentError(`Invalid tabId provided: ${tabId}`);
    }

    // If user tries to switch to the same tab, return the current active tab index.
    if (this.activeTab && this.activeTab.id == tabId) {
      console.log(`Already on the active tab: ${tabId}`);
      return {
        activeTabIndex: this.getTabIndex(this.getActiveTab()),
      };
    }

    const currentTab = this.activeTab;
    const nextTab = this.getTabById(tabId); // Find the next tab to switch to

    if (!nextTab) {
      console.warn(`Tab with ID '${tabId}' not found. Active tab remains unchanged.`);
      return {
        activeTabIndex: this.getTabIndex(this.getActiveTab()),
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
      activeTabIndex: this.getTabIndex(this.getActiveTab()),
    };
  }

  /**
   * Reorders a tab from one index to another.
   *
   * @param fromIndex - The current index of the tab to move.
   * @param toIndex - The new index where the tab should be placed.
   * @returns An object containing the updated list of tabs and the active tab index.
   * @throws {InvalidArgumentError} If the indices are invalid.
   */
  reorderTab(fromIndex: number, toIndex: number): { tabs: TabUIInfo[]; activeTabIndex: number } {
    // Validate the indices
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.tabs.length ||
      toIndex >= this.tabs.length
    ) {
      throw new InvalidArgumentError("Invalid tab indices for reordering.");
    }

    // Remove the tab from its original position
    const [movedTab] = this.tabs.splice(fromIndex, 1);

    // Insert the tab at its new position
    this.tabs.splice(toIndex, 0, movedTab);

    return {
      tabs: [
        ...this.tabs.map((tab) => {
          return { id: tab.id, title: tab.title, extensionUniqueId: tab.extensionUniqueId };
        }),
      ],
      activeTabIndex: this.getTabIndex(this.getActiveTab()),
    };
  }

  /**
   * Closes all tabs associated with a specific extension by its `extensionId`.
   *
   * This method ensures that all tabs linked to the given `extensionId` are closed.
   * If no tabs are associated with the `extensionId`, the method logs a message and does nothing.
   *
   * @param extensionId - The unique ID of the extension whose tabs should be closed.
   * @returns An object containing the updated active tab index.
   */
  closeExtensionById(extensionId: string): { activeTabIndex: number } {
    // Validate the extensionId
    if (!extensionId || typeof extensionId !== "string") {
      throw new InvalidArgumentError("Invalid extensionId provided.");
    }

    // Find all the tabs associated with the given extensionId
    const tabsToClose = this.tabs.filter((tab) => tab.extensionUniqueId === extensionId);

    // Close all the tabs and track the last activeTabIndex
    let activeTabIndex = -1;
    for (const tab of tabsToClose) {
      activeTabIndex = this.closeTab(tab.id).activeTabIndex;
    }

    console.log(`All tabs associated with extension ID '${extensionId}' have been closed.`);
    return { activeTabIndex };
  }

  // Helper methods

  /**
   * Returns the list of all tabs.
   *
   * @returns An array of all tabs.
   */
  getTabs(): Tab[] {
    return this.tabs;
  }

  /**
   * Returns the currently active tab.
   *
   * @returns The active tab or `null` if no tab is active.
   */
  getActiveTab(): Tab | null {
    return this.activeTab;
  }

  /**
   * Hides all tabs and sets the active tab to `null`.
   */
  hideAllTabs() {
    this.tabs.forEach((tab) => this.hideTab(tab.id));
    this.activeTab = null;
  }

  /**
   * Finds and returns a tab by its ID.
   *
   * @param id - The ID of the tab to find.
   * @returns The tab with the specified ID or `undefined` if not found.
   */
  getTabById(id: string): Tab | undefined {
    return this.tabs.find((tab) => tab.id === id);
  }

  /**
   * Hides a specific tab by its ID.
   *
   * @param tabId - The ID of the tab to hide.
   */
  hideTab(tabId: string) {
    const tab = this.getTabById(tabId);
    if (tab && tab.view) {
      tab.view.setVisible(false);
    }
  }

  /**
   * Shows a specific tab by its ID.
   *
   * @param tabId - The ID of the tab to show.
   */
  showTab(tabId: string) {
    const tab = this.getTabById(tabId);
    if (tab && tab.view) {
      tab.view.setVisible(true);
    }
  }

  /**
   * Generates a unique ID for a new tab.
   *
   * @returns A unique tab ID.
   */
  generateTabId(): string {
    return `tab-${Date.now()}`;
  }

  /**
   * Resizes a tab's view to fit the window.
   *
   * @param view - The `WebContentsView` to resize.
   */
  resizeView(view: WebContentsView) {
    const bounds = this.window.getBounds();
    view.setBounds({
      x: 0,
      y: headerHeight,
      width: bounds.width,
      height: bounds.height - headerHeight,
    });
  }

  /**
   * Returns the index of a given tab.
   *
   * @param tab - The tab to find the index of.
   * @returns The index of the tab or `-1` if not found.
   */
  getTabIndex(tab: Tab | null) {
    if (tab) return this.tabs.findIndex((t) => t.id === tab.id);

    return -1;
  }
}


