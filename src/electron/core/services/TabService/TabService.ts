import { BrowserWindow } from "electron";
import Service from "../Service.js";
import TabManager from "./TabManager.js";
import { BaseError, UnexpectedError } from "../../errors/index.js";



/**
 * `TabService` is a high-level service class that abstracts the complexities of managing tabs in the application.
 * It provides methods to create, close, switch, reorder, hide, and show tabs, while ensuring consistent error handling
 * and response formatting using the `TabServiceResponse` interface.
 *
 * This class interacts with the `TabManager` to perform tab-related operations and is designed to simplify
 * tab management for the rest of the application.
 */
export default class TabService extends Service {
  private tabManager: TabManager;
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
    this.tabManager = TabManager.getInstance(window);
  }

  /**
   * Creates a new tab and loads an extension into it.
   *
   * @param extensionId - The unique ID of the extension to load in the new tab.
   * @returns A promise that resolves to a `TabServiceResponse` containing the created tab's information.
   *
   * @example
   * const result = await tabService.createTab("extension-unique-id");
   * if (result.isSuccess) {
   *   console.log("Tab created:", result.data);
   * } else {
   *   console.error("Failed to create tab:", result.error);
   * }
   */
  async createTab(extensionId: string): Promise<TabServiceResponse<TabUIInfo>> {
    let response: TabServiceResponse<TabUIInfo>;

    try {
      let tabInfo = await this.tabManager.createNewTab(extensionId);

      response = {
        isSuccess: true,
        message: `Tab created successfully.`,
        data: tabInfo,
      };

      console.log(`Tab created successfully.`, response);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(
          `Unexpected error occured while creating tab with extension: ${extensionId}`
        );
      }

      response = {
        isSuccess: false,
        message: "Failed to create tab.",
        error: err,
      };

      console.error(`Failed to create tab.`, response);
    }

    return response;
  }

  /**
   * Closes a tab by its ID.
   *
   * @param tabId - The ID of the tab to close.
   * @returns A `TabServiceResponse` containing the new active tab index.
   */
  closeTab(tabId: string): TabServiceResponse<{ activeTabIndex: number }> {
    let response: TabServiceResponse<{ activeTabIndex: number }>;

    try {
      let { activeTabIndex } = this.tabManager.closeTab(tabId);

      response = {
        isSuccess: true,
        message: `Tab closed successfully.`,
        data: { activeTabIndex },
      };

      console.log(`Tab closed successfully.`, response);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(`Unexpected error occured while closing tab with id: ${tabId}`);
      }

      response = {
        isSuccess: false,
        message: "Failed to close tab.",
        error: err,
      };

      console.error(`Failed to close tab.`, response);
    }

    return response;
  }

  /**
   * Switches to a tab by its ID.
   *
   * @param tabId - The ID of the tab to switch to.
   * @returns A `TabServiceResponse` containing the new active tab index.
   */
  switchToTab(tabId: string): TabServiceResponse<{ activeTabIndex: number }> {
    let response: TabServiceResponse<{ activeTabIndex: number }>;

    try {
      let { activeTabIndex } = this.tabManager.switchToTab(tabId);

      response = {
        isSuccess: true,
        message: `Switched to tab successfully.`,
        data: { activeTabIndex },
      };

      console.log(`Switched to tab successfully.`, response);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(
          `Unexpected error occured while switching to tab with id: ${tabId}`
        );
      }

      response = {
        isSuccess: false,
        message: "Failed to switch to tab.",
        error: err,
      };

      console.error(`Failed to switch to tab.`, response);
    }

    return response;
  }

  /**
   * Reorders a tab by moving it from one index to another.
   *
   * @param fromIndex - The current index of the tab to move.
   * @param toIndex - The new index to move the tab to.
   * @returns A `TabServiceResponse` containing the updated tabs and the new active tab index.
   */
  reorderTab(
    fromIndex: number,
    toIndex: number
  ): TabServiceResponse<{ tabs: TabUIInfo[]; activeTabIndex: number }> {
    let response: TabServiceResponse<{ tabs: TabUIInfo[]; activeTabIndex: number }>;

    try {
      let { tabs, activeTabIndex } = this.tabManager.reorderTab(fromIndex, toIndex);

      response = {
        isSuccess: true,
        message: `Tab reordered successfully.`,
        data: { tabs, activeTabIndex },
      };

      console.log(`Tab reordered successfully.`, response);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(
          `Unexpected error occured while reordering tab from index ${fromIndex} to index ${toIndex}`
        );
      }

      response = {
        isSuccess: false,
        message: "Failed to reorder tab.",
        error: err,
      };

      console.error(`Failed to reorder tab.`, response);
    }

    return response;
  }

  /**
   * Closes all tabs associated with a specific extension by its `extensionId`.
   *
   * @param extensionId - The unique ID of the extension whose tabs should be closed.
   * @returns A `TabServiceResponse` containing the updated active tab index.
   */
  closeExtensionById(extensionId: string): TabServiceResponse<{ activeTabIndex: number }> {
    let response: TabServiceResponse<{ activeTabIndex: number }>;

    try {
      let { activeTabIndex } = this.tabManager.closeExtensionById(extensionId);

      response = {
        isSuccess: true,
        message: `Extension closed successfully.`,
        data: { activeTabIndex },
      };

      console.log(`Extension closed successfully.`, response);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(
          `Unexpected error occured while closing extension with id: ${extensionId}`
        );
      }

      response = {
        isSuccess: false,
        message: "Failed to close extension.",
        error: err,
      };

      console.error(`Failed to close extension.`, response);
    }

    return response;
  }

  /**
   * Hides all tabs.
   *
   * @returns A `TabServiceResponse` indicating the success or failure of the operation.
   */
  hideAllTabs(): TabServiceResponse<void> {
    let response: TabServiceResponse<void>;

    try {
      this.tabManager.hideAllTabs();

      response = {
        isSuccess: true,
        message: `All tabs hidden successfully.`,
      };

      console.log(`All tabs hidden successfully.`);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(`Unexpected error occured while hiding all tabs.`);
      }

      response = {
        isSuccess: false,
        message: "Failed to hide all tabs.",
        error: err,
      };

      console.error(`Failed to hide all tabs.`, { error: err });
    }

    return response;
  }

  /**
   * Hides a specific tab by its ID.
   *
   * @param tabId - The ID of the tab to hide.
   * @returns A `TabServiceResponse` indicating the success or failure of the operation.
   */
  hideTab(tabId: string): TabServiceResponse<void> {
    let response: TabServiceResponse<void>;

    try {
      this.tabManager.hideTab(tabId);

      response = {
        isSuccess: true,
        message: `Tab hidden successfully.`,
      };

      console.log(`Tab hidden successfully.`);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(`Unexpected error occured while hiding tab with id: ${tabId}`);
      }

      response = {
        isSuccess: false,
        message: "Failed to hide tab.",
        error: err,
      };

      console.error(`Failed to hide tab.`, { error: err });
    }

    return response;
  }

  /**
   * Shows a specific tab by its ID.
   *
   * @param tabId - The ID of the tab to show.
   * @returns A `TabServiceResponse` indicating the success or failure of the operation.
   */
  showTab(tabId: string): TabServiceResponse<void> {
    let response: TabServiceResponse<void>;

    try {
      this.tabManager.showTab(tabId);

      response = {
        isSuccess: true,
        message: `Tab shown successfully.`,
      };

      console.log(`Tab shown successfully.`);
    } catch (error) {
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError(`Unexpected error occured while showing tab with id: ${tabId}`);
      }

      response = {
        isSuccess: false,
        message: "Failed to show tab.",
        error: err,
      };

      console.error(`Failed to show tab.`, { error: err });
    }

    return response;
  }
}
