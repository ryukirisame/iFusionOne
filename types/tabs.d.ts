import { BaseError } from "../src/electron/core/errors/index.js";

declare global {
  interface TabUIInfo {
    readonly id: string;
    title: string;
    readonly extensionUniqueId: string;
  }

  interface Tab extends TabUIInfo {
    view: WebContentsView | null;
  }

  /**
   * Represents the response from a `TabService` method.
   *
   * @template T - The type of the data returned in the response.
   */
  type TabServiceResponse<T> = {
    /** Indicates whether the operation was successful. */
    isSuccess: boolean;

    /** A message describing the result of the operation. */
    message: string;

    /** The data returned by the operation, if successful. */
    data?: T;

    /** The error encountered during the operation, if any. */
    error?: BaseError;
  };

  interface CommandPayloadMapping {
    "tab:create": {
      request: { extensionId: string };
      response: MainToRendererResponse<TabUIInfo>;
    };

    "tab:close": {
      request: { tabId: string };
      response: MainToRendererResponse<{ activeTabIndex: number }>;
    };

    "tab:switch": {
      request: { tabId: string };
      response: MainToRendererResponse<{ activeTabIndex: number }>;
    };

    "tab:reorder": {
      request: { fromIndex: number; toIndex: number };
      response: MainToRendererResponse<{ tabs: TabUIInfo[]; activeTabIndex: number }>;
    };

    "tab:hide-all": {
      request: null;
      response: MainToRendererResponse<void>;
    };

    "tab:hide": {
      request: { tabId: string };
      response: MainToRendererResponse<void>;
    };

    "tab:show": {
      request: { tabId: string };
      response: MainToRendererResponse<void>;
    };

    "tab:close-extension": {
      request: { extensionId: string };
      response: MainToRendererResponse<{ activeTabIndex: number }>;
    };
  }

  interface ifusion {
    // Exposing tab management APIs to ifusion under tabs object
    tabs: {
      createNewTab: (extensionId: string) => Promise<MainToRendererResponse<TabUIInfo>>;

      closeTab: (tabId: string) => Promise<MainToRendererResponse<{ activeTabIndex: number }>>;

      switchToTab: (tabId: string) => Promise<MainToRendererResponse<{ activeTabIndex: number }>>;

      reorderTab: (
        fromIndex: number,
        toIndex: number
      ) => Promise<MainToRendererResponse<{ tabs: TabUIInfo[]; activeTabIndex: number }>>;

      hideAllTabs: () => void;

      closeExtensionTab: (
        extensionId: string
      ) => Promise<MainToRendererResponse<{ activeTabIndex: number }>>;
    };
  }
}

export {};
