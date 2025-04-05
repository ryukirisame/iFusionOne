declare global {
  interface TabUIInfo {
    readonly id: string;
    title: string;
  }

  interface Tab extends TabUIInfo {
    view: WebContentsView | null;
    readonly extensionUniqueId: string;
  }

  const enum TabManagerResultCode {
    TAB_CREATE_SUCCESSFUL = "TAB_CREATE_SUCCESSFUL",

    TAB_CLOSE_SUCCESSFUL = "TAB_CLOSE_SUCCESSFUL",

    TAB_SWITCH_SUCCESSFUL = "TAB_SWITCH_SUCCESSFUL",
    TAB_SWITCH_FAILED = "TAB_SWITCH_FAILED",

    TAB_REORDER_SUCCESSFUL = "TAB_REORDER_SUCCESSFUL",

    TAB_GET_ALL_SUCCESSFUL = "TAB_GET_ALL_SUCCESSFUL",

    TAB_GET_ACTIVE_SUCCESSFUL = "TAB_GET_ACTIVE_SUCCESSFUL",
  }

  // Event-Payload mapping for tab management
  interface EventPayloadMapping {
    "tab:create": {
      request: string;
      response: Result | Result<TabUIInfo>;
    };

    "tab:close": {
      request: string;
      response: Result<{ activeTabIndex: number }>;
    };

    "tab:switch": {
      request: string;
      response: Result<{ activeTabIndex: number }>;
    };

    "tab:reorder": {
      request: { fromIndex: number; toIndex: number };
      response: Result<{ tabs: TabUIInfo[]; activeTabIndex: number }>;
    };

    "tab:getAll": {
      request: null;
      response: Result<Tab[]>;
    };

    "tab:getActive": {
      request: null;
      response: Result<Tab | null>;
    };

    "tab:hideAll": {
      request: null;
      response: null;
    };
  }

  interface ifusion {
    // Exposing tab management APIs to ifusion under tabs object
    tabs: {
      createNewTab: (extensionUniqueId: string) => Promise<Promise<TabUIInfo>>;

      closeTab: (tabId: string) => Promise<Result<{ activeTabIndex: number }>>;

      switchToTab: (tabId: string) => Promise<Result<{ activeTabIndex: number }>>;

      reorderTab: (
        fromIndex: number,
        toIndex: number
      ) => Promise<Result<{ tabs: TabUIInfo[]; activeTabIndex: number }>>;

      getAllTabs: () => Promise<Result<Tab[]>>;

      getActiveTab: () => Promise<Result<Tab | null>>;

      hideAllTabs: () => void;
    };
  }
}

export {};
